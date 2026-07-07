import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, ClipboardList, Mic, Camera, Stethoscope, Users, Pill, ScanLine, FlaskConical, HeartPulse, Salad,
  ShieldAlert, FileText, Award, Brain, Languages, Play, Pause, Volume2, VolumeX, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Scene { icon: any; grad: string; title: string; caption: string; narration: string }

const SCENES: Scene[] = [
  { icon: Sparkles, grad: 'from-sky-400 to-indigo-500', title: 'Meet HealthAI', caption: 'Your AI-powered health companion', narration: 'Welcome to HealthAI — your complete AI health companion, built for India.' },
  { icon: ClipboardList, grad: 'from-sky-400 to-cyan-500', title: 'AI Symptom Check', caption: 'Chat or speak your symptoms', narration: 'Describe your symptoms by chat or voice and get a full AI assessment with likely causes, medicine suggestions and next steps.' },
  { icon: Mic, grad: 'from-violet-400 to-fuchsia-500', title: 'Voice Assistant', caption: 'Hands-free, in your language', narration: 'Go completely hands-free — talk to the assistant in Hindi, Bengali, and other Indian languages, and it replies out loud.' },
  { icon: Camera, grad: 'from-fuchsia-400 to-pink-500', title: 'AI Image Diagnosis', caption: 'Skin, wounds & reports', narration: 'Snap a photo of a rash, wound, or a lab report, and AI vision gives you a clear, structured assessment.' },
  { icon: Stethoscope, grad: 'from-violet-400 to-indigo-500', title: 'AI Second Opinion', caption: 'A panel of specialists', narration: 'Get a virtual panel of AI specialists — each gives their view, then agrees on a consensus.' },
  { icon: Users, grad: 'from-emerald-400 to-teal-500', title: 'Find & Book Doctors', caption: 'Real, verified doctors near you', narration: 'Find real doctors near you, verified against the medical register, and book an appointment in seconds.' },
  { icon: Pill, grad: 'from-fuchsia-400 to-pink-500', title: 'Medicine & Pill ID', caption: 'Scan and check interactions', narration: 'Snap any tablet or strip to identify it, and check it against your medicines for dangerous interactions.' },
  { icon: ScanLine, grad: 'from-indigo-400 to-blue-500', title: 'Prescription Scanner', caption: 'Photo to medication tracker', narration: 'Photograph your prescription and it automatically adds every medicine to your tracker with reminders.' },
  { icon: FlaskConical, grad: 'from-teal-400 to-emerald-500', title: 'Records & Lab Trends', caption: 'AI reads your reports', narration: 'Upload lab reports and prescriptions — AI reads the values and charts your health trends over time.' },
  { icon: HeartPulse, grad: 'from-rose-400 to-red-500', title: 'Care & Screenings', caption: 'Plans, risk scores & PHQ-9', narration: 'Follow AI care programs for diabetes or blood pressure, run risk calculators, and take mental-health screenings.' },
  { icon: Salad, grad: 'from-lime-400 to-emerald-500', title: 'Diet & Wellbeing', caption: 'Personalized plans + companion', narration: 'Get a personalized Indian diet plan, track your mood, and chat with a caring wellbeing companion.' },
  { icon: ShieldAlert, grad: 'from-rose-400 to-red-600', title: 'Emergency SOS', caption: 'Location + nearby hospitals', narration: 'In an emergency, one tap sends your live location to your contact and shows the nearest hospitals instantly.' },
  { icon: FileText, grad: 'from-slate-400 to-slate-600', title: 'Reports & Passport', caption: 'PDF summary + QR card', narration: 'Generate a doctor-ready PDF health report, and carry a QR health passport for any hospital.' },
  { icon: Brain, grad: 'from-violet-400 to-purple-500', title: 'AI Everywhere', caption: 'Assistant + ⌘K palette', narration: 'A floating AI assistant and a command palette are always a tap away on every screen.' },
  { icon: Languages, grad: 'from-sky-400 to-violet-500', title: 'Built for Everyone', caption: '6 languages · all in one app', narration: 'Available in six Indian languages — HealthAI puts your entire health journey in one place. Try it today.' },
]

