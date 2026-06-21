import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  AlertCircle, Mail, Lock, User, Phone, MapPin,
  Eye, EyeOff, Activity, ArrowRight, CheckCircle2,
} from 'lucide-react'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    role: 'PATIENT',
    licenseNumber: '',
    medicalCouncil: '',
    registrationYear: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (formData.password.length < 8 || !/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError('Password must be at least 8 characters and include letters and numbers')
      setLoading(false)
      return
    }
    if (formData.role === 'DOCTOR' && (!formData.licenseNumber.trim() || !formData.medicalCouncil.trim() || !formData.registrationYear.trim())) {
      setError('Please provide your medical registration number, council, and registration year')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          city: formData.city || undefined,
          role: formData.role,
          ...(formData.role === 'DOCTOR' && {
            licenseNumber: formData.licenseNumber,
            medicalCouncil: formData.medicalCouncil,
            registrationYear: formData.registrationYear,
          }),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const result = await signIn('credentials', {
          redirect: false,
          email: formData.email,
          password: formData.password,
        })
        if (result?.error) {
          setError('Account created! Please sign in.')
          setTimeout(() => { window.location.href = '/auth/signin' }, 2000)
        } else if (formData.role === 'DOCTOR') {
          // Doctors land on the verification screen, which runs the IMR check
          // and emails them the outcome.
          window.location.href = '/doctor/verification'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        setError(data.message || 'Registration failed. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrong = formData.password.length >= 8 && /[A-Za-z]/.test(formData.password) && /[0-9]/.test(formData.password)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-500 rounded-2xl mb-4">
            <Activity size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-1 text-sm">Join HealthAI and take control of your health</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              {(['PATIENT', 'DOCTOR'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: r })}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    formData.role === r
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {r === 'PATIENT' ? 'I\'m a Patient' : 'I\'m a Doctor'}
                </button>
              ))}
            </div>

            {/* Doctor credentials — required for verification */}
            {formData.role === 'DOCTOR' && (
              <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                <p className="text-xs text-sky-700">
                  We verify every doctor before granting access to patient data. Enter your medical
                  registration details — we’ll check them against the Indian Medical Register and email
                  you once they’re confirmed.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medical registration number</label>
                  <input
                    name="licenseNumber" type="text"
                    className="input"
                    placeholder="e.g. NMC / state council reg. no."
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medical council</label>
                    <input
                      name="medicalCouncil" type="text"
                      className="input"
                      placeholder="e.g. Maharashtra Medical Council"
                      value={formData.medicalCouncil}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registration year</label>
                    <input
                      name="registrationYear" type="number" min={1950} max={new Date().getFullYear()}
                      className="input"
                      placeholder="e.g. 2016"
                      value={formData.registrationYear}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="name" type="text" required
                    className="input pl-9"
                    placeholder="Ashutosh Kumar"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email" type="email" autoComplete="email" required
                    className="input pl-9"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Phone + City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Phone <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="phone" type="tel"
                    className="input pl-9"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  City <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="city" type="text"
                    className="input pl-9"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="password" type={showPw ? 'text' : 'password'} autoComplete="new-password" required
                  className="input pl-9 pr-10"
                  placeholder="At least 8 characters, letters + numbers"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {formData.password.length > 0 && (
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${pwStrong ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <CheckCircle2 size={12} />
                  {pwStrong ? 'Strong password' : 'Use at least 8 characters with letters and numbers'}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="confirmPassword" type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password" required
                  className="input pl-9 pr-10"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </>
              ) : (
                <>Create account <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-sky-600 hover:text-sky-700 font-semibold">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400 mt-3">
          By signing up you agree to our{' '}
          <a href="#" className="underline hover:text-slate-600">Terms</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
