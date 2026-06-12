import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const { medicationId, date, time, status } = req.body
  if (!medicationId || !date || !time || !['TAKEN', 'MISSED', 'SKIPPED'].includes(status)) {
    return res.status(400).json({ message: 'medicationId, date, time and a valid status (TAKEN/MISSED/SKIPPED) are required' })
  }

  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, userId: session.user.id },
  })
  if (!medication) return res.status(404).json({ message: 'Medication not found' })

  const log = await prisma.medicationDoseLog.upsert({
    where: { medicationId_date_time: { medicationId, date, time } },
    update: { status, loggedAt: new Date() },
    create: { medicationId, date, time, status },
  })

  return res.status(200).json({ log })
}
