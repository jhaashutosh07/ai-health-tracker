import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'
import { langValueNote } from '@/lib/i18n/translations'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Identifies a medicine from a photo of the tablet/strip/box using GPT-4o vision.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { image, mimeType, lang } = req.body
  if (!image || !mimeType) return res.status(400).json({ message: 'image and mimeType required' })
  if (!ALLOWED.includes(mimeType)) return res.status(400).json({ message: 'Use a JPG, PNG or WEBP image.' })

  const prompt = `Identify the medicine in this photo (tablet, capsule, blister strip, or box). Read any printed brand name, strength, and markings. Respond ONLY with JSON:
{
  "identified": true|false,
  "name": "brand name as printed (e.g. Dolo 650)",
  "genericName": "active ingredient(s) (e.g. Paracetamol 650mg)",
  "uses": ["what it's commonly used for"],
  "typicalDosage": "common adult dosage & frequency (general info, not a prescription)",
  "warnings": ["key cautions / side effects / who should avoid"],
  "notes": "1-line note (e.g. take after food)",
  "completed": true
}
Rules: use Indian brand context; if you cannot read/identify it confidently, set "identified": false and put your best guess in name with low confidence noted in notes; NEVER invent a specific medicine you can't see. This is general information, not a prescription.${langValueNote(lang)}`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 900,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
        { type: 'text', text: prompt },
      ] }],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(500).json({ message: 'Could not read the image. Try a clearer, well-lit photo.' })
    return res.status(200).json({ result: parsed })
  } catch (err: any) {
    console.error('Pill identify error:', err)
    return res.status(500).json({ message: `Identification failed: ${err.message}` })
  }
}
