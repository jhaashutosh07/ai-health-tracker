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
    const { category } = req.query

    const where: any = {
      userId: session.user.id
    }

    if (category && category !== 'ALL') {
      where.category = category as string
    }

    const documents = await prisma.medicalDocument.findMany({
      where,
      orderBy: {
        uploadedDate: 'desc'
      }
    })

    return res.status(200).json({
      documents,
      count: documents.length
    })

  } catch (error) {
    console.error('Fetch documents error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
