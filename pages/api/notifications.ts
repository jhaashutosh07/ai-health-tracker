import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export interface NotificationItem {
  id: string
  type: 'followup' | 'appointment' | 'medication'
  title: string
  body: string
  href: string
  createdAt: string
}

// Aggregates notification-worthy events for the bell dropdown.
// Read state is tracked client-side via a lastSeen timestamp in localStorage.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })
  if (session.user.role === 'DOCTOR') return res.status(200).json({ notifications: [] })

  const userId = session.user.id
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const items: NotificationItem[] = []

  const [followUp, appointments, medications] = await Promise.all([
    prisma.symptomLog.findFirst({
      where: { userId, followUpStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.findMany({
      where: {
        patientId: userId,
        status: { in: ['CONFIRMED', 'CANCELLED', 'COMPLETED'] },
        updatedAt: { gte: sevenDaysAgo },
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.medication.findMany({
      where: { userId, active: true },
      include: { doseLogs: { where: { date: new Date().toISOString().split('T')[0] } } },
    }),
  ])

  if (followUp) {
    let symptoms: string[] = []
    try { symptoms = JSON.parse(followUp.symptoms) } catch { symptoms = [followUp.symptoms] }
    items.push({
      id: `followup-${followUp.id}`,
      type: 'followup',
      title: 'How are you feeling?',
      body: `Check-in on your ${followUp.severity} symptom check (${symptoms.slice(0, 2).join(', ')})`,
      href: '/dashboard',
      createdAt: (followUp.followUpSentAt || followUp.createdAt).toISOString(),
    })
  }

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmed', CANCELLED: 'cancelled', COMPLETED: 'completed',
  }
  for (const apt of appointments) {
    items.push({
      id: `apt-${apt.id}-${apt.status}`,
      type: 'appointment',
      title: `Appointment ${statusLabels[apt.status]}`,
      body: `${apt.doctor?.name || 'Your doctor'} — ${new Date(apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${apt.appointmentTime ? ` at ${apt.appointmentTime}` : ''}`,
      href: '/appointments',
      createdAt: apt.updatedAt.toISOString(),
    })
  }

  let dueCount = 0
  for (const med of medications) {
    let times: string[] = []
    try { times = JSON.parse(med.times) } catch { times = [] }
    dueCount += times.filter(t => !med.doseLogs.some(l => l.time === t)).length
  }
  if (dueCount > 0) {
    const startOfDay = new Date()
    startOfDay.setHours(8, 0, 0, 0)
    items.push({
      id: `meds-${startOfDay.toISOString().split('T')[0]}`,
      type: 'medication',
      title: 'Medication reminder',
      body: `${dueCount} dose${dueCount !== 1 ? 's' : ''} still scheduled for today`,
      href: '/medications',
      createdAt: startOfDay.toISOString(),
    })
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return res.status(200).json({ notifications: items.slice(0, 10) })
}
