import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import {
  Search, Activity, ClipboardList, Mic, Camera, Users, Pill, HeartPulse, FlaskConical, Smile, Heart,
  Calendar, FileText, BarChart2, Settings, Salad, ShieldCheck, Stethoscope, Sparkles, Award, QrCode, Brain,
} from 'lucide-react'

interface Cmd { label: string; href: string; icon: any; hint?: string }

const COMMANDS: Cmd[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Activity },
  { label: 'Symptom Check', href: '/symptom-check', icon: ClipboardList, hint: 'AI' },
  { label: 'Voice Assistant', href: '/voice', icon: Mic },
  { label: 'AI Image Diagnosis', href: '/image-diagnosis', icon: Camera },
  { label: 'AI Second Opinion', href: '/second-opinion', icon: Stethoscope },
  { label: 'Ask HealthAI', href: '/health-chat', icon: Brain },
  { label: 'Find Doctors', href: '/find-doctors', icon: Users },
  { label: 'Book Appointment', href: '/appointments/new', icon: Calendar },
  { label: 'My Appointments', href: '/appointments', icon: Calendar },
  { label: 'Medicine Checker & Pill ID', href: '/medicine-checker', icon: Pill },
  { label: 'My Medications', href: '/medications', icon: Pill },
  { label: 'Vitals', href: '/vitals', icon: HeartPulse },
  { label: 'Lab Trends', href: '/lab-trends', icon: FlaskConical },
  { label: 'Care Programs', href: '/care-programs', icon: HeartPulse },
  { label: 'Risk Calculators', href: '/risk-calculators', icon: ShieldCheck },
  { label: 'Mental Health Screenings', href: '/screenings', icon: Brain },
  { label: 'Diet Planner', href: '/diet-planner', icon: Salad },
  { label: 'Mood Tracker', href: '/mood-tracker', icon: Smile },
  { label: 'Wellbeing Companion', href: '/companion', icon: Heart },
  { label: 'Medical Records', href: '/medical-records', icon: FileText },
  { label: 'Health Report', href: '/health-report', icon: FileText },
  { label: 'Achievements', href: '/achievements', icon: Award },
  { label: 'Health Passport (QR)', href: '/health-passport', icon: QrCode },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); setQ(''); setActive(0) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30) }, [open])

  const filtered = q.trim() ? COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase())) : COMMANDS
  const go = (href: string) => { setOpen(false); router.push(href) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && filtered[active]) go(filtered[active].href)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm fade-in" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
          <Search size={16} className="text-slate-400" />
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown}
            placeholder="Search features, doctors, pages…" className="flex-1 text-sm outline-none bg-transparent" />
          <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No matches</p>
          ) : filtered.map((c, i) => {
            const Icon = c.icon
            return (
              <button key={c.href} onMouseEnter={() => setActive(i)} onClick={() => go(c.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-sky-50' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${i === active ? 'brand-gradient text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={15} /></div>
                <span className="text-sm text-slate-700 flex-1">{c.label}</span>
                {c.hint && <span className="text-[10px] font-semibold text-violet-500 flex items-center gap-1"><Sparkles size={10} /> {c.hint}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
