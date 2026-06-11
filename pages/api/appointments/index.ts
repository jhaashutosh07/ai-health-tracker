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
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: session.user.id
      },
      include: {
        symptomLog: true,
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true,
          }
        }
      },
      orderBy: {
        appointmentDate: 'desc'
      }
    })

    return res.status(200).json({ appointments })
  } catch (error) {
    console.error('Fetch appointments error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
