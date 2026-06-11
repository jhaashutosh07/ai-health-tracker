import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Repeat, Calendar, AlertTriangle,
  Clock, Sun, ClipboardList, ArrowRight, Loader2, BarChart2,
} from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Pattern {
  title: string
  description: string
  type: string
  severity: 'info' | 'warning' | 'alert'
  icon: string
}

interface TopSymptom { name: string; count: number }

interface RecentLog {
  id: string
  date: string
  severity: string
  symptoms: string[]
  diagnosis: string | null
}

const iconMap: Record<string, any> = {
  repeat: Repeat,
  calendar: Calendar,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  alert: AlertTriangle,
  clock: Clock,
  sun: Sun,
}

const severityStyle: Record<string, { card: string; icon: string; badge: string }> = {
  info:    { card: 'bg-sky-50 border-sky-100',    icon: 'text-sky-500 bg-sky-100',    badge: 'bg-sky-100 text-sky-700' },
  warning: { card: 'bg-amber-50 border-amber-100', icon: 'text-amber-600 bg-amber-100', badge: 'bg-amber-100 text-amber-700' },
  alert:   { card: 'bg-red-50 border-red-100',    icon: 'text-red-600 bg-red-100',    badge: 'bg-red-100 text-red-700' },
}

const logSevStyle: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function SymptomPatterns() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    insufficientData: boolean
    count: number
    needed?: number
    patterns: Pattern[]
    topSymptoms: TopSymptom[]
    recentLogs: RecentLog[]
  } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/api/auth/signin'); return }
    if (status === 'authenticated') fetchPatterns()
  }, [status])

  const fetchPatterns = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/symptom-check/patterns')
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Health Patterns">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 size={28} className="text-sky-500 animate-spin" />
          <p className="text-slate-400 text-sm">Analysing your health history…</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Health Patterns"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Health Patterns' }]}
    >
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Health Patterns</h1>
            <p className="text-slate-500 text-sm mt-1">
              {data?.count
                ? `AI analysis of ${data.count} symptom check${data.count !== 1 ? 's' : ''}`
                : 'AI-powered insights from your symptom history'}
            </p>
          </div>
          <Link
            href="/symptom-check"
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <ClipboardList size={14} />
            New Check
          </Link>
        </div>

        {/* Not enough data */}
        {data?.insufficientData && (
          <div className="card p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 size={28} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Not Enough Data Yet</h2>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-2">
              You've done <strong>{data.count}</strong> symptom check{data.count !== 1 ? 's' : ''}.
              Complete at least <strong>{data.needed}</strong> to unlock AI pattern insights.
            </p>
            <div className="flex gap-1.5 my-4">
              {Array.from({ length: data.needed || 3 }).map((_, i) => (
                <div key={i} className={`h-2.5 w-8 rounded-full ${i < (data.count || 0) ? 'bg-sky-500' : 'bg-slate-200'}`} />
              ))}
            </div>
            <Link
              href="/symptom-check"
              className="flex items-center gap-2 bg-sky-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-sky-700 transition-all mt-2"
            >
              Start a Symptom Check <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {data && !data.insufficientData && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Checks', value: data.count, color: 'text-sky-600 bg-sky-50' },
                { label: 'Patterns Found', value: data.patterns.length, color: 'text-violet-600 bg-violet-50' },
                { label: 'Top Symptom', value: data.topSymptoms[0]?.name || '—', color: 'text-amber-600 bg-amber-50', small: true },
                { label: 'Alerts', value: data.patterns.filter(p => p.severity === 'alert').length, color: 'text-red-600 bg-red-50' },
              ].map(({ label, value, color, small }) => (
                <div key={label} className="card p-4 text-center">
                  <p className={`${small ? 'text-base' : 'text-3xl'} font-extrabold ${color.split(' ')[0]} mb-1`}>{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* AI Pattern Insights */}
            {data.patterns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-violet-600" />
                  <h2 className="text-base font-bold text-slate-900">AI Pattern Insights</h2>
                  <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">GPT-4o</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.patterns.map((p, i) => {
                    const IconComponent = iconMap[p.icon] || Repeat
                    const st = severityStyle[p.severity] || severityStyle.info
                    return (
                      <div key={i} className={`rounded-2xl border p-4 ${st.card}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${st.icon}`}>
                            <IconComponent size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-slate-900 text-sm leading-snug">{p.title}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0 ${st.badge}`}>
                                {p.severity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top Symptoms */}
            {data.topSymptoms.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Most Frequent Symptoms</h2>
                <div className="space-y-3">
                  {data.topSymptoms.map((s, i) => {
                    const pct = Math.round((s.count / data.count) * 100)
                    const colors = ['bg-sky-500', 'bg-violet-500', 'bg-amber-400', 'bg-emerald-500', 'bg-rose-400']
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700 capitalize">{s.name}</span>
                          <span className="text-xs text-slate-400">{s.count} time{s.count !== 1 ? 's' : ''} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent history */}
            {data.recentLogs.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Recent Symptom History</h2>
                <div className="space-y-3">
                  {data.recentLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-slate-500">
                            {new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${logSevStyle[log.severity] || logSevStyle.LOW}`}>
                            {log.severity}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {log.symptoms.slice(0, 4).map((s, j) => (
                            <span key={j} className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">{s}</span>
                          ))}
                          {log.symptoms.length > 4 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-400">+{log.symptoms.length - 4}</span>
                          )}
                        </div>
                        {log.diagnosis && (
                          <p className="text-xs text-slate-400 mt-1 truncate">AI: {log.diagnosis}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
