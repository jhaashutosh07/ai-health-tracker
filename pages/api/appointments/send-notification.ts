import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendAppointmentConfirmationEmail, sendAppointmentSMS } from '@/lib/notifications'
import { format } from 'date-fns'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { appointmentId } = req.body

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
      }
    })

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    const emailData = {
      patientName: appointment.patient.name,
      patientEmail: appointment.patient.email,
      appointmentDate: format(new Date(appointment.appointmentDate), 'MMMM dd, yyyy'),
      appointmentTime: appointment.appointmentTime,
      type: appointment.type,
      reason: appointment.reason,
    }

    // Send email
    const emailResult = await sendAppointmentConfirmationEmail(emailData)

    // Send SMS if phone number exists
    let smsResult = { success: false }
    if (appointment.patient.phone) {
      smsResult = await sendAppointmentSMS(appointment.patient.phone, emailData)
    }

    // Update appointment notification status
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        emailSent: emailResult.success,
        smsSent: smsResult.success,
      }
    })

    return res.status(200).json({
      email: emailResult,
      sms: smsResult,
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
