import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Analyzes a photo of a skin condition / wound / rash / lab report or prescription
// with GPT-4o vision and returns a structured, non-diagnostic assessment.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { image, mimeType, kind } = req.body
  if (!image || !mimeType) return res.status(400).json({ message: 'image and mimeType are required' })
  if (!ALLOWED.includes(mimeType)) return res.status(400).json({ message: 'Use a JPG, PNG, or WEBP image.' })

  const prompt = `You are a careful medical-imaging assistant for an Indian health app. Analyze the attached image${kind ? ` (the user says it is a: ${kind})` : ''}.
If it is a SKIN/WOUND/RASH/EYE photo: describe what is objectively visible and the most likely benign-to-serious possibilities.
If it is a LAB REPORT or PRESCRIPTION: extract and summarise the key values/medicines and flag anything notably out of range.
You are NOT making a diagnosis. Respond ONLY with a JSON object, no other text:
{
  "type": "skin|wound|rash|eye|lab_report|prescription|other",
  "observation": "2-3 sentence objective description of what is visible",
  "possibleConditions": [{ "name": "string", "note": "why it might fit (1 line)" }],
  "severity": "low|medium|high",
  "recommendation": "self-care|see-doctor-soon|urgent-care|emergency",
  "advice": "2-3 specific, practical next steps for the user right now",
  "redFlags": ["specific warning sign that means seek care immediately"],
  "completed": true
}
Rules: include 1-3 possibleConditions; keep it honest and cautious; if the image is unclear, say so in observation and set severity low with advice to retake/clarify or see a doctor.`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 900,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) {
      // Fall back to returning the raw text so the user still gets something useful.
      return res.status(200).json({ result: { observation: raw, possibleConditions: [], severity: 'low', advice: '', redFlags: [], recommendation: 'see-doctor-soon', completed: true } })
    }
    return res.status(200).json({ result: parsed })
  } catch (err: any) {
    console.error('Image diagnosis error:', err)
    return res.status(500).json({ message: `Analysis failed: ${err.message}. Please try again.` })
  }
}
