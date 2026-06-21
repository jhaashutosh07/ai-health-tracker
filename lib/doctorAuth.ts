import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export interface VerifiedDoctor {
  userId: string
  email: string
  doctorId: string
}

/**
 * Ensures the caller is a logged-in DOCTOR whose account has been verified
 * (doctorVerificationStatus === 'VERIFIED') and has a matching Doctor profile.
 * On failure it writes the appropriate HTTP response and returns null.
 */
export async function requireVerifiedDoctor(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<VerifiedDoctor | null> {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id || session.user.role !== 'DOCTOR') {
    res.status(401).json({ message: 'Unauthorized' })
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, doctorVerificationStatus: true },
  })

  if (!user) {
    res.status(401).json({ message: 'Unauthorized' })
    return null
  }

  if (user.doctorVerificationStatus !== 'VERIFIED') {
    res.status(403).json({
      message: 'Your doctor account is pending verification. You will get access once an administrator approves your medical credentials.',
    })
    return null
  }

  const doctor = await prisma.doctor.findUnique({
    where: { email: user.email },
    select: { id: true },
  })

  if (!doctor) {
    res.status(404).json({ message: 'No doctor profile is linked to this account. Please contact an administrator.' })
    return null
  }

  return { userId: session.user.id, email: user.email, doctorId: doctor.id }
}
