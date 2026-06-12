import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  if (req.method === 'GET') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const medications = await prisma.medication.findMany({
      where: { userId: session.user.id, active: true },
      include: { doseLogs: { where: { date: { gte: sevenDaysAgo } } } },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json({ medications })
  }

  if (req.method === 'POST') {
    const { name, dosage, frequency, times, instructions, endDate } = req.body
    if (!name?.trim() || !dosage?.trim() || !Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ message: 'name, dosage and at least one scheduled time are required' })
    }
    if (!times.every((t: string) => /^\d{2}:\d{2}$/.test(t))) {
      return res.status(400).json({ message: 'times must be in HH:mm format' })
    }

    const medication = await prisma.medication.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency?.trim() || `${times.length}x daily`,
        times: JSON.stringify(times),
        instructions: instructions?.trim() || null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    return res.status(201).json({ medication })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
