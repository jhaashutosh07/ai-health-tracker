import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { AI_LANG_INSTRUCTION, LangCode } from '@/lib/i18n/translations'

// A short, friendly AI "daily briefing" from the user's recent health data.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const userId = session.user.id
  const [symptoms, vitals, meds, appts] = await Promise.all([
    prisma.symptomLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3, select: { symptoms: true, severity: true, createdAt: true } }),
    prisma.vitalReading.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' }, take: 5 }),
    prisma.medication.findMany({ where: { userId, active: true }, select: { name: true, dosage: true, times: true } }),
    prisma.appointment.findMany({ where: { patientId: userId, status: { in: ['PENDING', 'CONFIRMED'] } }, orderBy: { appointmentDate: 'asc' }, take: 2, include: { doctor: { select: { name: true, specialization: true } } } }),
  ])
  const parse = (s: string) => { try { return JSON.parse(s) } catch { return s } }

  const data = {
    name: session.user.name?.split(' ')[0] || 'there',
    today: new Date().toISOString().split('T')[0],
    recentSymptoms: symptoms.map(s => ({ date: s.createdAt.toISOString().split('T')[0], symptoms: parse(s.symptoms), severity: s.severity })),
    vitals: vitals.map(v => ({ type: v.type, reading: v.type === 'BP' ? `${v.systolic}/${v.diastolic}` : v.value, unit: v.unit, date: v.recordedAt.toISOString().split('T')[0] })),
    activeMedications: meds.map(m => ({ name: m.name, times: parse(m.times) })),
    upcomingAppointments: appts.map(a => ({ date: a.appointmentDate.toISOString().split('T')[0], doctor: a.doctor ? `Dr. ${a.doctor.name}` : 'TBD' })),
  }

  const lang = (req.query.lang as LangCode) || 'en'
  const langInstruction = AI_LANG_INSTRUCTION[lang] || ''

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 220,
      messages: [
        { role: 'system', content: `You are a warm personal health assistant. Write a SHORT daily briefing (2-3 sentences, max 55 words) for the user based on their data. Greet them by name, mention one relevant thing (an upcoming appointment, a medication reminder for today, a vital to watch, or an encouraging note if all is well), and end with a gentle tip. Natural, positive, specific. No markdown. If data is sparse, give a friendly general nudge.${langInstruction ? '\n' + langInstruction : ''}` },
        { role: 'user', content: JSON.stringify(data) },
      ],
    })
    return res.status(200).json({ briefing: response.choices[0]?.message?.content?.trim() || '' })
  } catch (err) {
    console.error('Daily briefing error:', err)
    return res.status(200).json({ briefing: '' })
  }
}
