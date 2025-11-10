import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { limit } = req.query
    const limitNum = limit ? parseInt(limit as string) : 10

    const symptomLogs = await prisma.symptomLog.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limitNum,
      select: {
        id: true,
        symptoms: true,
        severity: true,
        aiDiagnosis: true,
        recommendation: true,
        createdAt: true,
      },
    })

    // Parse symptoms from JSON strings
    const logs = symptomLogs.map((log) => {
      let symptomsArray: string[] = []
      try {
        symptomsArray = JSON.parse(log.symptoms)
      } catch (e) {
        symptomsArray = [log.symptoms]
      }

      return {
        id: log.id,
        symptoms: symptomsArray.join(', '),
        severity: log.severity,
        aiResponse: log.recommendation || '',
        createdAt: log.createdAt,
      }
    })

    return res.status(200).json({
      logs,
      count: logs.length,
    })
  } catch (error: any) {
    console.error('Error fetching symptom history:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
