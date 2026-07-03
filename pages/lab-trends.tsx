import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { FlaskConical, Upload, Loader2, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import AppShell from '@/components/AppShell'

interface Reading { date: string; name: string; value: number; unit: string; refLow: number | null; refHigh: number | null; flag: string }

const flagMeta: Record<string, { cls: string; icon: any }> = {
  high: { cls: 'text-red-600 bg-red-50', icon: ArrowUp },
  low: { cls: 'text-amber-600 bg-amber-50', icon: ArrowDown },
  normal: { cls: 'text-emerald-600 bg-emerald-50', icon: Minus },
  unknown: { cls: 'text-slate-500 bg-slate-50', icon: Minus },
}

export default function LabTrends() {
  const { status } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])
  useEffect(() => { try { setReadings(JSON.parse(localStorage.getItem('healthai_labs') || '[]')) } catch {} }, [])

  const save = (next: Reading[]) => { setReadings(next); localStorage.setItem('healthai_labs', JSON.stringify(next)) }

  const onFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image.'); return }
    const reader = new FileReader()
    reader.onload = async () => {
      const b64 = (reader.result as string).split(',')[1]
      setLoading(true)
      try {
        const res = await fetch('/api/lab-extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, mimeType: file.type }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)
        const date = data.result.reportDate || new Date().toISOString().split('T')[0]
        const added: Reading[] = (data.result.results || []).map((r: any) => ({ ...r, date }))
        if (!added.length) { toast.error('No numeric results found. Try a clearer photo.'); return }
        save([...readings, ...added])
        toast.success(`Added ${added.length} results from ${date}`)
      } catch (e: any) { toast.error(e.message || 'Extraction failed.') } finally { setLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  if (status === 'loading') return null

  // Group by test name.
  const byName = readings.reduce<Record<string, Reading[]>>((acc, r) => { (acc[r.name] ||= []).push(r); return acc }, {})
  const names = Object.keys(byName).sort()

  return (
    <AppShell title="Lab Trends" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lab Trends' }]}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0"><FlaskConical size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lab Report Trends</h1>
            <p className="text-slate-500 text-sm mt-1">Upload lab reports — AI reads the values and charts them over time so you can see trends.</p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={loading} className="w-full border-2 border-dashed border-slate-300 rounded-2xl py-10 flex flex-col items-center gap-2 text-slate-400 hover:border-teal-400 hover:text-teal-500 disabled:opacity-60">
          {loading ? <><Loader2 size={26} className="animate-spin" /><span className="text-sm font-medium">Reading report…</span></> : <><Upload size={26} /><span className="text-sm font-medium">Upload a lab report photo</span><span className="text-xs">JPG / PNG / WEBP</span></>}
        </button>

        {names.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No lab data yet — upload a report to start tracking your biomarkers.</div>
        ) : (
          <div className="space-y-4">
            {names.map(name => {
              const series = byName[name].slice().sort((a, b) => a.date.localeCompare(b.date))
              const latest = series[series.length - 1]
              const fm = flagMeta[latest.flag] || flagMeta.unknown
              const Icon = fm.icon
              return (
                <div key={name} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-400">{latest.refLow != null && latest.refHigh != null ? `Ref: ${latest.refLow}–${latest.refHigh} ${latest.unit}` : ''}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${fm.cls}`}>
                      <Icon size={14} /><span className="font-bold text-sm">{latest.value} {latest.unit}</span>
                    </div>
                  </div>
                  {series.length > 1 && (
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series.map(s => ({ date: s.date.slice(5), value: s.value }))}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                          <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" width={30} domain={['auto', 'auto']} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )
            })}
            <button onClick={() => save([])} className="text-xs text-slate-400 hover:text-red-500">Clear all lab data</button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
