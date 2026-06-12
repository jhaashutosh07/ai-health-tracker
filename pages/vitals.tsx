import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  HeartPulse,
  Droplets,
  Scale,
  Wind,
  Thermometer,
  Activity,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Skeleton } from '@/components/Skeleton'

interface Reading {
  id: string
  type: string
  systolic: number | null
  diastolic: number | null
  value: number | null
  unit: string
  context: string | null
  notes: string | null
  recordedAt: string
}

interface Insights {
  overallStatus: 'GOOD' | 'WATCH' | 'CONCERN'
  summary: string
  flags: { type: string; severity: string; finding: string; action: string }[]
  tips: string[]
}

const TYPES = [
  { key: 'BP',          label: 'Blood Pressure', icon: HeartPulse,  unit: 'mmHg',  color: '#ef4444', normal: '< 120/80' },
  { key: 'SUGAR',       label: 'Blood Sugar',    icon: Droplets,    unit: 'mg/dL', color: '#8b5cf6', normal: '70–140' },
  { key: 'WEIGHT',      label: 'Weight',         icon: Scale,       unit: 'kg',    color: '#0ea5e9', normal: 'BMI 18.5–25' },
  { key: 'SPO2',        label: 'SpO2',           icon: Wind,        unit: '%',     color: '#10b981', normal: '≥ 95%' },
  { key: 'TEMPERATURE', label: 'Temperature',    icon: Thermometer, unit: '°F',    color: '#f59e0b', normal: '97–99°F' },
  { key: 'PULSE',       label: 'Pulse',          icon: Activity,    unit: 'bpm',   color: '#ec4899', normal: '60–100' },
]

