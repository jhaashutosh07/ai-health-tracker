import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const { id } = req.query
  if (typeof id !== 'string') return res.status(400).json({ message: 'Invalid id' })

  const medication = await prisma.medication.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!medication) return res.status(404).json({ message: 'Medication not found' })

  if (req.method === 'PATCH') {
    const { name, dosage, frequency, times, instructions, endDate, active } = req.body
    if (times && (!Array.isArray(times) || !times.every((t: string) => /^\d{2}:\d{2}$/.test(t)))) {
      return res.status(400).json({ message: 'times must be an array in HH:mm format' })
    }
    const updated = await prisma.medication.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(dosage !== undefined && { dosage: dosage.trim() }),
        ...(frequency !== undefined && { frequency: frequency.trim() }),
        ...(times !== undefined && { times: JSON.stringify(times) }),
        ...(instructions !== undefined && { instructions: instructions?.trim() || null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    })
    return res.status(200).json({ medication: updated })
  }

  if (req.method === 'DELETE') {
    await prisma.medication.delete({ where: { id } })
    return res.status(200).json({ message: 'Medication deleted' })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
