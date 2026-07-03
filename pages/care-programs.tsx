import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { HeartPulse, Loader2, Sparkles, CheckCircle2, Circle, AlertTriangle, Flame } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Plan {
  title: string; summary: string
  dailyTasks: { task: string; why: string }[]
  weeklyTargets: string[]; warningSigns: string[]; diet: string[]
}

const CONDITIONS = ['Type 2 Diabetes', 'Hypertension (High BP)', 'High Cholesterol', 'Obesity / Weight', 'Thyroid (Hypothyroid)', 'PCOS']
const todayKey = () => new Date().toISOString().split('T')[0]

export default function CarePrograms() {
  const { status } = useSession()
  const router = useRouter()
  const { lang } = useLanguage()
  const [condition, setCondition] = useState(CONDITIONS[0])
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [done, setDone] = useState<Record<number, boolean>>({})

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('healthai_care_plan') || 'null')
      if (saved?.plan) { setPlan(saved.plan); setCondition(saved.condition || CONDITIONS[0]) }
      const d = JSON.parse(localStorage.getItem('healthai_care_done_' + todayKey()) || '{}')
      setDone(d)
    } catch {}
  }, [])

  const generate = async () => {
    setLoading(true); setPlan(null); setDone({})
    try {
      const res = await fetch('/api/care-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ condition, lang }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setPlan(data.plan)
      localStorage.setItem('healthai_care_plan', JSON.stringify({ plan: data.plan, condition }))
    } catch (e: any) { toast.error(e.message || 'Failed to build plan.') } finally { setLoading(false) }
  }

  const toggle = (i: number) => {
    const next = { ...done, [i]: !done[i] }
    setDone(next)
    localStorage.setItem('healthai_care_done_' + todayKey(), JSON.stringify(next))
  }

  if (status === 'loading') return null
  const total = plan?.dailyTasks.length || 0
  const completed = Object.values(done).filter(Boolean).length
  const pct = total ? Math.round((completed / total) * 100) : 0

  return (
    <AppShell title="Care Programs" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Chronic Care' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0"><HeartPulse size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chronic Care Programs</h1>
            <p className="text-slate-500 text-sm mt-1">A personalized daily plan for your condition, with check-off tasks and AI guidance. Supplements — not replaces — your doctor.</p>
          </div>
        </div>

        <div className="card p-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value)} className="input text-sm">
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={loading} className="btn btn-primary gap-2 disabled:opacity-50">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Building…</> : <><Sparkles size={15} /> Build my plan</>}
          </button>
        </div>

        {plan && (
          <>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-slate-900">{plan.title}</h2>
                <div className="flex items-center gap-1.5 text-sm font-bold text-rose-600"><Flame size={15} /> {pct}%</div>
              </div>
              <p className="text-sm text-slate-500 mb-3">{plan.summary}</p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500 transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="text-xs text-slate-400 mt-2">{completed}/{total} of today's tasks done</p>
            </div>

            <div className="card p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Today's tasks</p>
              <div className="space-y-2">
                {plan.dailyTasks.map((t, i) => (
                  <button key={i} onClick={() => toggle(i)} className="w-full flex items-start gap-3 text-left p-2 rounded-xl hover:bg-slate-50">
                    {done[i] ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <Circle size={18} className="text-slate-300 flex-shrink-0 mt-0.5" />}
                    <span><span className={`text-sm ${done[i] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.task}</span><span className="block text-xs text-slate-400">{t.why}</span></span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5"><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Weekly targets</p><ul className="space-y-1.5 text-sm text-slate-700">{plan.weeklyTargets?.map((w, i) => <li key={i}>• {w}</li>)}</ul></div>
              <div className="card p-5"><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Diet focus</p><ul className="space-y-1.5 text-sm text-slate-700">{plan.diet?.map((d, i) => <li key={i}>• {d}</li>)}</ul></div>
            </div>

            <div className="card p-5 bg-red-50 border-red-100">
              <div className="flex items-center gap-1.5 mb-2"><AlertTriangle size={14} className="text-red-600" /><p className="text-xs font-bold text-red-700 uppercase tracking-wide">See a doctor urgently if</p></div>
              <ul className="space-y-1 text-sm text-red-700">{plan.warningSigns?.map((w, i) => <li key={i}>• {w}</li>)}</ul>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
