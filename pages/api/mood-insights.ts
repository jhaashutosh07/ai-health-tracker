import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai } from '@/lib/claude'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { todayMood, notes, moodHistory } = req.body
  if (!todayMood) return res.status(400).json({ message: 'Mood score is required' })

  const moodLabel = ['', 'Very Low 😢', 'Low 😔', 'Neutral 😐', 'Good 🙂', 'Great 😄'][Number(todayMood)] || 'Unknown'
  const historyText = Array.isArray(moodHistory) && moodHistory.length > 0
    ? `Past week: ${moodHistory.map((m: any) => `${m.date}: ${m.score}/5`).join(', ')}`
    : 'No previous mood history'

  const prompt = `You are a compassionate mental health AI. Give warm, personalised insights based on this mood data.

Today's mood: ${todayMood}/5 (${moodLabel})
${notes ? `Journal entry: "${notes}"` : 'No journal entry today.'}
${historyText}

Return ONLY this JSON, no extra text:
{
  "summary": "2-3 empathetic sentences about their emotional state",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "selfCareRecommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "positiveAffirmation": "A warm personalised message for them",
  "professionalHelpAdvised": false,
  "professionalHelpReason": ""
}

If mood score is 1-2 for 3+ days in history, set professionalHelpAdvised to true.
Be genuine and specific — not generic. If they wrote a journal entry, respond to it directly.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.choices[0]?.message?.content || ''
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = codeBlock ? codeBlock[1] : text.match(/\{[\s\S]*\}/)?.[0]

    if (jsonStr) {
      return res.status(200).json(JSON.parse(jsonStr))
    }

    return res.status(200).json({
      summary: text,
      insights: [],
      selfCareRecommendations: [],
      positiveAffirmation: '',
      professionalHelpAdvised: false,
    })
  } catch (err: any) {
    console.error('Mood insights error:', err)
    return res.status(500).json({
      message: `AI service error: ${err.message}. Please try again.`,
    })
  }
}
