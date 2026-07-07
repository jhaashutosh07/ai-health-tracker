import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Mic, Square, Loader2, Volume2, Ear, Stethoscope, AlertTriangle, CheckCircle2, Circle, Play } from 'lucide-react'
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

  // Cough & breathing check
  const [coughType, setCoughType] = useState('Dry')
  const [duration, setDuration] = useState('Under 1 week')
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [recording, setRecording] = useState(false)
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [coughLoading, setCoughLoading] = useState(false)
  const [coughResult, setCoughResult] = useState<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const toggleRecord = async () => {
    if (recording) { recorderRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec; chunksRef.current = []
      rec.ondataavailable = e => chunksRef.current.push(e.data)
      rec.onstop = () => { setClipUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: 'audio/webm' }))); stream.getTracks().forEach(t => t.stop()); setRecording(false) }
      rec.start(); setRecording(true)
      setTimeout(() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() }, 8000)
    } catch { /* mic denied */ }
  }

  const runCoughCheck = async () => {
    setCoughLoading(true); setCoughResult(null)
    try {
      const features = { coughType, duration, ...Object.fromEntries(Object.entries(flags).filter(([, v]) => v)) }
      const res = await fetch('/api/cough-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features, lang }) })
      const data = await res.json()
      if (res.ok) setCoughResult(data.result)
    } finally { setCoughLoading(false) }
  }

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
    // Use the browser voice ONLY for English — device regional voices sound
    // robotic, so route Hindi/Bengali/regional through natural cloud TTS.
    const voice = lang === 'en' ? pickVoice() : undefined
    if (voice && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = targetLang; u.voice = voice; u.rate = 0.98
      u.onend = onEnd
      u.onerror = onEnd
      window.speechSynthesis.speak(u)
    } else {
      // Natural cloud TTS (OpenAI) for non-English / voice-less languages.
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

        {/* Cough & breathing check */}
        <div className="w-full mt-10 card p-5 space-y-4 text-left">
          <div className="flex items-center gap-2">
            <Stethoscope size={17} className="text-teal-500" />
            <h2 className="font-semibold text-slate-900">Cough &amp; Breathing Check</h2>
          </div>
          <p className="text-xs text-slate-500 -mt-2">Record your cough and describe it — AI gives guidance based on the pattern. (Not sound analysis or a diagnosis.)</p>

          <div className="flex items-center gap-3">
            <button onClick={toggleRecord} className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl ${recording ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {recording ? <><Square size={13} /> Stop</> : <><Circle size={13} className="fill-red-500 text-red-500" /> Record cough</>}
            </button>
            {clipUrl && <audio src={clipUrl} controls className="h-8" />}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Cough type</p>
              <div className="flex flex-wrap gap-2">
                {['Dry', 'Wet / with phlegm', 'Barking', 'Wheezing'].map(t => (
                  <button key={t} onClick={() => setCoughType(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${coughType === t ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Duration</p>
              <div className="flex flex-wrap gap-2">
                {['Under 1 week', '1–3 weeks', 'Over 3 weeks'].map(d => (
                  <button key={d} onClick={() => setDuration(d)} className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${duration === d ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Also experiencing</p>
              <div className="flex flex-wrap gap-2">
                {['Fever', 'Breathlessness', 'Chest pain', 'Coughing blood'].map(f => (
                  <button key={f} onClick={() => setFlags(s => ({ ...s, [f]: !s[f] }))} className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${flags[f] ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500'}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={runCoughCheck} disabled={coughLoading} className="btn btn-primary gap-2 disabled:opacity-50">
            {coughLoading ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : <><Stethoscope size={15} /> Get AI note</>}
          </button>

          {coughResult && (
            <div className="space-y-3 pt-1">
              <p className="text-sm text-slate-700 leading-relaxed">{coughResult.note}</p>
              {coughResult.possibleCauses?.length > 0 && <p className="text-xs text-slate-600"><span className="font-semibold">Possible causes:</span> {coughResult.possibleCauses.join(', ')}</p>}
              {coughResult.selfCare?.length > 0 && (
                <div className="bg-sky-50 rounded-xl p-3"><p className="text-[10px] font-bold text-sky-600 uppercase tracking-wide mb-1 flex items-center gap-1"><CheckCircle2 size={11} /> Self-care</p><ul className="text-xs text-slate-700 space-y-0.5">{coughResult.selfCare.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul></div>
              )}
              {coughResult.redFlags?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3"><p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1"><AlertTriangle size={11} /> See a doctor urgently if</p><ul className="text-xs text-red-700 space-y-0.5">{coughResult.redFlags.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul></div>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 mt-6 text-center">Works best in Chrome. In an emergency call 112.</p>
      </div>
    </AppShell>
  )
}
