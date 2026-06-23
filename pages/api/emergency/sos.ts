import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/notifications'
import crypto from 'crypto'

// One-tap Emergency SOS: texts the user's emergency contact their live location
// + a link to their emergency medical card (blood type, allergies, contact).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  const { latitude, longitude } = req.body || {}

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, bloodType: true, allergies: true,
      emergencyContactName: true, emergencyContactPhone: true, emergencyToken: true,
    },
  })
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (!user.emergencyContactPhone) {
    return res.status(400).json({ message: 'No emergency contact set. Add one in Settings first.' })
  }

  // Ensure a card token exists so the SMS can link to the live emergency card.
  let token = user.emergencyToken
  if (!token) {
    token = crypto.randomBytes(24).toString('hex')
    await prisma.user.update({ where: { id: session.user.id }, data: { emergencyToken: token } })
  }

  const appUrl = process.env.NEXTAUTH_URL || ''
  const name = user.name || 'Someone'
  const allergies = user.allergies ? (JSON.parse(user.allergies) as string[]).join(', ') : ''
  const hasLoc = typeof latitude === 'number' && typeof longitude === 'number'
  const mapLink = hasLoc ? `https://maps.google.com/?q=${latitude},${longitude}` : ''
  const cardLink = appUrl ? `${appUrl}/emergency/${token}` : ''

  const lines = [
    `🚨 EMERGENCY ALERT from ${name}.`,
    `${name} may need urgent help.`,
    user.bloodType ? `Blood type: ${user.bloodType}.` : '',
    allergies ? `Allergies: ${allergies}.` : '',
    hasLoc ? `Live location: ${mapLink}` : 'Location unavailable.',
    cardLink ? `Medical card: ${cardLink}` : '',
  ].filter(Boolean)

  const result = await sendSMS(user.emergencyContactPhone, lines.join('\n'))

  if (!result.success) {
    return res.status(502).json({
      message: result.error === 'SMS service not configured'
        ? 'SMS service is not configured on the server (Twilio).'
        : `Could not send the alert: ${result.error}`,
    })
  }

  return res.status(200).json({
    message: `SOS sent to ${user.emergencyContactName || user.emergencyContactPhone}.`,
    sentTo: user.emergencyContactName || user.emergencyContactPhone,
  })
}
