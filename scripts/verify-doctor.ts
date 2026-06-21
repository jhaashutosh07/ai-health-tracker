/**
 * Manually verify a doctor account (demo / admin override), bypassing the NMC check.
 *
 * Usage:
 *   tsx scripts/verify-doctor.ts <email> ["Full Name"] [password]
 *
 * - If the user exists: promotes them to a VERIFIED doctor and ensures a linked
 *   Doctor directory profile exists.
 * - If the user does NOT exist and a password is given: creates a verified doctor
 *   account with that password.
 * - If the user does NOT exist and no password is given: prints instructions.
 */
import { prisma } from '../lib/prisma'
import { hash } from 'bcryptjs'

async function main() {
  const [, , emailArg, nameArg, passwordArg] = process.argv
  if (!emailArg) {
    console.error('Usage: tsx scripts/verify-doctor.ts <email> ["Full Name"] [password]')
    process.exit(1)
  }
  const email = emailArg.trim().toLowerCase()

  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    if (!passwordArg) {
      console.log(`No account found for ${email}.`)
      console.log('Either have them sign up first, then re-run this script, or pass a password:')
      console.log(`  tsx scripts/verify-doctor.ts ${email} "${nameArg || 'Full Name'}" <password>`)
      return
    }
    user = await prisma.user.create({
      data: {
        email,
        name: nameArg || 'Doctor',
        password: await hash(passwordArg, 12),
        role: 'DOCTOR',
        licenseNumber: 'DEMO-OVERRIDE',
        medicalCouncil: 'Demo (manual verification)',
        doctorVerificationStatus: 'VERIFIED',
        doctorVerifiedAt: new Date(),
        doctorVerificationCheckedAt: new Date(),
      },
    })
    console.log(`Created verified doctor account: ${email}`)
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'DOCTOR',
        ...(nameArg ? { name: nameArg } : {}),
        doctorVerificationStatus: 'VERIFIED',
        doctorVerifiedAt: new Date(),
        doctorVerificationCheckedAt: new Date(),
      },
    })
    console.log(`Verified existing account: ${email}`)
  }

  // Ensure the linked Doctor directory profile exists (required for doctor features).
  const doctor = await prisma.doctor.upsert({
    where: { email },
    update: {},
    create: {
      name: user.name || nameArg || 'Doctor',
      email,
      phone: user.phone || 'N/A',
      specialization: 'General Physician',
      experience: 0,
      location: user.city || 'N/A',
      city: user.city,
      state: user.state,
      availableSlots: JSON.stringify([]),
      isAvailable: true,
    },
  })

  console.log(`Doctor profile ready (id=${doctor.id}). Status: VERIFIED.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
