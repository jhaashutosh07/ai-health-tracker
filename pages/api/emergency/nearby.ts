import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const fmt = (km: number) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`

// Emergency "find nearby" (hospital / pharmacy / etc.) shown inside the SOS card.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { latitude, longitude, query } = req.body
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !query) {
    return res.status(400).json({ message: 'latitude, longitude and query required' })
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return res.status(503).json({ message: 'Maps not configured' })

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.internationalPhoneNumber,places.nationalPhoneNumber,places.currentOpeningHours.openNow,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 10, locationBias: { circle: { center: { latitude, longitude }, radius: 8000 } } }),
    })
    const data: any = await r.json().catch(() => ({}))
    if (!r.ok) return res.status(502).json({ message: data?.error?.message || 'Places error' })

    const places = (data.places || []).map((p: any) => {
      const lat = p.location?.latitude ?? 0, lng = p.location?.longitude ?? 0
      const km = haversineKm(latitude, longitude, lat, lng)
      return {
        id: p.id,
        name: p.displayName?.text || 'Unknown',
        address: p.shortFormattedAddress || p.formattedAddress || '',
        phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
        openNow: p.currentOpeningHours?.openNow ?? null,
        distance: km,
        distanceText: fmt(km),
        directions: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      }
    }).sort((a: any, b: any) => a.distance - b.distance).slice(0, 6)

    return res.status(200).json({ places })
  } catch (err: any) {
    console.error('Emergency nearby error:', err)
    return res.status(502).json({ message: 'Could not fetch nearby places.' })
  }
}
