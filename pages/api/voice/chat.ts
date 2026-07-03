import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { AI_LANG_INSTRUCTION, LangCode } from '@/lib/i18n/translations'

// Brief, spoken-friendly health assistant for the hands-free voice mode.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { messages, lang } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'messages required' })
  }

  const langInstruction = AI_LANG_INSTRUCTION[(lang as LangCode)] || ''
  const system = `You are a friendly voice health assistant. This is a SPOKEN conversation, so:
- Keep replies short and natural — 1-3 sentences, easy to say aloud. No markdown, no lists, no JSON.
- Ask one simple follow-up question when you need more detail.
- Give practical, everyday guidance. You are NOT a doctor and must not give a firm diagnosis.
- For emergencies (chest pain, trouble breathing, stroke signs, severe bleeding), tell them to call 112 immediately, first.
- Recommend seeing a doctor for anything serious or persistent.
${langInstruction ? '\n' + langInstruction : ''}`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 220,
      messages: [
        { role: 'system', content: system },
        ...messages.slice(-10).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content || '') })),
      ],
    })
    return res.status(200).json({ message: response.choices[0]?.message?.content?.trim() || '' })
  } catch (err) {
    console.error('Voice chat error:', err)
    return res.status(500).json({ message: 'Voice assistant is unavailable right now.' })
  }
}
