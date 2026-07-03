import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Heart, Send, Loader2, Sparkles, LifeBuoy } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Msg { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  "I'm feeling stressed about work",
  "I couldn't sleep well last night",
  "I just need to vent for a bit",
  "I'm feeling good today!",
]

export default function Companion() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLanguage()
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi, I'm Saathi 💙 your space to check in. How are you really feeling today?" },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      let recentMood: number | undefined
      try {
        const hist = JSON.parse(localStorage.getItem('healthai_mood_history') || '[]')
        if (Array.isArray(hist) && hist.length) recentMood = hist[hist.length - 1]?.score
      } catch {}

      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, recentMood, lang }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.message || 'Sorry, I had trouble responding.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return null

  return (
    <AppShell title="Companion" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Companion' }]}>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Saathi — your wellbeing companion</h1>
            <p className="text-xs text-slate-500">A supportive daily check-in. Not a substitute for professional care.</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <Loader2 size={15} className="animate-spin text-violet-500" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Starters */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 my-3">
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-xs bg-white border border-slate-200 hover:border-violet-300 text-slate-600 rounded-full px-3 py-1.5">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Crisis note */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-3 mb-1">
          <LifeBuoy size={12} />
          In crisis? iCall 9152987821 · Vandrevala 1860-2662-345 · Emergency 112
        </div>

        {/* Input */}
        <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2 mt-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type how you're feeling…"
            className="input flex-1 text-sm"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary px-4 disabled:opacity-40">
            <Send size={16} />
          </button>
        </form>
      </div>
    </AppShell>
  )
}
