import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Reads a prescription photo and extracts structured medicines to add to the tracker.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { image, mimeType } = req.body
  if (!image || !mimeType) return res.status(400).json({ message: 'image and mimeType required' })
  if (!ALLOWED.includes(mimeType)) return res.status(400).json({ message: 'Use a JPG, PNG or WEBP image.' })

  const prompt = `Extract the prescribed medicines from this prescription image. Respond ONLY with JSON:
{
  "medicines": [
    { "name": "medicine name (with strength, e.g. Amoxicillin 500mg)", "dosage": "e.g. 500mg", "frequency": "e.g. Twice daily / BD", "times": ["HH:mm", "HH:mm"], "durationDays": number|null, "instructions": "e.g. after food" }
  ],
  "completed": true
}
Rules: read each drug line; infer sensible clock times for the frequency (OD→["09:00"], BD→["09:00","21:00"], TDS→["08:00","14:00","20:00"], QID→["08:00","12:00","16:00","20:00"]); only include medicines you can actually read; if handwriting is unclear, still return your best reading but keep it faithful. Do not invent medicines.`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 1200,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
        { type: 'text', text: prompt },
      ] }],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed?.medicines?.length) return res.status(200).json({ medicines: [] })
    return res.status(200).json({ medicines: parsed.medicines })
  } catch (err: any) {
    console.error('Prescription scan error:', err)
    return res.status(500).json({ message: `Scan failed: ${err.message}` })
  }
}
