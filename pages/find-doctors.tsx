import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  MapPin, Phone, Star, Clock, Search, SlidersHorizontal,
  Calendar, Stethoscope, Navigation, Loader2, ExternalLink,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Doctor {
  id: string
  name: string
  specialization: string
  phone: string
  experience: number
  location: string
  address: string | null
  city: string | null
  latitude?: number | null
  longitude?: number | null
  rating: number | null
  reviewCount: number
  consultationFee: number | null
  distance?: number | null
  distanceText?: string | null
  website?: string | null
  isOpenNow?: boolean | null
  source?: string
  placeId?: string
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const SPECIALIZATIONS = [
  'General Practitioner',
  'Cardiologist',
  'Dermatologist',
  'Neurologist',
  'Orthopedic',
  'Pediatrician',
  'Psychiatrist',
  'ENT Specialist',
  'Gynecologist',
  'Ophthalmologist',
  'General Physician',
]

const severityColor = (rating: number | null) => {
  if (!rating) return 'text-slate-400'
  if (rating >= 4.5) return 'text-emerald-600'
  if (rating >= 3.5) return 'text-amber-500'
  return 'text-red-500'
}

export default function FindDoctors() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [radius, setRadius] = useState(10)
  const [specialization, setSpecialization] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [dataSource, setDataSource] = useState<'google' | 'platform' | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => { detectLocation() }, [detectLocation])

  // Fetch on mount and whenever filters/location change. We always show the
  // platform's own registered doctors (they're the ones bookable in-app), even
  // before the browser grants geolocation.
  useEffect(() => {
    fetchDoctors()
  }, [userLocation, radius, specialization])

  const fetchDoctors = async () => {
    setLoading(true)
    setLiveError(null)
    try {
      // 1) Platform's own registered + curated doctors (always shown, bookable
      //    in-app, no coordinates required).
      const platformParams = new URLSearchParams()
      if (specialization) platformParams.set('specialization', specialization)
      const platformRes = await fetch(`/api/doctors/search?${platformParams.toString()}`)
      let platform: Doctor[] = platformRes.ok ? ((await platformRes.json()).doctors || []) : []

      // When a location + radius is set, keep only platform doctors that are
      // within the radius. Doctors without coordinates (the platform's own
      // registered doctors, e.g. new sign-ups) are always kept; doctors with
      // coordinates outside the radius (e.g. directory entries in other cities)
      // are dropped so the list respects the chosen distance.
      if (userLocation) {
        platform = platform
          .map(d => {
            if (d.latitude == null || d.longitude == null) return d
            const km = haversineKm(userLocation.lat, userLocation.lng, d.latitude, d.longitude)
            return { ...d, distance: km, distanceText: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km` }
          })
          .filter(d => d.latitude == null || d.longitude == null || (d.distance ?? 0) <= radius)
      }

      // 2) Real nearby clinics from Google (only with a location).
      let external: Doctor[] = []
      let source: 'google' | 'platform' = 'platform'
      if (userLocation) {
        const params = new URLSearchParams({
          latitude: userLocation.lat.toString(),
          longitude: userLocation.lng.toString(),
          radius: radius.toString(),
          ...(specialization && { specialization }),
        })
        const placesRes = await fetch(`/api/doctors/places?${params}`)
        const placesData = await placesRes.json().catch(() => ({}))
        if (placesRes.ok && placesData.doctors?.length > 0) {
          external = placesData.doctors
          source = 'google'
        } else if (placesData.message) {
          // Surface why live nearby data is unavailable (e.g. API not enabled).
          setLiveError(placesData.message)
        }
      }

      // Merge: platform doctors first, then live Google results (deduped by id).
      const seen = new Set(platform.map(d => d.id))
      const merged = [...platform, ...external.filter(d => d.id && !seen.has(d.id))]
      setDoctors(merged)
      setDataSource(source)
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  const filtered = search.trim()
    ? doctors.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization.toLowerCase().includes(search.toLowerCase()) ||
        (d.city || '').toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  const openInMaps = (d: Doctor) => {
    if (d.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`, '_blank', 'noopener')
    } else if (userLocation) {
      window.open(`https://www.google.com/maps/search/doctor+near+me/@${userLocation.lat},${userLocation.lng},14z`, '_blank', 'noopener')
    }
  }

  if (status === 'loading') {
    return (
      <AppShell title="Find Doctors">
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={t('doctors.title')}
      breadcrumb={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('nav.findDoctors') }]}
    >
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('doctors.title')}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {dataSource === 'google'
                ? <span className="flex items-center gap-1">Registered doctors + live nearby results <span className="text-emerald-600 font-semibold text-xs">● Live</span></span>
                : userLocation
                ? 'Showing registered doctors'
                : 'Enable location to also see real clinics near you'}
            </p>
          </div>
          {!userLocation && (
            <button
              onClick={detectLocation}
              disabled={locating}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              {locating ? t('doctors.locating') : t('doctors.useLocation')}
            </button>
          )}
        </div>

        {/* Live nearby unavailable — surface the real reason */}
        {liveError && userLocation && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <MapPin size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Live nearby results are unavailable right now.</p>
              <p className="text-amber-700 text-xs mt-0.5">Showing registered doctors only. Reason: {liveError}</p>
            </div>
          </div>
        )}

        {/* Search + Filters bar */}
        <div className="card p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('doctors.search')}
                className="input pl-9 text-sm w-full"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${showFilters ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
            <button
              onClick={fetchDoctors}
              disabled={loading || !userLocation}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Specialization</label>
                <select
                  value={specialization}
                  onChange={e => setSpecialization(e.target.value)}
                  className="input text-sm w-full"
                >
                  <option value="">{t('doctors.allSpec')}</option>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Radius — <span className="text-sky-600 font-bold">{radius} km</span>
                </label>
                <input
                  type="range" min="1" max="50" value={radius}
                  onChange={e => setRadius(parseInt(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1 km</span><span>25 km</span><span>50 km</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location missing */}
        {!userLocation && !locating && (
          <div className="card bg-amber-50 border-amber-100 p-4 flex items-start gap-3">
            <Navigation size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Location not detected</p>
              <p className="text-xs text-amber-700 mt-0.5">Please allow location access in your browser to find doctors near you.</p>
            </div>
          </div>
        )}

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">
              {loading ? t('doctors.searching') : `${filtered.length} ${filtered.length === 1 ? t('doctors.found') : t('doctors.foundPlural')}`}
              {specialization && <span className="ml-2 text-xs text-sky-600 font-medium">· {specialization}</span>}
            </p>
          </div>

          {loading ? (
            <div className="card flex items-center justify-center py-20 gap-3">
              <Loader2 size={22} className="text-sky-500 animate-spin" />
              <span className="text-slate-400 text-sm">{t('doctors.searching')}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Stethoscope size={36} className="text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium mb-1">{t('doctors.notFound')}</p>
              <p className="text-xs text-slate-400">{t('doctors.notFoundHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(doctor => (
                <div key={doctor.id} className="card p-5 hover:shadow-md transition-all group">
                  {/* Top row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-700 font-bold text-lg">
                      {doctor.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{doctor.name}</p>
                      <p className="text-xs text-sky-600 font-medium">{doctor.specialization}</p>
                      {(doctor.city || doctor.location) && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="flex-shrink-0" />
                          {doctor.city || doctor.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {doctor.rating ? (
                        <div className={`flex items-center gap-0.5 justify-end font-bold text-sm ${severityColor(doctor.rating)}`}>
                          <Star size={13} fill="currentColor" />
                          {doctor.rating.toFixed(1)}
                        </div>
                      ) : null}
                      {doctor.reviewCount > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{doctor.reviewCount} reviews</p>
                      )}
                    </div>
                  </div>

                  {/* Info pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {doctor.experience > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        <Clock size={11} />
                        {doctor.experience} {t('common.yearsExp')}
                      </span>
                    )}
                    {doctor.distanceText && (
                      <span className="flex items-center gap-1 text-xs bg-sky-50 text-sky-600 font-medium px-2.5 py-1 rounded-full">
                        <MapPin size={11} />
                        {doctor.distanceText} {t('common.away')}
                      </span>
                    )}
                    {doctor.consultationFee != null && (
                      <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                        ₹{doctor.consultationFee} {t('common.fee')}
                      </span>
                    )}
                    {(doctor as any).isOpenNow === true && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-full">{t('doctors.openNow')}</span>
                    )}
                    {(doctor as any).isOpenNow === false && (
                      <span className="text-xs bg-red-50 text-red-500 font-semibold px-2 py-1 rounded-full">{t('doctors.closed')}</span>
                    )}
                  </div>

                  {doctor.address && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1 flex items-start gap-1">
                      <MapPin size={10} className="flex-shrink-0 mt-0.5" />
                      {doctor.address}
                    </p>
                  )}

                  {/* Real ratings summary + link to full Google reviews */}
                  {doctor.source === 'google' && doctor.rating != null && doctor.placeId && (
                    <a
                      href={`https://search.google.com/local/reviews?placeid=${doctor.placeId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 rounded-xl px-3 py-2 mb-4 transition-colors"
                    >
                      <Star size={13} className="text-amber-500" fill="currentColor" />
                      <span className="text-xs font-semibold text-amber-700">{doctor.rating.toFixed(1)}</span>
                      <span className="text-xs text-amber-600">· {doctor.reviewCount} Google reviews</span>
                      <ExternalLink size={11} className="text-amber-500 ml-auto" />
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {(doctor as any).source === 'google' ? (
                      <a
                        href={`https://www.google.com/maps/place/?q=place_id:${(doctor as any).placeId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
                      >
                        <ExternalLink size={13} /> {t('doctors.openMaps')}
                      </a>
                    ) : (
                      <Link
                        href={`/appointments/new?doctorId=${doctor.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
                      >
                        <Calendar size={13} /> {t('common.book')}
                      </Link>
                    )}
                    {doctor.phone && (
                      <a
                        href={`tel:${doctor.phone}`}
                        className="flex items-center justify-center gap-1.5 border border-slate-200 hover:border-sky-300 text-slate-600 hover:text-sky-600 text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                      >
                        <Phone size={13} /> {t('common.call')}
                      </a>
                    )}
                    <button
                      onClick={() => openInMaps(doctor)}
                      className="flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                      title={t('doctors.openMaps')}
                    >
                      <MapPin size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
