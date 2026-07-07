import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Brain, RotateCcw, LifeBuoy } from 'lucide-react'
import AppShell from '@/components/AppShell'

const PHQ9 = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling/staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself, or that you are a failure',
  'Trouble concentrating on things',
  'Moving/speaking slowly, or being fidgety/restless',
  'Thoughts that you would be better off dead or of hurting yourself',
]
const GAD7 = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
]
const OPTS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']

function phqSeverity(s: number) {
  if (s >= 20) return { label: 'Severe depression', cls: 'text-red-600' }
  if (s >= 15) return { label: 'Moderately severe', cls: 'text-orange-600' }
  if (s >= 10) return { label: 'Moderate', cls: 'text-amber-600' }
  if (s >= 5) return { label: 'Mild', cls: 'text-yellow-600' }
  return { label: 'Minimal', cls: 'text-emerald-600' }
}
function gadSeverity(s: number) {
  if (s >= 15) return { label: 'Severe anxiety', cls: 'text-red-600' }
  if (s >= 10) return { label: 'Moderate', cls: 'text-amber-600' }
  if (s >= 5) return { label: 'Mild', cls: 'text-yellow-600' }
  return { label: 'Minimal', cls: 'text-emerald-600' }
}

export default function Screenings() {
  const { status } = useSession()
  const router = useRouter()
  const [test, setTest] = useState<'phq9' | 'gad7'>('phq9')
  const [ans, setAns] = useState<Record<number, number>>({})
  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])

  const questions = test === 'phq9' ? PHQ9 : GAD7
  const reset = () => setAns({})
  const switchTest = (t: 'phq9' | 'gad7') => { setTest(t); setAns({}) }
  const total = Object.values(ans).reduce((a, b) => a + b, 0)
  const done = Object.keys(ans).length === questions.length
  const sev = test === 'phq9' ? phqSeverity(total) : gadSeverity(total)
  const flagSelfHarm = test === 'phq9' && (ans[8] ?? 0) >= 1

  if (status === 'loading') return null

  return (
    <AppShell title="Screenings" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mental Health Screenings' }]}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-fuchsia-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Brain size={22} className="text-white" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900">Mental Health Screenings</h1><p className="text-slate-500 text-sm mt-1">Standard, validated questionnaires (PHQ-9 & GAD-7). A screen, not a diagnosis.</p></div>
        </div>

        <div className="flex gap-2">
          {(['phq9', 'gad7'] as const).map(t => (
            <button key={t} onClick={() => switchTest(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${test === t ? 'brand-gradient text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{t === 'phq9' ? 'PHQ-9 (Depression)' : 'GAD-7 (Anxiety)'}</button>
          ))}
        </div>

        <p className="text-sm text-slate-500">Over the last 2 weeks, how often have you been bothered by:</p>

        <div className="space-y-3">
          {questions.map((qn, i) => (
            <div key={i} className="card p-4">
              <p className="text-sm font-medium text-slate-800 mb-3">{i + 1}. {qn}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OPTS.map((o, v) => (
                  <button key={v} onClick={() => setAns(a => ({ ...a, [i]: v }))} className={`text-xs px-2 py-2 rounded-lg border-2 transition-all ${ans[i] === v ? 'border-violet-500 bg-violet-50 text-violet-700 font-semibold' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{o}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card p-6 sticky bottom-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Score: {total} / {questions.length * 3}{!done && <span className="text-amber-500"> · answer all {questions.length}</span>}</p>
              {done && <p className={`text-2xl font-black ${sev.cls}`}>{sev.label}</p>}
            </div>
            <button onClick={reset} className="btn btn-outline text-xs gap-1.5"><RotateCcw size={13} /> Reset</button>
          </div>
          {done && (
            <p className="text-sm text-slate-600 mt-3">
              {total >= 10 ? 'Your score suggests it would help to talk to a doctor or mental-health professional.' : total >= 5 ? 'Mild symptoms — keep an eye on how you feel and practise self-care.' : 'Your responses suggest minimal symptoms right now.'}
            </p>
          )}
          {(flagSelfHarm || (done && total >= 15)) && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <LifeBuoy size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">If you're struggling or having thoughts of self-harm, please reach out now — iCall 9152987821, Vandrevala 1860-2662-345, or emergency 112. You're not alone.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
