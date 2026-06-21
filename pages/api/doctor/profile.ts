import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireVerifiedDoctor } from '@/lib/doctorAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const verified = await requireVerifiedDoctor(req, res)
  if (!verified) return // response already sent

  const doctor = await prisma.doctor.findUnique({ where: { id: verified.doctorId } })
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' })

  if (req.method === 'GET') {
    return res.json({
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      consultationFee: doctor.consultationFee,
      isAvailable: doctor.isAvailable,
      rating: doctor.rating,
      reviewCount: doctor.reviewCount,
    })
  }

  if (req.method === 'PATCH') {
    const { isAvailable } = req.body
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable (boolean) required' })
    }
    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: { isAvailable },
    })
    return res.json({ isAvailable: updated.isAvailable })
  }

  return res.status(405).end()
}
