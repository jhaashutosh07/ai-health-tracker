import { useState, useEffect, useMemo, FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  Search,
  Star,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  BadgeDollarSign,
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  Building2,
  Loader2,
  ArrowRight,
  Wifi,
} from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Doctor {
  id: string
  name: string
  specialization: string
  email: string
  phone: string
  experience: number
  location: string
  city: string | null
  latitude?: number | null
  longitude?: number | null
  rating: number | null
  reviewCount: number
  consultationFee: number | null
  distance?: number | null
  distanceText?: string | null
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  'ENT Specialist',
]

export default function NewAppointment() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { doctorId, symptomLogId } = router.query

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [specialization, setSpecialization] = useState('')
  const [searchName, setSearchName] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentType, setAppointmentType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  // Detect location (same as Find Doctors) so we can order by distance.
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    fetchDoctors()
  }, [specialization, searchName, sortBy])

  // Order like Find Doctors: your registered doctors first, then the rest
  // nearest-first by your location (falls back to the server order otherwise).
  const orderedDoctors = useMemo(() => {
    const list = doctors.map(d => {
      if (userLocation && d.latitude != null && d.longitude != null) {
        const km = haversineKm(userLocation.lat, userLocation.lng, d.latitude, d.longitude)
        return { ...d, distance: km, distanceText: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km` }
      }
      return d
    })
    return list.sort((a, b) => {
      const aReg = a.latitude == null && a.longitude == null ? 0 : 1
      const bReg = b.latitude == null && b.longitude == null ? 0 : 1
      if (aReg !== bReg) return aReg - bReg           // registered (no coords) first
      return (a.distance ?? Infinity) - (b.distance ?? Infinity) // then nearest first
    })
  }, [doctors, userLocation])

  useEffect(() => {
    if (doctorId && doctors.length > 0) {
      const doc = doctors.find(d => d.id === doctorId)
      if (doc) setSelectedDoctor(doc)
    }
  }, [doctorId, doctors])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(specialization && specialization !== 'All Specializations' && { specialization }),
        ...(searchName && { name: searchName }),
        sortBy,
        order: 'asc',
      })
      const res = await fetch(`/api/doctors/search?${params}`)
      const data = await res.json()
      if (res.ok) setDoctors(data.doctors || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor) { setError('Please select a doctor first.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          appointmentDate,
          appointmentTime,
          type: appointmentType,
          reason,
          notes: notes || undefined,
          symptomLogId: symptomLogId || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/appointments'), 2500)
      } else {
        setError(data.message || 'Failed to book appointment. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  if (status === 'loading') {
    return (
      <AppShell title="Book Appointment">
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Book Appointment"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Appointments', href: '/appointments' },
        { label: 'New' },
      ]}
    >
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Book an Appointment</h1>
            <p className="text-slate-500 text-sm mt-1">
              Search for a specialist and choose your preferred date and time.
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="card p-5 bg-emerald-50 border-emerald-200 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900">Appointment booked successfully!</p>
                <p className="text-sm text-emerald-700">Redirecting to your appointments…</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Doctor selection */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-4">Find a Doctor</h2>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchName}
                      onChange={e => setSearchName(e.target.value)}
                      placeholder="Search by name…"
                      className="input pl-9 text-sm"
                    />
                  </div>
                  <select
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    className="input text-sm"
                  >
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="rating">Sort: Rating</option>
                    <option value="experience">Sort: Experience</option>
                    <option value="fee">Sort: Fee</option>
                  </select>
                </div>

                {/* Doctor list */}
                <div className="space-y-3 max-h-[440px] overflow-y-auto scrollbar-thin pr-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Searching doctors…</span>
                    </div>
                  ) : orderedDoctors.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-500 text-sm">No doctors found. Try a different search.</p>
                    </div>
                  ) : (
                    orderedDoctors.map(doc => {
                      const isSelected = selectedDoctor?.id === doc.id
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedDoctor(doc)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50'
                              : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                              isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {doc.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="font-semibold text-slate-900">Dr. {doc.name}</p>
                                  <p className="text-xs text-slate-500">{doc.specialization}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {doc.distanceText && (
                                    <span className="badge bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                                      📍 {doc.distanceText}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="badge badge-confirmed gap-1 text-[10px]">
                                      <CheckCircle2 size={9} /> Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-slate-500">
                                {doc.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={11} /> {doc.city}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Briefcase size={11} /> {doc.experience} yrs exp
                                </span>
                                {doc.rating && (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <Star size={11} className="fill-amber-400 stroke-amber-400" />
                                    {doc.rating.toFixed(1)} ({doc.reviewCount})
                                  </span>
                                )}
                                {doc.consultationFee && (
                                  <span className="flex items-center gap-1">
                                    <BadgeDollarSign size={11} /> ₹{doc.consultationFee}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-slate-400">
                                <a
                                  href={`mailto:${doc.email}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-sky-600 transition-colors"
                                >
                                  <Mail size={11} /> {doc.email}
                                </a>
                                <a
                                  href={`tel:${doc.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-sky-600 transition-colors"
                                >
                                  <Phone size={11} /> {doc.phone}
                                </a>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Booking form */}
            <div className="lg:col-span-1">
              <div className="card p-5 sticky top-6">
                <h2 className="font-semibold text-slate-900 mb-4">Appointment Details</h2>

                {!selectedDoctor ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <ArrowRight size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">Select a doctor from the list to continue booking.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Selected doctor */}
                    <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-sky-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {selectedDoctor.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-sky-900 truncate">Dr. {selectedDoctor.name}</p>
                        <p className="text-xs text-sky-600">{selectedDoctor.specialization}</p>
                      </div>
                    </div>

                    {/* Type selector */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Consultation type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAppointmentType('ONLINE')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                            appointmentType === 'ONLINE'
                              ? 'border-sky-500 bg-sky-50 text-sky-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <Video size={16} />
                          Online
                          <span className="text-[10px] font-normal opacity-70">Video call</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppointmentType('OFFLINE')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                            appointmentType === 'OFFLINE'
                              ? 'border-slate-700 bg-slate-50 text-slate-800'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <Building2 size={16} />
                          In-Person
                          <span className="text-[10px] font-normal opacity-70">Clinic visit</span>
                        </button>
                      </div>
                      {appointmentType === 'ONLINE' && (
                        <p className="text-xs text-sky-600 mt-2 flex items-center gap-1">
                          <Wifi size={11} />
                          A video call link will be generated once confirmed.
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                      <div className="relative">
                        <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          min={today}
                          value={appointmentDate}
                          onChange={e => setAppointmentDate(e.target.value)}
                          required
                          className="input pl-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time</label>
                      <div className="relative">
                        <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="time"
                          value={appointmentTime}
                          onChange={e => setAppointmentTime(e.target.value)}
                          required
                          className="input pl-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason for visit</label>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                        rows={3}
                        placeholder="Briefly describe your symptoms or concern…"
                        className="input resize-none text-sm"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Additional notes <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Allergies, current medications, etc."
                        className="input resize-none text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || success}
                      className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <><Loader2 size={15} className="animate-spin" /> Booking…</>
                      ) : success ? (
                        <><CheckCircle2 size={15} /> Booked!</>
                      ) : (
                        <>Confirm Booking <ArrowRight size={15} /></>
                      )}
                    </button>

                    <Link href="/appointments" className="block text-center text-sm text-slate-500 hover:text-slate-700">
                      Cancel
                    </Link>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
