import { NextApiRequest, NextApiResponse } from 'next'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(['PATIENT', 'DOCTOR']).default('PATIENT'),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = registerSchema.parse(req.body)

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
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }

    console.error('Registration error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
