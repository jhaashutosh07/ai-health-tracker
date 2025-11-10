import { useState, useEffect, FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
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
  city: string | null
  rating: number | null
  reviewCount: number
  consultationFee: number | null
  availableSlots: string
  distance?: number | null
  distanceText?: string | null
}

const SPECIALIZATIONS = [
  'All Specializations',
  'General Practitioner',
  'Cardiologist',
  'Dermatologist',
  'Neurologist',
  'Orthopedic',
  'Pediatrician',
  'Psychiatrist',
  'ENT Specialist'
]

const APPOINTMENT_TYPES = ['ONLINE', 'OFFLINE']

export default function NewAppointment() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { doctorId } = router.query

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [specialization, setSpecialization] = useState('')
  const [searchName, setSearchName] = useState('')
  const [sortBy, setSortBy] = useState('name')

  // Form data
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentType, setAppointmentType] = useState('OFFLINE')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchDoctors()
  }, [specialization, searchName, sortBy])

  useEffect(() => {
    if (doctorId && doctors.length > 0) {
      const doctor = doctors.find(d => d.id === doctorId)
      if (doctor) {
        setSelectedDoctor(doctor)
      }
    }
  }, [doctorId, doctors])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(specialization && specialization !== 'All Specializations' && { specialization }),
        ...(searchName && { name: searchName }),
        sortBy,
        order: 'asc'
      })

      const response = await fetch(`/api/doctors/search?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDoctors(data.doctors)
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor) {
      setError('Please select a doctor')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          appointmentDate,
          appointmentTime,
          type: appointmentType,
          reason,
          notes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.message || 'Failed to book appointment')
      }
    } catch (err) {
      setError('Failed to book appointment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="mt-2 text-gray-600">Select a doctor and choose your preferred time</p>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">Appointment booked successfully!</p>
            <p className="text-green-600 text-sm">Redirecting to dashboard...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Select a Doctor</h2>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by Name
                  </label>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Doctor name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="name">Name</option>
                    <option value="rating">Rating</option>
                    <option value="experience">Experience</option>
                    <option value="fee">Consultation Fee</option>
                  </select>
                </div>
              </div>

              {/* Doctors List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500 text-center py-8">Loading doctors...</p>
                ) : doctors.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No doctors found</p>
                ) : (
                  doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedDoctor?.id === doctor.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{doctor.name}</h3>
                            {doctor.distanceText && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                📍 {doctor.distanceText}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{doctor.specialization}</p>
                          <p className="text-sm text-gray-500 mt-1">{doctor.location}</p>

                          {/* Contact Details */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <a href={`mailto:${doctor.email}`} className="hover:text-blue-600 hover:underline">
                                {doctor.email}
                              </a>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            {doctor.rating && (
                              <span className="text-yellow-600">
                                ⭐ {doctor.rating.toFixed(1)} ({doctor.reviewCount})
                              </span>
                            )}
                            {doctor.consultationFee && (
                              <span className="text-gray-600">
                                Fee: ${doctor.consultationFee}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedDoctor?.id === doctor.id && (
                          <span className="text-blue-600 font-semibold">✓ Selected</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                <Link
                  href="/find-doctors"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  → Find doctors near you on map
                </Link>
              </div>
            </div>
          </div>

          {/* Appointment Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Appointment Details</h2>

              {selectedDoctor ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="font-semibold text-sm text-blue-900">{selectedDoctor.name}</p>
                    <p className="text-xs text-blue-700">{selectedDoctor.specialization}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Time *
                    </label>
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Type *
                    </label>
                    <select
                      value={appointmentType}
                      onChange={(e) => setAppointmentType(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {APPOINTMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Visit *
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      rows={3}
                      placeholder="Brief description of your symptoms or reason for visit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Any additional information..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 font-medium"
                  >
                    {submitting ? 'Booking...' : 'Book Appointment'}
                  </button>

                  <Link
                    href="/dashboard"
                    className="block text-center text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </Link>
                </form>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">
                  Please select a doctor from the list to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
