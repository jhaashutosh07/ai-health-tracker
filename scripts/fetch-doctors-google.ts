import axios from 'axios'
import * as fs from 'fs'

// Configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyCM7h1VyCzcnWnFgwD1Kc0WjaLHYWyPdFE'

// West Bengal major cities and areas - Expanded list
const WEST_BENGAL_LOCATIONS = [
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Howrah', lat: 22.5958, lng: 88.2636 },
  { name: 'Durgapur', lat: 23.5204, lng: 87.3119 },
  { name: 'Asansol', lat: 23.6739, lng: 86.9524 },
  { name: 'Siliguri', lat: 26.7271, lng: 88.3953 },
  { name: 'Bardhaman', lat: 23.2324, lng: 87.8615 },
  { name: 'Malda', lat: 25.0096, lng: 88.1405 },
  { name: 'Baharampur', lat: 24.1000, lng: 88.2500 },
  { name: 'Habra', lat: 22.8333, lng: 88.6333 },
  { name: 'Kharagpur', lat: 22.3460, lng: 87.2320 },
  { name: 'Barrackpore', lat: 22.7642, lng: 88.3776 },
  { name: 'Rajarhat', lat: 22.6211, lng: 88.4572 },
  { name: 'Salt Lake', lat: 22.5809, lng: 88.4201 },
  { name: 'New Town', lat: 22.5872, lng: 88.4756 },
  { name: 'Raiganj', lat: 25.6145, lng: 88.1231 },
  { name: 'Jalpaiguri', lat: 26.5167, lng: 88.7333 },
  { name: 'Midnapore', lat: 22.4234, lng: 87.3197 },
  { name: 'Hooghly', lat: 22.9069, lng: 88.3969 },
  { name: 'Serampore', lat: 22.7497, lng: 88.3416 },
  { name: 'Barasat', lat: 22.7236, lng: 88.4836 },
  { name: 'Krishnanagar', lat: 23.4060, lng: 88.5025 },
  { name: 'Raniganj', lat: 23.6110, lng: 87.1282 },
  { name: 'Haldia', lat: 22.0250, lng: 88.0583 },
  { name: 'Bankura', lat: 23.2500, lng: 87.0667 },
  { name: 'Purulia', lat: 23.3379, lng: 86.3638 },
]

// Medical specializations to search for - Expanded list
const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Pediatrician',
  'Orthopedic',
  'Dermatologist',
  'Gynecologist',
  'Neurologist',
  'ENT Specialist',
  'Ophthalmologist',
  'Dentist',
  'Urologist',
  'Gastroenterologist',
  'Pulmonologist',
  'Endocrinologist',
  'Rheumatologist',
  'Oncologist',
  'Psychiatrist',
  'Nephrologist',
  'Diabetologist',
  'Physiotherapist',
]

interface Doctor {
  name: string
  email: string
  phone: string
  specialization: string
  experience: number
  location: string
  address: string
  latitude: number
  longitude: number
  city: string
  state: string
  zipCode: string
  rating: number
  reviewCount: number
  consultationFee: number
}

async function searchDoctors(
  location: { name: string; lat: number; lng: number },
  specialization: string,
  radius: number = 5000
): Promise<any[]> {
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
    const params = {
      location: `${location.lat},${location.lng}`,
      radius: radius.toString(),
      keyword: `doctor ${specialization}`,
      key: GOOGLE_PLACES_API_KEY,
    }

    const response = await axios.get(url, { params })

    if (response.data.status === 'OK') {
      return response.data.results
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.log(`No results for ${specialization} in ${location.name}`)
      return []
    } else {
      console.error(`Error searching ${location.name}:`, response.data.status)
      return []
    }
  } catch (error) {
    console.error(`Error fetching data for ${location.name}:`, error)
    return []
  }
}

async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json'
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,geometry,rating,user_ratings_total,website',
      key: GOOGLE_PLACES_API_KEY,
    }

    const response = await axios.get(url, { params })

    if (response.data.status === 'OK') {
      return response.data.result
    } else {
      console.error(`Error getting place details:`, response.data.status)
      return null
    }
  } catch (error) {
    console.error(`Error fetching place details:`, error)
    return null
  }
}

function generateEmail(name: string, index: number): string {
  const cleanName = name
    .toLowerCase()
    .replace(/dr\.?\s*/gi, '')
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .join('.')

  return `${cleanName}${index}@healthcare.in`
}

function extractZipCode(address: string): string {
  const zipMatch = address.match(/\b\d{6}\b/)
  return zipMatch ? zipMatch[0] : '700001'
}

function estimateExperience(rating?: number, reviewCount?: number): number {
  // Estimate based on rating and reviews
  const baseExperience = 5
  const ratingBonus = rating ? Math.floor((rating - 3) * 5) : 0
  const reviewBonus = reviewCount ? Math.min(Math.floor(reviewCount / 50), 15) : 0
  return Math.max(5, Math.min(35, baseExperience + ratingBonus + reviewBonus))
}

function estimateConsultationFee(specialization: string, rating?: number): number {
  const baseFees: { [key: string]: number } = {
    'General Physician': 300,
    'Cardiologist': 800,
    'Pediatrician': 500,
    'Orthopedic': 700,
    'Dermatologist': 600,
    'Gynecologist': 700,
    'Neurologist': 900,
    'ENT Specialist': 500,
    'Ophthalmologist': 600,
    'Dentist': 400,
    'Urologist': 750,
    'Gastroenterologist': 850,
    'Pulmonologist': 800,
    'Endocrinologist': 800,
    'Rheumatologist': 750,
    'Oncologist': 1000,
    'Psychiatrist': 700,
    'Nephrologist': 850,
    'Diabetologist': 600,
    'Physiotherapist': 400,
  }

  let base = baseFees[specialization] || 500
  if (rating && rating >= 4.5) base *= 1.2
  else if (rating && rating >= 4.0) base *= 1.1

  return Math.round(base)
}

