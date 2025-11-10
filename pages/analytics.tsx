import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, TrendingUp, Calendar, FileText, Download } from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalSymptomChecks: number
    totalAppointments: number
    pendingAppointments: number
    completedAppointments: number
  }
  symptomFrequency: { symptom: string; count: number }[]
  severityDistribution: { severity: string; count: number }[]
  symptomsOverTime: { month: string; count: number }[]
  appointmentStatus: { status: string; count: number }[]
  appointmentsOverTime: { month: string; count: number }[]
  recentActivity: {
    id: string
    type: string
    date: string
    description: string
    severity?: string
    status?: string
  }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const SEVERITY_COLORS: { [key: string]: string } = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444'
}

export default function Analytics() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchAnalytics()
    }
  }, [session])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/analytics/health')
      const data = await response.json()

      if (response.ok) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    window.print()
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Activity className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health Analytics</h1>
            <p className="mt-2 text-gray-600">Track your health journey and insights</p>
          </div>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download size={20} />
            <span>Export Report</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Symptom Checks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.summary.totalSymptomChecks}</p>
              </div>
              <Activity className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.summary.totalAppointments}</p>
              </div>
              <Calendar className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.summary.pendingAppointments}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.summary.completedAppointments}</p>
              </div>
              <FileText className="h-12 w-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Symptoms Over Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Symptom Checks Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.symptomsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Symptom Checks" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Severity Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Severity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.severityDistribution}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.severity}: ${entry.count}`}
                >
                  {analytics.severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Symptoms */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Reported Symptoms</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.symptomFrequency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="symptom" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Frequency" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Appointments Over Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Appointments Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.appointmentsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} name="Appointments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointment Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Appointment Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.appointmentStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {analytics.recentActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            ) : (
              analytics.recentActivity.map((activity) => (
                <div key={activity.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.type === 'symptom_check'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {activity.type === 'symptom_check' ? 'Symptom Check' : 'Appointment'}
                        </span>
                        {activity.severity && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.severity === 'LOW' ? 'bg-green-100 text-green-800' :
                            activity.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            activity.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activity.severity}
                          </span>
                        )}
                        {activity.status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            activity.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.status}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mt-1">{activity.description}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
