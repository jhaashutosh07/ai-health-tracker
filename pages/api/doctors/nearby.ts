import { NextApiRequest, NextApiResponse } from 'next'
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
    const {
      latitude,
      longitude,
      radius = 10, // Default 10km radius
      specialization,
      limit = 50
    } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' })
    }

    const userLat = parseFloat(latitude as string)
    const userLon = parseFloat(longitude as string)
    const searchRadius = parseFloat(radius as string)
    const maxResults = parseInt(limit as string)

    // Get all doctors (with coordinates)
    const allDoctors = await prisma.doctor.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        isAvailable: true,
        ...(specialization && { specialization: specialization as string })
      }
    })

    // Calculate distance for each doctor and filter by radius
    const doctorsWithDistance = allDoctors
      .map(doctor => {
        if (doctor.latitude === null || doctor.longitude === null) {
          return null
        }

        const distance = calculateDistance(
          userLat,
          userLon,
          doctor.latitude,
          doctor.longitude
        )

        return {
          ...doctor,
          distance: parseFloat(distance.toFixed(2)), // Round to 2 decimal places
          distanceText: distance < 1
            ? `${(distance * 1000).toFixed(0)}m`
            : `${distance.toFixed(1)}km`
        }
      })
      .filter(doctor => doctor !== null && doctor.distance <= searchRadius)
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, maxResults)

    return res.status(200).json({
      doctors: doctorsWithDistance,
      count: doctorsWithDistance.length,
      searchRadius: searchRadius,
      userLocation: {
        latitude: userLat,
        longitude: userLon
      }
    })

  } catch (error) {
    console.error('Nearby doctors error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
