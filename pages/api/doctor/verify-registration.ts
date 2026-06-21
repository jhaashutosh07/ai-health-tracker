import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { verifyDoctorRegistration } from '@/lib/nmcVerify'
import { sendEmail, emailTemplates } from '@/lib/email'

// Self-service doctor verification.
//   GET  -> current verification status for the logged-in doctor
//   POST -> run an automated IMR check now, update status, and email the result
//
// This replaces the manual admin-approval step: a doctor signs up, lands on the
// verification page, and the registration number they entered is checked against
// the Indian Medical Register. They are emailed the outcome.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id || session.user.role !== 'DOCTOR') {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, phone: true, city: true, state: true,
      licenseNumber: true, medicalCouncil: true, registrationYear: true,
      doctorVerificationStatus: true, doctorVerificationCheckedAt: true,
    },
  })
  if (!user) return res.status(404).json({ message: 'Account not found' })

  if (req.method === 'GET') {
    return res.status(200).json({
      status: user.doctorVerificationStatus,
      checkedAt: user.doctorVerificationCheckedAt,
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  // Already verified — nothing to do.
  if (user.doctorVerificationStatus === 'VERIFIED') {
    return res.status(200).json({ status: 'VERIFIED' })
  }

  if (!user.licenseNumber) {
    return res.status(400).json({ status: user.doctorVerificationStatus, message: 'No registration number on file.' })
  }

  const appUrl = process.env.NEXTAUTH_URL || ''
  const supportEmail = process.env.EMAIL_FROM || 'support@healthai.app'
  const firstCheck = !user.doctorVerificationCheckedAt

  const result = await verifyDoctorRegistration({
    registrationNumber: user.licenseNumber,
    name: user.name,
    medicalCouncil: user.medicalCouncil,
    registrationYear: user.registrationYear,
  })

  if (result.outcome === 'MATCHED') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        doctorVerificationStatus: 'VERIFIED',
        doctorVerifiedAt: new Date(),
        doctorVerificationCheckedAt: new Date(),
      },
    })

    // Ensure a linked Doctor directory profile exists so doctor features work.
    const existing = await prisma.doctor.findUnique({ where: { email: user.email } })
    if (!existing) {
      await prisma.doctor.create({
        data: {
          name: user.name || result.matchedName || 'Doctor',
          email: user.email,
          phone: user.phone || 'N/A',
          specialization: 'General Physician',
          experience: 0,
          location: user.city || 'N/A',
          city: user.city,
          state: user.state,
          availableSlots: JSON.stringify([]),
        },
      })
    }

    if (user.name) {
      await sendEmail({ to: user.email, ...emailTemplates.doctorVerified(user.name, appUrl) })
    }
    return res.status(200).json({ status: 'VERIFIED' })
  }

  if (result.outcome === 'NOT_FOUND') {
    await prisma.user.update({
      where: { id: user.id },
      data: { doctorVerificationStatus: 'REJECTED', doctorVerificationCheckedAt: new Date() },
    })
    await sendEmail({ to: user.email, ...emailTemplates.doctorVerificationFailed(user.name || 'Doctor', supportEmail) })
    return res.status(200).json({ status: 'REJECTED', reason: 'no_match' })
  }

  // INCONCLUSIVE — keep pending and queue for manual review. Email once.
  await prisma.user.update({
    where: { id: user.id },
    data: { doctorVerificationCheckedAt: new Date() },
  })
  if (firstCheck && user.name) {
    await sendEmail({ to: user.email, ...emailTemplates.doctorUnderReview(user.name) })
  }
  return res.status(200).json({ status: 'PENDING', reason: 'inconclusive' })
}
