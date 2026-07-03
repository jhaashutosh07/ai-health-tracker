import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Extracts structured biomarker values from a photo of a lab report so they can
// be tracked over time.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { image, mimeType } = req.body
  if (!image || !mimeType) return res.status(400).json({ message: 'image and mimeType required' })
  if (!ALLOWED.includes(mimeType)) return res.status(400).json({ message: 'Use a JPG, PNG or WEBP image.' })

  const prompt = `Extract lab test results from this report image. Respond ONLY with JSON:
{
  "reportDate": "YYYY-MM-DD or empty if not visible",
  "results": [ { "name": "test name (standardized, e.g. Hemoglobin, Fasting Glucose, HbA1c, Total Cholesterol, LDL, HDL, Triglycerides, TSH, Creatinine, Vitamin D)", "value": number, "unit": "string", "refLow": number|null, "refHigh": number|null, "flag": "low|normal|high|unknown" } ],
  "completed": true
}
Rules: only include tests with a clear numeric value; standardize common test names; parse the reference range into refLow/refHigh when shown; set flag by comparing value to the range. Ignore non-numeric/qualitative rows.`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 1500,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
        { type: 'text', text: prompt },
      ] }],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(500).json({ message: 'Could not read the report. Try a clearer photo.' })
    return res.status(200).json({ result: parsed })
  } catch (err: any) {
    console.error('Lab extract error:', err)
    return res.status(500).json({ message: `Extraction failed: ${err.message}` })
  }
}
