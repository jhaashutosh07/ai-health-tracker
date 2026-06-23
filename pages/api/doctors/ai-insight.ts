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

  const ratingCount = Number(reviewCount ?? 0)
  // Characterise reputation from the actual numbers so summaries differ per doctor.
  const reputation = rating == null
    ? 'no Google rating yet'
    : `${rating}/5 from ${ratingCount} ratings` +
      (rating >= 4.6 ? ' (excellent)' : rating >= 4.0 ? ' (good)' : rating >= 3.0 ? ' (mixed)' : ' (low)') +
      (ratingCount >= 1000 ? ', very high patient volume' : ratingCount >= 100 ? ', well-established' : ratingCount >= 20 ? ', moderately reviewed' : ', few ratings so far')

  const facts = [
    `Name: ${name}`,
    specialization ? `Specialty/type: ${specialization}` : '',
    `Reputation: ${reputation}`,
    city ? `Area: ${city}` : '',
    isOpenNow === true ? 'Currently open' : isOpenNow === false ? 'Currently closed' : '',
  ].filter(Boolean).join('\n')

  const system = `You write ONE short, specific, patient-facing sentence (max 30 words) that helps someone choose between doctors.
Make each summary DISTINCT — lead with what is specific to THIS provider:
- Name the specialty and the concrete conditions/care it generally covers (e.g. a cardiologist → heart/BP/chest-pain; a dermatologist → skin/hair/acne; a hospital → multi-department/emergency care). Vary this by the specialty given.
- Reflect the reputation EXACTLY as described (rating tier + how many patients rated). A 4.8-from-30 reads differently from a 4.1-from-9000 — say so.
- If patient reviews are provided, lead with their common themes instead.
Rules:
- Use ONLY the facts provided. Never invent credentials, experience, outcomes, or reviews.
- No generic filler like "this is a great doctor". Be concrete and differentiated.
- Plain language, one sentence.`

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
