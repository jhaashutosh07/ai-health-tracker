import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Ensures the user has an unguessable emergency-card token, creating one if needed.
async function ensureEmergencyToken(userId: string, existing: string | null): Promise<string> {
  if (existing) return existing
  const token = crypto.randomBytes(24).toString('hex')
  await prisma.user.update({ where: { id: userId }, data: { emergencyToken: token } })
  return token
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { token } = req.query

    // Public read by unguessable token — used by the printed/QR emergency card.
    if (token && typeof token === 'string') {
      const user = await prisma.user.findFirst({
        where: { emergencyToken: token },
        select: {
          name: true,
          bloodType: true,
          allergies: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
        },
      })

      if (!user) return res.status(404).json({ message: 'Card not found' })

      return res.status(200).json({
        name: user.name,
        bloodType: user.bloodType,
        allergies: user.allergies ? JSON.parse(user.allergies) : [],
        emergencyContactName: user.emergencyContactName,
        emergencyContactPhone: user.emergencyContactPhone,
      })
    }

    // Authenticated self read — used by the settings page to prefill the form
    // and to obtain this user's own share token.
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        bloodType: true,
        allergies: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyToken: true,
      },
    })
    if (!user) return res.status(404).json({ message: 'User not found' })

    const emergencyToken = await ensureEmergencyToken(session.user.id, user.emergencyToken)

    return res.status(200).json({
      name: user.name,
      bloodType: user.bloodType,
      allergies: user.allergies ? JSON.parse(user.allergies) : [],
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      emergencyToken,
    })
  }

  if (req.method === 'PUT') {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

    const { bloodType, allergies, emergencyContactName, emergencyContactPhone } = req.body

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emergencyToken: true },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bloodType: bloodType || null,
        allergies: allergies && allergies.length > 0 ? JSON.stringify(allergies) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      },
    })

    const emergencyToken = await ensureEmergencyToken(session.user.id, existing?.emergencyToken ?? null)

    return res.status(200).json({ message: 'Emergency info updated', emergencyToken })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
