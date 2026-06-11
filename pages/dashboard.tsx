import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Calendar, FileText, Activity, ClipboardList, UserCircle, LogOut, Settings, Bell } from 'lucide-react'
import { useAppointmentUpdates } from '@/hooks/useAppointmentUpdates'

interface Appointment {
  id: string
  type: string
  status: string
  scheduledDate: string
  doctor: {
    name: string
    specialization: string
  } | null
}

interface SymptomLog {
  id: string
  symptoms: string
  severity: string
  aiResponse: string
  createdAt: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([])
  const [loading, setLoading] = useState(true)
  const [liveUpdate, setLiveUpdate] = useState<string | null>(null)

  // Real-time appointment status via Pusher
  const handleAppointmentUpdate = useCallback((update: { appointmentId: string; status: string }) => {
    setAppointments(prev =>
      prev.map(apt =>
        apt.id === update.appointmentId ? { ...apt, status: update.status } : apt
      )
    )
    setLiveUpdate(`Appointment status updated to ${update.status}`)
    setTimeout(() => setLiveUpdate(null), 5000)
  }, [])

  useAppointmentUpdates(session?.user?.id, handleAppointmentUpdate)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    } else if (session?.user?.role === 'DOCTOR') {
      router.push('/doctors/dashboard')
    } else if (session) {
      fetchDashboardData()
    }
  }, [session, status, router])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [appointmentsRes, symptomsRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/symptom-check/history?limit=3')
      ])

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json()
        setAppointments(appointmentsData.appointments || [])
      }

      if (symptomsRes.ok) {
        const symptomsData = await symptomsRes.json()
        setRecentSymptoms(symptomsData.logs || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-gradient">
        <div className="text-center bg-white/95 rounded-3xl p-12 shadow-2xl">
          <div className="relative">
            <div className="inline-block animate-spin rounded-full h-20 w-20 border-4 border-purple-500/30 border-t-purple-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-8 w-8 text-purple-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-gray-900 text-lg font-bold">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'PENDING' || apt.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-gradient">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 animate-slide-up shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">HealthAI</h1>
            </div>
            <div className="flex items-center space-x-3">
              {liveUpdate && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-xl animate-pulse">
                  <Bell size={14} />
                  {liveUpdate}
                </div>
              )}
              <div className="bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                <span className="text-gray-900 font-medium">
                  {session?.user?.name || session?.user?.email}
                </span>
              </div>
              <Link
                href="/settings"
                className="bg-gray-100 p-2 rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
                title="Settings & Emergency Card"
              >
                <Settings className="h-5 w-5 text-gray-700" />
              </Link>
              <Link
                href="/api/auth/signout"
                className="bg-gray-100 p-2 rounded-xl hover:bg-gray-200 transition-all border border-gray-200 group"
              >
                <LogOut className="h-5 w-5 text-gray-700 group-hover:text-red-600 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 animate-fade-in bg-white/95 rounded-2xl p-6 shadow-lg">
          <h2 className="text-4xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Patient'}! 👋
          </h2>
          <p className="text-gray-600 mt-3 text-lg">Here's your health overview</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Link
            href="/symptom-check"
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 hover-glow border border-white/50 group animate-scale-in"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Check Symptoms</h3>
                <p className="text-sm text-gray-600">AI Analysis</p>
              </div>
            </div>
          </Link>

          <Link
            href="/appointments/new"
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.1s' }}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Book Appointment</h3>
                <p className="text-sm text-gray-600">Schedule Visit</p>
              </div>
            </div>
          </Link>

          <Link
            href="/find-doctors"
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
                <UserCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Find Doctors</h3>
                <p className="text-sm text-gray-600">Near You</p>
              </div>
            </div>
          </Link>

          <Link
            href="/medical-records"
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.3s' }}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Medical Records</h3>
                <p className="text-sm text-gray-600">View History</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Upcoming Appointments</h3>
              <Link href="/appointments" className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors">
                View All →
              </Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No upcoming appointments</p>
                <Link
                  href="/appointments/new"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all font-semibold"
                >
                  Schedule an appointment
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">
                          {appointment.doctor?.name || 'Doctor Not Assigned'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {appointment.doctor?.specialization || 'Awaiting assignment'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(appointment.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg ${
                        appointment.status === 'CONFIRMED'
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                          : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Symptom Checks */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Recent Symptom Checks</h3>
              <Link href="/symptom-check" className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors">
                New Check →
              </Link>
            </div>
            {recentSymptoms.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No symptom checks yet</p>
                <Link
                  href="/symptom-check"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all font-semibold"
                >
                  Start symptom check
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSymptoms.map((log) => (
                  <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg ${
                        log.severity === 'CRITICAL' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' :
                        log.severity === 'HIGH' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' :
                        log.severity === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                        'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                      }`}>
                        {log.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{log.symptoms}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/50 hover-glow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Appointments</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{appointments.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl group-hover:scale-110 transition-transform shadow-lg">
                <Calendar className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/50 hover-glow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Symptom Checks</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{recentSymptoms.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl group-hover:scale-110 transition-transform shadow-lg">
                <ClipboardList className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/50 hover-glow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Upcoming</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{upcomingAppointments.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl group-hover:scale-110 transition-transform shadow-lg">
                <Activity className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
