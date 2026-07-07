import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Award, Flame, Star, Trophy, Lock, CheckCircle2 } from 'lucide-react'
import AppShell from '@/components/AppShell'

const todayKey = () => new Date().toISOString().split('T')[0]
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] }

export default function Achievements() {
  const { status } = useSession()
  const router = useRouter()
  const [streak, setStreak] = useState(1)
  const [stats, setStats] = useState({ mood: 0, labs: 0, care: 0 })

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])

  useEffect(() => {
    try {
      // Login streak
      const raw = JSON.parse(localStorage.getItem('healthai_streak') || 'null')
      let count = 1
      if (raw?.last === todayKey()) count = raw.count
      else if (raw?.last === yesterdayKey()) count = (raw.count || 0) + 1
      localStorage.setItem('healthai_streak', JSON.stringify({ last: todayKey(), count }))
      setStreak(count)

      const mood = JSON.parse(localStorage.getItem('healthai_mood_history') || '[]').length
      const labs = JSON.parse(localStorage.getItem('healthai_labs') || '[]').length
      let care = 0
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('healthai_care_done_')) { const d = JSON.parse(localStorage.getItem(k) || '{}'); care += Object.values(d).filter(Boolean).length } }
      setStats({ mood, labs, care })
    } catch {}
  }, [])

  const points = streak * 10 + stats.mood * 5 + stats.labs * 8 + stats.care * 3
  const level = Math.floor(points / 100) + 1
  const intoLevel = points % 100

  const badges = [
    { name: 'First Steps', desc: 'Started your health journey', earned: true, icon: Star },
    { name: 'Mood Aware', desc: 'Logged your mood', earned: stats.mood >= 1, icon: Star },
    { name: 'Consistent', desc: 'Logged mood 7 times', earned: stats.mood >= 7, icon: Star },
    { name: 'Lab Logger', desc: 'Tracked a lab report', earned: stats.labs >= 1, icon: Star },
    { name: 'Care Champion', desc: 'Completed care tasks', earned: stats.care >= 5, icon: Trophy },
    { name: 'On Fire', desc: '7-day streak', earned: streak >= 7, icon: Flame },
    { name: 'Dedicated', desc: '30-day streak', earned: streak >= 30, icon: Flame },
    { name: 'Health Hero', desc: 'Reached level 5', earned: level >= 5, icon: Trophy },
  ]
  const earnedCount = badges.filter(b => b.earned).length

  if (status === 'loading') return null

  return (
    <AppShell title="Achievements" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Achievements' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ backgroundImage: 'linear-gradient(135deg,#7c3aed,#4f46e5 60%,#0ea5e9)' }}>
          <div className="blob" style={{ width: 200, height: 200, top: -60, right: -20, background: 'radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%)' }} />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/70 text-sm">Level {level}</p>
              <p className="text-4xl font-black">{points} <span className="text-lg font-semibold text-white/70">points</span></p>
              <div className="mt-3 w-56 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white" style={{ width: `${intoLevel}%` }} /></div>
              <p className="text-[11px] text-white/60 mt-1">{100 - intoLevel} pts to level {level + 1}</p>
            </div>
            <div className="flex items-center gap-2 glass rounded-2xl px-4 py-3">
              <Flame size={22} className="text-orange-300" />
              <div><p className="text-2xl font-black leading-none">{streak}</p><p className="text-[11px] text-white/70">day streak</p></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Award size={18} className="text-violet-500" />
          <h2 className="font-bold text-slate-900">Badges <span className="text-slate-400 font-normal">({earnedCount}/{badges.length})</span></h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map(b => {
            const Icon = b.icon
            return (
              <div key={b.name} className={`card p-4 text-center ${b.earned ? '' : 'opacity-60'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 ${b.earned ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-100'}`}>
                  {b.earned ? <Icon size={22} className="text-white" /> : <Lock size={18} className="text-slate-400" />}
                </div>
                <p className="text-xs font-bold text-slate-800">{b.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{b.desc}</p>
                {b.earned && <CheckCircle2 size={13} className="text-emerald-500 mx-auto mt-1.5" />}
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400 text-center">Earn points by checking in daily, logging mood, tracking labs, and completing care tasks.</p>
      </div>
    </AppShell>
  )
}
