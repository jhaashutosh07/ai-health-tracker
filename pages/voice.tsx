import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Mic, Square, Loader2, Volume2, Ear } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Msg { role: 'user' | 'assistant'; content: string }

const SPEECH_LANG: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
}

export default function VoiceMode() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLanguage()

  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [messages, setMessages] = useState<Msg[]>([])

  const activeRef = useRef(false)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const messagesRef = useRef<Msg[]>([])

  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices() || [] }
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
    return () => { window.speechSynthesis.removeEventListener?.('voiceschanged', load) }
  }, [])

  useEffect(() => () => { stopAll() }, [])

  const targetLang = SPEECH_LANG[lang] || 'en-IN'

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = voicesRef.current
    if (!voices.length) return undefined
    const lc = targetLang.toLowerCase(); const base = lc.split('-')[0]
    return voices.find(v => v.lang.toLowerCase() === lc) || voices.find(v => v.lang.toLowerCase().startsWith(base))
  }

  const speak = (text: string, onEnd: () => void) => {
    const voice = pickVoice()
    if (voice && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = targetLang; u.voice = voice; u.rate = 0.98
      u.onend = onEnd
      u.onerror = onEnd
      window.speechSynthesis.speak(u)
    } else {
      // Cloud TTS for languages without a local voice (e.g. Bengali).
      fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
        .then(r => r.ok ? r.blob() : Promise.reject())
        .then(blob => {
          const audio = new Audio(URL.createObjectURL(blob))
          audioRef.current = audio
          audio.onended = onEnd
          audio.onerror = onEnd as any
          audio.play().catch(onEnd)
        })
        .catch(onEnd)
    }
  }

  const listen = () => {
    if (!activeRef.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setPhase('idle'); return }
    const rec = new SR()
    recognitionRef.current = rec
    rec.lang = targetLang
    rec.continuous = false
    rec.interimResults = false
    setPhase('listening')
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      handleUserText(transcript)
    }
    rec.onerror = () => { if (activeRef.current) setTimeout(listen, 400) }
    rec.onend = () => { /* handled by onresult or onerror */ }
    try { rec.start() } catch { /* already started */ }
  }

  const handleUserText = async (text: string) => {
    if (!text?.trim() || !activeRef.current) return
    const next = [...messagesRef.current, { role: 'user' as const, content: text }]
    setMessages(next)
    setPhase('thinking')
    try {
      const res = await fetch('/api/voice/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, lang }),
      })
      const data = await res.json()
      const reply = data.message || "Sorry, I didn't catch that."
      setMessages(m => [...m, { role: 'assistant', content: reply }])
      if (!activeRef.current) return
      setPhase('speaking')
      speak(reply, () => { if (activeRef.current) listen() })
    } catch {
      if (activeRef.current) listen()
    }
  }

  const start = () => {
    setMessages([])
    activeRef.current = true
    setActive(true)
    listen()
  }

  const stopAll = () => {
    activeRef.current = false
    setActive(false)
    setPhase('idle')
    try { recognitionRef.current?.stop() } catch {}
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }

  if (status === 'loading') return null

  const phaseText: Record<string, string> = {
    idle: 'Tap the mic and just talk — I\'ll listen and reply out loud.',
    listening: 'Listening… speak now',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
  }

  return (
    <AppShell title="Voice Assistant" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Voice Assistant' }]}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex flex-col items-center">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Voice Health Assistant</h1>
          <p className="text-slate-500 text-sm mt-1">Hands-free, in your language. Speak your symptoms and hear the reply. Not a medical diagnosis.</p>
        </div>

        {/* Orb */}
        <button
          onClick={active ? stopAll : start}
          className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all mb-4 ${
            active ? 'bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg' : 'bg-slate-200 hover:bg-slate-300'
          }`}
        >
          {active && <span className="absolute inset-0 rounded-full animate-ping bg-sky-400/40" />}
          {phase === 'listening' && <Ear size={44} className="text-white relative z-10" />}
          {phase === 'thinking' && <Loader2 size={44} className="text-white relative z-10 animate-spin" />}
          {phase === 'speaking' && <Volume2 size={44} className="text-white relative z-10" />}
          {(!active || phase === 'idle') && <Mic size={44} className={active ? 'text-white relative z-10' : 'text-slate-500'} />}
        </button>

        <p className="text-sm font-medium text-slate-600 mb-1">{phaseText[phase]}</p>
        <button onClick={active ? stopAll : start} className={`mt-3 btn gap-2 ${active ? 'btn-danger' : 'btn-primary'}`}>
          {active ? <><Square size={15} /> Stop</> : <><Mic size={15} /> Start conversation</>}
        </button>

        {/* Transcript */}
        {messages.length > 0 && (
          <div className="w-full mt-8 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-6 text-center">Works best in Chrome. In an emergency call 112.</p>
      </div>
    </AppShell>
  )
}
