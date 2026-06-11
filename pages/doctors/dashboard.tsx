import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  Calendar, Users, Activity, Clock, CheckCircle2, XCircle, Video,
  Phone, Mail, MessageSquare, ChevronDown, ChevronUp, Bell, Wifi,
  MapPin, Loader2, TrendingUp, IndianRupee, ToggleLeft, ToggleRight,
  Brain, FileText, Sparkles, AlertTriangle, ClipboardList,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useAppointmentUpdates } from '@/hooks/useAppointmentUpdates'

interface Patient { id: string; name: string; email: string; phone: string | null }
interface SymptomLog { symptoms: string; severity: string; description: string }
interface Appointment {
  id: string; type: string; status: string; appointmentDate: string
  appointmentTime: string; reason: string; notes: string | null
  patient: Patient; symptomLog: SymptomLog | null
}
interface DoctorProfile {
  consultationFee: number | null; isAvailable: boolean; rating: number | null; reviewCount: number
}

const statusMeta: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'badge-pending' },
  CONFIRMED: { label: 'Confirmed', cls: 'badge-confirmed' },
  COMPLETED: { label: 'Completed', cls: 'badge-completed' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-cancelled' },
}
const severityMeta: Record<string, { cls: string }> = {
  LOW: { cls: 'badge-low' }, MEDIUM: { cls: 'badge-medium' },
  HIGH: { cls: 'badge-high' }, CRITICAL: { cls: 'badge-critical' },
}

const PRESCRIPTION_TEMPLATES = [
  { label: 'Fever / Cold', text: 'Tab. Paracetamol 650mg — 1 tab TDS × 5 days\nTab. Cetirizine 10mg — 1 tab OD at night × 5 days\nTab. Vitamin C 500mg — 1 tab BD × 7 days\nAdvice: Rest, plenty of fluids, avoid cold food/drinks.' },
  { label: 'Gastritis', text: 'Tab. Pantoprazole 40mg — 1 tab AC BD × 7 days\nTab. Domperidone 10mg — 1 tab TDS AC × 5 days\nSyp. Sucralfate 10ml — 1 tsp TDS AC × 5 days\nAdvice: Soft bland diet, avoid spicy/oily food, no NSAIDs.' },
  { label: 'Hypertension', text: 'Tab. Amlodipine 5mg — 1 tab OD × 30 days\nAdvice: Low salt diet, regular walking 30 min/day, avoid stress, monitor BP daily.' },
]

