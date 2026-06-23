import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { sendEmail, verifyEmailTransport } from '@/lib/email'

// Safe email diagnostic: sends a test message to the logged-in user's OWN
// address and reports the real outcome (or the exact SMTP error). You can only
// email yourself, so it's not abusable. GET /api/health/email-test
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ message: 'Sign in first' })

  const transport = await verifyEmailTransport()
  if (!transport.ok) {
    return res.status(200).json({
      ok: false,
      stage: 'verify',
      demoMode: transport.demoMode,
      error: transport.error,
      hint: transport.demoMode
        ? 'Set EMAIL_FROM and EMAIL_PASSWORD (a Gmail App Password) in Vercel.'
        : 'SMTP auth/connection failed — most often the Gmail App Password is wrong, revoked, or 2-Step Verification is off.',
    })
  }

  const sent = await sendEmail({
    to: session.user.email,
    subject: 'HealthAI email test ✅',
    html: '<p>Your HealthAI email delivery is working. This is a test message.</p>',
    text: 'Your HealthAI email delivery is working. This is a test message.',
  })

  return res.status(200).json({
    ok: sent,
    stage: 'send',
    to: session.user.email,
    message: sent ? 'Test email sent — check your inbox (and spam).' : 'Transport verified but send failed; check server logs.',
  })
}
