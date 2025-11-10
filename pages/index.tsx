import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Redirect authenticated users to their appropriate dashboard
      if (session.user.role === 'DOCTOR') {
        router.push('/doctors/dashboard')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient">
        <div className="text-center bg-white/95 rounded-3xl p-12 shadow-2xl">
          <div className="relative">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500/30 border-t-purple-500"></div>
          </div>
          <p className="mt-6 text-gray-900 text-lg font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-white/50 relative z-10 animate-slide-up shadow-lg">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">HealthAI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 px-6 py-2 rounded-lg font-medium transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center animate-fade-in">
          <div className="inline-block mb-4">
            <span className="bg-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm border border-white/30 animate-scale-in text-purple-600 shadow-lg">
              ✨ Powered by Advanced AI Technology
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 mb-6 drop-shadow-2xl animate-slide-up bg-white/90 rounded-3xl py-6 px-8 inline-block">
            AI-Powered Health
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
              Assistant
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-900 mb-10 max-w-3xl mx-auto drop-shadow-lg animate-slide-up bg-white/90 rounded-2xl py-4 px-6 font-semibold" style={{ animationDelay: '0.1s' }}>
            Get instant symptom analysis, personalized health recommendations, and book appointments with qualified doctors
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link
              href="/auth/signin"
              className="group relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-5 rounded-2xl text-lg font-bold shadow-2xl transition-all transform hover:scale-110 hover-glow overflow-hidden"
            >
              <span className="relative z-10">Check Your Symptoms</span>
            </Link>
            <Link
              href="/find-doctors"
              className="bg-white text-purple-600 px-10 py-5 rounded-2xl text-lg font-bold shadow-2xl transition-all transform hover:scale-110 border-2 border-white backdrop-blur-lg hover:bg-gray-50"
            >
              Find Doctors Nearby
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 hover-glow border border-white/50 group animate-scale-in">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Symptom Checker</h3>
            <p className="text-gray-700">
              Chat with our AI assistant powered by GPT-4 to analyze your symptoms and get instant recommendations
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Severity Assessment</h3>
            <p className="text-gray-700">
              Automatic evaluation of your symptoms to determine if you need immediate care or can wait
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Easy Booking</h3>
            <p className="text-gray-700">
              Schedule appointments with doctors based on your symptoms, location, and availability
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Medical Records</h3>
            <p className="text-gray-700">
              Keep track of your health history, symptoms, and appointments all in one place
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Notifications</h3>
            <p className="text-gray-700">
              Get email and SMS confirmations for appointments and important health updates
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 hover-glow border border-white/50 group animate-scale-in" style={{ animationDelay: '0.5s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Find Nearby Doctors</h3>
            <p className="text-gray-700">
              Locate qualified doctors near you with specializations matching your needs
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-32 bg-white/95 rounded-3xl p-12 shadow-2xl">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">How It Works</h2>
          <p className="text-center text-gray-700 mb-16 text-lg">Your health journey in 4 simple steps</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl group-hover:scale-110 transition-transform pulse-slow">
                  1
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Describe Symptoms</h3>
              <p className="text-gray-600">Tell our AI about what you're experiencing</p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl group-hover:scale-110 transition-transform pulse-slow" style={{ animationDelay: '0.5s' }}>
                  2
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Get Analysis</h3>
              <p className="text-gray-600">Receive severity assessment and recommendations</p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl group-hover:scale-110 transition-transform pulse-slow" style={{ animationDelay: '1s' }}>
                  3
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Book Appointment</h3>
              <p className="text-gray-600">Schedule with a doctor if needed</p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl group-hover:scale-110 transition-transform pulse-slow" style={{ animationDelay: '1.5s' }}>
                  4
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1.5s' }}></div>
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Get Treatment</h3>
              <p className="text-gray-600">Receive care online or in person</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-16 text-center border border-white/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 animate-gradient"></div>
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Ready to Take Control of Your Health?
            </h2>
            <p className="text-2xl text-gray-700 mb-10 max-w-2xl mx-auto">
              Join thousands of users who trust HealthAI for their healthcare needs
            </p>
            <Link
              href="/auth/register"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-12 py-5 rounded-2xl text-xl font-bold shadow-2xl transition-all transform hover:scale-110 hover-glow"
            >
              Get Started Free
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-16 text-center">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-white/50 max-w-3xl mx-auto shadow-lg">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Disclaimer:</strong> This system is for educational and informational purposes only.
              It should NOT replace professional medical advice, diagnosis, or treatment. Always consult
              qualified healthcare professionals for medical concerns.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/95 border-t border-gray-200 mt-24 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-700">
            <p>&copy; 2024 HealthAI. Built for improving healthcare accessibility.</p>
            <p className="mt-2 text-sm text-gray-600">Powered by Next.js & OpenAI</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
