import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'

// Generates a structured daily self-care plan for a chronic condition.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { condition, notes } = req.body
  if (!condition) return res.status(400).json({ message: 'condition required' })

  const prompt = `Create a practical daily self-management plan for a patient in India with: ${condition}.${notes ? ` Extra context: ${notes}.` : ''}
Respond ONLY with JSON:
{
  "title": "short program name",
  "summary": "1-2 sentence overview",
  "dailyTasks": [ { "task": "specific daily action", "why": "1-line reason" } ],
  "weeklyTargets": ["measurable weekly goal"],
  "warningSigns": ["symptom that means see a doctor urgently"],
  "diet": ["key diet do/don't"],
  "completed": true
}
Rules: 5-7 concrete dailyTasks a patient can actually check off (meds reminder, monitoring, activity, diet, hydration); Indian food/context; do not prescribe specific drug doses; this supplements, not replaces, their doctor's advice.`

  try {
    const response = await openai.chat.completions.create({ model: CHAT_MODEL, max_completion_tokens: 1100, messages: [{ role: 'user', content: prompt }] })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(500).json({ message: 'Could not build a plan. Please try again.' })
    return res.status(200).json({ plan: parsed })
  } catch (err) {
    console.error('Care plan error:', err)
    return res.status(500).json({ message: 'Could not build a plan right now.' })
  }
}
