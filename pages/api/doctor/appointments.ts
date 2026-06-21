import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { requireVerifiedDoctor } from '@/lib/doctorAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const doctor = await requireVerifiedDoctor(req, res)
  if (!doctor) return // response already sent

  const doctorRecord = { id: doctor.doctorId }

  if (req.method === 'GET') {
    try {
      const appointments = await prisma.appointment.findMany({
        where: { doctorId: doctorRecord.id },
        include: {
          patient: {
            select: { id: true, name: true, email: true, phone: true },
          },
          symptomLog: true,
          prescription: true,
        },
        orderBy: { appointmentDate: 'desc' },
      })

      return res.status(200).json({ appointments })
    } catch (error) {
      console.error('Fetch doctor appointments error:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { appointmentId, status, notes } = req.body

      // Verify the appointment actually belongs to this doctor
      const existing = await prisma.appointment.findFirst({
        where: { id: appointmentId, doctorId: doctorRecord.id },
      })

      if (!existing) {
        return res.status(404).json({ message: 'Appointment not found' })
      }

      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status,
          ...(notes !== undefined && { notes }),
        },
        include: { patient: true, symptomLog: true },
      })

      // Real-time push to patient's channel
      if (pusherServer) {
        await pusherServer.trigger(`patient-${appointment.patientId}`, 'appointment-updated', {
          appointmentId: appointment.id,
          status: appointment.status,
          notes: appointment.notes,
        })
      }

      return res.status(200).json({ appointment })
    } catch (error) {
      console.error('Update appointment error:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
