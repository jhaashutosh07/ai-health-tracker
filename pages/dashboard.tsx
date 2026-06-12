import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  Calendar,
  ClipboardList,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Bell,
  Pill,
  Smile,
  ShieldCheck,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SkeletonDashboard } from '@/components/Skeleton'
import { useAppointmentUpdates } from '@/hooks/useAppointmentUpdates'

interface Appointment {
  id: string
  type: string
  status: string
  scheduledDate?: string
  appointmentDate?: string
  appointmentTime?: string
  reason?: string
  doctor: { name: string; specialization: string } | null
}

interface SymptomLog {
  id: string
  symptoms: string
  severity: string
  createdAt: string
}

interface FollowUp {
  symptomLogId: string
  symptoms: string[]
  severity: string
  recommendation: string | null
  checkedAt: string
}

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

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<FollowUp | null>(null)
  const [followUpResult, setFollowUpResult] = useState<{ escalate: boolean; message: string } | null>(null)
  const [followUpSending, setFollowUpSending] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session?.user?.role === 'DOCTOR') router.push('/doctors/dashboard')
    else if (session) fetchData()
  }, [session, status])

  const fetchData = async () => {
    setLoading(true)
    const [aptRes, symRes, fuRes] = await Promise.all([
      fetch('/api/appointments'),
      fetch('/api/symptom-check/history?limit=5'),
      fetch('/api/symptom-check/follow-up'),
    ])
    if (aptRes.ok) setAppointments((await aptRes.json()).appointments || [])
    if (symRes.ok) setRecentSymptoms((await symRes.json()).logs || [])
    if (fuRes.ok) setFollowUp((await fuRes.json()).followUp || null)
    setLoading(false)
  }

  const respondToFollowUp = async (response: 'BETTER' | 'SAME' | 'WORSE') => {
    if (!followUp || followUpSending) return
    setFollowUpSending(true)
    try {
      const res = await fetch('/api/symptom-check/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptomLogId: followUp.symptomLogId, response }),
      })
      if (res.ok) setFollowUpResult(await res.json())
    } finally {
      setFollowUpSending(false)
    }
  }

  const handleLiveUpdate = useCallback((update: { appointmentId: string; status: string }) => {
    setAppointments(prev =>
      prev.map(a => a.id === update.appointmentId ? { ...a, status: update.status } : a)
    )
    const labels: Record<string, string> = {
      CONFIRMED: 'Your appointment has been confirmed',
      CANCELLED: 'An appointment was cancelled',
      COMPLETED: 'Appointment marked as completed',
    }
    setToast(labels[update.status] || `Appointment updated to ${update.status}`)
    setTimeout(() => setToast(null), 5000)
  }, [])

  useAppointmentUpdates(session?.user?.id, handleLiveUpdate)

  const upcoming = appointments
    .filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.appointmentDate || a.scheduledDate || 0).getTime() - new Date(b.appointmentDate || b.scheduledDate || 0).getTime())
    .slice(0, 5)

  const metricCards = [
    {
      label: 'Total Appointments',
      value: appointments.length,
      change: `${upcoming.length} upcoming`,
      icon: Calendar,
      color: 'sky',
    },
    {
      label: 'Symptom Checks',
      value: recentSymptoms.length,
      change: 'last 5 shown',
      icon: ClipboardList,
      color: 'violet',
    },
    {
      label: 'Confirmed',
      value: appointments.filter(a => a.status === 'CONFIRMED').length,
      change: 'appointments',
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      label: 'Completed',
      value: appointments.filter(a => a.status === 'COMPLETED').length,
      change: 'consultations',
      icon: TrendingUp,
      color: 'amber',
    },
  ]

  const iconBg: Record<string, string> = {
    sky:     'bg-sky-500',
    violet:  'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
  }

  const calcHealthScore = () => {
    if (loading) return null
    let score = 90
    recentSymptoms.slice(0, 5).forEach(s => {
      if (s.severity === 'CRITICAL') score -= 28
      else if (s.severity === 'HIGH') score -= 15
      else if (s.severity === 'MEDIUM') score -= 7
      else score -= 2
    })
    score += Math.min(appointments.filter(a => a.status === 'COMPLETED').length * 3, 12)
    return Math.max(10, Math.min(100, score))
  }
  const healthScore = calcHealthScore()
  const scoreColor = healthScore === null ? '' :
    healthScore >= 80 ? 'text-emerald-600' :
    healthScore >= 60 ? 'text-amber-600' :
    'text-red-600'
  const scoreLabel = healthScore === null ? '' :
    healthScore >= 80 ? 'Excellent' :
    healthScore >= 60 ? 'Fair' :
    'Needs attention'

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Dashboard">
        <SkeletonDashboard />
      </AppShell>
    )
  }

  // Per-check scores (oldest → newest) for the health score sparkline
  const severityScore: Record<string, number> = { LOW: 90, MEDIUM: 70, HIGH: 45, CRITICAL: 20 }
  const trendPoints = [...recentSymptoms]
    .reverse()
    .map(s => severityScore[s.severity] ?? 70)
  const sparklinePath = trendPoints.length >= 2
    ? trendPoints
        .map((v, i) => `${(i / (trendPoints.length - 1)) * 96 + 2},${26 - (v / 100) * 24}`)
        .join(' ')
    : null
  const trendingUp = trendPoints.length >= 2 && trendPoints[trendPoints.length - 1] >= trendPoints[0]

  return (
    <AppShell title="Dashboard">
      {/* Live update toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 fade-in">
          <Bell size={16} className="text-sky-400 flex-shrink-0" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      <div className="p-6 lg:p-8 space-y-8">
        {/* Follow-up check-in banner */}
        {followUp && (
          <div className="card p-5 border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50">
            {!followUpResult ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center flex-shrink-0">
                  <Bell size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">
                    Checking in on your{' '}
                    <span className={`badge ${(severityMeta[followUp.severity] || severityMeta.LOW).cls}`}>{followUp.severity}</span>{' '}
                    symptom check from {new Date(followUp.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {followUp.symptoms.slice(0, 4).join(', ')} — how are you feeling now?
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => respondToFollowUp('BETTER')} disabled={followUpSending}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
                    😊 Better
                  </button>
                  <button onClick={() => respondToFollowUp('SAME')} disabled={followUpSending}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
                    😐 Same
                  </button>
                  <button onClick={() => respondToFollowUp('WORSE')} disabled={followUpSending}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50">
                    😟 Worse
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${followUpResult.escalate ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {followUpResult.escalate ? <AlertCircle size={18} className="text-white" /> : <CheckCircle2 size={18} className="text-white" />}
                </div>
                <p className="flex-1 text-sm text-slate-700">{followUpResult.message}</p>
                {followUpResult.escalate && (
                  <Link href="/appointments/new" className="btn btn-primary text-xs flex-shrink-0 !bg-red-600 hover:!bg-red-700">
                    Book a doctor now
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Welcome */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Good day, {session?.user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Here's what's happening with your health today.</p>
          </div>
          <Link
            href="/symptom-check"
            className="hidden sm:flex btn btn-primary gap-2"
          >
            <Activity size={15} />
            Check symptoms
          </Link>
        </div>

        {/* Metric cards + health score */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {metricCards.map(({ label, value, change, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${iconBg[color]} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{change}</p>
            </div>
          ))}

          {/* AI Health Score */}
          <div className="card p-5 col-span-2 lg:col-span-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={15} className="text-sky-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Health Score</p>
            </div>
            {healthScore !== null ? (
              <>
                <p className={`text-4xl font-black ${scoreColor}`}>{healthScore}</p>
                <p className={`text-xs font-semibold mt-1 ${scoreColor}`}>{scoreLabel}</p>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      healthScore >= 80 ? 'bg-emerald-500' :
                      healthScore >= 60 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
                {sparklinePath && (
                  <div className="mt-3 flex items-end gap-2">
                    <svg viewBox="0 0 100 28" className="w-full h-7" preserveAspectRatio="none">
                      <polyline
                        points={sparklinePath}
                        fill="none"
                        stroke={trendingUp ? '#10b981' : '#ef4444'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <TrendingUp size={13} className={`flex-shrink-0 ${trendingUp ? 'text-emerald-500' : 'text-red-500 rotate-180'}`} />
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-2">
                  {sparklinePath ? 'Trend across recent checks' : 'Based on recent activity'}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Log activity to see score</p>
            )}
          </div>
        </div>

        {/* AI Feature cards */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">AI-Powered Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/symptom-check" className="card p-5 flex items-center gap-4 hover:border-sky-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">Symptom Check</p>
                <p className="text-xs text-slate-500">AI analysis + voice</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-sky-500 transition-colors flex-shrink-0" />
            </Link>

            <Link href="/medicine-checker" className="card p-5 flex items-center gap-4 hover:border-violet-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center flex-shrink-0">
                <Pill size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">Medicine Checker</p>
                <p className="text-xs text-slate-500">Drug interaction AI</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors flex-shrink-0" />
            </Link>

            <Link href="/mood-tracker" className="card p-5 flex items-center gap-4 hover:border-pink-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center flex-shrink-0">
                <Smile size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">Mood Tracker</p>
                <p className="text-xs text-slate-500">Mental health AI</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-pink-500 transition-colors flex-shrink-0" />
            </Link>

            <Link href="/appointments/new" className="card p-5 flex items-center gap-4 hover:border-emerald-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">Book Appointment</p>
                <p className="text-xs text-slate-500">Find a specialist</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* Appointments + Symptoms */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming appointments */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Upcoming Appointments</h2>
              <Link href="/appointments" className="text-xs text-sky-500 hover:text-sky-600 font-medium">
                View all →
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <Calendar size={32} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-500 mb-4">No upcoming appointments</p>
                <Link href="/appointments/new" className="btn btn-primary text-sm">
                  Book an appointment
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {upcoming.map(apt => {
                  const meta = statusMeta[apt.status] || statusMeta.PENDING
                  const StatusIcon = meta.icon
                  const dateStr = apt.appointmentDate || apt.scheduledDate
                  return (
                    <div key={apt.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <Calendar size={16} className="text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {apt.doctor?.name || 'Doctor TBD'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {apt.doctor?.specialization || 'Awaiting assignment'}
                          {dateStr && ` · ${new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                          {apt.appointmentTime && ` at ${apt.appointmentTime}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge ${meta.cls} gap-1`}>
                          <StatusIcon size={10} />
                          {meta.label}
                        </span>
                        <span className="badge bg-slate-100 text-slate-500 border-slate-200">{apt.type}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent symptom checks */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Recent Checks</h2>
              <Link href="/symptom-check" className="text-xs text-sky-500 hover:text-sky-600 font-medium">
                New →
              </Link>
            </div>

            {recentSymptoms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <ClipboardList size={28} className="text-slate-200 mb-3" />
                <p className="text-xs text-slate-500 mb-3">No symptom checks yet</p>
                <Link href="/symptom-check" className="btn btn-primary text-xs">
                  Start a check
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentSymptoms.map(log => {
                  const sev = severityMeta[log.severity] || severityMeta.LOW
                  let symptoms: string[] = []
                  try { symptoms = JSON.parse(log.symptoms) } catch { symptoms = [log.symptoms] }
                  return (
                    <div key={log.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`badge ${sev.cls}`}>{log.severity}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        {symptoms.slice(0, 3).join(', ') || 'No symptoms listed'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
