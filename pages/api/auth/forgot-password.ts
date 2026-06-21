import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import crypto from 'crypto'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Throttle reset requests to limit email-bombing and user enumeration timing.
  if (!rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ message: 'Too many requests. Please try again later.' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.status(200).json({
        message: 'If an account with that email exists, we sent you a password reset link.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save token to database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    // Send password reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    const emailTemplate = emailTemplates.passwordReset(user.name, resetUrl)
    await sendEmail({
      to: user.email,
      ...emailTemplate
    })

    console.log('Password Reset Email sent to:', user.email)
    console.log('Reset URL:', resetUrl)

    return res.status(200).json({
      message: 'If an account with that email exists, we sent you a password reset link.',
      // Include reset URL in development for testing
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
