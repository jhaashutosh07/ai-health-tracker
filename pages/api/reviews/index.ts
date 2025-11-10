import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // POST - Create new review
    if (req.method === 'POST') {
      const { doctorId, rating, comment, professionalism, waitTime, bedsidemanner } = req.body

      if (!doctorId || !rating) {
        return res.status(400).json({ message: 'Doctor ID and rating are required' })
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' })
      }

      // Check if doctor exists
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId }
      })

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' })
      }

      // Check if user already reviewed this doctor
      const existingReview = await prisma.review.findFirst({
        where: {
          doctorId,
          userId: session.user.id
        }
      })

      if (existingReview) {
        return res.status(400).json({ message: 'You have already reviewed this doctor' })
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          doctorId,
          userId: session.user.id,
          rating: parseFloat(rating),
          comment,
          professionalism: professionalism ? parseFloat(professionalism) : null,
          waitTime: waitTime ? parseFloat(waitTime) : null,
          bedsidemanner: bedsidemanner ? parseFloat(bedsidemanner) : null
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      // Update doctor's average rating and review count
      const allReviews = await prisma.review.findMany({
        where: { doctorId }
      })

      const averageRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length

      await prisma.doctor.update({
        where: { id: doctorId },
        data: {
          rating: averageRating,
          reviewCount: allReviews.length
        }
      })

      return res.status(201).json({
        message: 'Review created successfully',
        review
      })
    }

    // GET - Get reviews by doctor ID
    if (req.method === 'GET') {
      const { doctorId } = req.query

      if (!doctorId || typeof doctorId !== 'string') {
        return res.status(400).json({ message: 'Doctor ID is required' })
      }

      const reviews = await prisma.review.findMany({
        where: { doctorId },
        include: {
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.status(200).json({ reviews })
    }

    return res.status(405).json({ message: 'Method not allowed' })

  } catch (error) {
    console.error('Review operation error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
