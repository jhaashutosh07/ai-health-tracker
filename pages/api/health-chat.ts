import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { retrieveContext, buildReferenceBlock, buildSources } from '@/lib/rag/retrieve'

// "Ask HealthAI" — answers questions grounded in the user's own health records
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'messages array required' })
  }

  const userId = session.user.id
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [symptomLogs, vitals, medications, appointments, history] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { createdAt: true, symptoms: true, severity: true, aiDiagnosis: true, recommendation: true, followUpStatus: true },
    }),
    prisma.vitalReading.findMany({
      where: { userId, recordedAt: { gte: ninetyDaysAgo } },
      orderBy: { recordedAt: 'asc' },
      take: 60,
    }),
    prisma.medication.findMany({
      where: { userId, active: true },
      include: { doseLogs: { where: { date: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } } } },
    }),
    prisma.appointment.findMany({
      where: { patientId: userId },
      orderBy: { appointmentDate: 'desc' },
      take: 10,
      include: { doctor: { select: { name: true, specialization: true } }, prescription: true },
    }),
    prisma.medicalHistory.findMany({ where: { userId }, take: 10 }),
  ])

  const parse = (s: string) => { try { return JSON.parse(s) } catch { return s } }

  const context = {
    today: new Date().toISOString().split('T')[0],
    patientName: session.user.name || 'the patient',
    symptomChecks: symptomLogs.map(l => ({
      date: l.createdAt.toISOString().split('T')[0],
      symptoms: parse(l.symptoms),
      severity: l.severity,
      aiAssessment: l.aiDiagnosis,
      recommendation: l.recommendation,
      followUp: l.followUpStatus,
    })),
    vitals: vitals.map(v => ({
      date: v.recordedAt.toISOString().split('T')[0],
      type: v.type,
      reading: v.type === 'BP' ? `${v.systolic}/${v.diastolic} ${v.unit}` : `${v.value} ${v.unit}`,
      context: v.context || undefined,
    })),
    activeMedications: medications.map(m => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      last14dDoses: {
        taken: m.doseLogs.filter(d => d.status === 'TAKEN').length,
        missed: m.doseLogs.filter(d => d.status === 'MISSED').length,
        skipped: m.doseLogs.filter(d => d.status === 'SKIPPED').length,
      },
    })),
    appointments: appointments.map(a => ({
      date: a.appointmentDate.toISOString().split('T')[0],
      doctor: a.doctor ? `Dr. ${a.doctor.name} (${a.doctor.specialization})` : 'TBD',
      status: a.status,
      type: a.type,
      reason: a.reason,
      prescription: a.prescription ? parse(a.prescription.items) : undefined,
    })),
    medicalHistory: history.map(h => ({ condition: h.condition, diagnosis: h.diagnosis, medications: parse(h.medications) })),
  }

  const systemPrompt = `You are HealthAI, a personal health assistant with access to ${context.patientName}'s complete health records on this platform. Today is ${context.today}.

THE PATIENT'S DATA:
${JSON.stringify(context, null, 2)}

Your job:
- Answer questions about THEIR data specifically: when symptoms occurred, vital trends, medication adherence, appointment history, prescriptions
- Always cite actual dates and numbers from the data ("On May 28 you reported...", "Your adherence over the last 14 days is 86%")
- For "summarize my health for a doctor" requests, produce a clean, structured summary a clinician could read in 30 seconds
- If the data doesn't contain the answer, say so plainly — never invent records
- You may give general health information, but for new symptoms direct them to the Symptom Check feature, and for anything serious recommend seeing a doctor
- Never diagnose. Keep answers concise and warm. Use markdown formatting (bold, lists) where it improves readability.`

  // RAG: retrieve trusted medical references relevant to the latest question
  // and ground the answer in them with inline [n] citations.
  const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || ''
  let sources: ReturnType<typeof buildSources> = []
  let referenceBlock = ''
  try {
    const chunks = await retrieveContext(String(lastUserMessage))
    referenceBlock = buildReferenceBlock(chunks)
    sources = buildSources(chunks)
  } catch { /* retrieval is best-effort; answer without it on failure */ }

  const finalSystem = referenceBlock ? `${systemPrompt}\n\n${referenceBlock}` : systemPrompt

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 900,
      messages: [
        { role: 'system', content: finalSystem },
        ...messages.slice(-12).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content || '') })),
      ],
    })
    return res.status(200).json({ message: response.choices[0]?.message?.content || '', sources })
  } catch (err: any) {
    console.error('Health chat error:', err)
    return res.status(500).json({ message: 'AI is temporarily unavailable. Please try again.' })
  }
}