const FALLBACK_MS = 4400

export default function DemoTour() {
  const { lang } = useLanguage()
  const [scenes, setScenes] = useState<Scene[]>(SCENES)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<any>(null)
  const mutedRef = useRef(muted)
  const playingRef = useRef(playing)
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { playingRef.current = playing }, [playing])

  // Localize the script (text + voiceover) to the selected language.
  useEffect(() => {
    if (lang === 'en') { setScenes(SCENES); return }
    let cancelled = false
    fetch('/api/demo-script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, scenes: SCENES.map(s => ({ title: s.title, caption: s.caption, narration: s.narration })) }) })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && Array.isArray(d?.scenes)) setScenes(SCENES.map((s, idx) => ({ ...s, ...(d.scenes[idx] || {}) }))) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lang])

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }
  const goNext = () => setI(prev => (prev + 1) % scenes.length)

  useEffect(() => {
    stopAudio()
    if (!playing) return
    let cancelled = false
    const advanceAfter = (ms: number) => { timerRef.current = setTimeout(() => { if (!cancelled && playingRef.current) goNext() }, ms) }
    if (muted) { advanceAfter(FALLBACK_MS); return () => { cancelled = true; stopAudio() } }

    fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: scenes[i]?.narration || '' }) })
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
  }, [i, playing, muted, scenes])

  useEffect(() => () => stopAudio(), [])

  const scene = scenes[i] || SCENES[0]
  const Icon = scene.icon

  return (
    <div className="relative w-full h-full overflow-hidden text-white" style={{ backgroundImage: 'linear-gradient(135deg,#0b1220,#1e1b4b 55%,#0e7490 130%)' }}>
      <div className="blob" style={{ width: 260, height: 260, top: -70, right: -30, background: 'radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)' }} />
      <div className="blob" style={{ width: 220, height: 220, bottom: -80, left: '20%', background: 'radial-gradient(circle, rgba(14,165,233,0.45), transparent 70%)', animationDelay: '3s' }} />

      <div key={i} className="relative h-full flex flex-col items-center justify-center text-center px-8 fade-up">
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${scene.grad} flex items-center justify-center mb-6 shadow-2xl`} style={{ boxShadow: '0 20px 50px -12px rgba(99,102,241,0.6)' }}>
          <Icon size={44} className="text-white" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full glass mb-3"><Sparkles size={11} /> HealthAI · {i + 1}/{scenes.length}</span>
        <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{scene.title}</h2>
        <p className="text-white/70 mt-2 text-sm lg:text-base max-w-md">{scene.caption}</p>
      </div>

      <div className="absolute top-4 left-4 right-16 flex gap-1">
        {scenes.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-white/80 transition-all" style={{ width: idx <= i ? '100%' : '0%', opacity: idx === i ? 1 : idx < i ? 0.6 : 0 }} />
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
        <button onClick={() => setI(p => (p - 1 + scenes.length) % scenes.length)} className="w-9 h-9 rounded-full glass hover:bg-white/20 flex items-center justify-center"><ChevronLeft size={16} /></button>
        <button onClick={() => setPlaying(p => !p)} className="w-11 h-11 rounded-full bg-white text-slate-900 hover:bg-white/90 flex items-center justify-center shadow-lg">{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}</button>
        <button onClick={() => setI(p => (p + 1) % scenes.length)} className="w-9 h-9 rounded-full glass hover:bg-white/20 flex items-center justify-center"><ChevronRight size={16} /></button>
        <button onClick={() => setMuted(m => !m)} className="w-9 h-9 rounded-full glass hover:bg-white/20 flex items-center justify-center ml-2" title={muted ? 'Unmute AI narration' : 'Mute'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      </div>
    </div>
  )
}
