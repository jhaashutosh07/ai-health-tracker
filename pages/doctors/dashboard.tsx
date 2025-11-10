import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Calendar, Users, Activity, ClipboardList, LogOut, TrendingUp } from 'lucide-react'

interface Appointment {
  id: string
  type: string
  status: string
  scheduledDate: string
  patient: {
    name: string
    email: string
  }
  symptomLog: {
    symptoms: string
    severity: string
  } | null
}

export default function DoctorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    } else if (session?.user?.role !== 'DOCTOR') {
      router.push('/dashboard')
    } else if (session) {
      fetchAppointments()
    }
  }, [session, status, router])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/doctor/appointments')

      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])

        // Calculate stats
        const total = data.appointments?.length || 0
        const pending = data.appointments?.filter((apt: Appointment) => apt.status === 'PENDING').length || 0
        const confirmed = data.appointments?.filter((apt: Appointment) => apt.status === 'CONFIRMED').length || 0
        const completed = data.appointments?.filter((apt: Appointment) => apt.status === 'COMPLETED').length || 0

        setStats({ total, pending, confirmed, completed })
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/doctor/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appointmentId, status: newStatus }),
      })

      if (response.ok) {
        fetchAppointments()
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduledDate)
    const today = new Date()
    return aptDate.toDateString() === today.toDateString() &&
           (apt.status === 'PENDING' || apt.status === 'CONFIRMED')
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

  const upcomingAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(apt.scheduledDate)
      const today = new Date()
      return aptDate > today && (apt.status === 'PENDING' || apt.status === 'CONFIRMED')
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">HealthAI - Doctor Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Dr. {session?.user?.name || session?.user?.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, Dr. {session?.user?.name?.split(' ')[0] || 'Doctor'}!
          </h2>
          <p className="text-gray-600 mt-2">Here's your practice overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <Calendar className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <ClipboardList className="h-12 w-12 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Confirmed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.confirmed}</p>
              </div>
              <Users className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.completed}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Appointments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Today's Appointments</h3>
              <span className="text-sm text-gray-600">{todayAppointments.length} scheduled</span>
            </div>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{appointment.patient.name}</h4>
                        <p className="text-sm text-gray-600">{appointment.patient.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(appointment.scheduledDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                    {appointment.symptomLog && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">Symptoms:</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            appointment.symptomLog.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            appointment.symptomLog.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            appointment.symptomLog.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {appointment.symptomLog.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{appointment.symptomLog.symptoms}</p>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      {appointment.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'CONFIRMED')}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {(appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') && (
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'COMPLETED')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upcoming Appointments</h3>
              <Link href="/analytics" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Analytics
              </Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.patient.name}</h4>
                        <p className="text-sm text-gray-600">{appointment.type}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(appointment.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                    {appointment.symptomLog && (
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          appointment.symptomLog.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          appointment.symptomLog.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          appointment.symptomLog.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {appointment.symptomLog.severity} Severity
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
