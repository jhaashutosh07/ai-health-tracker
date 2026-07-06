import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, ClipboardList, Mic, Users, Pill, FlaskConical, ShieldAlert, HeartPulse, Play, Pause, Volume2, VolumeX, ChevronRight, ChevronLeft,
} from 'lucide-react'

interface Scene { icon: any; grad: string; title: string; caption: string; narration: string }

const SCENES: Scene[] = [
  { icon: Sparkles, grad: 'from-sky-400 to-indigo-500', title: 'Meet HealthAI', caption: 'Your AI-powered health companion', narration: 'Welcome to HealthAI — your all-in-one AI health companion.' },
  { icon: ClipboardList, grad: 'from-sky-400 to-cyan-500', title: 'AI Symptom Check', caption: 'Chat or speak your symptoms', narration: 'Describe your symptoms by chat or voice, and get a full AI assessment with likely causes and next steps.' },
  { icon: Mic, grad: 'from-violet-400 to-fuchsia-500', title: 'Talk in Your Language', caption: 'Hands-free, in Hindi, Bengali & more', narration: 'Go completely hands-free — talk to the assistant in Hindi, Bengali, and other Indian languages.' },
  { icon: Users, grad: 'from-emerald-400 to-teal-500', title: 'Find & Book Doctors', caption: 'Real, verified doctors near you', narration: 'Find real doctors near you, verified against the medical register, and book an appointment in seconds.' },
  { icon: Pill, grad: 'from-fuchsia-400 to-pink-500', title: 'Scan Any Medicine', caption: 'Identify pills & check interactions', narration: 'Snap a photo of any medicine to identify it, and check it against your prescriptions for interactions.' },
  { icon: FlaskConical, grad: 'from-teal-400 to-emerald-500', title: 'Records & Lab Trends', caption: 'AI reads your reports', narration: 'Upload lab reports and prescriptions — AI reads them and charts your health trends over time.' },
  { icon: ShieldAlert, grad: 'from-rose-400 to-red-500', title: 'One-Tap Emergency SOS', caption: 'Sends your live location', narration: 'In an emergency, one tap sends your live location and medical card to your emergency contact.' },
  { icon: HeartPulse, grad: 'from-indigo-400 to-violet-500', title: 'All In One App', caption: 'Try HealthAI today', narration: 'Symptom checks, doctors, medicines, records and more — all in one app. This is HealthAI.' },
]

const FALLBACK_MS = 4200

export default function DemoTour() {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<any>(null)
  const mutedRef = useRef(muted)
  const playingRef = useRef(playing)
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { playingRef.current = playing }, [playing])

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const goNext = () => setI(prev => (prev + 1) % SCENES.length)

  // Play the current scene: narrate (AI voice) then advance, or time out.
  useEffect(() => {
    stopAudio()
    if (!playing) return
    let cancelled = false
    const advanceAfter = (ms: number) => { timerRef.current = setTimeout(() => { if (!cancelled && playingRef.current) goNext() }, ms) }

    if (muted) { advanceAfter(FALLBACK_MS); return () => { cancelled = true; stopAudio() } }

    fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: SCENES[i].narration }) })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        if (cancelled) return
        const audio = new Audio(URL.createObjectURL(blob))
        audioRef.current = audio
        audio.onended = () => { if (!cancelled && playingRef.current) goNext() }
        audio.onerror = () => advanceAfter(FALLBACK_MS)
        audio.play().catch(() => advanceAfter(FALLBACK_MS))
      })
      .catch(() => advanceAfter(FALLBACK_MS))

    return () => { cancelled = true; stopAudio() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, muted])

  useEffect(() => () => stopAudio(), [])

  const scene = SCENES[i]
  const Icon = scene.icon

  return (
    <div className="relative w-full h-full overflow-hidden text-white" style={{ backgroundImage: 'linear-gradient(135deg,#0b1220,#1e1b4b 55%,#0e7490 130%)' }}>
      <div className="blob" style={{ width: 260, height: 260, top: -70, right: -30, background: 'radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)' }} />
      <div className="blob" style={{ width: 220, height: 220, bottom: -80, left: '20%', background: 'radial-gradient(circle, rgba(14,165,233,0.45), transparent 70%)', animationDelay: '3s' }} />

      {/* Scene */}
      <div key={i} className="relative h-full flex flex-col items-center justify-center text-center px-8 fade-up">
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${scene.grad} flex items-center justify-center mb-6 shadow-2xl`} style={{ boxShadow: '0 20px 50px -12px rgba(99,102,241,0.6)' }}>
          <Icon size={44} className="text-white" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full glass mb-3"><Sparkles size={11} /> HealthAI</span>
        <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{scene.title}</h2>
        <p className="text-white/70 mt-2 text-sm lg:text-base max-w-md">{scene.caption}</p>
      </div>

      {/* Progress segments */}
      <div className="absolute top-4 left-4 right-16 flex gap-1.5">
        {SCENES.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-white/80 transition-all" style={{ width: idx < i ? '100%' : idx === i ? '100%' : '0%', opacity: idx === i ? 1 : idx < i ? 0.6 : 0 }} />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
        <button onClick={() => setI(p => (p - 1 + SCENES.length) % SCENES.length)} className="w-9 h-9 rounded-full glass hover:bg-white/20 flex items-center justify-center"><ChevronLeft size={16} /></button>
        <button onClick={() => setPlaying(p => !p)} className="w-11 h-11 rounded-full bg-white text-slate-900 hover:bg-white/90 flex items-center justify-center shadow-lg">{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}</button>
        <button onClick={() => setI(p => (p + 1) % SCENES.length)} className="w-9 h-9 rounded-full glass hover:bg-white/20 flex items-center justify-center"><ChevronRight size={16} /></button>
        <button onClick={() => setMuted(m => !m)} className="w-9 h-9 rounded-full glass hover:bg-white/20 flex items-center justify-center ml-2" title={muted ? 'Unmute AI narration' : 'Mute'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      </div>
    </div>
  )
}
