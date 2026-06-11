import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Public read — used by the emergency card page
    const { userId } = req.query
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId is required' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bloodType: true,
        allergies: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    })

    if (!user) return res.status(404).json({ message: 'User not found' })

    return res.status(200).json({
      name: user.name,
      bloodType: user.bloodType,
      allergies: user.allergies ? JSON.parse(user.allergies) : [],
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
    })
  }

  if (req.method === 'PUT') {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

    const { bloodType, allergies, emergencyContactName, emergencyContactPhone } = req.body

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bloodType: bloodType || null,
        allergies: allergies && allergies.length > 0 ? JSON.stringify(allergies) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      },
    })

    return res.status(200).json({ message: 'Emergency info updated' })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
