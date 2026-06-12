import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import nodemailer from 'nodemailer'

// Secured — only callable by Vercel Cron with the CRON_SECRET header
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  let sent = 0
  let skipped = 0

  try {
    const users = await prisma.user.findMany({
      where: { role: 'PATIENT' },
      select: { id: true, name: true, email: true },
    })

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    for (const user of users) {
      const [symptomLogs, appointments] = await Promise.all([
        prisma.symptomLog.findMany({
          where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.appointment.findMany({
          where: { patientId: user.id, createdAt: { gte: sevenDaysAgo } },
          include: { doctor: { select: { name: true, specialization: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      if (symptomLogs.length === 0 && appointments.length === 0) {
        skipped++
        continue
      }

      const summaryData = {
        symptomLogs: symptomLogs.map(s => ({
          date: s.createdAt.toISOString().split('T')[0],
          symptoms: JSON.parse(s.symptoms || '[]'),
          severity: s.severity,
          recommendation: s.recommendation,
        })),
        appointments: appointments.map(a => ({
          date: a.appointmentDate.toISOString().split('T')[0],
          doctor: a.doctor?.name || 'TBD',
          specialization: a.doctor?.specialization || '',
          status: a.status,
          type: a.type,
        })),
      }

      let digest = ''

      const prompt = `You are a health AI assistant. Generate a friendly weekly health digest for ${user.name || 'the patient'}.

Data from the past 7 days:
${JSON.stringify(summaryData, null, 2)}

Write a warm, concise digest (3-5 sentences) that:
1. Summarizes their symptom patterns (if any)
2. Notes appointments and their outcomes
3. Gives 1 personalized wellness tip based on their activity
4. Ends with an encouraging note

Keep it positive, supportive, and non-alarmist. Plain text only, no markdown.`

      try {
        const aiRes = await openai.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        })
        digest = aiRes.choices[0]?.message?.content || ''
      } catch {
        const symCount = symptomLogs.length
        const aptCount = appointments.length
        digest = `Hi ${user.name || 'there'}! Here's your weekly health summary. You logged ${symCount} symptom check${symCount !== 1 ? 's' : ''} and had ${aptCount} appointment${aptCount !== 1 ? 's' : ''} this week. Keep monitoring your health and stay hydrated. Have a great week ahead!`
      }

      const html = buildDigestEmail(user.name || 'Patient', digest, summaryData, user.id)

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email!,
          subject: `Your Weekly Health Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          html,
        })
        sent++
      } catch (emailErr) {
        console.error(`Failed to send digest to ${user.email}:`, emailErr)
        skipped++
      }
    }

    return res.status(200).json({ message: `Weekly digest sent to ${sent} users, ${skipped} skipped` })
  } catch (error: any) {
    console.error('Weekly digest cron error:', error)
    return res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

function buildDigestEmail(
  name: string,
  digest: string,
  data: { symptomLogs: any[]; appointments: any[] },
  userId: string
) {
  const cardUrl = `${process.env.NEXTAUTH_URL}/emergency/${userId}`
  const appUrl = process.env.NEXTAUTH_URL || 'https://your-app.vercel.app'

  const severityBadge = (s: string) => {
    const colors: Record<string, string> = {
      LOW: '#16a34a',
      MEDIUM: '#d97706',
      HIGH: '#ea580c',
      CRITICAL: '#dc2626',
    }
    return `<span style="background:${colors[s] || '#6b7280'};color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600">${s}</span>`
  }

  const symptomRows = data.symptomLogs
    .map(s => `<tr>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6">${s.date}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6">${(s.symptoms as string[]).join(', ') || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6">${severityBadge(s.severity)}</td>
    </tr>`)
    .join('')

  const aptRows = data.appointments
    .map(a => `<tr>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6">${a.date}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6">${a.doctor}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6">${a.status}</td>
    </tr>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">Your Weekly Health Digest</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>

    <div style="padding:32px">
      <p style="font-size:16px;color:#374151">Hi <strong>${name}</strong>,</p>
      <div style="background:#f5f3ff;border-left:4px solid #7c3aed;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
        <p style="margin:0;color:#374151;line-height:1.6">${digest}</p>
      </div>

      ${data.symptomLogs.length > 0 ? `
      <h3 style="color:#374151;margin:24px 0 12px">Symptom Checks This Week</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#f9fafb">
          <th style="padding:8px;text-align:left;color:#6b7280">Date</th>
          <th style="padding:8px;text-align:left;color:#6b7280">Symptoms</th>
          <th style="padding:8px;text-align:left;color:#6b7280">Severity</th>
        </tr></thead>
        <tbody>${symptomRows}</tbody>
      </table>` : ''}

      ${data.appointments.length > 0 ? `
      <h3 style="color:#374151;margin:24px 0 12px">Appointments This Week</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#f9fafb">
          <th style="padding:8px;text-align:left;color:#6b7280">Date</th>
          <th style="padding:8px;text-align:left;color:#6b7280">Doctor</th>
          <th style="padding:8px;text-align:left;color:#6b7280">Status</th>
        </tr></thead>
        <tbody>${aptRows}</tbody>
      </table>` : ''}

      <div style="margin-top:32px;padding:16px;background:#fef2f2;border-radius:12px;text-align:center">
        <p style="margin:0 0 8px;font-size:14px;color:#991b1b;font-weight:600">🆘 Emergency Medical Card</p>
        <p style="margin:0 0 12px;font-size:13px;color:#b91c1c">Share this link with family or save as QR code</p>
        <a href="${cardUrl}" style="background:#dc2626;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">View Emergency Card</a>
      </div>

      <div style="margin-top:24px;text-align:center">
        <a href="${appUrl}/dashboard" style="background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard</a>
      </div>
    </div>

    <div style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#9ca3af">
      <p style="margin:0">AI Health Tracker &mdash; Weekly Digest</p>
      <p style="margin:4px 0 0">This is an automated message. Do not reply.</p>
    </div>
  </div>
</body>
</html>`
}
