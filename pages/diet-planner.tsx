import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Salad, Loader2, Sparkles, Utensils, Ban } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'

interface Meal { meal: string; items: string[]; note: string }
interface Plan { title: string; calories: string; meals: Meal[]; avoid: string[]; tips: string[] }

const GOALS = ['General healthy eating', 'Weight loss', 'Weight gain / muscle', 'Blood sugar control', 'Lower cholesterol / BP', 'Pregnancy nutrition']
const PREFS = ['Vegetarian', 'Vegan', 'Non-vegetarian', 'Eggetarian', 'Jain']

export default function DietPlanner() {
  const { status } = useSession()
  const router = useRouter()
  const [goal, setGoal] = useState(GOALS[0])
  const [conditions, setConditions] = useState('')
  const [preference, setPreference] = useState(PREFS[0])
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])

  const generate = async () => {
    setLoading(true); setPlan(null)
    try {
      const res = await fetch('/api/diet-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, conditions, preference }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setPlan(data.plan)
    } catch (e: any) { toast.error(e.message || 'Failed to build plan.') } finally { setLoading(false) }
  }

  if (status === 'loading') return null

  return (
    <AppShell title="Diet Planner" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Diet Planner' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-lime-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Salad size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Diet & Nutrition Planner</h1>
            <p className="text-slate-500 text-sm mt-1">A personalized 1-day Indian meal plan for your goal and health conditions.</p>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Goal</label><select value={goal} onChange={e => setGoal(e.target.value)} className="input text-sm">{GOALS.map(g => <option key={g}>{g}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Diet preference</label><select value={preference} onChange={e => setPreference(e.target.value)} className="input text-sm">{PREFS.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Health conditions <span className="font-normal text-slate-400">(optional)</span></label><input value={conditions} onChange={e => setConditions(e.target.value)} placeholder="e.g. diabetes, high BP, thyroid" className="input text-sm" /></div>
          <button onClick={generate} disabled={loading} className="btn btn-primary gap-2 disabled:opacity-50">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Building…</> : <><Sparkles size={15} /> Generate meal plan</>}
          </button>
        </div>

        {plan && (
          <div className="space-y-4">
            <div className="card p-5"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">{plan.title}</h2><span className="text-xs font-semibold text-lime-700 bg-lime-50 px-2.5 py-1 rounded-full">{plan.calories}</span></div></div>
            <div className="space-y-3">
              {plan.meals?.map((m, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-2 mb-2"><Utensils size={14} className="text-lime-600" /><p className="font-semibold text-slate-900 text-sm">{m.meal}</p></div>
                  <ul className="text-sm text-slate-700 space-y-1 mb-2">{m.items?.map((it, j) => <li key={j}>• {it}</li>)}</ul>
                  {m.note && <p className="text-xs text-slate-400">{m.note}</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5"><div className="flex items-center gap-1.5 mb-2"><Ban size={13} className="text-red-500" /><p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Limit / avoid</p></div><ul className="text-sm text-slate-700 space-y-1">{plan.avoid?.map((a, i) => <li key={i}>• {a}</li>)}</ul></div>
              <div className="card p-5"><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tips</p><ul className="text-sm text-slate-700 space-y-1">{plan.tips?.map((t, i) => <li key={i}>• {t}</li>)}</ul></div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
