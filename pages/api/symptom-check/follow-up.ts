import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

const FOLLOW_UP_SEVERITIES = ['MEDIUM', 'HIGH', 'CRITICAL']
const ELIGIBLE_AFTER_MS = 24 * 60 * 60 * 1000 // surface 24h after the assessment
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000 // don't ask about week-old checks

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ message: 'Unauthorized' })

  if (req.method === 'GET') {
    const now = Date.now()

    // Already-pending check-in first (e.g. surfaced by the cron email)
    let log = await prisma.symptomLog.findFirst({
      where: {
        userId: session.user.id,
        followUpStatus: 'PENDING',
        createdAt: { gte: new Date(now - STALE_AFTER_MS) },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Otherwise surface an eligible assessment in-app even if the cron hasn't run
    if (!log) {
      log = await prisma.symptomLog.findFirst({
        where: {
          userId: session.user.id,
          followUpStatus: null,
          severity: { in: FOLLOW_UP_SEVERITIES },
          createdAt: {
            gte: new Date(now - STALE_AFTER_MS),
            lte: new Date(now - ELIGIBLE_AFTER_MS),
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (log) {
        log = await prisma.symptomLog.update({
          where: { id: log.id },
          data: { followUpStatus: 'PENDING', followUpSentAt: new Date() },
        })
      }
    }

    if (!log) return res.status(200).json({ followUp: null })

    let symptoms: string[] = []
    try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }

    return res.status(200).json({
      followUp: {
        symptomLogId: log.id,
        symptoms,
        severity: log.severity,
        recommendation: log.recommendation,
        checkedAt: log.createdAt,
      },
    })
  }

  if (req.method === 'POST') {
    const { symptomLogId, response } = req.body
    if (!symptomLogId || !['BETTER', 'SAME', 'WORSE'].includes(response)) {
      return res.status(400).json({ message: 'symptomLogId and a valid response (BETTER/SAME/WORSE) are required' })
    }

    const log = await prisma.symptomLog.findFirst({
      where: { id: symptomLogId, userId: session.user.id },
    })
    if (!log) return res.status(404).json({ message: 'Symptom log not found' })

    await prisma.symptomLog.update({
      where: { id: log.id },
      data: { followUpStatus: response, followUpRespondedAt: new Date() },
    })

    const escalate =
      response === 'WORSE' ||
      (response === 'SAME' && ['HIGH', 'CRITICAL'].includes(log.severity))

    const messages: Record<string, string> = {
      BETTER: "Great to hear you're feeling better! Keep following the self-care advice and stay hydrated.",
      SAME: escalate
        ? 'Since your symptoms were serious and have not improved, we strongly recommend seeing a doctor now.'
        : "Symptoms can take a few days to settle. Keep monitoring — if they persist beyond a week, see a doctor.",
      WORSE: 'Worsening symptoms need professional attention. Please book an appointment now — your previous assessment will be attached for the doctor.',
    }

    return res.status(200).json({ escalate, message: messages[response] })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
