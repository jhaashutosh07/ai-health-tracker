import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai, SYMPTOM_CHECKER_SYSTEM_PROMPT } from '@/lib/openai'
import { AI_LANG_INSTRUCTION, LangCode } from '@/lib/i18n/translations'
import { prisma } from '@/lib/prisma'

async function callAI(messages: { role: 'user' | 'assistant'; content: string }[], lang: LangCode = 'en'): Promise<string> {
  const langInstruction = AI_LANG_INSTRUCTION[lang] || ''
  const systemContent = langInstruction
    ? `${langInstruction}\n\n${SYMPTOM_CHECKER_SYSTEM_PROMPT}`
    : SYMPTOM_CHECKER_SYSTEM_PROMPT

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    // The final assessment JSON (conditions + medicines + tips, sometimes in
    // Devanagari/Tamil script) regularly exceeds 1500 tokens — a truncated
    // JSON means no assessment card and no saved symptom log.
    max_tokens: 4000,
    messages: [
      { role: 'system', content: systemContent },
      ...messages,
    ],
  })
  return response.choices[0]?.message?.content || ''
}

// Strip JSON blocks and any dangling lead-in the model wrote pointing at them
// (e.g. "Here's what I think based on what you've shared:")
function stripForDisplay(text: string) {
  let clean = text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim()
  const lines = clean.split('\n')
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim()
    if (last === '' || /[:：]$/.test(last) || /^(here('|’)s|based on what)/i.test(last)) lines.pop()
    else break
  }
  return lines.join('\n').trim()
}

function tryParse(str: string): any | null {
  try { return JSON.parse(str) } catch { }
  // Common model slip: trailing commas before } or ]
  try { return JSON.parse(str.replace(/,\s*([}\]])/g, '$1')) } catch { }
  return null
}

function extractAssessment(text: string) {
  const candidates: string[] = []

  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) candidates.push(codeBlockMatch[1])

  // Balanced-brace scan picks up bare JSON objects (and survives text after them)
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        candidates.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }

  for (const candidate of candidates) {
    const parsed = tryParse(candidate)
    if (parsed && parsed.completed === true) return parsed
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { messages, lang } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Invalid messages format' })
  }

  let aiResponse: string
  try {
    aiResponse = await callAI(
      messages.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      (lang as LangCode) || 'en'
    )
  } catch (err: any) {
    console.error('AI API error:', err)
    return res.status(500).json({
      message: `Sorry, the AI service is temporarily unavailable (${err.message}). Please try again in a moment.`,
    })
  }

  let assessment = extractAssessment(aiResponse)

  // The model clearly attempted a final assessment but the JSON didn't parse
  // (usually truncation) — ask it once to resend just the JSON block.
  if (!assessment && /"completed"|```json/.test(aiResponse)) {
    try {
      const repaired = await callAI(
        [
          ...messages.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'assistant', content: aiResponse },
          { role: 'user', content: 'Your JSON assessment block was malformed or cut off. Resend ONLY the complete ```json assessment block with "completed": true — no other text.' },
        ],
        (lang as LangCode) || 'en'
      )
      assessment = extractAssessment(repaired)
    } catch { /* fall through to normal incomplete handling */ }
  }

  if (assessment) {
    try {
      const symptomLog = await prisma.symptomLog.create({
        data: {
          userId: session.user.id,
          symptoms: JSON.stringify(assessment.symptoms || []),
          description: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
          chatHistory: JSON.stringify(messages),
          severity: assessment.severity || 'LOW',
          // possibleConditions entries are {name, probability, reasoning} objects
          aiDiagnosis: Array.isArray(assessment.possibleConditions)
            ? assessment.possibleConditions
                .map((c: any) => (typeof c === 'string' ? c : c?.name))
                .filter(Boolean)
                .join(', ')
            : '',
          recommendation: assessment.advice || '',
          suggestedMedicines: assessment.medicineSuggestions
            ? JSON.stringify(assessment.medicineSuggestions)
            : null,
        },
      })

      const displayMessage = stripForDisplay(aiResponse)

      return res.status(200).json({
        message: displayMessage || "I've completed your assessment — the full breakdown is in the card that just appeared.",
        assessment,
        symptomLogId: symptomLog.id,
        completed: true,
      })
    } catch (dbErr) {
      console.error('DB save error:', dbErr)
      return res.status(200).json({
        message: stripForDisplay(aiResponse),
        assessment,
        completed: true,
      })
    }
  }

  return res.status(200).json({ message: aiResponse, completed: false })
}
