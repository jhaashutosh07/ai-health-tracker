import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { validatePassword } from '@/lib/password'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Throttle to limit brute-forcing of reset tokens.
  if (!rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ message: 'Too many attempts. Please try again later.' })
  }

  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' })
    }

    const check = validatePassword(password)
    if (!check.valid) {
      return res.status(400).json({ message: check.message })
    }

    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date() // Token must not be expired
        }
      }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    // Hash new password
    const hashedPassword = await hash(password, 12)

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now login with your new password.'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
