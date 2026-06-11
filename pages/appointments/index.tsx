import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Plus,
  Video,
  MapPin,
  Wifi,
  User,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Appointment {
  id: string
  type: string
  status: string
  appointmentDate: string
  appointmentTime: string
  reason: string
  notes: string | null
  doctor: {
    name: string
    specialization: string
    email: string
  } | null
  symptomLog: {
    symptoms: string
    severity: string
  } | null
}

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const statusMeta: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  PENDING:   { label: 'Pending',   cls: 'badge-pending',   icon: Clock },
  CONFIRMED: { label: 'Confirmed', cls: 'badge-confirmed', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', cls: 'badge-completed', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', cls: 'badge-cancelled', icon: XCircle },
}

const severityMeta: Record<string, { cls: string }> = {
  LOW:      { cls: 'badge-low' },
  MEDIUM:   { cls: 'badge-medium' },
  HIGH:     { cls: 'badge-high' },
  CRITICAL: { cls: 'badge-critical' },
}

function getVideoCallUrl(appointmentId: string) {
  return `https://meet.jit.si/HealthAI-${appointmentId.slice(0, 12)}`
}

export default function Appointments() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session) fetchAppointments()
  }, [session, status])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/appointments')
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const countFor = (s: string) => s === 'ALL'
    ? appointments.length
    : appointments.filter(a => a.status === s).length

  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter(a => a.status === filter)

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Appointments">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
            Loading appointments…
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Appointments"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Appointments' }]}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
            <p className="text-slate-500 text-sm mt-1">
              {appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING').length} active appointments
            </p>
          </div>
          <Link href="/appointments/new" className="btn btn-primary gap-2 flex-shrink-0">
            <Plus size={15} />
            Book Appointment
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="card p-1 flex flex-wrap gap-1">
          {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === tab
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab} ({countFor(tab)})
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Calendar size={36} className="text-slate-200 mb-4" />
            <p className="font-semibold text-slate-700 mb-1">No appointments found</p>
            <p className="text-slate-500 text-sm mb-6">
              {filter === 'ALL'
                ? "You haven't booked any appointments yet."
                : `No ${filter.toLowerCase()} appointments.`}
            </p>
            <Link href="/appointments/new" className="btn btn-primary gap-2">
              <Plus size={15} />
              Book your first appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(apt => {
              const sMeta = statusMeta[apt.status] || statusMeta.PENDING
              const StatusIcon = sMeta.icon
              const sevMeta = apt.symptomLog ? (severityMeta[apt.symptomLog.severity] || severityMeta.LOW) : null
              const isOnline = apt.type === 'ONLINE'
              const canJoinCall = isOnline && apt.status === 'CONFIRMED'
              const dateObj = new Date(apt.appointmentDate)
              const dateStr = dateObj.toLocaleDateString('en-IN', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })
              let symptoms: string[] = []
              try { symptoms = JSON.parse(apt.symptomLog?.symptoms || '[]') } catch {
                symptoms = apt.symptomLog ? [apt.symptomLog.symptoms] : []
              }

              return (
                <div
                  key={apt.id}
                  className={`card overflow-hidden transition-all hover:shadow-md ${
                    canJoinCall ? 'border-sky-200' : ''
                  }`}
                >
                  {/* Top bar for online + confirmed */}
                  {canJoinCall && (
                    <div className="bg-sky-600 px-5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-xs font-medium">
                        <Wifi size={13} />
                        Online consultation ready — your doctor can start the call
                      </div>
                      <a
                        href={getVideoCallUrl(apt.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-white text-sky-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-sky-50 transition-colors"
                      >
                        <Video size={12} />
                        Join Video Call
                      </a>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Doctor info */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0">
                          {apt.doctor ? apt.doctor.name[0].toUpperCase() : <User size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {apt.doctor ? `Dr. ${apt.doctor.name}` : 'Doctor TBD'}
                          </p>
                          <p className="text-xs text-slate-500">{apt.doctor?.specialization || 'Awaiting assignment'}</p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${sMeta.cls} gap-1`}>
                          <StatusIcon size={10} />
                          {sMeta.label}
                        </span>
                        <span className={`badge flex items-center gap-1 ${isOnline ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {isOnline ? <Wifi size={10} /> : <MapPin size={10} />}
                          {isOnline ? 'Online' : 'In-Person'}
                        </span>
                        {sevMeta && (
                          <span className={`badge ${sevMeta.cls}`}>
                            {apt.symptomLog?.severity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date and time */}
                    <div className="mt-4 flex items-center gap-5 flex-wrap text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {dateStr}
                      </span>
                      {apt.appointmentTime && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {apt.appointmentTime}
                        </span>
                      )}
                    </div>

                    {/* Reason */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Reason for visit</p>
                      <p className="text-sm text-slate-700">{apt.reason}</p>
                    </div>

                    {/* Symptoms */}
                    {symptoms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {symptoms.slice(0, 5).map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">{s}</span>
                        ))}
                        {symptoms.length > 5 && (
                          <span className="px-2.5 py-1 text-xs text-slate-400">+{symptoms.length - 5} more</span>
                        )}
                      </div>
                    )}

                    {/* Doctor notes */}
                    {apt.notes && (
                      <div className="mt-3 p-3 bg-sky-50 border border-sky-100 rounded-xl">
                        <p className="text-xs font-semibold text-sky-700 mb-1">Doctor's notes</p>
                        <p className="text-sm text-slate-700">{apt.notes}</p>
                      </div>
                    )}

                    {/* If online and pending — info about how to join */}
                    {isOnline && apt.status === 'PENDING' && (
                      <div className="mt-3 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          Your doctor will confirm this appointment. Once confirmed, a video call link will appear here.
                        </p>
                      </div>
                    )}

                    {/* Bottom actions */}
                    {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                        {canJoinCall && (
                          <a
                            href={getVideoCallUrl(apt.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary gap-2 text-sm"
                          >
                            <Video size={14} />
                            Join Video Call
                          </a>
                        )}
                        {apt.symptomLog && (
                          <Link href="/symptom-check" className="btn btn-ghost gap-1.5 text-xs">
                            <ClipboardList size={13} />
                            View Symptom Log
                          </Link>
                        )}
                        <Link href="/appointments/new" className="ml-auto btn btn-outline gap-1.5 text-xs">
                          <Plus size={13} />
                          Book Another
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick tip */}
        {appointments.some(a => a.type === 'ONLINE' && a.status === 'CONFIRMED') && (
          <div className="card p-4 bg-sky-50 border-sky-100 flex items-start gap-3">
            <Video size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sky-900">Video consultation tip</p>
              <p className="text-xs text-sky-700 mt-0.5">
                For the best experience, use Chrome or Firefox. Allow camera and microphone access when prompted. Make sure you're in a quiet, well-lit space.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
