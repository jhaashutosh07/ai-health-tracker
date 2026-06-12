import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export const VITAL_TYPES: Record<string, { unit: string; min: number; max: number }> = {
  BP:          { unit: 'mmHg',  min: 40,  max: 300 },
  SUGAR:       { unit: 'mg/dL', min: 20,  max: 800 },
  WEIGHT:      { unit: 'kg',    min: 1,   max: 400 },
  SPO2:        { unit: '%',     min: 50,  max: 100 },
  TEMPERATURE: { unit: '°F',    min: 90,  max: 110 },
  PULSE:       { unit: 'bpm',   min: 25,  max: 250 },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  if (req.method === 'GET') {
    const { type, days } = req.query
    const since = new Date(Date.now() - (Number(days) || 90) * 24 * 60 * 60 * 1000)
    const readings = await prisma.vitalReading.findMany({
      where: {
        userId: session.user.id,
        recordedAt: { gte: since },
        ...(typeof type === 'string' && VITAL_TYPES[type] ? { type } : {}),
      },
      orderBy: { recordedAt: 'asc' },
    })
    return res.status(200).json({ readings })
  }

  if (req.method === 'POST') {
    const { type, systolic, diastolic, value, context, notes, recordedAt } = req.body
    const spec = VITAL_TYPES[type]
    if (!spec) return res.status(400).json({ message: 'Invalid vital type' })

    if (type === 'BP') {
      const sys = Number(systolic)
      const dia = Number(diastolic)
      if (!sys || !dia || sys < spec.min || sys > spec.max || dia < spec.min || dia > spec.max || dia >= sys) {
        return res.status(400).json({ message: 'Enter a valid blood pressure (systolic must exceed diastolic)' })
      }
    } else {
      const v = Number(value)
      if (!v || v < spec.min || v > spec.max) {
        return res.status(400).json({ message: `Enter a valid ${type.toLowerCase()} reading (${spec.min}–${spec.max} ${spec.unit})` })
      }
    }

    const reading = await prisma.vitalReading.create({
      data: {
        userId: session.user.id,
        type,
        systolic: type === 'BP' ? Number(systolic) : null,
        diastolic: type === 'BP' ? Number(diastolic) : null,
        value: type === 'BP' ? null : Number(value),
        unit: spec.unit,
        context: context?.trim() || null,
        notes: notes?.trim() || null,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      },
    })
    return res.status(201).json({ reading })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ message: 'id required' })
    const reading = await prisma.vitalReading.findFirst({ where: { id, userId: session.user.id } })
    if (!reading) return res.status(404).json({ message: 'Reading not found' })
    await prisma.vitalReading.delete({ where: { id } })
    return res.status(200).json({ message: 'Deleted' })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
