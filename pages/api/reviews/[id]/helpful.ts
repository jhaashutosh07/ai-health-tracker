import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Review ID is required' })
  }

  try {
    // Find the review
    const review = await prisma.review.findUnique({
      where: { id }
    })

    if (!review) {
      return res.status(404).json({ message: 'Review not found' })
    }

    // Increment helpful count
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        helpfulCount: {
          increment: 1
        }
      }
    })

    return res.status(200).json({
      message: 'Review marked as helpful',
      review: updatedReview
    })

  } catch (error) {
    console.error('Helpful vote error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
