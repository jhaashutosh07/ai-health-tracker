import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { anthropic } from '@/lib/claude'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { todayMood, notes, moodHistory } = req.body

  if (!todayMood) return res.status(400).json({ message: 'Mood score is required' })

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    return res.status(200).json({
      summary: 'Thank you for checking in with your mood today. Self-awareness is a powerful step toward wellbeing.',
      insights: [
        'Tracking your mood daily helps identify patterns over time.',
        'Small lifestyle changes — like regular sleep and exercise — significantly impact mood.',
        'Sharing how you feel, even with an app, is a healthy coping mechanism.',
      ],
      selfCareRecommendations: [
        'Take a short walk outside today.',
        'Try 5 minutes of deep breathing or meditation.',
        'Connect with someone you care about.',
      ],
      positiveAffirmation: 'Every day you show up for yourself is a win. You\'re doing better than you think.',
      professionalHelpAdvised: false,
      demoMode: true,
    })
  }

  const moodLabel = ['', 'Very Low', 'Low', 'Neutral', 'Good', 'Great'][todayMood] || 'Unknown'
  const historyText = moodHistory && moodHistory.length > 0
    ? `Past week: ${moodHistory.map((m: any) => `${m.date}: ${m.score}/5`).join(', ')}`
    : 'No previous mood history'

  const prompt = `You are a compassionate mental health AI assistant. Provide warm, personalized insights based on this person's mood data.

Today's mood: ${todayMood}/5 (${moodLabel})
${notes ? `Today's journal entry: "${notes}"` : 'No journal entry today.'}
${historyText}

Respond with empathy and warmth. Be specific to their situation, not generic. If the mood is low, be extra compassionate.

Respond ONLY with this JSON:
{
  "summary": "2-3 sentences acknowledging their current state with genuine empathy",
  "insights": ["Personalized insight 1", "Personalized insight 2", "Personalized insight 3"],
  "selfCareRecommendations": ["Specific actionable tip 1", "Specific actionable tip 2", "Specific actionable tip 3"],
  "positiveAffirmation": "A warm, genuine, uplifting message tailored to where they are emotionally",
  "professionalHelpAdvised": false,
  "professionalHelpReason": ""
}

If mood is 1-2 for multiple days, set professionalHelpAdvised to true and explain why briefly.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return res.status(200).json(JSON.parse(jsonMatch[0]))
    }

    return res.status(200).json({ summary: text, insights: [], selfCareRecommendations: [], positiveAffirmation: '', professionalHelpAdvised: false })
  } catch (error: any) {
    console.error('Mood insights error:', error)
    return res.status(500).json({ message: 'Failed to generate insights. Please try again.' })
  }
}
