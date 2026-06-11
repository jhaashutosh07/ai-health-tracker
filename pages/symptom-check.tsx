import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  AlertTriangle,
  Calendar,
  Phone,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import SymptomChat from '../components/SymptomChat'
import AppShell from '@/components/AppShell'

interface Assessment {
  symptoms: string[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  possibleConditions: string[]
  recommendation: string
  advice: string
  completed: boolean
}

const severityMeta = {
  LOW:      { label: 'Low — Monitor at home',           cls: 'badge-low',      bg: 'bg-emerald-50 border-emerald-100' },
  MEDIUM:   { label: 'Medium — See a doctor soon',      cls: 'badge-medium',   bg: 'bg-amber-50 border-amber-100' },
  HIGH:     { label: 'High — Seek urgent care',         cls: 'badge-high',     bg: 'bg-orange-50 border-orange-100' },
  CRITICAL: { label: 'Critical — Emergency immediately', cls: 'badge-critical', bg: 'bg-red-50 border-red-100' },
}

const tips = [
  'Be specific — mention location, duration, and intensity',
  'Include when symptoms started (hours or days)',
  'Note if symptoms are constant or come and go',
  'Mention any medications you\'re currently taking',
  'Use voice input or upload a photo for faster assessment',
]

export default function SymptomCheck() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [symptomLogId, setSymptomLogId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  const handleAssessmentComplete = (a: Assessment, logId: string) => {
    setAssessment(a)
    setSymptomLogId(logId)
  }

  if (status === 'loading') {
    return (
      <AppShell title="Symptom Check">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
            Loading…
          </div>
        </div>
      </AppShell>
    )
  }

  const sevMeta = assessment ? (severityMeta[assessment.severity] ?? severityMeta.LOW) : null

  return (
    <AppShell
      title="AI Symptom Checker"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Symptom Check' }]}
    >
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

          {/* ── Main chat area ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Chat card */}
            <div className="card flex flex-col" style={{ height: 560 }}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Claude AI Health Assistant</p>
                  <p className="text-xs text-slate-400">Powered by Anthropic · voice &amp; image enabled</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <SymptomChat onAssessmentComplete={handleAssessmentComplete} />
              </div>
            </div>

            {/* Assessment result */}
            {assessment && sevMeta && (
              <div className={`card border p-6 ${sevMeta.bg}`}>
                <div className="flex items-center gap-3 mb-5">
                  <CheckCircle2 size={20} className="text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Assessment Complete</h3>
                  <span className={`badge ${sevMeta.cls} ml-auto`}>{sevMeta.label}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reported Symptoms</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assessment.symptoms.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white rounded-full text-xs text-slate-600 border border-slate-200">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Possible Conditions</p>
                    <ul className="space-y-1">
                      {assessment.possibleConditions.map((c, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                          <div className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-black/5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Advice</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{assessment.advice}</p>
                </div>

                {(assessment.severity === 'MEDIUM' || assessment.severity === 'HIGH' || assessment.severity === 'CRITICAL') && (
                  <div className="mt-5">
                    <Link
                      href={`/appointments/new${symptomLogId ? `?symptomLogId=${symptomLogId}` : ''}`}
                      className="btn btn-primary gap-2"
                    >
                      <Calendar size={15} />
                      Book an appointment
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="flex flex-col gap-4">
            {/* Emergency */}
            <div className="card border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Phone size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-red-900">Emergency?</p>
              </div>
              <p className="text-xs text-red-700 mb-3 leading-relaxed">
                If you're experiencing chest pain, difficulty breathing, or severe bleeding — call emergency services immediately.
              </p>
              <a href="tel:112" className="btn btn-danger text-xs gap-2 w-full justify-center">
                <Phone size={13} /> Call 112
              </a>
            </div>

            {/* Disclaimer */}
            <div className="card p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  This is for informational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={15} className="text-amber-500" />
                <p className="text-sm font-semibold text-slate-900">Tips for better results</p>
              </div>
              <ul className="space-y-2.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-px">
                      {i + 1}
                    </div>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-900 mb-3">Quick actions</p>
              <div className="space-y-2">
                {[
                  { label: 'Find doctors', href: '/find-doctors' },
                  { label: 'Book appointment', href: '/appointments/new' },
                  { label: 'Medical records', href: '/medical-records' },
                ].map(({ label, href }) => (
                  <Link key={href} href={href} className="flex items-center justify-between py-2 text-xs text-slate-600 hover:text-sky-600 transition-colors group">
                    {label}
                    <ArrowRight size={12} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
