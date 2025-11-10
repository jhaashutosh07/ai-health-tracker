import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import SymptomChat from '../components/SymptomChat'
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react'

interface Assessment {
  symptoms: string[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  possibleConditions: string[]
  recommendation: string
  advice: string
  completed: boolean
}

export default function SymptomCheck() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showBooking, setShowBooking] = useState(false)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [symptomLogId, setSymptomLogId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  const handleAssessmentComplete = (completedAssessment: Assessment, logId: string) => {
    setAssessment(completedAssessment)
    setSymptomLogId(logId)

    // Show booking option if severity is MEDIUM or higher
    if (completedAssessment.severity === 'MEDIUM' ||
        completedAssessment.severity === 'HIGH' ||
        completedAssessment.severity === 'CRITICAL') {
      setShowBooking(true)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityMessage = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'Immediate medical attention required'
      case 'HIGH':
        return 'Please seek medical care soon'
      case 'MEDIUM':
        return 'Consider scheduling an appointment'
      case 'LOW':
        return 'Monitor your symptoms'
      default:
        return ''
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
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
              <h1 className="text-2xl font-bold text-gray-900">AI Symptom Checker</h1>
            </div>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Chat with AI Assistant</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Describe your symptoms in detail for an accurate assessment
                </p>
              </div>
              <div className="p-6">
                <SymptomChat onAssessmentComplete={handleAssessmentComplete} />
              </div>
            </div>

            {/* Assessment Summary */}
            {assessment && (
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Assessment Summary</h3>
                </div>

                {/* Severity Badge */}
                <div className="mb-4">
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border ${getSeverityColor(assessment.severity)}`}>
                    Severity: {assessment.severity} - {getSeverityMessage(assessment.severity)}
                  </span>
                </div>

                {/* Symptoms */}
                {assessment.symptoms && assessment.symptoms.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Reported Symptoms:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {assessment.symptoms.map((symptom, index) => (
                        <li key={index} className="text-gray-700">{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Possible Conditions */}
                {assessment.possibleConditions && assessment.possibleConditions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Possible Conditions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {assessment.possibleConditions.map((condition, index) => (
                        <li key={index} className="text-gray-700">{condition}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendation */}
                {assessment.recommendation && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Recommendation:</h4>
                    <p className="text-gray-700">{assessment.recommendation}</p>
                  </div>
                )}

                {/* Advice */}
                {assessment.advice && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Advice:</h4>
                    <p className="text-gray-700">{assessment.advice}</p>
                  </div>
                )}

                {/* Booking Option */}
                {showBooking && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-6 w-6 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          Would you like to book an appointment?
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Based on your symptoms, we recommend consulting with a doctor.
                        </p>
                        <Link
                          href={`/appointments/new${symptomLogId ? `?symptomLogId=${symptomLogId}` : ''}`}
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Book Appointment
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Important Notice</h3>
                  <p className="text-sm text-yellow-800">
                    This AI assistant is for informational purposes only and should not replace professional medical advice.
                    Always consult with a qualified healthcare provider for medical concerns.
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Emergency?</h3>
                  <p className="text-sm text-red-800 mb-2">
                    If you're experiencing a medical emergency, call emergency services immediately.
                  </p>
                  <a
                    href="tel:911"
                    className="inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    Call 911
                  </a>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Tips for Better Assessment</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Be specific about your symptoms</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Mention when symptoms started</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Describe the severity and frequency</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Include relevant medical history</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Mention any medications you're taking</span>
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/find-doctors"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Find Doctors
                </Link>
                <Link
                  href="/appointments/new"
                  className="block w-full text-center bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Book Appointment
                </Link>
                <Link
                  href="/medical-records"
                  className="block w-full text-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  View Records
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
