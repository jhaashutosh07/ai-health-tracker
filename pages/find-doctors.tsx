import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import Link from 'next/link'

interface Doctor {
  id: string
  name: string
  specialization: string
  email: string
  phone: string
  experience: number
  location: string
  address: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  rating: number | null
  reviewCount: number
  consultationFee: number | null
  distance: number
  distanceText: string
}

const SPECIALIZATIONS = [
  'General Practitioner',
  'Cardiologist',
  'Dermatologist',
  'Neurologist',
  'Orthopedic',
  'Pediatrician',
  'Psychiatrist',
  'ENT Specialist'
]

export default function FindDoctors() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [radius, setRadius] = useState(10)
  const [specialization, setSpecialization] = useState('')
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }) // Default: New York

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(location)
          setMapCenter(location)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Please enable location services to find nearby doctors')
        }
      )
    }
  }, [])

  // Fetch nearby doctors when location or filters change
  useEffect(() => {
    if (userLocation) {
      fetchNearbyDoctors()
    }
  }, [userLocation, radius, specialization])

  const fetchNearbyDoctors = async () => {
    if (!userLocation) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        latitude: userLocation.lat.toString(),
        longitude: userLocation.lng.toString(),
        radius: radius.toString(),
        ...(specialization && { specialization })
      })

      const response = await fetch(`/api/doctors/nearby?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDoctors(data.doctors)
      } else {
        console.error('Failed to fetch doctors')
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Find Nearby Doctors</h1>
          <p className="mt-2 text-gray-600">Discover healthcare professionals near you</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius (km)
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">{radius} km</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Specializations</option>
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchNearbyDoctors}
                disabled={loading || !userLocation}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {!userLocation && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Detecting your location... Please allow location access to find nearby doctors.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Map View</h2>
            <div className="h-96 rounded-lg overflow-hidden">
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'your-google-maps-api-key-here' ? (
                <div className="h-full flex items-center justify-center bg-gray-100 text-gray-500">
                  <div className="text-center p-6">
                    <p className="font-semibold mb-2">Google Maps API Key Required</p>
                    <p className="text-sm">Please add your Google Maps API key to .env file</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 inline-block">
                      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
                    </code>
                  </div>
                </div>
              ) : (
                <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={12}
                  >
                    {/* User location marker */}
                    {userLocation && (
                      <Marker
                        position={userLocation}
                        icon={{
                          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                        }}
                        title="Your Location"
                      />
                    )}

                    {/* Doctor markers */}
                    {doctors.map((doctor) => (
                      doctor.latitude && doctor.longitude && (
                        <Marker
                          key={doctor.id}
                          position={{ lat: doctor.latitude, lng: doctor.longitude }}
                          title={doctor.name}
                          onClick={() => setSelectedDoctor(doctor)}
                          icon={{
                            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                          }}
                        />
                      )
                    ))}

                    {/* Info window for selected doctor */}
                    {selectedDoctor && selectedDoctor.latitude && selectedDoctor.longitude && (
                      <InfoWindow
                        position={{ lat: selectedDoctor.latitude, lng: selectedDoctor.longitude }}
                        onCloseClick={() => setSelectedDoctor(null)}
                      >
                        <div className="p-2 max-w-xs">
                          <h3 className="font-semibold">{selectedDoctor.name}</h3>
                          <p className="text-sm text-gray-600">{selectedDoctor.specialization}</p>
                          <p className="text-sm text-gray-600">{selectedDoctor.distanceText} away</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {selectedDoctor.phone}
                            </p>
                            <p className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {selectedDoctor.email}
                            </p>
                          </div>
                          <Link
                            href={`/appointments/new?doctorId=${selectedDoctor.id}`}
                            className="inline-block mt-2 text-blue-600 text-sm hover:underline font-medium"
                          >
                            Book Appointment →
                          </Link>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </LoadScript>
              )}
            </div>
          </div>

          {/* Doctors List */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Nearby Doctors ({doctors.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading doctors...</p>
              ) : doctors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No doctors found in your area. Try increasing the search radius.
                </p>
              ) : (
                doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedDoctor(doctor)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{doctor.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        <p className="text-sm text-gray-500 mt-1">{doctor.location}</p>
                        {doctor.address && (
                          <p className="text-xs text-gray-500">{doctor.address}</p>
                        )}

                        {/* Contact Details */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${doctor.email}`} className="hover:text-blue-600 hover:underline truncate">
                              {doctor.email}
                            </a>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <a href={`tel:${doctor.phone}`} className="hover:text-blue-600 hover:underline">
                              {doctor.phone}
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center mt-2 space-x-4 text-sm">
                          <span className="text-gray-600">
                            {doctor.experience} years exp
                          </span>
                          <span className="text-blue-600 font-semibold">
                            {doctor.distanceText} away
                          </span>
                          {doctor.rating && (
                            <span className="text-yellow-600">
                              ⭐ {doctor.rating.toFixed(1)} ({doctor.reviewCount})
                            </span>
                          )}
                        </div>
                        {doctor.consultationFee && (
                          <p className="text-sm text-gray-600 mt-1">
                            Fee: ${doctor.consultationFee}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Link
                        href={`/appointments/new?doctorId=${doctor.id}`}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 text-sm"
                      >
                        Book Appointment
                      </Link>
                      <a
                        href={`tel:${doctor.phone}`}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 text-sm"
                        title="Call doctor"
                      >
                        Call
                      </a>
                      <a
                        href={`mailto:${doctor.email}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                        title="Email doctor"
                      >
                        Email
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
