import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user || session.user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Access denied' })
  }

  if (req.method === 'GET') {
    try {
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId: session.user.id
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
          symptomLog: true,
        },
        orderBy: {
          appointmentDate: 'desc'
        }
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

      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status,
          notes,
          doctorId: session.user.id,
        },
        include: {
          patient: true,
          symptomLog: true,
        }
      })

      // Push real-time status update to the patient's channel
      if (pusherServer) {
        await pusherServer.trigger(
          `patient-${appointment.patientId}`,
          'appointment-updated',
          {
            appointmentId: appointment.id,
            status: appointment.status,
            notes: appointment.notes,
          }
        )
      }

      return res.status(200).json({ appointment })
    } catch (error) {
      console.error('Update appointment error:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
