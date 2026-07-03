import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai } from '@/lib/openai'

// Server-side text-to-speech via OpenAI, used as a fallback when the browser has
// no local voice for a language (e.g. Bengali). Returns MP3 audio. The TTS model
// auto-detects the input language, so it speaks Bengali/Tamil/etc. natively.
export const config = { api: { responseLimit: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { text } = req.body || {}
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ message: 'text is required' })
  }

  // Cap length to control cost/latency (assistant replies are short anyway).
  const input = text.slice(0, 1200)
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'

  try {
    const speech = await openai.audio.speech.create({
      model,
      voice: (process.env.OPENAI_TTS_VOICE as any) || 'alloy',
      input,
    })
    const buffer = Buffer.from(await speech.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    return res.status(200).send(buffer)
  } catch (err: any) {
    console.error('TTS error:', err?.message || err)
    return res.status(500).json({ message: 'Text-to-speech is temporarily unavailable.' })
  }
}
