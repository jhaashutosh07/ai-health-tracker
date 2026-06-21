import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { ShieldCheck, Loader2, MailCheck, AlertTriangle, Activity } from 'lucide-react'

type Status = 'PENDING' | 'VERIFIED' | 'REJECTED'

export default function DoctorVerification() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState<Status>('PENDING')

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/auth/signin')
      return
    }
    if (authStatus !== 'authenticated') return
    if (session?.user?.role !== 'DOCTOR') {
      router.replace('/dashboard')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        // If already verified, go straight to the dashboard.
        const statusRes = await fetch('/api/doctor/verify-registration')
        const current = statusRes.ok ? (await statusRes.json()).status : 'PENDING'
        if (current === 'VERIFIED') {
          router.replace('/doctors/dashboard')
          return
        }

        // Kick off (or re-run) the automated IMR check.
        const res = await fetch('/api/doctor/verify-registration', { method: 'POST' })
        const data = res.ok ? await res.json() : { status: current }
        if (cancelled) return

        if (data.status === 'VERIFIED') {
          router.replace('/doctors/dashboard')
          return
        }
        setStatus((data.status as Status) || 'PENDING')
      } catch {
        if (!cancelled) setStatus('PENDING')
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => { cancelled = true }
  }, [authStatus, session?.user?.role])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">HealthAI</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          {checking ? (
            <>
              <Loader2 size={40} className="text-sky-500 mx-auto animate-spin" />
              <h1 className="text-xl font-bold text-slate-900 mt-5">Verifying your registration…</h1>
              <p className="text-slate-500 mt-2 text-sm">
                We’re checking your medical registration number against the Indian Medical Register (IMR). This only takes a moment.
              </p>
            </>
          ) : status === 'REJECTED' ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle size={26} className="text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-5">We couldn’t confirm your registration</h1>
              <p className="text-slate-500 mt-2 text-sm">
                The details you provided didn’t match an Indian Medical Register record. We’ve emailed you the next steps —
                reply with your correct registration number and issuing council and we’ll review it manually.
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto">
                <MailCheck size={26} className="text-sky-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-5">Verification in progress</h1>
              <p className="text-slate-500 mt-2 text-sm">
                Thanks for signing up. We’re verifying your medical registration against the Indian Medical Register.
                <strong className="text-slate-700"> We’ll email you as soon as your credentials are confirmed</strong> — your
                patient features unlock automatically once they match.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} />
                You can safely close this page.
              </div>
            </>
          )}

          <button
            onClick={() => router.replace('/auth/signin')}
            className="mt-8 text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}