async function fetchAllDoctors(limit: number = 100, startIndex: number = 1): Promise<Doctor[]> {
  const allDoctors: Doctor[] = []
  const seenPlaceIds = new Set<string>() // Track unique doctors by place_id
  let doctorIndex = startIndex

  console.log('Starting to fetch doctors from Google Places API...\n')

  for (const location of WEST_BENGAL_LOCATIONS) {
    if (allDoctors.length >= limit) break

    for (const specialization of SPECIALIZATIONS) {
      if (allDoctors.length >= limit) break

      console.log(`Searching for ${specialization} in ${location.name}...`)

      const places = await searchDoctors(location, specialization, 10000) // Increased radius to 10km

      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))

      for (const place of places) {
        if (allDoctors.length >= limit) break

        // Skip if we've already added this doctor (same place_id)
        if (seenPlaceIds.has(place.place_id)) {
          console.log(`  - Skipped duplicate: ${place.name}`)
          continue
        }

        // Get detailed information
        const details = await getPlaceDetails(place.place_id)
        await new Promise(resolve => setTimeout(resolve, 500))

        if (!details) continue

        seenPlaceIds.add(place.place_id)

        const doctor: Doctor = {
          name: details.name.startsWith('Dr.') ? details.name : `Dr. ${details.name}`,
          email: generateEmail(details.name, doctorIndex++),
          phone: details.formatted_phone_number || `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          specialization: specialization,
          experience: estimateExperience(details.rating, details.user_ratings_total),
          location: `${location.name}, West Bengal`,
          address: details.formatted_address || `${location.name}, West Bengal`,
          latitude: details.geometry?.location?.lat || location.lat,
          longitude: details.geometry?.location?.lng || location.lng,
          city: location.name,
          state: 'West Bengal',
          zipCode: extractZipCode(details.formatted_address || ''),
          rating: details.rating ? Math.min(5, details.rating) : 4.0,
          reviewCount: details.user_ratings_total || 0,
          consultationFee: estimateConsultationFee(specialization, details.rating),
        }

        allDoctors.push(doctor)
        console.log(`  ✓ Added: ${doctor.name} (${doctor.specialization})`)
      }
    }
  }

  return allDoctors
}

function generateSeedFileContent(doctors: Doctor[]): string {
  const doctorObjects = doctors
    .map(
      (doc) => `    {
      name: '${doc.name}',
      email: '${doc.email}',
      phone: '${doc.phone}',
      specialization: '${doc.specialization}',
      experience: ${doc.experience},
      location: '${doc.location}',
      address: '${doc.address.replace(/'/g, "\\'")}',
      latitude: ${doc.latitude},
      longitude: ${doc.longitude},
      city: '${doc.city}',
      state: '${doc.state}',
      zipCode: '${doc.zipCode}',
      rating: ${doc.rating.toFixed(1)},
      reviewCount: ${doc.reviewCount},
      consultationFee: ${doc.consultationFee},
    }`
    )
    .join(',\n')

  return `  const doctors = [\n${doctorObjects}\n  ]`
}

async function main() {
  if (GOOGLE_PLACES_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Error: Please set your Google Places API key!')
    console.error('Set the GOOGLE_PLACES_API_KEY environment variable or update the script.')
    process.exit(1)
  }

  console.log('🔍 Fetching doctors from Google Places API...\n')

  // Load existing doctors if any
  let existingDoctors: Doctor[] = []
  let startIndex = 1

  try {
    const existingData = fs.readFileSync('doctors-google-data.json', 'utf-8')
    existingDoctors = JSON.parse(existingData)
    startIndex = existingDoctors.length + 1
    console.log(`📥 Found ${existingDoctors.length} existing doctors`)
    console.log(`🔄 Fetching ${600 - existingDoctors.length} more doctors to reach 600 total...\n`)
  } catch (error) {
    console.log('📭 No existing doctors found, starting fresh...\n')
  }

  const newDoctors = await fetchAllDoctors(600 - existingDoctors.length, startIndex)

  // Merge existing and new doctors
  const allDoctors = [...existingDoctors, ...newDoctors]

  console.log(`\n✅ Successfully fetched ${newDoctors.length} new doctors!`)
  console.log(`📊 Total doctors in database: ${allDoctors.length}`)

  // Save to JSON file for review
  const jsonOutput = JSON.stringify(allDoctors, null, 2)
  fs.writeFileSync('doctors-google-data.json', jsonOutput)
  console.log('📄 Saved raw data to doctors-google-data.json')

  // Generate seed file format
  const seedContent = generateSeedFileContent(allDoctors)
  fs.writeFileSync('doctors-seed-format.txt', seedContent)
  console.log('📄 Saved seed format to doctors-seed-format.txt')

  console.log('\n📋 Summary:')
  console.log(`   Total doctors: ${allDoctors.length}`)
  console.log(`   Average rating: ${(allDoctors.reduce((sum, d) => sum + d.rating, 0) / allDoctors.length).toFixed(2)}`)
  console.log(`   Cities covered: ${[...new Set(allDoctors.map(d => d.city))].join(', ')}`)
  console.log(`   Specializations: ${[...new Set(allDoctors.map(d => d.specialization))].join(', ')}`)

  console.log('\n💡 Next steps:')
  console.log('   1. Review the doctors-google-data.json file')
  console.log('   2. Run the update script to add doctors to seed.ts')
  console.log('   3. Run: npm run db:seed')
}

main().catch(console.error)
