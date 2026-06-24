import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/notifications'
import { whatsappConfigured, sendEmergencyWhatsApp } from '@/lib/whatsapp'
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
  const body = lines.join('\n')

  // Prefer WhatsApp (free, richer, reliable in India), fall back to SMS (Twilio).
  let channel = ''
  let result: { success: boolean; error?: string }
  if (whatsappConfigured()) {
    channel = 'WhatsApp'
    result = await sendEmergencyWhatsApp(
      user.emergencyContactPhone,
      body,
      // Template body params (only used if WHATSAPP_TEMPLATE_NAME is set).
      [name, hasLoc ? mapLink : 'location unavailable', cardLink || 'N/A'],
    )
  } else {
    channel = 'SMS'
    result = await sendSMS(user.emergencyContactPhone, body)
  }

  if (!result.success) {
    const notConfigured = result.error === 'SMS service not configured' || result.error === 'WhatsApp not configured'
    return res.status(502).json({
      message: notConfigured
        ? 'No messaging channel is configured on the server (WhatsApp or Twilio).'
        : `Could not send the alert via ${channel}: ${result.error}`,
    })
  }

  return res.status(200).json({
    message: `SOS sent to ${user.emergencyContactName || user.emergencyContactPhone} via ${channel}.`,
    sentTo: user.emergencyContactName || user.emergencyContactPhone,
    channel,
  })
}
