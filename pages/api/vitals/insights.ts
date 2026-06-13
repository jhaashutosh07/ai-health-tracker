import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { openai, CHAT_MODEL } from '@/lib/openai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const readings = await prisma.vitalReading.findMany({
    where: { userId: session.user.id, recordedAt: { gte: since } },
    orderBy: { recordedAt: 'asc' },
  })

  if (readings.length < 3) {
    return res.status(200).json({
      insights: null,
      message: 'Log at least 3 readings to get AI insights on your trends.',
    })
  }

  const data = readings.map(r => ({
    date: r.recordedAt.toISOString().split('T')[0],
    type: r.type,
    reading: r.type === 'BP' ? `${r.systolic}/${r.diastolic} ${r.unit}` : `${r.value} ${r.unit}`,
    context: r.context || undefined,
  }))

  const prompt = `You are a clinical AI reviewing a patient's self-logged vital signs from the past 90 days.

Readings (chronological):
${JSON.stringify(data, null, 2)}

Analyze trends and return ONLY this JSON, no extra text:
{
  "overallStatus": "GOOD" | "WATCH" | "CONCERN",
  "summary": "2-3 sentences on the overall picture, written directly to the patient in plain language",
  "flags": [
    { "type": "BP|SUGAR|WEIGHT|SPO2|TEMPERATURE|PULSE", "severity": "INFO|WARNING|ALERT", "finding": "Specific pattern, e.g. 'Systolic BP has risen across your last 5 readings (128 → 142)'", "action": "What to do about it" }
  ],
  "tips": ["1-3 personalized, specific lifestyle tips based on the actual data"]
}

Rules:
- Reference actual numbers and dates from the data — no generic statements
- Use standard reference ranges (BP <120/80 normal, fasting sugar 70-100 mg/dL, post-meal <140, SpO2 ≥95%, temp 97-99°F, pulse 60-100)
- ALERT only for readings needing prompt medical attention (e.g. BP ≥180/120, fasting sugar ≥250, SpO2 <92)
- If everything is in range, say so positively with empty flags array`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.choices[0]?.message?.content || ''
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = codeBlock ? codeBlock[1] : text.match(/\{[\s\S]*\}/)?.[0]
    if (jsonStr) return res.status(200).json({ insights: JSON.parse(jsonStr) })
    return res.status(200).json({ insights: { overallStatus: 'WATCH', summary: text, flags: [], tips: [] } })
  } catch (err: any) {
    console.error('Vitals insights error:', err)
    return res.status(500).json({ message: 'AI analysis failed. Please try again.' })
  }
}
