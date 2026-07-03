import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { AI_LANG_INSTRUCTION, LangCode } from '@/lib/i18n/translations'

// Direct scan for self-harm / crisis language (mental-health specific).
const CRISIS_RE = /\b(suicide|suicidal|kill myself|end my life|don'?t want to live|want to die|harm myself|hurt myself|self.?harm|no reason to live|better off dead)\b/i

// A warm, supportive mental-health check-in companion. It is NOT therapy and not
// a diagnosis — it listens, reflects, offers gentle coping ideas, and escalates
// to crisis resources when the conversation suggests risk.
const SYSTEM_PROMPT = `You are "Saathi", a warm, supportive mental-wellbeing companion in a health app (India).
Your role:
- Be a kind, non-judgmental listener for a daily emotional check-in. Validate feelings first.
- Keep replies short, human and conversational (2-5 sentences). Ask one gentle follow-up.
- Offer simple, practical coping ideas (breathing, grounding, journaling, a short walk, reaching out to someone) when helpful — not a lecture.
- You are NOT a therapist and must never diagnose or prescribe. Encourage professional help for persistent low mood.
- If the person expresses thoughts of self-harm, suicide, or being in danger: respond with calm care, urge them to reach out NOW, and clearly share India crisis lines — iCall 9152987821, Vandrevala Foundation 1860-2662-345, or emergency 112. Tell them they're not alone.
- Never be dismissive or toxic-positive. Warmth over cheerfulness.`

const CRISIS_RESOURCES = 'If you are in crisis or thinking about harming yourself, please reach out right now — iCall 9152987821, Vandrevala Foundation 1860-2662-345, or call 112. You are not alone, and talking to someone can help.'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { messages, recentMood, lang } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'messages array required' })
  }
  const langInstruction = AI_LANG_INSTRUCTION[(lang as LangCode)] || ''

  // Independent safety scan of the user's words for self-harm/crisis language.
  const userText = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' ')
  const crisis = CRISIS_RE.test(userText)

  const moodNote = typeof recentMood === 'number'
    ? `\n\nContext: the person's recent mood self-rating is ${recentMood}/5 (1=very low, 5=great). Be attuned to it.`
    : ''

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 350,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + moodNote + (langInstruction ? `\n\n${langInstruction}` : '') },
        ...messages.slice(-12).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content || '') })),
      ],
    })
    let reply = response.choices[0]?.message?.content?.trim() || ''
    // Always append crisis resources if our own scan flagged risk, in case the model under-reacted.
    if (crisis && !/9152987821|1860-2662-345|112/.test(reply)) {
      reply = `${reply}\n\n${CRISIS_RESOURCES}`
    }
    return res.status(200).json({ message: reply, crisis })
  } catch (err) {
    console.error('Companion chat error:', err)
    return res.status(500).json({ message: 'Saathi is unavailable right now. Please try again in a moment.' })
  }
}
