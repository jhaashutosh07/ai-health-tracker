import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

// Daily cron (Vercel) — two jobs in one to stay within cron limits:
// 1. Follow-up check-ins: email patients whose MEDIUM+ symptom check was 24-48h ago
// 2. Medication reminders: mark yesterday's unlogged doses as MISSED, email today's schedule
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  })

  const appUrl = process.env.NEXTAUTH_URL || 'https://your-app.vercel.app'
  const results = { followUpsSent: 0, missedDosesMarked: 0, medicationRemindersSent: 0, errors: 0 }

  // ---------- 1. Follow-up check-ins ----------
  try {
    const now = Date.now()
    const logs = await prisma.symptomLog.findMany({
      where: {
        severity: { in: ['MEDIUM', 'HIGH', 'CRITICAL'] },
        followUpStatus: null,
        createdAt: {
          gte: new Date(now - 48 * 60 * 60 * 1000),
          lte: new Date(now - 24 * 60 * 60 * 1000),
        },
      },
      include: { user: { select: { name: true, email: true } } },
    })

    for (const log of logs) {
      let symptoms: string[] = []
      try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: log.user.email!,
          subject: 'How are you feeling? — Health check-in',
          html: buildFollowUpEmail(log.user.name || 'there', symptoms, log.severity, appUrl),
        })
        await prisma.symptomLog.update({
          where: { id: log.id },
          data: { followUpStatus: 'PENDING', followUpSentAt: new Date() },
        })
        results.followUpsSent++
      } catch (err) {
        console.error(`Follow-up email failed for log ${log.id}:`, err)
        results.errors++
      }
    }
  } catch (err) {
    console.error('Follow-up check-in job error:', err)
    results.errors++
  }

  // ---------- 2. Medication reminders + missed-dose marking ----------
  try {
    const meds = await prisma.medication.findMany({
      where: { active: true },
      include: { user: { select: { id: true, name: true, email: true } }, doseLogs: true },
    })

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Mark yesterday's unlogged doses as MISSED
    for (const med of meds) {
      let times: string[] = []
      try { times = JSON.parse(med.times) } catch { times = [] }
      for (const time of times) {
        const logged = med.doseLogs.some(l => l.date === yesterday && l.time === time)
        if (!logged && new Date(med.startDate).toISOString().split('T')[0] <= yesterday) {
          await prisma.medicationDoseLog.create({
            data: { medicationId: med.id, date: yesterday, time, status: 'MISSED' },
          }).catch(() => {}) // unique constraint race — ignore
          results.missedDosesMarked++
        }
      }
    }

    // Group active meds by user and email today's schedule
    const byUser = new Map<string, { name: string; email: string; meds: typeof meds }>()
    for (const med of meds) {
      if (med.endDate && new Date(med.endDate) < new Date()) continue
      if (!med.user.email) continue
      const entry = byUser.get(med.user.id) || { name: med.user.name || 'there', email: med.user.email, meds: [] as typeof meds }
      entry.meds.push(med)
      byUser.set(med.user.id, entry)
    }

    const entries = Array.from(byUser.values())
    for (const { name, email, meds: userMeds } of entries) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: `💊 Today's medication schedule — ${userMeds.length} medicine${userMeds.length !== 1 ? 's' : ''}`,
          html: buildMedicationEmail(name, userMeds, appUrl),
        })
        results.medicationRemindersSent++
      } catch (err) {
        console.error(`Medication reminder failed for ${email}:`, err)
        results.errors++
      }
    }
  } catch (err) {
    console.error('Medication reminder job error:', err)
    results.errors++
  }

  return res.status(200).json(results)
}

function buildFollowUpEmail(name: string, symptoms: string[], severity: string, appUrl: string) {
  const severityColors: Record<string, string> = {
    MEDIUM: '#d97706', HIGH: '#ea580c', CRITICAL: '#dc2626',
  }
  const color = severityColors[severity] || '#6b7280'
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px">How are you feeling today?</h1>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#374151">Hi <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#4b5563;line-height:1.6">
        Yesterday you completed a symptom check
        (<span style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600">${severity}</span>)
        for: <strong>${symptoms.join(', ') || 'your symptoms'}</strong>.
      </p>
      <p style="font-size:14px;color:#4b5563;line-height:1.6">
        We'd like to check in — are you feeling <strong>better</strong>, the <strong>same</strong>, or <strong>worse</strong>?
        Tap below to respond. If things have gotten worse, we'll help you book a doctor right away.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${appUrl}/dashboard" style="background:#0ea5e9;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Respond to Check-in</a>
      </div>
      <p style="font-size:12px;color:#9ca3af">If you are experiencing a medical emergency, call 112 immediately.</p>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af">
      <p style="margin:0">HealthAI — Automated follow-up. Do not reply.</p>
    </div>
  </div>
</body>
</html>`
}

function buildMedicationEmail(name: string, meds: any[], appUrl: string) {
  const rows = meds.map(m => {
    let times: string[] = []
    try { times = JSON.parse(m.times) } catch { times = [] }
    return `<tr>
      <td style="padding:10px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827">${m.name}</td>
      <td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#4b5563">${m.dosage}</td>
      <td style="padding:10px;border-bottom:1px solid #f3f4f6;color:#4b5563">${times.join(', ') || m.frequency}</td>
    </tr>`
  }).join('')

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#8b5cf6,#6366f1);padding:28px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px">💊 Today's Medications</h1>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#374151">Hi <strong>${name}</strong>, here is your schedule for today:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
        <thead><tr style="background:#f9fafb">
          <th style="padding:10px;text-align:left;color:#6b7280">Medicine</th>
          <th style="padding:10px;text-align:left;color:#6b7280">Dosage</th>
          <th style="padding:10px;text-align:left;color:#6b7280">When</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:center;margin:24px 0 8px">
        <a href="${appUrl}/medications" style="background:#8b5cf6;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Mark Doses as Taken</a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af">
      <p style="margin:0">HealthAI — Medication reminder. Do not reply.</p>
    </div>
  </div>
</body>
</html>`
}