const statusMeta = {
  GOOD:    { icon: ShieldCheck,   cls: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Looking good' },
  WATCH:   { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   label: 'Worth watching' },
  CONCERN: { icon: ShieldAlert,   cls: 'bg-red-50 border-red-200',         text: 'text-red-700',     label: 'Needs attention' },
}

export default function Vitals() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('BP')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // Form
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [value, setValue] = useState('')
  const [context, setContext] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session) fetchReadings()
  }, [session, status])

  const fetchReadings = async () => {
    setLoading(true)
    const res = await fetch('/api/vitals?days=90')
    if (res.ok) setReadings((await res.json()).readings || [])
    setLoading(false)
  }

  const addReading = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          systolic: systolic || undefined,
          diastolic: diastolic || undefined,
          value: value || undefined,
          context: context || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Reading logged')
        setSystolic(''); setDiastolic(''); setValue(''); setContext('')
        setShowForm(false)
        setInsights(null)
        fetchReadings()
      } else {
        toast.error((await res.json()).message || 'Failed to save reading')
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteReading = async () => {
    if (!pendingDelete) return
    const id = pendingDelete
    setPendingDelete(null)
    const res = await fetch('/api/vitals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success('Reading deleted')
      fetchReadings()
    } else {
      toast.error('Failed to delete reading')
    }
  }

  const getInsights = async () => {
    if (analyzing) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/vitals/insights', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.insights) setInsights(data.insights)
        else toast.info(data.message)
      } else {
        toast.error(data.message || 'AI analysis failed')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const typeMeta = TYPES.find(t => t.key === activeType)!
  const typeReadings = useMemo(() => readings.filter(r => r.type === activeType), [readings, activeType])
  const latest = typeReadings[typeReadings.length - 1]

  const chartData = typeReadings.map(r => ({
    date: new Date(r.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    systolic: r.systolic,
    diastolic: r.diastolic,
    value: r.value,
  }))

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Vitals">
        <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-72" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Vitals">
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vitals Tracker</h1>
            <p className="text-slate-500 mt-1 text-sm">Log your readings and let AI watch the trends for you.</p>
          </div>
          <button onClick={getInsights} disabled={analyzing} className="btn bg-violet-600 hover:bg-violet-700 text-white gap-2 disabled:opacity-50">
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {analyzing ? 'Analyzing 90 days…' : 'AI Trend Analysis'}
          </button>
        </div>

        {/* AI insights */}
        {insights && (() => {
          const meta = statusMeta[insights.overallStatus] || statusMeta.WATCH
          const StatusIcon = meta.icon
          return (
            <div className={`card border p-5 ${meta.cls}`}>
              <div className="flex items-center gap-3 mb-2">
                <StatusIcon size={20} className={meta.text} />
                <p className={`font-bold text-sm ${meta.text}`}>{meta.label}</p>
                <button onClick={() => setInsights(null)} className="ml-auto p-1 rounded-lg text-slate-400 hover:bg-white/50"><X size={14} /></button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{insights.summary}</p>
              {insights.flags.length > 0 && (
                <div className="mt-3 space-y-2">
                  {insights.flags.map((f, i) => (
                    <div key={i} className="bg-white/70 rounded-xl p-3 text-xs">
                      <p className="font-bold text-slate-900">
                        {TYPES.find(t => t.key === f.type)?.label || f.type}
                        <span className={`ml-2 badge ${f.severity === 'ALERT' ? 'badge-critical' : f.severity === 'WARNING' ? 'badge-medium' : 'badge-confirmed'}`}>{f.severity}</span>
                      </p>
                      <p className="mt-1 text-slate-700">{f.finding}</p>
                      <p className="mt-1 font-semibold text-slate-900">→ {f.action}</p>
                    </div>
                  ))}
                </div>
              )}
              {insights.tips.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {insights.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span>💡</span><span>{tip}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )
        })()}

        {/* Type selector */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {TYPES.map(({ key, label, icon: Icon, color }) => {
            const last = readings.filter(r => r.type === key).slice(-1)[0]
            const active = activeType === key
            return (
              <button
                key={key}
                onClick={() => { setActiveType(key); setShowForm(false) }}
                className={`card p-3.5 text-left transition-all ${active ? 'ring-2 ring-sky-500/60 border-sky-200' : 'hover:shadow-md'}`}
              >
                <Icon size={16} style={{ color }} />
                <p className="text-[11px] font-semibold text-slate-500 mt-2 truncate">{label}</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {last
                    ? last.type === 'BP' ? `${last.systolic}/${last.diastolic}` : `${last.value}`
                    : '—'}
                  {last && <span className="text-[10px] font-medium text-slate-400 ml-1">{last.unit}</span>}
                </p>
              </button>
            )
          })}
        </div>

        {/* Chart + add */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">{typeMeta.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Normal: {typeMeta.normal} · Last 90 days</p>
            </div>
            <button onClick={() => setShowForm(v => !v)} className="btn btn-primary text-xs gap-1.5">
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? 'Cancel' : 'Log reading'}
            </button>
          </div>

          {showForm && (
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-end gap-3">
              {activeType === 'BP' ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Systolic</p>
                    <input type="number" value={systolic} onChange={e => setSystolic(e.target.value)} placeholder="120" className="input w-28 text-sm" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Diastolic</p>
                    <input type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)} placeholder="80" className="input w-28 text-sm" />
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{typeMeta.label} ({typeMeta.unit})</p>
                  <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} placeholder={activeType === 'SUGAR' ? '95' : activeType === 'SPO2' ? '98' : ''} className="input w-32 text-sm" />
                </div>
              )}
              {activeType === 'SUGAR' && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Context</p>
                  <select value={context} onChange={e => setContext(e.target.value)} className="input w-36 text-sm">
                    <option value="">Random</option>
                    <option value="FASTING">Fasting</option>
                    <option value="POST_MEAL">Post-meal</option>
                  </select>
                </div>
              )}
              <button onClick={addReading} disabled={saving} className="btn btn-primary gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Save
              </button>
            </div>
          )}

          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <typeMeta.icon size={32} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-500">No {typeMeta.label.toLowerCase()} readings yet. Log your first one above.</p>
            </div>
          ) : (
            <div className="p-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  {activeType === 'BP' ? (
                    <>
                      <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Systolic" />
                      <Line type="monotone" dataKey="diastolic" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Diastolic" />
                    </>
                  ) : (
                    <Line type="monotone" dataKey="value" stroke={typeMeta.color} strokeWidth={2} dot={{ r: 3 }} name={typeMeta.label} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent readings */}
        {typeReadings.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Recent {typeMeta.label} Readings</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {[...typeReadings].reverse().slice(0, 8).map(r => (
                <div key={r.id} className="px-6 py-3 flex items-center gap-4">
                  <p className="text-sm font-bold text-slate-900 w-28">
                    {r.type === 'BP' ? `${r.systolic}/${r.diastolic}` : r.value} <span className="text-[10px] font-medium text-slate-400">{r.unit}</span>
                  </p>
                  {r.context && <span className="badge bg-slate-100 text-slate-500 border-slate-200">{r.context.replace('_', ' ').toLowerCase()}</span>}
                  <p className="text-xs text-slate-400 ml-auto">
                    {new Date(r.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(r.recordedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <button onClick={() => setPendingDelete(r.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center">
          Powered by OpenAI GPT-4o · Self-logged readings — not a substitute for clinical measurement.
        </p>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this reading?"
        message="This vital reading will be permanently removed from your history."
        confirmLabel="Delete"
        danger
        onConfirm={deleteReading}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}
