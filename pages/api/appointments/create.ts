import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email'
import { z } from 'zod'

const appointmentSchema = z.object({
  symptomLogId: z.string().nullish(),
  doctorId: z.string().optional(),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  type: z.enum(['ONLINE', 'OFFLINE']),
  reason: z.string(),
  notes: z.string().optional(),
})

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
    const body = appointmentSchema.parse(req.body)

    // Validate that doctorId exists if provided
    if (body.doctorId) {
      const doctorExists = await prisma.doctor.findUnique({
        where: { id: body.doctorId }
      })

      if (!doctorExists) {
        return res.status(400).json({ message: 'Invalid doctor ID. The selected doctor does not exist.' })
      }
    } else {
      return res.status(400).json({ message: 'Doctor ID is required to create an appointment.' })
    }

    // Validate symptomLogId if provided
    if (body.symptomLogId) {
      const symptomLogExists = await prisma.symptomLog.findUnique({
        where: { id: body.symptomLogId }
      })

      if (!symptomLogExists) {
        return res.status(400).json({ message: 'Invalid symptom log ID.' })
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: session.user.id,
        doctorId: body.doctorId,
        symptomLogId: body.symptomLogId || null,
        appointmentDate: new Date(body.appointmentDate),
        appointmentTime: body.appointmentTime,
        type: body.type,
        reason: body.reason,
        notes: body.notes || null,
        status: 'PENDING',
        emailSent: false,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        doctor: true,
        symptomLog: true,
      }
    })

    // Send confirmation email to patient
    if (appointment.patient.email) {
      const doctorName = appointment.doctor?.name || 'Your Doctor'
      const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const emailTemplate = emailTemplates.appointmentConfirmation(
        appointment.patient.name,
        doctorName,
        appointmentDate,
        appointment.appointmentTime,
        appointment.reason
      )

      const emailSent = await sendEmail({
        to: appointment.patient.email,
        ...emailTemplate
      })

      // Update appointment to mark email as sent
      if (emailSent) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { emailSent: true }
        })
      }
    }

    return res.status(201).json({ appointment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }

    console.error('Appointment creation error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
