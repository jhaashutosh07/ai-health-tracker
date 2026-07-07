import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'
import { AI_LANG_INSTRUCTION, LangCode } from '@/lib/i18n/translations'

// Translates the demo-walkthrough script into the selected language so the
// on-screen text AND the AI voiceover match the app language. Cached per language.
const cache = new Map<string, any[]>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { lang, scenes } = req.body
  if (!Array.isArray(scenes) || !scenes.length) return res.status(400).json({ message: 'scenes required' })
  if (!lang || lang === 'en' || !AI_LANG_INSTRUCTION[lang as LangCode]) {
    return res.status(200).json({ scenes })
  }

  if (cache.has(lang)) return res.status(200).json({ scenes: cache.get(lang) })

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 1600,
      messages: [{
        role: 'user',
        content: `Translate the "title", "caption" and "narration" of each item in this JSON array into ${AI_LANG_INSTRUCTION[lang as LangCode]?.replace(/^.*?in /i, '') || lang}. Keep it natural, warm and concise (this is a spoken app walkthrough). Return ONLY a JSON array of the same length and order with the same keys.\n\n${JSON.stringify(scenes)}`,
      }],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\[[\s\S]*\]/)?.[0] || raw
    const parsed = tryParse(json)
    if (Array.isArray(parsed) && parsed.length === scenes.length) {
      cache.set(lang, parsed)
      return res.status(200).json({ scenes: parsed })
    }
    return res.status(200).json({ scenes })
  } catch (err) {
    console.error('Demo script error:', err)
    return res.status(200).json({ scenes })
  }
}
