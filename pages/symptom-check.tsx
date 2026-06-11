import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  AlertTriangle, Phone, Lightbulb, CheckCircle2, ArrowRight,
  Pill, Leaf, ShieldAlert, Clock, Calendar, Activity,
} from 'lucide-react'
import SymptomChat from '../components/SymptomChat'
import AppShell from '@/components/AppShell'

interface Condition {
  name: string
  probability: number
  reasoning: string
}

interface Medicine {
  name: string
  type: 'OTC' | 'PRESCRIPTION' | 'ADVICE'
  purpose: string
  dosage: string
  warning?: string
}

interface Assessment {
  symptoms: string[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  possibleConditions: (Condition | string)[]
  medicineSuggestions?: Medicine[]
  nonMedicineApproaches?: string[]
  redFlags?: string[]
  recoveryTimeline?: string
  recommendation: string
  advice: string
  completed: boolean
}

const severityConfig = {
  LOW:      { label: 'Low Risk — Monitor at home',      headerBg: 'bg-emerald-600', badgeBg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-100' },
  MEDIUM:   { label: 'Moderate — See a doctor soon',    headerBg: 'bg-amber-500',   badgeBg: 'bg-amber-100 text-amber-700',    border: 'border-amber-100' },
  HIGH:     { label: 'High Risk — Seek urgent care',    headerBg: 'bg-orange-600',  badgeBg: 'bg-orange-100 text-orange-700',  border: 'border-orange-100' },
  CRITICAL: { label: 'Critical — Go to emergency now',  headerBg: 'bg-red-600',     badgeBg: 'bg-red-100 text-red-700',        border: 'border-red-100' },
}

const tips = [
  'Be specific — mention location, duration, and intensity',
  'Include when symptoms started (hours or days)',
  'Note if symptoms are constant or come and go',
  'Mention any medications you\'re currently taking',
  'Use voice input or upload a photo for faster assessment',
]

const barColors = ['bg-sky-500', 'bg-violet-500', 'bg-amber-400', 'bg-emerald-500']

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
    setTimeout(() => {
      document.getElementById('assessment-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
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

  const sev = assessment ? (severityConfig[assessment.severity] ?? severityConfig.LOW) : null

  const conditions: Condition[] = assessment
    ? assessment.possibleConditions.map(c =>
        typeof c === 'string' ? { name: c, probability: 0, reasoning: '' } : c
      )
    : []

  const medicines = assessment?.medicineSuggestions || []
  const nonMed = assessment?.nonMedicineApproaches || []
  const redFlags = assessment?.redFlags || []

  return (
    <AppShell
      title="AI Symptom Checker"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Symptom Check' }]}
    >
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Chat */}
            <div className="card flex flex-col" style={{ height: 560 }}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">AI Health Assistant</p>
                  <p className="text-xs text-slate-400">GPT-4o powered · voice &amp; image enabled</p>
                </div>
                {assessment && (
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${sev?.badgeBg}`}>
                    Assessment Ready ↓
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <SymptomChat onAssessmentComplete={handleAssessmentComplete} />
              </div>
            </div>

            {/* ── Assessment Panel ── */}
            {assessment && sev && (
              <div id="assessment-panel" className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

                {/* Severity header */}
                <div className={`${sev.headerBg} px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Activity size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">AI Health Assessment</p>
                        <p className="text-white/70 text-xs mt-0.5">{sev.label}</p>
                      </div>
                    </div>
                    <CheckCircle2 size={22} className="text-white/80" />
                  </div>
                </div>

                <div className="bg-white p-6 space-y-6">

                  {/* Advice + Symptoms row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Symptoms Reported</p>
                      <div className="flex flex-wrap gap-1.5">
                        {assessment.symptoms.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">AI Advice</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{assessment.advice}</p>
                    </div>
                  </div>

                  {/* Conditions with probability bars */}
                  {conditions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Possible Conditions</p>
                      <div className="space-y-4">
                        {conditions.map((c, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                              {c.probability > 0 && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${barColors[i % barColors.length]}`}>
                                  {c.probability}%
                                </span>
                              )}
                            </div>
                            {c.probability > 0 && (
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div
                                  className={`h-full rounded-full ${barColors[i % barColors.length]}`}
                                  style={{ width: `${c.probability}%` }}
                                />
                              </div>
                            )}
                            {c.reasoning && <p className="text-xs text-slate-500">{c.reasoning}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medicines + Non-medicine two-column */}
                  {(medicines.length > 0 || nonMed.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                      {/* Medicines */}
                      {medicines.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-3">
                            <Pill size={13} className="text-sky-600" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medicine Suggestions</p>
                          </div>
                          <div className="space-y-2">
                            {medicines.map((m, i) => (
                              <div key={i} className={`rounded-xl p-3 border ${
                                m.type === 'ADVICE'
                                  ? 'bg-amber-50 border-amber-100'
                                  : m.type === 'PRESCRIPTION'
                                  ? 'bg-violet-50 border-violet-100'
                                  : 'bg-sky-50 border-sky-100'
                              }`}>
                                <div className="flex items-start justify-between gap-2 mb-0.5">
                                  <p className="text-xs font-semibold text-slate-800 leading-snug">{m.name}</p>
                                  {m.type !== 'ADVICE' && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                      m.type === 'PRESCRIPTION' ? 'bg-violet-200 text-violet-700' : 'bg-sky-200 text-sky-700'
                                    }`}>{m.type}</span>
                                  )}
                                </div>
                                {m.purpose && <p className="text-[11px] text-slate-500">{m.purpose}</p>}
                                {m.dosage && <p className="text-[11px] font-medium text-slate-700 mt-0.5">{m.dosage}</p>}
                                {m.warning && (
                                  <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                                    <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />{m.warning}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Non-medicine */}
                      {nonMed.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-3">
                            <Leaf size={13} className="text-emerald-600" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Natural Approaches</p>
                          </div>
                          <ul className="space-y-2">
                            {nonMed.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-px">{i + 1}</div>
                                <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Red flags */}
                  {redFlags.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <ShieldAlert size={15} className="text-red-600" />
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Seek Immediate Medical Care If You Experience</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {redFlags.map((flag, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                            <p className="text-xs text-red-700">{flag}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recovery + CTA */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 border-t border-slate-100">
                    {assessment.recoveryTimeline && (
                      <div className="flex items-center gap-2 flex-1">
                        <Clock size={14} className="text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Recovery: </span>
                          {assessment.recoveryTimeline}
                        </p>
                      </div>
                    )}
                    {(assessment.severity === 'MEDIUM' || assessment.severity === 'HIGH' || assessment.severity === 'CRITICAL') && (
                      <Link
                        href={`/appointments/new${symptomLogId ? `?symptomLogId=${symptomLogId}` : ''}`}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all whitespace-nowrap"
                      >
                        <Calendar size={14} />
                        Book a Doctor
                        <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="flex flex-col gap-4">
            <div className="card border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Phone size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-red-900">Emergency?</p>
              </div>
              <p className="text-xs text-red-700 mb-3 leading-relaxed">
                Chest pain, difficulty breathing, severe bleeding — call immediately.
              </p>
              <a href="tel:112" className="btn btn-danger text-xs gap-2 w-full justify-center">
                <Phone size={13} /> Call 112
              </a>
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  This is for informational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.
                </p>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={15} className="text-amber-500" />
                <p className="text-sm font-semibold text-slate-900">Tips for better results</p>
              </div>
              <ul className="space-y-2.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-px">{i + 1}</div>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

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
