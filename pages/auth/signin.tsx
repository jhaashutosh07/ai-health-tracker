import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  AlertCircle, Mail, Lock, Eye, EyeOff,
  Activity, ShieldCheck, Brain, Zap, ArrowRight,
} from 'lucide-react'

const features = [
  { icon: Brain, text: 'Claude AI symptom analysis' },
  { icon: ShieldCheck, text: 'Emergency medical card + QR' },
  { icon: Zap, text: 'Real-time appointment updates' },
]

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackUrl = (router.query.callbackUrl as string) || '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })
      if (result?.ok && !result?.error) {
        window.location.href = callbackUrl
      } else {
        setError('Invalid email or password. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[500px] flex-col bg-slate-900 text-white p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-10 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">HealthAI</span>
            <span className="text-[10px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full ml-1">
              Claude
            </span>
          </div>

          <div className="mt-auto mb-auto pt-16">
            <h1 className="text-4xl font-extrabold leading-tight">
              Your personal<br />
              <span className="text-gradient">health intelligence</span><br />
              platform.
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              AI-powered symptom analysis, emergency medical cards, and real-time doctor communication — all in one place.
            </p>

            <ul className="mt-8 space-y-4">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-sky-400" />
                  </div>
                  <span className="text-sm text-slate-300">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-600">
            Powered by Anthropic Claude · Built with Next.js
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">HealthAI</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="text-slate-500 mt-1 text-sm">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input pl-10 pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="btn btn-outline w-full justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3.5">
            <p className="text-xs font-semibold text-sky-700 mb-1.5">Demo credentials</p>
            <div className="text-xs text-slate-600 space-y-1">
              <p><span className="font-medium text-slate-700">Patient:</span> patient@example.com · password123</p>
              <p><span className="font-medium text-slate-700">Doctor:</span> doctor@example.com · password123</p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-sky-600 hover:text-sky-700 font-semibold">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
