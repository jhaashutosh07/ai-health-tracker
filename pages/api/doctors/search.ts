import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

// Haversine formula to calculate distance between two points in km
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    const {
      id,
      specialization,
      city,
      name,
      minRating,
      sortBy = 'name',
      order = 'asc'
    } = req.query

    // If ID is provided, fetch single doctor
    if (id && typeof id === 'string') {
      const doctor = await prisma.doctor.findUnique({
        where: { id }
      })

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' })
      }

      return res.status(200).json({
        doctors: [doctor],
        count: 1
      })
    }

    // Build where clause
    const where: any = {
      isAvailable: true
    }

    if (specialization && specialization !== 'all') {
      where.specialization = specialization as string
    }

    if (city) {
      where.city = {
        contains: city as string,
        mode: 'insensitive'
      }
    }

    if (name) {
      where.name = {
        contains: name as string,
        mode: 'insensitive'
      }
    }

    if (minRating) {
      where.rating = {
        gte: parseFloat(minRating as string)
      }
    }

    // Build orderBy clause
    let orderBy: any = {}
    if (sortBy === 'rating') {
      orderBy = { rating: order }
    } else if (sortBy === 'experience') {
      orderBy = { experience: order }
    } else if (sortBy === 'fee') {
      orderBy = { consultationFee: order }
    } else {
      orderBy = { name: order }
    }

    let doctors = await prisma.doctor.findMany({
      where,
      orderBy
    })

    // If user is logged in and has location, sort by distance
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { latitude: true, longitude: true, city: true }
      })

      if (user && user.latitude !== null && user.longitude !== null) {
        // Calculate distance for each doctor
        const doctorsWithDistance = doctors.map(doctor => {
          if (doctor.latitude !== null && doctor.longitude !== null) {
            const distance = calculateDistance(
              user.latitude!,
              user.longitude!,
              doctor.latitude,
              doctor.longitude
            )
            return {
              ...doctor,
              distance: parseFloat(distance.toFixed(2)),
              distanceText: distance < 1
                ? `${(distance * 1000).toFixed(0)}m`
                : `${distance.toFixed(1)}km`
            }
          }
          return {
            ...doctor,
            distance: null,
            distanceText: null
          }
        })

        // Sort by distance first (doctors with location at top), then by original sort
        doctorsWithDistance.sort((a, b) => {
          // Prioritize doctors with location
          if (a.distance === null && b.distance !== null) return 1
          if (a.distance !== null && b.distance === null) return -1

          // Both have distance, sort by distance
          if (a.distance !== null && b.distance !== null) {
            return a.distance - b.distance
          }

          // Both don't have distance, prioritize same city
          if (user.city && a.city && b.city) {
            const aMatchesCity = a.city.toLowerCase() === user.city.toLowerCase()
            const bMatchesCity = b.city.toLowerCase() === user.city.toLowerCase()
            if (aMatchesCity && !bMatchesCity) return -1
            if (!aMatchesCity && bMatchesCity) return 1
          }

          // Keep original order
          return 0
        })

        return res.status(200).json({
          doctors: doctorsWithDistance,
          count: doctorsWithDistance.length,
          sortedByLocation: true,
          userLocation: {
            city: user.city,
            latitude: user.latitude,
            longitude: user.longitude
          }
        })
      }
    }

    return res.status(200).json({
      doctors,
      count: doctors.length,
      sortedByLocation: false
    })

  } catch (error) {
    console.error('Doctor search error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