function isToday(dateStr: string) {
  const d = new Date(dateStr), t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function getVideoCallUrl(id: string) { return `https://meet.jit.si/HealthAI-${id.slice(0, 12)}` }

export default function DoctorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState<'TODAY' | 'UPCOMING' | 'ALL'>('TODAY')
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false)

  // AI brief state per appointment
  const [briefs, setBriefs] = useState<Record<string, { loading: boolean; text: string; error?: string }>>({})

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session && session.user.role !== 'DOCTOR') router.push('/dashboard')
    else if (session) { fetchAppointments(); fetchProfile() }
  }, [session, status])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/doctor/appointments')
      if (res.ok) setAppointments((await res.json()).appointments || [])
    } catch { /* noop */ } finally { setLoading(false) }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/doctor/profile')
      if (res.ok) setProfile(await res.json())
    } catch { /* noop */ }
  }

  const toggleAvailability = async () => {
    if (!profile) return
    setAvailabilityUpdating(true)
    try {
      const res = await fetch('/api/doctor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !profile.isAvailable }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? { ...prev, isAvailable: data.isAvailable } : prev)
        showToast(data.isAvailable ? 'You are now visible to patients' : 'You are now set as unavailable')
      }
    } catch { /* noop */ } finally { setAvailabilityUpdating(false) }
  }

  const generateBrief = async (apt: Appointment) => {
    setBriefs(prev => ({ ...prev, [apt.id]: { loading: true, text: '' } }))
    try {
      const res = await fetch('/api/doctor/patient-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: apt.patient.id }),
      })
      const data = await res.json()
      setBriefs(prev => ({ ...prev, [apt.id]: { loading: false, text: data.brief || '' } }))
    } catch {
      setBriefs(prev => ({ ...prev, [apt.id]: { loading: false, text: '', error: 'Failed to generate brief' } }))
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
          CONFIRMED: 'Appointment confirmed', COMPLETED: 'Marked as completed', CANCELLED: 'Appointment cancelled',
        }
        showToast(msgs[newStatus] || 'Updated')
        setExpandedId(null)
      }
    } catch { /* noop */ } finally { setUpdatingId(null) }
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const handleLiveUpdate = useCallback(() => { fetchAppointments(); showToast('New appointment update') }, [])
  useAppointmentUpdates(session?.user?.id, handleLiveUpdate)

  const today = appointments.filter(a => isToday(a.appointmentDate) && ['PENDING', 'CONFIRMED'].includes(a.status))
    .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''))
  const upcoming = appointments.filter(a => {
    const d = new Date(a.appointmentDate)
    return d > new Date() && !isToday(a.appointmentDate) && ['PENDING', 'CONFIRMED'].includes(a.status)
  }).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

  const displayed =
    filter === 'TODAY' ? today :
    filter === 'UPCOMING' ? upcoming :
    [...appointments].sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())

  const completedThisMonth = appointments.filter(a => {
    const d = new Date(a.appointmentDate)
    const now = new Date()
    return a.status === 'COMPLETED' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const estimatedEarnings = profile?.consultationFee
    ? completedThisMonth * profile.consultationFee
    : null

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Doctor Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
            Loading your schedule…
          </div>
        </div>
      </AppShell>
    )
  }

  const iconBg: Record<string, string> = {
    sky: 'bg-sky-500', violet: 'bg-violet-500', amber: 'bg-amber-500',
    emerald: 'bg-emerald-500', green: 'bg-green-500',
  }

  const stats = [
    { label: 'Total Patients',  value: appointments.length,                                    icon: Users,        color: 'sky' },
    { label: 'Today',           value: today.length,                                            icon: Calendar,     color: 'violet' },
    { label: 'Pending',         value: appointments.filter(a => a.status === 'PENDING').length, icon: Clock,        color: 'amber' },
    { label: 'Confirmed',       value: appointments.filter(a => a.status === 'CONFIRMED').length, icon: CheckCircle2, color: 'emerald' },
    ...(estimatedEarnings !== null ? [{
      label: 'Est. Earnings (Month)',
      value: `₹${estimatedEarnings.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'green',
    }] : []),
  ]

  return (
    <AppShell title="Doctor Dashboard">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-white/10">
          <Bell size={15} className="text-sky-400 flex-shrink-0" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      <div className="p-6 lg:p-8 space-y-6">

        {/* Welcome + Availability toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Good day, Dr. {session?.user?.name?.split(' ')[0] || 'Doctor'} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {today.length > 0
                ? `You have ${today.length} appointment${today.length > 1 ? 's' : ''} today.`
                : 'No appointments scheduled for today.'}
            </p>
          </div>

          {/* Availability toggle */}
          {profile && (
            <button
              onClick={toggleAvailability}
              disabled={availabilityUpdating}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                profile.isAvailable
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {availabilityUpdating
                ? <Loader2 size={15} className="animate-spin" />
                : profile.isAvailable
                ? <ToggleRight size={18} className="text-emerald-600" />
                : <ToggleLeft size={18} className="text-slate-400" />}
              {profile.isAvailable ? 'Accepting Patients' : 'Not Available'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${iconBg[color]} flex items-center justify-center`}>
                  <Icon size={16} className="text-white" />
                </div>
              </div>
              <p className={`font-extrabold text-slate-900 ${typeof value === 'string' && value.startsWith('₹') ? 'text-xl' : 'text-3xl'}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Practice insight banner */}
        <div className="bg-gradient-to-r from-violet-600 to-sky-600 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold">AI Patient Briefs are live</p>
              <p className="text-white/70 text-xs mt-0.5">Click any appointment → "Generate AI Brief" to read a patient's full health summary before the consultation.</p>
            </div>
          </div>
          <Brain size={28} className="text-white/30 flex-shrink-0 hidden sm:block" />
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
               filter === 'UPCOMING' ? 'No upcoming appointments' : 'No appointments yet'}
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
              const dateStr = new Date(apt.appointmentDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
              const brief = briefs[apt.id]

              let symptoms: string[] = []
              try { symptoms = JSON.parse(apt.symptomLog?.symptoms || '[]') } catch { symptoms = apt.symptomLog ? [apt.symptomLog.symptoms] : [] }

              return (
                <div key={apt.id} className={`card overflow-hidden transition-all ${
                  isToday(apt.appointmentDate) && !['COMPLETED', 'CANCELLED'].includes(apt.status) ? 'border-sky-200 shadow-sky-100' : ''
                }`}>
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {(apt.patient.name || apt.patient.email)[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-900">{apt.patient.name || 'Patient'}</p>
                          <p className="text-xs text-slate-500">{apt.patient.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                          <span className={`badge ${sMeta.cls}`}>{sMeta.label}</span>
                          <span className={`badge ${isOnline ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'} flex items-center gap-1`}>
                            {isOnline ? <Wifi size={10} /> : <MapPin size={10} />}
                            {isOnline ? 'Online' : 'In-Person'}
                          </span>
                          {sevMeta && <span className={`badge ${sevMeta.cls}`}>{apt.symptomLog?.severity}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {dateStr}</span>
                        {apt.appointmentTime && <span className="flex items-center gap-1"><Clock size={11} /> {apt.appointmentTime}</span>}
                        {apt.patient.phone && <span className="flex items-center gap-1"><Phone size={11} /> {apt.patient.phone}</span>}
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">
                        <span className="font-medium">Reason:</span> {apt.reason}
                      </p>

                      {symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {symptoms.slice(0, 4).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">{s}</span>
                          ))}
                          {symptoms.length > 4 && <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-400">+{symptoms.length - 4}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {canCall && (
                        <a href={getVideoCallUrl(apt.id)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-all">
                          <Video size={13} /> Start Call
                        </a>
                      )}
                      {apt.status === 'PENDING' && (
                        <button onClick={() => updateStatus(apt.id, 'CONFIRMED')} disabled={isUpdating}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50">
                          <CheckCircle2 size={13} /> Confirm
                        </button>
                      )}
                      {['PENDING', 'CONFIRMED'].includes(apt.status) && (
                        <button onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all">
                          <MessageSquare size={13} />
                          {isExpanded ? 'Close' : 'Actions'}
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-5">

                      {/* ── AI Patient Brief ── */}
                      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <Brain size={14} className="text-violet-600" />
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">AI Patient Brief</p>
                            <span className="text-[9px] bg-violet-100 text-violet-700 font-semibold px-1.5 py-0.5 rounded-full">GPT-4o</span>
                          </div>
                          {!brief && (
                            <button
                              onClick={() => generateBrief(apt)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Sparkles size={12} /> Generate Brief
                            </button>
                          )}
                        </div>

                        <div className="p-4">
                          {!brief ? (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Get an AI summary of this patient's complete HealthAI symptom history before the consultation — know their recurring complaints, severity trend, and key concerns in seconds.
                            </p>
                          ) : brief.loading ? (
                            <div className="flex items-center gap-2 py-2">
                              <Loader2 size={14} className="text-violet-500 animate-spin" />
                              <span className="text-xs text-slate-500">Analysing patient history…</span>
                            </div>
                          ) : brief.error ? (
                            <p className="text-xs text-red-500">{brief.error}</p>
                          ) : (
                            <div>
                              <p className="text-sm text-slate-700 leading-relaxed">{brief.text}</p>
                              <button
                                onClick={() => generateBrief(apt)}
                                className="mt-3 text-xs text-violet-500 hover:text-violet-700 flex items-center gap-1"
                              >
                                <Sparkles size={10} /> Regenerate
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Symptom report */}
                      {apt.symptomLog?.description && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <ClipboardList size={12} /> Patient's Symptom Report
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-xl border border-slate-100 p-3">
                            {apt.symptomLog.description.slice(0, 500)}{apt.symptomLog.description.length > 500 ? '…' : ''}
                          </p>
                        </div>
                      )}

                      {/* Prescription + notes */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                            <FileText size={12} /> Consultation Notes & Prescription
                          </label>
                        </div>

                        {/* Prescription templates */}
                        <div className="flex gap-2 flex-wrap mb-2">
                          {PRESCRIPTION_TEMPLATES.map(t => (
                            <button
                              key={t.label}
                              onClick={() => setNotesInput(prev => ({ ...prev, [apt.id]: t.text }))}
                              className="text-[10px] font-semibold px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition-all border border-sky-100"
                            >
                              + {t.label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={notesInput[apt.id] || apt.notes || ''}
                          onChange={e => setNotesInput(prev => ({ ...prev, [apt.id]: e.target.value }))}
                          rows={4}
                          placeholder="Write consultation notes or prescription here…"
                          className="input resize-none text-sm w-full font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={() => updateStatus(apt.id, 'COMPLETED', notesInput[apt.id])} disabled={isUpdating}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                          <CheckCircle2 size={14} /> Mark Completed
                        </button>
                        <button onClick={() => updateStatus(apt.id, 'CANCELLED')} disabled={isUpdating}
                          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                          <XCircle size={14} /> Cancel
                        </button>
                        <a
                          href={`mailto:${apt.patient.email}?subject=Your Appointment on ${dateStr}&body=${encodeURIComponent(
                            `Dear ${apt.patient.name || 'Patient'},\n\nHere are your consultation notes:\n\n${notesInput[apt.id] || ''}\n\n---\nDr. ${session?.user?.name || ''}\nHealthAI Platform`
                          )}`}
                          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-all ml-auto"
                        >
                          <Mail size={14} /> Send to Patient
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
