import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user || session.user.role !== 'DOCTOR') {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { patientId } = req.body
  if (!patientId) return res.status(400).json({ message: 'patientId required' })

  const logs = await prisma.symptomLog.findMany({
    where: { userId: patientId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (logs.length === 0) {
    return res.json({ brief: 'No previous symptom history found for this patient via HealthAI.', hasHistory: false })
  }

  const summary = logs.map((log, i) => {
    let symptoms: string[] = []
    try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }
    const date = new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return `Visit ${i + 1} [${date}]: Severity ${log.severity} | Symptoms: ${symptoms.join(', ')} | AI Diagnosis: ${log.aiDiagnosis || 'N/A'} | Recommendation: ${log.recommendation || 'N/A'}`
  }).join('\n')

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    max_completion_tokens: 400,
    messages: [
      {
        role: 'system',
        content: `You are a clinical assistant generating a pre-consultation brief for a doctor. Be concise, clinical, and useful. Highlight: chief recurring complaints, severity trend, any concerning patterns, and suggested focus areas for this consultation. Keep it under 150 words. No bullet headers — write in short clinical paragraphs.`,
      },
      {
        role: 'user',
        content: `Generate a pre-consultation brief based on this patient's HealthAI symptom history:\n\n${summary}`,
      },
    ],
  })

  return res.json({
    brief: response.choices[0]?.message?.content || '',
    hasHistory: true,
    visitCount: logs.length,
  })
}
