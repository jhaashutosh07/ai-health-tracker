import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { ShieldCheck, Activity, HeartPulse, Scale } from 'lucide-react'
import AppShell from '@/components/AppShell'

type Tab = 'diabetes' | 'bmi' | 'heart'

export default function RiskCalculators() {
  const { status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('diabetes')
  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])

  // IDRS (Indian Diabetes Risk Score)
  const [age, setAge] = useState(30)
  const [waist, setWaist] = useState<'low' | 'mid' | 'high'>('low')
  const [activity, setActivity] = useState<'vigorous' | 'moderate' | 'mild' | 'sedentary'>('moderate')
  const [family, setFamily] = useState<'none' | 'one' | 'both'>('none')
  const idrs =
    (age < 35 ? 0 : age < 50 ? 20 : 30) +
    (waist === 'low' ? 0 : waist === 'mid' ? 10 : 20) +
    (activity === 'vigorous' ? 0 : activity === 'moderate' ? 10 : activity === 'mild' ? 20 : 30) +
    (family === 'none' ? 0 : family === 'one' ? 10 : 20)
  const idrsRisk = idrs >= 60 ? { label: 'High risk', cls: 'text-red-600', bar: 'bg-red-500' } : idrs >= 30 ? { label: 'Moderate risk', cls: 'text-amber-600', bar: 'bg-amber-500' } : { label: 'Low risk', cls: 'text-emerald-600', bar: 'bg-emerald-500' }

  // BMI
  const [weight, setWeight] = useState(65)
  const [height, setHeight] = useState(170)
  const bmi = height > 0 ? weight / ((height / 100) ** 2) : 0
  const bmiCat = bmi < 18.5 ? { label: 'Underweight', cls: 'text-sky-600' } : bmi < 23 ? { label: 'Normal (Asian)', cls: 'text-emerald-600' } : bmi < 25 ? { label: 'At risk', cls: 'text-amber-600' } : bmi < 30 ? { label: 'Overweight', cls: 'text-orange-600' } : { label: 'Obese', cls: 'text-red-600' }

  // Simple heart-risk heuristic
  const [hAge, setHAge] = useState(40)
  const [smoker, setSmoker] = useState(false)
  const [highBP, setHighBP] = useState(false)
  const [diabetic, setDiabetic] = useState(false)
  const hScore = (hAge >= 55 ? 2 : hAge >= 45 ? 1 : 0) + (smoker ? 2 : 0) + (highBP ? 2 : 0) + (diabetic ? 2 : 0)
  const heart = hScore >= 5 ? { label: 'High', cls: 'text-red-600', bar: 'bg-red-500', w: 90 } : hScore >= 3 ? { label: 'Moderate', cls: 'text-amber-600', bar: 'bg-amber-500', w: 55 } : { label: 'Low', cls: 'text-emerald-600', bar: 'bg-emerald-500', w: 25 }

  if (status === 'loading') return null
  const Chip = ({ on, onClick, children }: any) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${on ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{children}</button>
  )

  return (
    <AppShell title="Risk Calculators" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Risk Calculators' }]}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0"><ShieldCheck size={22} className="text-white" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900">Health Risk Calculators</h1><p className="text-slate-500 text-sm mt-1">Quick, validated screens for diabetes, weight and heart risk. Not a diagnosis.</p></div>
        </div>

        <div className="flex gap-2">
          {([['diabetes', 'Diabetes (IDRS)', Activity], ['bmi', 'BMI', Scale], ['heart', 'Heart risk', HeartPulse]] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium ${tab === t ? 'brand-gradient text-white' : 'bg-white border border-slate-200 text-slate-600'}`}><Icon size={14} /> {label}</button>
          ))}
        </div>

        {tab === 'diabetes' && (
          <div className="card p-6 space-y-5">
            <div><p className="text-sm font-semibold text-slate-700 mb-2">Age: {age}</p><input type="range" min={20} max={80} value={age} onChange={e => setAge(+e.target.value)} className="w-full accent-sky-500" /></div>
            <div><p className="text-sm font-semibold text-slate-700 mb-2">Waist</p><div className="flex flex-wrap gap-2"><Chip on={waist==='low'} onClick={()=>setWaist('low')}>Small (F&lt;80/M&lt;90cm)</Chip><Chip on={waist==='mid'} onClick={()=>setWaist('mid')}>Medium</Chip><Chip on={waist==='high'} onClick={()=>setWaist('high')}>Large (F≥90/M≥100)</Chip></div></div>
            <div><p className="text-sm font-semibold text-slate-700 mb-2">Physical activity</p><div className="flex flex-wrap gap-2"><Chip on={activity==='vigorous'} onClick={()=>setActivity('vigorous')}>Vigorous</Chip><Chip on={activity==='moderate'} onClick={()=>setActivity('moderate')}>Moderate</Chip><Chip on={activity==='mild'} onClick={()=>setActivity('mild')}>Mild</Chip><Chip on={activity==='sedentary'} onClick={()=>setActivity('sedentary')}>Sedentary</Chip></div></div>
            <div><p className="text-sm font-semibold text-slate-700 mb-2">Family history of diabetes</p><div className="flex flex-wrap gap-2"><Chip on={family==='none'} onClick={()=>setFamily('none')}>None</Chip><Chip on={family==='one'} onClick={()=>setFamily('one')}>One parent</Chip><Chip on={family==='both'} onClick={()=>setFamily('both')}>Both parents</Chip></div></div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-end justify-between"><span className="text-sm text-slate-500">IDRS score</span><span className={`text-3xl font-black ${idrsRisk.cls}`}>{idrs}<span className="text-sm text-slate-400">/100</span></span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2"><div className={`h-full ${idrsRisk.bar}`} style={{ width: `${idrs}%` }} /></div>
              <p className={`text-sm font-semibold mt-2 ${idrsRisk.cls}`}>{idrsRisk.label}{idrs >= 60 ? ' — get a blood sugar test soon.' : idrs >= 30 ? ' — consider screening.' : ' — keep it up.'}</p>
            </div>
          </div>
        )}

        {tab === 'bmi' && (
          <div className="card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(+e.target.value)} className="input text-sm" /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Height (cm)</label><input type="number" value={height} onChange={e => setHeight(+e.target.value)} className="input text-sm" /></div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-center">
              <p className={`text-5xl font-black ${bmiCat.cls}`}>{bmi.toFixed(1)}</p>
              <p className={`text-sm font-semibold mt-1 ${bmiCat.cls}`}>{bmiCat.label}</p>
              <p className="text-xs text-slate-400 mt-2">Asian-Indian BMI cut-offs: normal 18.5–22.9, at-risk 23–24.9, overweight ≥25.</p>
            </div>
          </div>
        )}

        {tab === 'heart' && (
          <div className="card p-6 space-y-5">
            <div><p className="text-sm font-semibold text-slate-700 mb-2">Age: {hAge}</p><input type="range" min={20} max={80} value={hAge} onChange={e => setHAge(+e.target.value)} className="w-full accent-sky-500" /></div>
            <div className="flex flex-wrap gap-2"><Chip on={smoker} onClick={()=>setSmoker(!smoker)}>Smoker</Chip><Chip on={highBP} onClick={()=>setHighBP(!highBP)}>High BP</Chip><Chip on={diabetic} onClick={()=>setDiabetic(!diabetic)}>Diabetic</Chip></div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-end justify-between"><span className="text-sm text-slate-500">Cardiovascular risk</span><span className={`text-2xl font-black ${heart.cls}`}>{heart.label}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2"><div className={`h-full ${heart.bar}`} style={{ width: `${heart.w}%` }} /></div>
              <p className="text-xs text-slate-400 mt-2">Simplified estimate. For an accurate risk, see a doctor for a lipid profile and BP check.</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
