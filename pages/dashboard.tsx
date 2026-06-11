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
} from 'lucide-react'
import AppShell from '@/components/AppShell'
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

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session?.user?.role === 'DOCTOR') router.push('/doctors/dashboard')
    else if (session) fetchData()
  }, [session, status])

  const fetchData = async () => {
    setLoading(true)
    const [aptRes, symRes] = await Promise.all([
      fetch('/api/appointments'),
      fetch('/api/symptom-check/history?limit=5'),
    ])
    if (aptRes.ok) setAppointments((await aptRes.json()).appointments || [])
    if (symRes.ok) setRecentSymptoms((await symRes.json()).logs || [])
    setLoading(false)
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

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
            <span>Loading your dashboard…</span>
          </div>
        </div>
      </AppShell>
    )
  }

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

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        {/* Quick actions row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/symptom-check" className="card p-5 flex items-center gap-4 hover:border-sky-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">Symptom Check</p>
              <p className="text-xs text-slate-500">AI-powered analysis</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 group-hover:text-sky-500 transition-colors flex-shrink-0" />
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

          <Link href="/settings" className="card p-5 flex items-center gap-4 hover:border-red-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">Emergency Card</p>
              <p className="text-xs text-slate-500">Setup your QR card</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors flex-shrink-0" />
          </Link>
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
