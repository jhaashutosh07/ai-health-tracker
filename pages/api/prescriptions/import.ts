import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { FREQUENCY_TIMES, FREQUENCY_LABELS, parseDurationToEndDate } from '@/lib/prescriptions'

// Patient imports a doctor's prescription into their medication tracker
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const { prescriptionId } = req.body
  if (!prescriptionId) return res.status(400).json({ message: 'prescriptionId required' })

  const prescription = await prisma.prescription.findFirst({
    where: { id: prescriptionId, appointment: { patientId: session.user.id } },
    include: { appointment: { include: { doctor: { select: { name: true } } } } },
  })
  if (!prescription) return res.status(404).json({ message: 'Prescription not found' })
  if (prescription.importedAt) {
    return res.status(400).json({ message: 'This prescription is already in your medication tracker' })
  }

  let items: any[] = []
  try { items = JSON.parse(prescription.items) } catch { items = [] }
  if (items.length === 0) return res.status(400).json({ message: 'Prescription has no medicines' })

  const doctorName = prescription.appointment.doctor?.name
  const created = await prisma.$transaction([
    ...items.map((it: any) =>
      prisma.medication.create({
        data: {
          userId: session.user.id,
          name: it.name,
          dosage: it.dosage || '—',
          frequency: FREQUENCY_LABELS[it.frequency] || it.frequency || 'Once daily',
          times: JSON.stringify(FREQUENCY_TIMES[it.frequency] || FREQUENCY_TIMES.OD),
          instructions: [it.instructions, doctorName ? `Prescribed by Dr. ${doctorName}` : null]
            .filter(Boolean).join(' · ') || null,
          endDate: parseDurationToEndDate(it.duration),
        },
      })
    ),
    prisma.prescription.update({
      where: { id: prescription.id },
      data: { importedAt: new Date() },
    }),
  ])

  return res.status(200).json({
    message: `${items.length} medicine${items.length !== 1 ? 's' : ''} added to your tracker`,
    medications: created.slice(0, -1),
  })
}
