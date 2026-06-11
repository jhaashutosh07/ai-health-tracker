import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  Calendar,
  Users,
  Activity,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Video,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Bell,
  Wifi,
  MapPin,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useAppointmentUpdates } from '@/hooks/useAppointmentUpdates'

interface Patient {
  id: string
  name: string
  email: string
  phone: string | null
}

interface SymptomLog {
  symptoms: string
  severity: string
  description: string
}

interface Appointment {
  id: string
  type: string
  status: string
  appointmentDate: string
  appointmentTime: string
  reason: string
  notes: string | null
  patient: Patient
  symptomLog: SymptomLog | null
}

const statusMeta: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'badge-pending' },
  CONFIRMED: { label: 'Confirmed', cls: 'badge-confirmed' },
  COMPLETED: { label: 'Completed', cls: 'badge-completed' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-cancelled' },
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

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const t = new Date()
  return d.getFullYear() === t.getFullYear() &&
         d.getMonth() === t.getMonth() &&
         d.getDate() === t.getDate()
}

export default function DoctorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState<'TODAY' | 'UPCOMING' | 'ALL'>('TODAY')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session && session.user.role !== 'DOCTOR') router.push('/dashboard')
    else if (session) fetchAppointments()
  }, [session, status])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/doctor/appointments')
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

  const updateStatus = async (appointmentId: string, newStatus: string, notes?: string) => {
    setUpdatingId(appointmentId)
    try {
      const res = await fetch('/api/doctor/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, status: newStatus, notes }),
      })
      if (res.ok) {
        await fetchAppointments()
        const msgs: Record<string, string> = {
          CONFIRMED: 'Appointment confirmed — patient notified',
          COMPLETED: 'Appointment marked as completed',
          CANCELLED: 'Appointment cancelled',
        }
        showToast(msgs[newStatus] || 'Status updated')
        setExpandedId(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleLiveUpdate = useCallback(() => {
    fetchAppointments()
    showToast('Appointment list updated')
  }, [])

  useAppointmentUpdates(session?.user?.id, handleLiveUpdate)

  const today = appointments.filter(a =>
    isToday(a.appointmentDate) && (a.status === 'PENDING' || a.status === 'CONFIRMED')
  ).sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''))

  const upcoming = appointments.filter(a => {
    const d = new Date(a.appointmentDate)
    return d > new Date() && !isToday(a.appointmentDate) && (a.status === 'PENDING' || a.status === 'CONFIRMED')
  }).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

  const displayed =
    filter === 'TODAY' ? today :
    filter === 'UPCOMING' ? upcoming :
    [...appointments].sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Doctor Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
            <span>Loading your schedule…</span>
          </div>
        </div>
      </AppShell>
    )
  }

  const stats = [
    { label: 'Total Patients',     value: appointments.length,                                          icon: Users,         color: 'sky' },
    { label: 'Today',              value: today.length,                                                  icon: Calendar,      color: 'violet' },
    { label: 'Pending Review',     value: appointments.filter(a => a.status === 'PENDING').length,       icon: Clock,         color: 'amber' },
    { label: 'Confirmed',          value: appointments.filter(a => a.status === 'CONFIRMED').length,     icon: CheckCircle2,  color: 'emerald' },
  ]

  const iconBg: Record<string, string> = {
    sky: 'bg-sky-500', violet: 'bg-violet-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500',
  }

  return (
    <AppShell title="Doctor Dashboard">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 fade-in">
          <Bell size={15} className="text-sky-400 flex-shrink-0" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      <div className="p-6 lg:p-8 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good day, Dr. {session?.user?.name?.split(' ')[0] || 'Doctor'} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {today.length > 0
              ? `You have ${today.length} appointment${today.length > 1 ? 's' : ''} scheduled for today.`
              : 'No appointments scheduled for today.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${iconBg[color]} flex items-center justify-center`}>
                  <Icon size={16} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            { key: 'TODAY', label: `Today (${today.length})` },
            { key: 'UPCOMING', label: `Upcoming (${upcoming.length})` },
            { key: 'ALL', label: 'All' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Appointment list */}
        {displayed.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Calendar size={36} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">
              {filter === 'TODAY' ? 'No appointments today' :
               filter === 'UPCOMING' ? 'No upcoming appointments' :
               'No appointments yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(apt => {
              const sMeta = statusMeta[apt.status] || statusMeta.PENDING
              const sevMeta = apt.symptomLog ? (severityMeta[apt.symptomLog.severity] || severityMeta.LOW) : null
              const isExpanded = expandedId === apt.id
              const isOnline = apt.type === 'ONLINE'
              const canCall = isOnline && apt.status === 'CONFIRMED'
              const isUpdating = updatingId === apt.id
              const dateObj = new Date(apt.appointmentDate)
              const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
              let symptoms: string[] = []
              try { symptoms = JSON.parse(apt.symptomLog?.symptoms || '[]') } catch { symptoms = apt.symptomLog ? [apt.symptomLog.symptoms] : [] }

              return (
                <div key={apt.id} className={`card overflow-hidden transition-all ${
                  isToday(apt.appointmentDate) && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
                    ? 'border-sky-200 shadow-sky-100'
                    : ''
                }`}>
                  {/* Main row */}
                  <div className="p-5 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {(apt.patient.name || apt.patient.email)[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-900">{apt.patient.name || 'Unknown Patient'}</p>
                          <p className="text-xs text-slate-500">{apt.patient.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                          <span className={`badge ${sMeta.cls}`}>{sMeta.label}</span>
                          <span className={`badge ${isOnline ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'} flex items-center gap-1`}>
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

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {dateStr}
                        </span>
                        {apt.appointmentTime && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {apt.appointmentTime}
                          </span>
                        )}
                        {apt.patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {apt.patient.phone}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">
                        <span className="font-medium">Reason:</span> {apt.reason}
                      </p>

                      {symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {symptoms.slice(0, 4).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">{s}</span>
                          ))}
                          {symptoms.length > 4 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-500">+{symptoms.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {canCall && (
                        <a
                          href={getVideoCallUrl(apt.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                        >
                          <Video size={13} />
                          Start Call
                        </a>
                      )}
                      {apt.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          Confirm
                        </button>
                      )}
                      {(apt.status === 'PENDING' || apt.status === 'CONFIRMED') && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all"
                        >
                          <MessageSquare size={13} />
                          {isExpanded ? 'Close' : 'Actions'}
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-4">
                      {apt.symptomLog?.description && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Patient's symptom report</p>
                          <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-xl border border-slate-100 p-3">
                            {apt.symptomLog.description.slice(0, 500)}{apt.symptomLog.description.length > 500 ? '…' : ''}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Consultation notes <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <textarea
                          value={notesInput[apt.id] || apt.notes || ''}
                          onChange={e => setNotesInput(prev => ({ ...prev, [apt.id]: e.target.value }))}
                          rows={3}
                          placeholder="Add notes for this appointment…"
                          className="input resize-none text-sm w-full"
                        />
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => updateStatus(apt.id, 'COMPLETED', notesInput[apt.id])}
                          disabled={isUpdating}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          Mark Completed
                        </button>
                        <button
                          onClick={() => updateStatus(apt.id, 'CANCELLED')}
                          disabled={isUpdating}
                          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Cancel
                        </button>
                        <a
                          href={`mailto:${apt.patient.email}?subject=Appointment on ${dateStr}`}
                          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-all ml-auto"
                        >
                          <Mail size={14} />
                          Email Patient
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
