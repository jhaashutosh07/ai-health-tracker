import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Syringe, CheckCircle2, Circle, CalendarClock } from 'lucide-react'
import AppShell from '@/components/AppShell'

// India National Immunization Schedule (childhood) — ageMonths from birth.
const SCHEDULE: { vaccine: string; ageMonths: number; label: string }[] = [
  { vaccine: 'BCG, OPV-0, Hepatitis B-0', ageMonths: 0, label: 'At birth' },
  { vaccine: 'OPV-1, Pentavalent-1, Rotavirus-1, fIPV-1, PCV-1', ageMonths: 1.5, label: '6 weeks' },
  { vaccine: 'OPV-2, Pentavalent-2, Rotavirus-2', ageMonths: 2.5, label: '10 weeks' },
  { vaccine: 'OPV-3, Pentavalent-3, Rotavirus-3, fIPV-2, PCV-2', ageMonths: 3.5, label: '14 weeks' },
  { vaccine: 'Measles/MR-1, JE-1, PCV-Booster, Vitamin A-1', ageMonths: 9, label: '9–12 months' },
  { vaccine: 'DPT-Booster-1, Measles/MR-2, OPV-Booster, JE-2', ageMonths: 16, label: '16–24 months' },
  { vaccine: 'DPT-Booster-2, OPV', ageMonths: 60, label: '5–6 years' },
  { vaccine: 'Td (Tetanus & diphtheria)', ageMonths: 120, label: '10 years' },
  { vaccine: 'Td', ageMonths: 192, label: '16 years' },
]

function monthsBetween(dob: Date, now: Date) {
  return (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth()) + (now.getDate() >= dob.getDate() ? 0 : -1)
}

export default function Vaccinations() {
  const { status } = useSession()
  const router = useRouter()
  const [dob, setDob] = useState('')
  const [done, setDone] = useState<Record<number, boolean>>({})

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])
  useEffect(() => {
    try {
      setDob(localStorage.getItem('healthai_vax_dob') || '')
      setDone(JSON.parse(localStorage.getItem('healthai_vax_done') || '{}'))
    } catch {}
  }, [])

  const setDobSaved = (v: string) => { setDob(v); localStorage.setItem('healthai_vax_dob', v) }
  const toggle = (i: number) => { const n = { ...done, [i]: !done[i] }; setDone(n); localStorage.setItem('healthai_vax_done', JSON.stringify(n)) }

  if (status === 'loading') return null

  const ageM = dob ? monthsBetween(new Date(dob), new Date()) : null
  const statusOf = (i: number, ageMonths: number): 'done' | 'overdue' | 'due' | 'upcoming' => {
    if (done[i]) return 'done'
    if (ageM == null) return 'upcoming'
    if (ageM >= ageMonths + 1) return 'overdue'
    if (ageM >= ageMonths - 0.5) return 'due'
    return 'upcoming'
  }
  const statusMeta: Record<string, { label: string; cls: string }> = {
    done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' },
    overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700' },
    due: { label: 'Due now', cls: 'bg-amber-100 text-amber-700' },
    upcoming: { label: 'Upcoming', cls: 'bg-slate-100 text-slate-500' },
  }

  return (
    <AppShell title="Vaccinations" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vaccination Tracker' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Syringe size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Immunization Tracker</h1>
            <p className="text-slate-500 text-sm mt-1">India's National Immunization Schedule. Enter the date of birth to see what's due, overdue, or upcoming.</p>
          </div>
        </div>

        <div className="card p-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Child's date of birth</label>
          <input type="date" value={dob} onChange={e => setDobSaved(e.target.value)} className="input text-sm max-w-xs" />
          {ageM != null && <p className="text-xs text-slate-500 mt-2">Current age: {Math.floor(ageM / 12)}y {ageM % 12}m</p>}
        </div>

        <div className="space-y-2">
          {SCHEDULE.map((s, i) => {
            const st = statusOf(i, s.ageMonths); const m = statusMeta[st]
            return (
              <div key={i} className="card p-4 flex items-center gap-3">
                <button onClick={() => toggle(i)}>{done[i] ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-300" />}</button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{s.vaccine}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><CalendarClock size={11} /> {s.label}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.cls}`}>{m.label}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400">Reference schedule (NIS). Confirm exact timing with your pediatrician; adult/travel vaccines not shown.</p>
      </div>
    </AppShell>
  )
}
