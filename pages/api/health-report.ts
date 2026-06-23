import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { openai, CHAT_MODEL } from '@/lib/openai'

// Builds a doctor-ready health summary from the patient's own records, with an
// AI-written narrative. The page renders this and lets the user print to PDF.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const userId = session.user.id
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [symptomLogs, vitals, medications, appointments, history] = await Promise.all([
    prisma.symptomLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { createdAt: true, symptoms: true, severity: true, aiDiagnosis: true, recommendation: true } }),
    prisma.vitalReading.findMany({ where: { userId, recordedAt: { gte: ninetyDaysAgo } }, orderBy: { recordedAt: 'desc' }, take: 40 }),
    prisma.medication.findMany({ where: { userId, active: true } }),
    prisma.appointment.findMany({ where: { patientId: userId }, orderBy: { appointmentDate: 'desc' }, take: 8,
      include: { doctor: { select: { name: true, specialization: true } } } }),
    prisma.medicalHistory.findMany({ where: { userId }, take: 10 }),
  ])

  const parse = (s: string) => { try { return JSON.parse(s) } catch { return s } }

  const data = {
    symptomChecks: symptomLogs.map(l => ({ date: l.createdAt.toISOString().split('T')[0], symptoms: parse(l.symptoms), severity: l.severity, assessment: l.aiDiagnosis, recommendation: l.recommendation })),
    vitals: vitals.map(v => ({ date: v.recordedAt.toISOString().split('T')[0], type: v.type, reading: v.type === 'BP' ? `${v.systolic}/${v.diastolic} ${v.unit}` : `${v.value} ${v.unit}`, context: v.context || undefined })),
    medications: medications.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency })),
    appointments: appointments.map(a => ({ date: a.appointmentDate.toISOString().split('T')[0], doctor: a.doctor ? `Dr. ${a.doctor.name} (${a.doctor.specialization})` : 'TBD', status: a.status, reason: a.reason })),
    conditions: history.map(h => ({ condition: h.condition, diagnosis: h.diagnosis, medications: parse(h.medications) })),
  }

  let summary = ''
  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 700,
      messages: [
        { role: 'system', content: `You write a concise clinical summary a doctor can read in 30 seconds, from a patient's app data. Use short markdown sections: **Overview**, **Recent symptoms & assessments**, **Vital trends**, **Current medications**, **Notable patterns / concerns**. Cite real dates and numbers from the data. Do not invent anything. If a section has no data, omit it. Neutral clinical tone.` },
        { role: 'user', content: `Patient: ${session.user.name || 'Patient'}. Today: ${new Date().toISOString().split('T')[0]}.\n\nData:\n${JSON.stringify(data, null, 2)}` },
      ],
    })
    summary = response.choices[0]?.message?.content?.trim() || ''
  } catch (err) {
    console.error('Health report AI error:', err)
  }

  return res.status(200).json({
    patientName: session.user.name || 'Patient',
    patientEmail: session.user.email || '',
    generatedOn: new Date().toISOString(),
    summary,
    data,
  })
}
