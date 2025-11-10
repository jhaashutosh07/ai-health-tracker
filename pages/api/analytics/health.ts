import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // Get all symptom logs for the user
    const symptomLogs = await prisma.symptomLog.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get all appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: session.user.id
      },
      include: {
        doctor: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate symptom frequency
    const symptomFrequency: { [key: string]: number } = {}
    symptomLogs.forEach(log => {
      try {
        const symptoms = JSON.parse(log.symptoms)
        symptoms.forEach((symptom: string) => {
          symptomFrequency[symptom] = (symptomFrequency[symptom] || 0) + 1
        })
      } catch (e) {
        // If parsing fails, treat as single symptom
        if (log.symptoms) {
          symptomFrequency[log.symptoms] = (symptomFrequency[log.symptoms] || 0) + 1
        }
      }
    })

    // Calculate severity distribution
    const severityDistribution: { [key: string]: number } = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    }
    symptomLogs.forEach(log => {
      if (log.severity) {
        severityDistribution[log.severity] = (severityDistribution[log.severity] || 0) + 1
      }
    })

    // Calculate symptoms over time (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    const symptomsOverTime: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const count = symptomLogs.filter(log => {
        const logDate = new Date(log.createdAt)
        return logDate.getMonth() === date.getMonth() &&
               logDate.getFullYear() === date.getFullYear()
      }).length

      symptomsOverTime.push({ month: monthName, count })
    }

    // Calculate appointment status distribution
    const appointmentStatus: { [key: string]: number } = {
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0
    }
    appointments.forEach(apt => {
      if (apt.status) {
        appointmentStatus[apt.status] = (appointmentStatus[apt.status] || 0) + 1
      }
    })

    // Calculate appointments over time (last 6 months)
    const appointmentsOverTime: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const count = appointments.filter(apt => {
        const aptDate = new Date(apt.createdAt)
        return aptDate.getMonth() === date.getMonth() &&
               aptDate.getFullYear() === date.getFullYear()
      }).length

      appointmentsOverTime.push({ month: monthName, count })
    }

    // Top symptoms (top 5)
    const topSymptoms = Object.entries(symptomFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }))

    // Recent activity
    const recentActivity = [
      ...symptomLogs.slice(0, 5).map(log => ({
        id: log.id,
        type: 'symptom_check',
        date: log.createdAt,
        description: log.description.substring(0, 100) + '...',
        severity: log.severity
      })),
      ...appointments.slice(0, 5).map(apt => ({
        id: apt.id,
        type: 'appointment',
        date: apt.createdAt,
        description: apt.reason,
        status: apt.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

    return res.status(200).json({
      summary: {
        totalSymptomChecks: symptomLogs.length,
        totalAppointments: appointments.length,
        pendingAppointments: appointmentStatus.PENDING || 0,
        completedAppointments: appointmentStatus.COMPLETED || 0
      },
      symptomFrequency: topSymptoms,
      severityDistribution: Object.entries(severityDistribution).map(([severity, count]) => ({
        severity,
        count
      })),
      symptomsOverTime,
      appointmentStatus: Object.entries(appointmentStatus).map(([status, count]) => ({
        status,
        count
      })),
      appointmentsOverTime,
      recentActivity
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
