import { NextApiRequest, NextApiResponse } from 'next'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email'
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/password'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  name: z.string().min(2, 'Please enter your full name'),
  phone: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(['PATIENT', 'DOCTOR']).default('PATIENT'),
  // Doctor credentials — required for verification when registering as a doctor.
  licenseNumber: z.string().optional(),
  medicalCouncil: z.string().optional(),
  // Treat empty string as "not provided"; coerce any provided value to an int.
  registrationYear: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().optional()
  ),
}).superRefine((data, ctx) => {
  if (data.role === 'DOCTOR') {
    if (!data.licenseNumber || data.licenseNumber.trim().length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['licenseNumber'], message: 'Medical registration number is required for doctors' })
    }
    if (!data.medicalCouncil || data.medicalCouncil.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['medicalCouncil'], message: 'Issuing medical council is required for doctors' })
    }
    const year = data.registrationYear
    const currentYear = new Date().getFullYear()
    if (!year || year < 1950 || year > currentYear) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registrationYear'], message: 'A valid registration year is required for doctors' })
    }
  }
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ message: 'Too many sign-up attempts. Please try again later.' })
  }

  try {
    const body = registerSchema.parse(req.body)

    const pw = validatePassword(body.password)
    if (!pw.valid) {
      return res.status(400).json({ message: pw.message })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        phone: body.phone,
        city: body.city,
        role: body.role,
        // Doctors start unverified and cannot access patient data until an
        // administrator confirms their medical credentials.
        ...(body.role === 'DOCTOR' && {
          licenseNumber: body.licenseNumber,
          medicalCouncil: body.medicalCouncil,
          registrationYear: body.registrationYear,
          doctorVerificationStatus: 'PENDING',
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    // Send welcome email
    const emailTemplate = emailTemplates.welcome(user.name)
    await sendEmail({
      to: user.email,
      ...emailTemplate
    })

    return res.status(201).json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Surface the specific reason (e.g. "Please enter a valid email address")
      // instead of a generic "Invalid input" the user can't act on.
      const first = error.errors[0]
      return res.status(400).json({ message: first?.message || 'Invalid input', errors: error.errors })
    }

    console.error('Registration error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
