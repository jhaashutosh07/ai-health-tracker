import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, MapPin, User, Plus } from 'lucide-react'

interface Appointment {
  id: string
  type: string
  status: string
  scheduledDate: string
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

export default function Appointments() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    } else if (session) {
      fetchAppointments()
    }
  }, [session, status, router])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/appointments')
      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  const filteredAppointments = filter === 'ALL'
    ? appointments
    : appointments.filter(apt => apt.status === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
            </div>
            <Link
              href="/appointments/new"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Appointment</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex flex-wrap border-b">
            {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as typeof filter)}
                className={`px-6 py-3 font-medium transition-colors ${
                  filter === status
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status}
                <span className="ml-2 text-sm">
                  ({status === 'ALL'
                    ? appointments.length
                    : appointments.filter(apt => apt.status === status).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No appointments found
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'ALL'
                ? "You haven't booked any appointments yet."
                : `You don't have any ${filter.toLowerCase()} appointments.`}
            </p>
            <Link
              href="/appointments/new"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Book Your First Appointment</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {appointment.doctor?.name || 'Doctor Not Assigned'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      {appointment.doctor && (
                        <p className="text-gray-600 mb-1">
                          {appointment.doctor.specialization}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(appointment.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(appointment.scheduledDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Type:</p>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="capitalize">{appointment.type.toLowerCase()}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                      <p className="text-gray-600">{appointment.reason}</p>
                    </div>
                  </div>

                  {appointment.symptomLog && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Related Symptoms:</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(appointment.symptomLog.severity)}`}>
                          {appointment.symptomLog.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{appointment.symptomLog.symptoms}</p>
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    </div>
                  )}

                  {appointment.doctor && (
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>{appointment.doctor.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
