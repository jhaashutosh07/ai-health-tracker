import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'

// Generates a short, patient-friendly AI summary of a doctor/clinic so a patient
// can quickly gauge what they offer. It is grounded ONLY in the real data passed
// in (specialty, Google rating, number of ratings, open status, and review text
// IF available). It must not invent credentials, outcomes, or quote reviews that
// weren't provided. Results are cached in-memory to avoid repeat LLM calls.
const cache = new Map<string, { insight: string; at: number }>()
const TTL = 24 * 60 * 60 * 1000 // 1 day

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { id, name, specialization, rating, reviewCount, city, isOpenNow, reviews } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name required' })

  const cacheKey = String(id || name)
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) {
    return res.status(200).json({ insight: hit.insight, cached: true })
  }

  // Real review text (only present if the data source provides it).
  const reviewBlock = Array.isArray(reviews) && reviews.length > 0
    ? `\nPatient reviews:\n${reviews.slice(0, 5).map((r: any, i: number) => `${i + 1}. (${r.rating ?? '?'}/5) ${r.text}`).join('\n')}`
    : ''

  const facts = [
    `Name: ${name}`,
    specialization ? `Specialty/type: ${specialization}` : '',
    rating != null ? `Google rating: ${rating}/5 from ${reviewCount ?? 0} ratings` : 'No rating available',
    city ? `Area: ${city}` : '',
    isOpenNow === true ? 'Currently open' : isOpenNow === false ? 'Currently closed' : '',
  ].filter(Boolean).join('\n')

  const system = `You write one short, neutral, patient-facing sentence (max 30 words) helping someone decide whether to visit a doctor or clinic.
Rules:
- Use ONLY the facts provided. If patient reviews are included, summarise their common themes honestly.
- If there are NO reviews, base it on the rating, number of ratings, and specialty only — and do not pretend to quote or summarise reviews.
- Never invent credentials, years of experience, clinical outcomes, or specific reviews.
- For a known specialty, you may briefly note the kinds of conditions it generally addresses.
- Plain language. No marketing fluff. No "highly recommended" unless the rating clearly supports it.`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 80,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${facts}${reviewBlock}` },
      ],
    })
    const insight = response.choices[0]?.message?.content?.trim() || ''
    if (insight) cache.set(cacheKey, { insight, at: Date.now() })
    return res.status(200).json({ insight })
  } catch (err) {
    console.error('AI insight error:', err)
    return res.status(500).json({ message: 'Could not generate insight' })
  }
}
