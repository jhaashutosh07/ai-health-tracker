import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'
import { langValueNote } from '@/lib/i18n/translations'

// Runs a case through several specialist "personas" and synthesizes a consensus.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { caseText, lang } = req.body
  if (!caseText || typeof caseText !== 'string' || caseText.trim().length < 10) {
    return res.status(400).json({ message: 'Please describe the case in a bit more detail.' })
  }

  const prompt = `A patient case is described below. Convene a virtual multi-specialty panel. Pick the 3 MOST relevant specialties for this case (from: General Physician, Cardiologist, Neurologist, Dermatologist, Gastroenterologist, Pulmonologist, Endocrinologist, Orthopedic, ENT, Gynecologist, Psychiatrist, Nephrologist). Each gives a brief independent opinion; then synthesize a consensus.

Respond ONLY with JSON:
{
  "specialists": [
    { "specialty": "string", "opinion": "2-3 sentence perspective from this specialty", "likelyCauses": ["..."], "recommendation": "what this specialist advises" }
  ],
  "consensus": "3-4 sentence synthesized recommendation the panel agrees on",
  "urgency": "routine|see-soon|urgent|emergency",
  "disclaimer": "one short line",
  "completed": true
}
Rules: be specific to the case; do not invent test results; note when specialties disagree; recommend in-person evaluation where appropriate.

CASE:
${caseText.slice(0, 3000)}${langValueNote(lang)}`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(200).json({ result: { specialists: [], consensus: raw, urgency: 'see-soon', disclaimer: '' } })
    return res.status(200).json({ result: parsed })
  } catch (err: any) {
    console.error('Second opinion error:', err)
    return res.status(500).json({ message: 'Could not run the panel right now. Please try again.' })
  }
}
