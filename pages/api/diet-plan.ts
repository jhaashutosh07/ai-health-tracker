import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'
import { langValueNote } from '@/lib/i18n/translations'

// Condition-aware Indian diet plan generator.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { goal, conditions, preference, lang } = req.body
  const prompt = `Create a 1-day Indian meal plan.
Goal: ${goal || 'general healthy eating'}. Health conditions: ${conditions || 'none'}. Diet preference: ${preference || 'vegetarian'}.
Respond ONLY with JSON:
{
  "title": "short plan name",
  "calories": "approx daily kcal range",
  "meals": [ { "meal": "Breakfast|Mid-morning|Lunch|Snack|Dinner", "items": ["dish + portion"], "note": "1-line tip" } ],
  "avoid": ["foods to limit for these conditions"],
  "tips": ["2-3 practical tips"],
  "completed": true
}
Rules: real, affordable Indian foods; respect the diet preference; tailor to the conditions (e.g. low-GI for diabetes, low-sodium for BP); no medical claims.${langValueNote(lang)}`

  try {
    const response = await openai.chat.completions.create({ model: CHAT_MODEL, max_completion_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(500).json({ message: 'Could not build a plan. Please try again.' })
    return res.status(200).json({ plan: parsed })
  } catch (err) {
    console.error('Diet plan error:', err)
    return res.status(500).json({ message: 'Could not build a plan right now.' })
  }
}
