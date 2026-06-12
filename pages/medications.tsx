import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import ConfirmDialog from '@/components/ConfirmDialog'
import { SkeletonMedications } from '@/components/Skeleton'

interface DoseLog {
  id: string
  date: string
  time: string
  status: string
}

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  times: string // JSON array
  instructions: string | null
  doseLogs: DoseLog[]
}

interface InteractionResult {
  overallSafety: 'SAFE' | 'CAUTION' | 'DANGER'
  interactions: { medicines: string[]; severity: string; description: string; recommendation: string }[]
  generalAdvice: string
  importantWarnings: string[]
  shouldConsultDoctor: boolean
}

const todayStr = () => new Date().toISOString().split('T')[0]

export default function Medications() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [interactions, setInteractions] = useState<InteractionResult | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [instructions, setInstructions] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00'])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session) fetchMedications()
  }, [session, status])

  const fetchMedications = async () => {
    setLoading(true)
    const res = await fetch('/api/medications')
    if (res.ok) setMedications((await res.json()).medications || [])
    setLoading(false)
  }

  const addMedication = async () => {
    if (!name.trim() || !dosage.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dosage, times: times.filter(Boolean), instructions }),
      })
      if (res.ok) {
        setName(''); setDosage(''); setInstructions(''); setTimes(['08:00'])
        setShowForm(false)
        setInteractions(null)
        toast.success('Medicine added to your tracker')
        fetchMedications()
      } else {
        toast.error((await res.json()).message || 'Failed to add medication')
      }
    } finally {
      setSaving(false)
    }
  }

  const removeMedication = async () => {
    if (!pendingDelete) return
    const { id, name: medName } = pendingDelete
    setPendingDelete(null)
    const res = await fetch(`/api/medications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setInteractions(null)
      toast.success(`${medName} removed`)
      fetchMedications()
    } else {
      toast.error('Failed to remove medicine')
    }
  }

  const logDose = async (medicationId: string, time: string, doseStatus: 'TAKEN' | 'SKIPPED') => {
    const res = await fetch('/api/medications/dose-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId, date: todayStr(), time, status: doseStatus }),
    })
    if (res.ok) fetchMedications()
  }

  const checkInteractions = async () => {
    if (medications.length === 0 || checking) return
    setChecking(true)
    setInteractions(null)
    try {
      const res = await fetch('/api/medicine-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines: medications.map(m => `${m.name} ${m.dosage}`) }),
      })
      if (res.ok) setInteractions(await res.json())
      else toast.error((await res.json()).message || 'Interaction check failed')
    } finally {
      setChecking(false)
    }
  }

  // Adherence over the last 7 days
  const allLogs = medications.flatMap(m => m.doseLogs)
  const taken = allLogs.filter(l => l.status === 'TAKEN').length
  const missed = allLogs.filter(l => l.status === 'MISSED').length
  const adherence = allLogs.length > 0 ? Math.round((taken / allLogs.length) * 100) : null

  const getDoseStatus = (med: Medication, time: string) =>
    med.doseLogs.find(l => l.date === todayStr() && l.time === time)?.status

  const safetyMeta = {
    SAFE:    { icon: ShieldCheck, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', iconCls: 'text-emerald-500', label: 'Safe combination' },
    CAUTION: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-700', iconCls: 'text-amber-500', label: 'Use with caution' },
    DANGER:  { icon: ShieldAlert, cls: 'bg-red-50 border-red-200 text-red-700', iconCls: 'text-red-500', label: 'Dangerous interaction' },
  }

  if (status === 'loading' || loading) {
    return (
      <AppShell title="My Medications">
        <SkeletonMedications />
      </AppShell>
    )
  }

  return (
    <AppShell title="My Medications">
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Medications</h1>
            <p className="text-slate-500 mt-1 text-sm">Track your medicines, log doses, and check for interactions with AI.</p>
          </div>
          <div className="flex gap-2">
            {medications.length > 0 && (
              <button onClick={checkInteractions} disabled={checking} className="btn bg-violet-600 hover:bg-violet-700 text-white gap-2 disabled:opacity-50">
                {checking ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {checking ? 'Analyzing…' : 'Check Interactions (AI)'}
              </button>
            )}
            <button onClick={() => setShowForm(v => !v)} className="btn btn-primary gap-2">
              {showForm ? <X size={15} /> : <Plus size={15} />}
              {showForm ? 'Cancel' : 'Add Medicine'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-3xl font-extrabold text-slate-900">{medications.length}</p>
            <p className="text-xs text-slate-500 mt-1">Active medicines</p>
          </div>
          <div className="card p-5">
            <p className={`text-3xl font-extrabold ${adherence === null ? 'text-slate-300' : adherence >= 80 ? 'text-emerald-600' : adherence >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {adherence === null ? '—' : `${adherence}%`}
            </p>
            <p className="text-xs text-slate-500 mt-1">Adherence (7 days)</p>
          </div>
          <div className="card p-5">
            <p className={`text-3xl font-extrabold ${missed > 0 ? 'text-red-600' : 'text-slate-900'}`}>{missed}</p>
            <p className="text-xs text-slate-500 mt-1">Missed doses (7 days)</p>
          </div>
        </div>

        {/* AI interaction result */}
        {interactions && (() => {
          const meta = safetyMeta[interactions.overallSafety] || safetyMeta.CAUTION
          const SafetyIcon = meta.icon
          return (
            <div className={`card p-5 border ${meta.cls}`}>
              <div className="flex items-center gap-3 mb-3">
                <SafetyIcon size={22} className={meta.iconCls} />
                <div>
                  <p className="font-bold text-sm">{meta.label}</p>
                  <p className="text-xs opacity-80">AI analysis of your {medications.length} saved medicine{medications.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {interactions.interactions.length > 0 && (
                <div className="space-y-2 mb-3">
                  {interactions.interactions.map((it, i) => (
                    <div key={i} className="bg-white/70 rounded-xl p-3 text-xs">
                      <p className="font-bold">{it.medicines.join(' + ')} <span className="font-semibold opacity-70">({it.severity})</span></p>
                      <p className="mt-1">{it.description}</p>
                      <p className="mt-1 font-semibold">→ {it.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs leading-relaxed">{interactions.generalAdvice}</p>
              {interactions.importantWarnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {interactions.importantWarnings.map((w, i) => (
                    <li key={i} className="text-xs flex gap-1.5"><span>⚠️</span><span>{w}</span></li>
                  ))}
                </ul>
              )}
              {interactions.shouldConsultDoctor && (
                <p className="mt-3 text-xs font-bold">Please consult a doctor or pharmacist about this combination.</p>
              )}
            </div>
          )
        })()}

        {/* Add form */}
        {showForm && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 text-sm">Add a medicine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Medicine name, e.g. Paracetamol (Dolo 650)" className="input text-sm" />
              <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Dosage, e.g. 650mg" className="input text-sm" />
            </div>
            <input value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Instructions (optional), e.g. After food" className="input text-sm w-full" />
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Scheduled times</p>
              <div className="flex flex-wrap gap-2 items-center">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      value={t}
                      onChange={e => setTimes(prev => prev.map((p, j) => (j === i ? e.target.value : p)))}
                      className="input text-sm w-28"
                    />
                    {times.length > 1 && (
                      <button onClick={() => setTimes(prev => prev.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setTimes(prev => [...prev, '20:00'])} className="text-xs text-sky-600 font-semibold hover:text-sky-700 flex items-center gap-1">
                  <Plus size={13} /> Add time
                </button>
              </div>
            </div>
            <button onClick={addMedication} disabled={saving || !name.trim() || !dosage.trim()} className="btn btn-primary gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Save medicine
            </button>
          </div>
        )}

        {/* Today's schedule */}
        {medications.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center px-6">
            <Pill size={36} className="text-slate-200 mb-4" />
            <p className="text-sm text-slate-500 mb-4">No medications added yet. Add your medicines to get daily reminders and AI interaction checks.</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary text-sm gap-2">
              <Plus size={15} /> Add your first medicine
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Today's Schedule</h2>
              <p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="divide-y divide-slate-50">
              {medications.map(med => {
                let medTimes: string[] = []
                try { medTimes = JSON.parse(med.times) } catch { medTimes = [] }
                return (
                  <div key={med.id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <Pill size={16} className="text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{med.name}</p>
                          <span className="badge bg-slate-100 text-slate-500 border-slate-200">{med.dosage}</span>
                          {med.instructions && <span className="text-xs text-slate-400">· {med.instructions}</span>}
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {medTimes.map(time => {
                            const doseStatus = getDoseStatus(med, time)
                            return (
                              <div key={time} className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                                doseStatus === 'TAKEN' ? 'bg-emerald-50 border-emerald-200' :
                                doseStatus === 'SKIPPED' || doseStatus === 'MISSED' ? 'bg-red-50 border-red-200' :
                                'bg-slate-50 border-slate-200'
                              }`}>
                                <Clock size={12} className="text-slate-400" />
                                <span className="font-semibold text-slate-700">{time}</span>
                                {doseStatus === 'TAKEN' ? (
                                  <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 size={12} /> Taken</span>
                                ) : doseStatus === 'SKIPPED' ? (
                                  <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={12} /> Skipped</span>
                                ) : doseStatus === 'MISSED' ? (
                                  <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={12} /> Missed</span>
                                ) : (
                                  <span className="flex gap-1">
                                    <button onClick={() => logDose(med.id, time, 'TAKEN')} className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors">Take</button>
                                    <button onClick={() => logDose(med.id, time, 'SKIPPED')} className="px-2 py-0.5 rounded-lg bg-slate-300 hover:bg-slate-400 text-white font-bold transition-colors">Skip</button>
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <button onClick={() => setPendingDelete({ id: med.id, name: med.name })} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0" title="Remove medicine">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center">
          Powered by OpenAI GPT-4o · A daily reminder email is sent each morning with your schedule. Not a substitute for professional medical advice.
        </p>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove medicine?"
        message={`${pendingDelete?.name || 'This medicine'} and its dose history will be permanently removed from your tracker.`}
        confirmLabel="Remove"
        danger
        onConfirm={removeMedication}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}
