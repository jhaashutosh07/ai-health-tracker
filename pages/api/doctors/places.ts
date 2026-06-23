import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// Real nearby doctors/clinics via the Google Places API (New) Text Search.
// Returns live name / address / rating / phone / open-now / distance. Google
// does NOT expose consultation fees, so that stays null (never fabricated).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { latitude, longitude, radius = '10', specialization = '' } = req.query
  if (!latitude || !longitude) return res.status(400).json({ message: 'latitude and longitude required' })

  // Prefer a dedicated server-side key (unrestricted / IP-restricted). Fall back
  // to the public Maps key, but note that referrer-restricted keys will be
  // REQUEST_DENIED on server-side calls — see the error surfaced below.
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return res.status(503).json({ message: 'Google Places API key not configured', fallback: true })
  }

  const lat = parseFloat(latitude as string)
  const lng = parseFloat(longitude as string)
  const radiusMeters = Math.min(parseFloat(radius as string) * 1000, 50000)
  const textQuery = specialization ? `${specialization} doctor` : 'doctor clinic hospital'

  let data: any
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.shortFormattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.internationalPhoneNumber',
          'places.nationalPhoneNumber',
          'places.currentOpeningHours.openNow',
          'places.primaryTypeDisplayName',
          'places.types',
          'places.websiteUri',
          'places.googleMapsUri',
          'places.businessStatus',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 20,
        // Bias strongly to the area; we additionally hard-filter by the exact
        // radius below (Text Search circle is a bias, not a strict limit).
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        },
      }),
    })

    data = await response.json().catch(() => ({}))

    if (!response.ok) {
      // Surface the real reason (e.g. API not enabled, key referrer-restricted,
      // billing not set up) so it can be fixed — and let the page fall back.
      const reason = data?.error?.message || `HTTP ${response.status}`
      return res.status(502).json({ message: `Google Places error: ${reason}`, status: data?.error?.status, fallback: true })
    }
  } catch (err: any) {
    return res.status(502).json({ message: `Google Places request failed: ${err?.message || 'network error'}`, fallback: true })
  }

  const radiusKm = radiusMeters / 1000
  const doctors = (data.places || [])
    .map((place: any) => {
      const placeLat = place.location?.latitude ?? 0
      const placeLng = place.location?.longitude ?? 0
      const km = haversineKm(lat, lng, placeLat, placeLng)
      const types: string[] = place.types || []
      const spec =
        place.primaryTypeDisplayName?.text ||
        (types.includes('hospital') ? 'Hospital' : types.includes('pharmacy') ? 'Pharmacy' : specialization || 'Doctor')

      return {
        id: place.id,
        name: place.displayName?.text || 'Unknown',
        specialization: spec,
        phone: place.internationalPhoneNumber || place.nationalPhoneNumber || '',
        experience: 0,
        location: place.shortFormattedAddress || place.formattedAddress || '',
        address: place.formattedAddress || place.shortFormattedAddress || '',
        city: (place.formattedAddress || '').split(',').slice(-2, -1)[0]?.trim() || '',
        latitude: placeLat,
        longitude: placeLng,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? 0,
        consultationFee: null, // Not available from Google — never fabricated.
        distance: km,
        distanceText: formatDist(km),
        isOpenNow: place.currentOpeningHours?.openNow ?? null,
        businessStatus: place.businessStatus ?? null,
        website: place.websiteUri ?? null,
        mapsUri: place.googleMapsUri ?? null,
        placeId: place.id,
        source: 'google',
      }
    })
    // Hard-enforce the selected radius (drop anything beyond it) and drop
    // permanently-closed places.
    .filter((d: any) => d.distance <= radiusKm && d.businessStatus !== 'CLOSED_PERMANENTLY')
    .sort((a: any, b: any) => a.distance - b.distance)

  return res.json({ doctors, total: doctors.length, source: 'google' })
}
