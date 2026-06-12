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
    max_tokens: 1500,
    messages: [
      { role: 'system', content: systemContent },
      ...messages,
    ],
  })
  return response.choices[0]?.message?.content || ''
}

function extractAssessment(text: string) {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1])
      if (parsed.completed === true) return parsed
    } catch { }
  }

  const bareMatch = text.match(/\{[\s\S]*?"completed"\s*:\s*true[\s\S]*?\}/)
  if (bareMatch) {
    try {
      const parsed = JSON.parse(bareMatch[0])
      if (parsed.completed === true) return parsed
    } catch { }
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

  const assessment = extractAssessment(aiResponse)

  if (assessment) {
    try {
      const symptomLog = await prisma.symptomLog.create({
        data: {
          userId: session.user.id,
          symptoms: JSON.stringify(assessment.symptoms || []),
          description: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
          chatHistory: JSON.stringify(messages),
          severity: assessment.severity || 'LOW',
          aiDiagnosis: Array.isArray(assessment.possibleConditions)
            ? assessment.possibleConditions.join(', ')
            : '',
          recommendation: assessment.advice || '',
        },
      })

      const displayMessage = aiResponse
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim()

      return res.status(200).json({
        message: displayMessage || "I've completed your assessment. Please see the summary below.",
        assessment,
        symptomLogId: symptomLog.id,
        completed: true,
      })
    } catch (dbErr) {
      console.error('DB save error:', dbErr)
      return res.status(200).json({
        message: aiResponse.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim(),
        assessment,
        completed: true,
      })
    }
  }

  return res.status(200).json({ message: aiResponse, completed: false })
}
