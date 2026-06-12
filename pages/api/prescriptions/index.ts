import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export interface PrescriptionItem {
  name: string
  dosage: string
  frequency: string // OD, BD, TDS, QID, SOS
  duration: string  // e.g. "5 days"
  instructions?: string
}

// Doctor creates/updates a structured digital prescription for an appointment
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user || session.user.role !== 'DOCTOR') {
    return res.status(403).json({ message: 'Access denied' })
  }

  const doctorRecord = await prisma.doctor.findUnique({
    where: { email: session.user.email! },
  })
  if (!doctorRecord) return res.status(404).json({ message: 'No doctor profile found for this account' })

  const { appointmentId, diagnosis, notes, items } = req.body
  if (!appointmentId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'appointmentId and at least one prescribed medicine are required' })
  }

  const cleanItems: PrescriptionItem[] = items
    .map((it: any) => ({
      name: String(it.name || '').trim(),
      dosage: String(it.dosage || '').trim(),
      frequency: String(it.frequency || 'OD').trim(),
      duration: String(it.duration || '').trim(),
      instructions: String(it.instructions || '').trim() || undefined,
    }))
    .filter(it => it.name)
  if (cleanItems.length === 0) {
    return res.status(400).json({ message: 'Each medicine needs at least a name' })
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId: doctorRecord.id },
  })
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' })

  const prescription = await prisma.prescription.upsert({
    where: { appointmentId },
    update: {
      diagnosis: diagnosis?.trim() || null,
      notes: notes?.trim() || null,
      items: JSON.stringify(cleanItems),
    },
    create: {
      appointmentId,
      diagnosis: diagnosis?.trim() || null,
      notes: notes?.trim() || null,
      items: JSON.stringify(cleanItems),
    },
  })

  if (pusherServer) {
    await pusherServer.trigger(`patient-${appointment.patientId}`, 'appointment-updated', {
      appointmentId: appointment.id,
      status: appointment.status,
      prescription: true,
    }).catch(() => {})
  }

  return res.status(200).json({ prescription })
}
