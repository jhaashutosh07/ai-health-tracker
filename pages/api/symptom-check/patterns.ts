import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const logs = await prisma.symptomLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  if (logs.length < 3) {
    return res.json({ insufficientData: true, count: logs.length, needed: 3 })
  }

  const summary = logs.map((log, i) => {
    let symptoms: string[] = []
    try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }
    const date = new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${i + 1}. [${date}] Severity: ${log.severity} | Symptoms: ${symptoms.join(', ')} | Diagnosis: ${log.aiDiagnosis || 'N/A'}`
  }).join('\n')

  const topSymptoms: Record<string, number> = {}
  logs.forEach(log => {
    let symptoms: string[] = []
    try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }
    symptoms.forEach(s => {
      const key = s.toLowerCase().trim()
      topSymptoms[key] = (topSymptoms[key] || 0) + 1
    })
  })
  const sortedSymptoms = Object.entries(topSymptoms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  let patterns: any[] = []
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You are a health pattern analyst. Analyze a patient's symptom history and identify meaningful patterns. Return ONLY a valid JSON array with 3-5 pattern objects. Each object must have:
- "title": short title (max 6 words)
- "description": 1-2 sentences with specific data from the records
- "type": one of "frequency" | "trigger" | "seasonal" | "trend" | "severity"
- "severity": one of "info" | "warning" | "alert"
- "icon": one of "repeat" | "calendar" | "trending-up" | "trending-down" | "alert" | "clock" | "sun"

Be specific and data-driven. Reference actual symptoms, dates, and frequencies. No generic advice.`,
        },
        {
          role: 'user',
          content: `Analyze these ${logs.length} symptom records and find patterns:\n\n${summary}`,
        },
      ],
    })

    const text = (response.choices[0]?.message?.content || '[]')
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    patterns = JSON.parse(text)
  } catch {
    patterns = []
  }

  return res.json({
    insufficientData: false,
    count: logs.length,
    patterns,
    topSymptoms: sortedSymptoms,
    recentLogs: logs.slice(0, 5).map(log => {
      let symptoms: string[] = []
      try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }
      return {
        id: log.id,
        date: log.createdAt,
        severity: log.severity,
        symptoms,
        diagnosis: log.aiDiagnosis,
      }
    }),
  })
}
