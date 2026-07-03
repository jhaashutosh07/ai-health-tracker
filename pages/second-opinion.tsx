import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Users, Loader2, Stethoscope, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'

interface Specialist { specialty: string; opinion: string; likelyCauses: string[]; recommendation: string }
interface Panel { specialists: Specialist[]; consensus: string; urgency: string; disclaimer?: string }

const urgencyMeta: Record<string, { label: string; cls: string }> = {
  routine: { label: 'Routine', cls: 'bg-emerald-100 text-emerald-700' },
  'see-soon': { label: 'See a doctor soon', cls: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', cls: 'bg-orange-100 text-orange-700' },
  emergency: { label: 'Emergency', cls: 'bg-red-100 text-red-700' },
}

export default function SecondOpinion() {
  const { status } = useSession()
  const router = useRouter()
  const [caseText, setCaseText] = useState('')
  const [loading, setLoading] = useState(false)
  const [panel, setPanel] = useState<Panel | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])

  const run = async () => {
    if (caseText.trim().length < 10) { toast.error('Please describe the case in more detail.'); return }
    setLoading(true); setPanel(null)
    try {
      const res = await fetch('/api/second-opinion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseText }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setPanel(data.result)
    } catch (e: any) { toast.error(e.message || 'Failed to run panel.') } finally { setLoading(false) }
  }

  if (status === 'loading') return null
  const u = panel ? (urgencyMeta[panel.urgency] || urgencyMeta['see-soon']) : null

  return (
    <AppShell title="Second Opinion" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Second Opinion' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Users size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Second-Opinion Panel</h1>
            <p className="text-slate-500 text-sm mt-1">Describe the case — a virtual panel of specialists each weigh in, then agree on a consensus. Not a medical diagnosis.</p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <textarea value={caseText} onChange={e => setCaseText(e.target.value)} rows={5}
            placeholder="Describe symptoms, duration, age, existing conditions, medications, and any test results…"
            className="input resize-none text-sm" />
          <button onClick={run} disabled={loading} className="btn btn-primary gap-2 disabled:opacity-50">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Convening panel…</> : <><Stethoscope size={15} /> Get panel opinion</>}
          </button>
        </div>

        {panel && (
          <div className="space-y-4">
            {u && (
              <div className="card p-5 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /><h2 className="font-bold text-slate-900">Panel consensus</h2></div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${u.cls}`}>{u.label}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{panel.consensus}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {panel.specialists?.map((s, i) => (
                <div key={i} className="card p-5">
                  <p className="font-bold text-violet-700 text-sm mb-2 flex items-center gap-1.5"><Stethoscope size={14} />{s.specialty}</p>
                  <p className="text-sm text-slate-700 mb-3">{s.opinion}</p>
                  {s.likelyCauses?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Considers</p>
                      <p className="text-xs text-slate-600">{s.likelyCauses.join(' · ')}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-700 bg-sky-50 rounded-lg px-3 py-2"><span className="font-semibold">Advises:</span> {s.recommendation}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              {panel.disclaimer || 'This is an AI-generated panel for guidance only, not a diagnosis. Consult a qualified doctor.'}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
