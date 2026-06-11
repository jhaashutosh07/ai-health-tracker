import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { latitude, longitude, radius = '10', specialization = '' } = req.query
  if (!latitude || !longitude) return res.status(400).json({ message: 'latitude and longitude required' })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return res.status(503).json({ message: 'Google Places API key not configured', fallback: true })
  }

  const lat = parseFloat(latitude as string)
  const lng = parseFloat(longitude as string)
  const radiusMeters = Math.min(parseFloat(radius as string) * 1000, 50000)

  const keyword = specialization
    ? `doctor ${specialization}`
    : 'doctor clinic hospital'

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radiusMeters.toString())
  url.searchParams.set('type', 'doctor')
  url.searchParams.set('keyword', keyword)
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  if (!response.ok) {
    return res.status(502).json({ message: 'Google Places API error' })
  }

  const data = await response.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return res.status(502).json({ message: `Google Places: ${data.status}`, error_message: data.error_message })
  }

  const doctors = (data.results || []).map((place: any) => {
    const placeLat = place.geometry?.location?.lat ?? 0
    const placeLng = place.geometry?.location?.lng ?? 0
    const km = haversineKm(lat, lng, placeLat, placeLng)

    const isOpen = place.opening_hours?.open_now ?? null

    const spec = (place.types || []).includes('hospital')
      ? 'Hospital'
      : (place.types || []).includes('pharmacy')
      ? 'Pharmacy'
      : specialization || 'General Physician'

    return {
      id: place.place_id,
      name: place.name,
      specialization: spec,
      phone: '',
      experience: 0,
      location: place.vicinity || '',
      address: place.vicinity || '',
      city: (place.vicinity || '').split(',').pop()?.trim() || '',
      latitude: placeLat,
      longitude: placeLng,
      rating: place.rating ?? null,
      reviewCount: place.user_ratings_total ?? 0,
      consultationFee: null,
      distance: km,
      distanceText: formatDist(km),
      isOpenNow: isOpen,
      placeId: place.place_id,
      photoRef: place.photos?.[0]?.photo_reference || null,
      source: 'google',
    }
  }).sort((a: any, b: any) => a.distance - b.distance)

  return res.json({ doctors, total: doctors.length, source: 'google' })
}
