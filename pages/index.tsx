import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useEffect } from 'react'
import {
  Activity,
  MessageSquare,
  Calendar,
  ShieldAlert,
  BarChart2,
  Mic,
  ImagePlus,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Heart,
  Users,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    color: 'sky',
    title: 'AI Symptom Analysis',
    desc: 'Describe symptoms in natural language. Our AI asks the right follow-up questions and provides a severity assessment.',
  },
  {
    icon: Mic,
    color: 'violet',
    title: 'Voice Input',
    desc: 'Speak your symptoms — no typing needed. Built-in voice recognition converts speech to text instantly.',
  },
  {
    icon: ImagePlus,
    color: 'rose',
    title: 'Image Analysis',
    desc: 'Upload photos of rashes, wounds, or lab reports. AI vision identifies visible symptoms objectively.',
  },
  {
    icon: Calendar,
    color: 'emerald',
    title: 'Smart Booking',
    desc: 'Book appointments based on your severity. Real-time status updates when your doctor confirms.',
  },
  {
    icon: ShieldAlert,
    color: 'red',
    title: 'Emergency Card',
    desc: 'A public QR-linked card with your blood type, allergies, and emergency contacts — accessible to first responders.',
  },
  {
    icon: Mail,
    color: 'amber',
    title: 'Weekly Health Digest',
    desc: 'Every Monday, AI summarises your week — symptom trends, appointments, and a personalised wellness tip.',
  },
]

const stats = [
  { label: 'Registered Doctors', value: '600+', icon: Users },
  { label: 'Symptom Checks', value: '10K+', icon: Activity },
  { label: 'Cities Covered', value: '50+', icon: MapPin },
  { label: 'Avg. Response Time', value: '<3s', icon: Zap },
]

const steps = [
  { n: '01', title: 'Describe or Show', desc: 'Type, speak, or upload an image of your symptoms' },
  { n: '02', title: 'AI Assessment', desc: 'AI analyses severity and suggests possible conditions' },
  { n: '03', title: 'Book a Doctor', desc: 'Schedule with a specialist matched to your needs' },
  { n: '04', title: 'Get Better', desc: 'Online or in-person consultation, tracked in your dashboard' },
]

const colorMap: Record<string, string> = {
  sky:     'bg-sky-50 text-sky-600 border-sky-100',
  violet:  'bg-violet-50 text-violet-600 border-violet-100',
  rose:    'bg-rose-50 text-rose-600 border-rose-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  red:     'bg-red-50 text-red-600 border-red-100',
  amber:   'bg-amber-50 text-amber-600 border-amber-100',
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push(session.user.role === 'DOCTOR' ? '/doctors/dashboard' : '/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
              <Stethoscope size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">HealthAI</span>
            <span className="hidden sm:inline-flex ml-1 items-center px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-sky-600 text-[11px] font-semibold">
              AI-Powered
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-sm">
            {['Features', 'How it works'].map(label => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                className="px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors font-medium"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="btn btn-primary text-sm gap-1.5"
            >
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-slate-900 dot-grid overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-sm font-medium mb-8 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Now powered by GPT-4o — OpenAI
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 fade-up fade-up-delay-1">
            Your personal{' '}
            <span className="text-gradient">health intelligence</span>
            <br />platform
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed fade-up fade-up-delay-2">
            Analyse symptoms with AI, find the right specialist, book appointments — and get a weekly health digest delivered to your inbox.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up fade-up-delay-3">
            <Link href="/auth/register" className="btn btn-primary px-7 py-3 text-base gap-2 shadow-lg shadow-sky-500/25">
              Check your symptoms <ArrowRight size={16} />
            </Link>
            <Link href="/find-doctors" className="btn px-7 py-3 text-base text-slate-300 bg-white/10 hover:bg-white/15 border border-white/10">
              Find doctors near me
            </Link>
          </div>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 fade-up fade-up-delay-3">
            {['Voice input', 'Image analysis', 'Emergency QR card', 'Real-time updates'].map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-slate-300 text-xs font-medium">
                <CheckCircle2 size={12} className="text-emerald-400" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-slate-900 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="inline-flex p-2.5 rounded-xl bg-white/5 border border-white/10 mb-3">
                  <Icon size={18} className="text-sky-400" />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-sky-500 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything in one place
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              From first symptom to recovery — HealthAI covers every step of your healthcare journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="group card p-6 hover:border-slate-200 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-5 ${colorMap[color]}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-sky-500 uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-500">Your health journey in four simple steps</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ n, title, desc }, i) => (
              <div key={n} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-full w-full h-px bg-slate-200 z-0" style={{ width: 'calc(100% - 2rem)' }} />
                )}
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-xl font-black mb-5 shadow-lg shadow-sky-500/25">
                    {n}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-50" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-sky-500/30">
            <Heart size={24} className="text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
            Take control of your health
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Join thousands who use HealthAI for smarter, faster healthcare decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="btn btn-primary px-8 py-3 text-base gap-2 shadow-lg shadow-sky-500/30">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link href="/auth/signin" className="btn px-8 py-3 text-base text-slate-300 bg-white/10 hover:bg-white/15 border border-white/10">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── DISCLAIMER ── */}
      <div className="bg-slate-50 border-t border-slate-100 py-6 px-4">
        <p className="text-xs text-slate-400 text-center max-w-3xl mx-auto">
          <strong className="text-slate-500">Medical Disclaimer:</strong> HealthAI is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns.
        </p>
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-sky-500 rounded-lg flex items-center justify-center">
                <Stethoscope size={13} className="text-white" />
              </div>
              <span className="text-slate-300 font-semibold text-sm">HealthAI</span>
            </div>
            <p className="text-slate-500 text-xs">© 2025 HealthAI. Built with Next.js &amp; OpenAI.</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <Link href="/auth/signin" className="hover:text-slate-300 transition-colors">Sign in</Link>
              <Link href="/auth/register" className="hover:text-slate-300 transition-colors">Register</Link>
              <Link href="/find-doctors" className="hover:text-slate-300 transition-colors">Find doctors</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
