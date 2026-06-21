import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

// Admin-only endpoint to review and approve/reject doctor sign-ups.
// GET  -> list doctor accounts pending verification (with submitted credentials)
// POST -> { userId, action: 'VERIFY' | 'REJECT', specialization?, location?, experience?, consultationFee? }
//         On VERIFY a linked Doctor directory profile is created (if missing) so
//         the doctor can access patient features.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  if (req.method === 'GET') {
    const pending = await prisma.user.findMany({
      where: { role: 'DOCTOR', doctorVerificationStatus: 'PENDING' },
      select: {
        id: true, name: true, email: true, phone: true, city: true, state: true,
        licenseNumber: true, medicalCouncil: true, registrationYear: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return res.status(200).json({ pending })
  }

  if (req.method === 'POST') {
    const { userId, action, specialization, location, experience, consultationFee } = req.body
    if (!userId || (action !== 'VERIFY' && action !== 'REJECT')) {
      return res.status(400).json({ message: 'userId and a valid action (VERIFY | REJECT) are required' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'DOCTOR') {
      return res.status(404).json({ message: 'Doctor account not found' })
    }

    if (action === 'REJECT') {
      await prisma.user.update({
        where: { id: userId },
        data: { doctorVerificationStatus: 'REJECTED', doctorVerifiedAt: null },
      })
      return res.status(200).json({ message: 'Doctor account rejected' })
    }

    // VERIFY — mark the account verified and ensure a Doctor directory profile exists.
    await prisma.user.update({
      where: { id: userId },
      data: { doctorVerificationStatus: 'VERIFIED', doctorVerifiedAt: new Date() },
    })

    const existingDoctor = await prisma.doctor.findUnique({ where: { email: user.email } })
    if (!existingDoctor) {
      await prisma.doctor.create({
        data: {
          name: user.name || 'Doctor',
          email: user.email,
          phone: user.phone || 'N/A',
          specialization: specialization || 'General Physician',
          experience: typeof experience === 'number' ? experience : 0,
          location: location || user.city || 'N/A',
          city: user.city,
          state: user.state,
          availableSlots: JSON.stringify([]),
          consultationFee: typeof consultationFee === 'number' ? consultationFee : null,
        },
      })
    }

    return res.status(200).json({ message: 'Doctor account verified' })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
