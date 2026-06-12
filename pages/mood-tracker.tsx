import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  Smile,
  Loader2,
  Sparkles,
  Heart,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Brain,
} from 'lucide-react'
import AppShell from '@/components/AppShell'

interface MoodEntry {
  date: string
  score: number
  notes?: string
}

interface MoodInsights {
  summary: string
  insights: string[]
  selfCareRecommendations: string[]
  positiveAffirmation: string
  professionalHelpAdvised: boolean
  professionalHelpReason?: string
  demoMode?: boolean
}

const MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Very Low',  color: 'border-red-300 bg-red-50 text-red-700',     active: 'border-red-500 bg-red-100 ring-2 ring-red-500/30' },
  { score: 2, emoji: '😔', label: 'Low',        color: 'border-orange-300 bg-orange-50 text-orange-700', active: 'border-orange-500 bg-orange-100 ring-2 ring-orange-500/30' },
  { score: 3, emoji: '😐', label: 'Neutral',    color: 'border-yellow-300 bg-yellow-50 text-yellow-700', active: 'border-yellow-500 bg-yellow-100 ring-2 ring-yellow-500/30' },
  { score: 4, emoji: '🙂', label: 'Good',       color: 'border-lime-300 bg-lime-50 text-lime-700',   active: 'border-lime-500 bg-lime-100 ring-2 ring-lime-500/30' },
  { score: 5, emoji: '😄', label: 'Great',      color: 'border-emerald-300 bg-emerald-50 text-emerald-700', active: 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-500/30' },
]

const MOOD_BAR_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-400']

const STORAGE_KEY = 'healthai_mood_history'

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function MoodTracker() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<MoodInsights | null>(null)
  const [history, setHistory] = useState<MoodEntry[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: MoodEntry[] = JSON.parse(stored)
        setHistory(parsed)
        const today = parsed.find(e => e.date === getTodayKey())
        if (today) {
          setSelectedMood(today.score)
          setNotes(today.notes || '')
          setSaved(true)
        }
      }
    } catch {}
  }, [])

  const saveToday = () => {
    if (!selectedMood) return
    const today: MoodEntry = { date: getTodayKey(), score: selectedMood, notes: notes || undefined }
    const updated = [
      ...history.filter(e => e.date !== getTodayKey()),
      today,
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setSaved(true)
  }

  const getInsights = async () => {
    if (!selectedMood) return
    saveToday()
    setLoading(true)
    setInsights(null)
    try {
      const moodHistory = history
        .filter(e => e.date !== getTodayKey())
        .slice(-6)
        .map(e => ({ date: formatDate(e.date), score: e.score }))

      const res = await fetch('/api/mood-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todayMood: selectedMood, notes, moodHistory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setInsights(data)
    } catch (err: any) {
      alert(err.message || 'Failed to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const last7 = getLast7Days()
  const historyMap = Object.fromEntries(history.map(e => [e.date, e]))
  const avgScore = history.length > 0
    ? (history.reduce((s, e) => s + e.score, 0) / history.length).toFixed(1)
    : null

  if (status === 'loading') {
    return (
      <AppShell title="Mood Tracker">
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Mood Tracker"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mood Tracker' }]}
    >
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Smile size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mental Health Tracker</h1>
            <p className="text-slate-500 text-sm mt-1">
              Track your daily mood and get personalized AI insights to support your mental wellbeing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Check-in + history */}
          <div className="lg:col-span-2 space-y-6">

            {/* Today's check-in */}
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">How are you feeling today?</h2>
                <span className="text-xs text-slate-400">{formatDate(getTodayKey())}</span>
              </div>

              {/* Mood picker */}
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map(({ score, emoji, label, color, active }) => (
                  <button
                    key={score}
                    onClick={() => { setSelectedMood(score); setSaved(false); setInsights(null) }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      selectedMood === score ? active : color
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Journal <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setSaved(false) }}
                  placeholder="What's on your mind? How has your day been going?…"
                  rows={3}
                  className="input resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveToday}
                  disabled={!selectedMood}
                  className="btn btn-outline gap-2 disabled:opacity-40"
                >
                  {saved ? <CheckCircle2 size={15} className="text-emerald-500" /> : <BookOpen size={15} />}
                  {saved ? 'Saved' : 'Save entry'}
                </button>
                <button
                  onClick={getInsights}
                  disabled={!selectedMood || loading}
                  className="btn btn-primary gap-2 flex-1 justify-center disabled:opacity-40"
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
                  ) : (
                    <><Sparkles size={15} /> Get AI Insights</>
                  )}
                </button>
              </div>
            </div>

            {/* Weekly mood chart */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-slate-500" />
                  <h3 className="font-semibold text-slate-900 text-sm">Last 7 Days</h3>
                </div>
                {avgScore && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Avg mood:</span>
                    <span className="font-bold text-slate-800">{avgScore}/5</span>
                    <span className="text-base">{MOOD_OPTIONS.find(m => m.score === Math.round(Number(avgScore)))?.emoji || '😐'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-end gap-2 h-28">
                {last7.map(date => {
                  const entry = historyMap[date]
                  const isToday = date === getTodayKey()
                  const score = isToday && selectedMood ? selectedMood : (entry?.score || 0)
                  const barH = score > 0 ? `${(score / 5) * 100}%` : '4px'

                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            score > 0 ? MOOD_BAR_COLORS[score] : 'bg-slate-100'
                          } ${isToday ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}
                          style={{ height: barH, minHeight: 4 }}
                          title={score > 0 ? `${MOOD_OPTIONS.find(m => m.score === score)?.label}` : 'No entry'}
                        />
                      </div>
                      <span className={`text-[10px] font-medium ${isToday ? 'text-sky-600' : 'text-slate-400'}`}>
                        {formatShortDate(date)}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400">
                <span>😢 Very Low</span>
                <span>😄 Great</span>
              </div>
            </div>
          </div>

          {/* Right: Insights */}
          <div className="space-y-4">
            {insights ? (
              <>
                {/* Affirmation */}
                <div className="card p-5 bg-gradient-to-br from-pink-50 to-violet-50 border-pink-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart size={16} className="text-pink-500" />
                    <p className="text-xs font-semibold text-pink-700 uppercase tracking-wider">For you today</p>
                  </div>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed italic">
                    "{insights.positiveAffirmation}"
                  </p>
                  {insights.demoMode && (
                    <span className="mt-2 inline-block badge bg-slate-100 text-slate-500 border-slate-200 text-[10px]">Demo mode</span>
                  )}
                </div>

                {/* Summary */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain size={15} className="text-violet-500" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">AI Insight</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{insights.summary}</p>
                </div>

                {/* Insights */}
                <div className="card p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Insights</p>
                  <ul className="space-y-3">
                    {insights.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <div className="w-4 h-4 rounded-full bg-violet-100 text-violet-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Self-care tips */}
                <div className="card p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Self-care today</p>
                  <ul className="space-y-2.5">
                    {insights.selfCareRecommendations.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Professional help */}
                {insights.professionalHelpAdvised && (
                  <div className="card p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900 mb-1">Consider speaking to someone</p>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {insights.professionalHelpReason || 'Based on your recent mood patterns, talking to a mental health professional could be beneficial.'}
                        </p>
                        <p className="text-xs text-amber-700 mt-2 font-medium">iCall Helpline: 9152987821</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-6 text-center">
                <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={20} className="text-pink-500" />
                </div>
                <p className="font-semibold text-slate-800 text-sm mb-1">AI Mental Health Insights</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select your mood and click "Get AI Insights" to receive personalized wellbeing guidance from AI.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
