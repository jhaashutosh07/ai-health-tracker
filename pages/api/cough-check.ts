import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'
import { langValueNote } from '@/lib/i18n/translations'

// AI note for a cough/breathing check based on the described characteristics.
// (Guidance from described features — not acoustic analysis of the recording.)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { features, lang } = req.body
  if (!features) return res.status(400).json({ message: 'features required' })

  const prompt = `A patient reports these cough/breathing characteristics: ${JSON.stringify(features)}.
Give a brief, cautious assessment. Respond ONLY with JSON:
{
  "note": "2-3 sentence plain-language note on what this pattern may suggest",
  "possibleCauses": ["likely common causes"],
  "selfCare": ["practical self-care steps"],
  "redFlags": ["warning signs that mean see a doctor urgently"],
  "seeDoctor": "self-care|see-soon|urgent",
  "completed": true
}
Rules: base it ONLY on the described features; never claim to diagnose from audio; always flag breathlessness, chest pain, blue lips, coughing blood, or high fever as urgent. Indian context.${langValueNote(lang)}`

  try {
    const response = await openai.chat.completions.create({ model: CHAT_MODEL, max_completion_tokens: 700, messages: [{ role: 'user', content: prompt }] })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(500).json({ message: 'Could not analyze. Please try again.' })
    return res.status(200).json({ result: parsed })
  } catch (err) {
    console.error('Cough check error:', err)
    return res.status(500).json({ message: 'Could not analyze right now.' })
  }
}
