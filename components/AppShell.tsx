'use client'

import { ReactNode, useState, useCallback, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { toast } from 'sonner'
import {
  Activity,
  ClipboardList,
  Calendar,
  Users,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Bell,
  ChevronRight,
  Phone,
  AlertTriangle,
  Pill,
  Smile,
  MapPin,
  Loader2,
  Hospital,
  Shield,
  Flame,
  Stethoscope,
  Droplets,
  Share2,
  TrendingUp,
  Languages,
  Moon,
  Sun,
  BellOff,
  HeartPulse,
  Brain,
  Heart,
  Camera,
  Mic,
  FlaskConical,
  Salad,
  ShieldCheck,
  Award,
  QrCode,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import FloatingAssistant from '@/components/FloatingAssistant'
import CommandPalette from '@/components/CommandPalette'
import { LANGUAGES } from '@/lib/i18n/translations'

const patientNavKeys = [
  { key: 'nav.dashboard',       href: '/dashboard',          icon: Activity },
  { key: 'nav.askAI',           href: '/health-chat',        icon: Brain },
  { key: 'nav.symptomCheck',    href: '/symptom-check',      icon: ClipboardList },
  { key: 'nav.voice',           href: '/voice',              icon: Mic },
  { key: 'nav.imageDiagnosis',  href: '/image-diagnosis',    icon: Camera },
  { key: 'nav.secondOpinion',   href: '/second-opinion',     icon: Stethoscope },
  { key: 'nav.screenings',      href: '/screenings',         icon: Brain },
  { key: 'nav.vitals',          href: '/vitals',             icon: HeartPulse },
  { key: 'nav.labTrends',       href: '/lab-trends',         icon: FlaskConical },
  { key: 'nav.riskCalc',        href: '/risk-calculators',   icon: ShieldCheck },
  { key: 'nav.carePrograms',    href: '/care-programs',      icon: HeartPulse },
  { key: 'nav.healthPatterns',  href: '/symptom-patterns',   icon: TrendingUp },
  { key: 'nav.medicineChecker', href: '/medicine-checker',   icon: Pill },
  { key: 'nav.medications',     href: '/medications',        icon: Pill },
  { key: 'nav.dietPlanner',     href: '/diet-planner',       icon: Salad },
  { key: 'nav.moodTracker',     href: '/mood-tracker',       icon: Smile },
  { key: 'nav.companion',       href: '/companion',          icon: Heart },
  { key: 'nav.appointments',    href: '/appointments',       icon: Calendar },
  { key: 'nav.findDoctors',     href: '/find-doctors',       icon: Users },
  { key: 'nav.medicalRecords',  href: '/medical-records',    icon: FileText },
  { key: 'nav.healthReport',    href: '/health-report',      icon: FileText },
  { key: 'nav.passport',        href: '/health-passport',    icon: QrCode },
  { key: 'nav.achievements',    href: '/achievements',       icon: Award },
  { key: 'nav.analytics',       href: '/analytics',          icon: BarChart2 },
]

const doctorNavKeys = [
  { key: 'nav.dashboard',    href: '/doctors/dashboard', icon: Activity },
  { key: 'nav.appointments', href: '/doctors/dashboard', icon: Calendar },
  { key: 'nav.soapNotes',    href: '/doctor/soap',       icon: FileText },
]

const quickDial = [
  { name: 'Emergency', number: '112', color: 'bg-red-600 hover:bg-red-700' },
  { name: 'Ambulance', number: '102', color: 'bg-orange-500 hover:bg-orange-600' },
  { name: 'EMRI',      number: '108', color: 'bg-orange-500 hover:bg-orange-600' },
  { name: 'Police',    number: '100', color: 'bg-blue-600 hover:bg-blue-700' },
  { name: 'Fire',      number: '101', color: 'bg-amber-500 hover:bg-amber-600' },
]

const nearbyCategories = [
  { label: 'Hospital',       query: 'hospital',          icon: Hospital,    bg: 'bg-red-50 hover:bg-red-100 border-red-100',     text: 'text-red-600',     iconBg: 'bg-red-100' },
  { label: 'Pharmacy',       query: 'pharmacy 24 hours', icon: Pill,        bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { label: 'Police Station', query: 'police station',    icon: Shield,      bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100',  text: 'text-blue-600',    iconBg: 'bg-blue-100' },
  { label: 'Fire Station',   query: 'fire station',      icon: Flame,       bg: 'bg-amber-50 hover:bg-amber-100 border-amber-100', text: 'text-amber-600',   iconBg: 'bg-amber-100' },
  { label: 'Doctor Clinic',  query: 'doctor clinic',     icon: Stethoscope, bg: 'bg-violet-50 hover:bg-violet-100 border-violet-100', text: 'text-violet-600',  iconBg: 'bg-violet-100' },
  { label: 'Blood Bank',     query: 'blood bank',        icon: Droplets,    bg: 'bg-rose-50 hover:bg-rose-100 border-rose-100',  text: 'text-rose-600',    iconBg: 'bg-rose-100' },
]

interface AppShellProps {
  children: ReactNode
  title?: string
  breadcrumb?: { label: string; href?: string }[]
}

interface NotificationItem {
  id: string
  type: 'followup' | 'appointment' | 'medication'
  title: string
  body: string
  href: string
  createdAt: string
}

const notifTypeMeta: Record<NotificationItem['type'], { icon: typeof Bell; cls: string }> = {
  followup:    { icon: HeartPulse, cls: 'bg-sky-50 text-sky-500' },
  appointment: { icon: Calendar,   cls: 'bg-emerald-50 text-emerald-500' },
  medication:  { icon: Pill,       cls: 'bg-violet-50 text-violet-500' },
}

const LAST_SEEN_KEY = 'healthai_notif_last_seen'

const bottomNavKeys = [
  { key: 'nav.dashboard',    href: '/dashboard',     icon: Activity },
  { key: 'nav.symptomCheck', href: '/symptom-check', icon: ClipboardList },
  { key: 'nav.medications',  href: '/medications',   icon: Pill },
  { key: 'nav.appointments', href: '/appointments',  icon: Calendar },
  { key: 'nav.medicalRecords', href: '/medical-records', icon: FileText },
]

export default function AppShell({ children, title, breadcrumb }: AppShellProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  const [locatingFor, setLocatingFor] = useState<string | null>(null)
  const [nearby, setNearby] = useState<any[]>([])
  const [nearbyLabel, setNearbyLabel] = useState<string>('')

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unseenCount, setUnseenCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  // Dark mode (class applied before paint by the _document script)
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : { notifications: [] }))
      .then(({ notifications: items }: { notifications: NotificationItem[] }) => {
        setNotifications(items || [])
        let lastSeen = 0
        try { lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0) } catch {}
        setUnseenCount((items || []).filter(n => new Date(n.createdAt).getTime() > lastSeen).length)
      })
      .catch(() => {})
  }, [session?.user?.id])

  // Close the notification dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notifOpen])

  const openNotifications = () => {
    setNotifOpen(v => !v)
    if (!notifOpen) {
      setUnseenCount(0)
      try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())) } catch {}
    }
  }

  const findNearby = useCallback((query: string, label: string) => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.')
      return
    }
    setLocatingFor(query)
    setLocError(null)
    setNearby([])
    setNearbyLabel(label)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch('/api/emergency/nearby', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, query }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.message)
          setNearby(data.places || [])
          if (!(data.places || []).length) setLocError(`No ${label.toLowerCase()} found nearby.`)
        } catch (e: any) {
          setLocError(e.message || 'Could not fetch nearby places.')
        } finally {
          setLocatingFor(null)
        }
      },
      (err) => {
        setLocatingFor(null)
        setLocError(
          err.code === 1
            ? 'Location access denied. Please allow location in your browser settings.'
            : 'Unable to get your location. Please search manually.'
        )
      },
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
      navigator.clipboard?.writeText(url).then(() => toast.success('Location link copied to clipboard')).catch(() => window.open(url, '_blank'))
    })
  }, [])

  const isDoctor = session?.user?.role === 'DOCTOR'
  const navKeys = isDoctor ? doctorNavKeys : patientNavKeys
  const currentPath = router.pathname

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-64 flex-shrink-0 relative overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(180deg, #0b1220 0%, #0f172a 55%, #131c34 100%)' }}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%)' }} />
      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 brand-gradient" style={{ boxShadow: '0 6px 18px -4px rgba(99,102,241,0.6)' }}>
          <Activity size={17} className="text-white" />
        </div>
        <span className="text-white font-extrabold text-lg tracking-tight">Health<span className="text-gradient">AI</span></span>
        <span className="ml-auto bg-white/10 text-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/15">
          AI
        </span>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navKeys.map(({ key, href, icon: Icon }) => {
          const active = currentPath === href
          return (
            <Link
              key={href + key}
              href={href}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              {t(key)}
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          )
        })}

        {!isDoctor && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/settings"
              className={`nav-item ${currentPath === '/settings' ? 'nav-item-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings size={17} />
              {t('nav.settings')}
            </Link>
            {/* The public card is keyed by an unguessable token, not the user id.
                Route through settings, where the token-based QR + preview link live. */}
            <Link
              href="/settings"
              className="nav-item"
              onClick={() => setSidebarOpen(false)}
            >
              <ShieldAlert size={17} />
              {t('nav.emergencyCard')}
            </Link>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all group">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-slate-400 text-xs truncate">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Global overlays */}
      <CommandPalette />
      <FloatingAssistant />

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-4 flex-shrink-0 z-30">
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            {breadcrumb ? (
              breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />}
                  {b.href ? (
                    <Link href={b.href} className="text-slate-500 hover:text-slate-700 truncate">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-slate-800 font-medium truncate">{b.label}</span>
                  )}
                </span>
              ))
            ) : title ? (
              <span className="text-slate-800 font-semibold">{title}</span>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all text-xs font-semibold border border-slate-200"
                title="Change language"
              >
                <Languages size={14} />
                <span>{LANGUAGES.find(l => l.code === lang)?.nativeName || 'EN'}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-9 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-44">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">Language</p>
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                        lang === l.code ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <div>
                        <p className="text-xs font-semibold leading-none">{l.nativeName}</p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{l.name}</p>
                      </div>
                      {lang === l.code && <span className="ml-auto text-sky-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifications}
                className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
                title="Notifications"
              >
                <Bell size={18} />
                {unseenCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unseenCount > 9 ? '9+' : unseenCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-80 max-w-[calc(100vw-2rem)]">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Last 7 days</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <BellOff size={24} className="text-slate-200 mb-2" />
                      <p className="text-xs text-slate-400">You're all caught up</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-slate-50">
                      {notifications.map(n => {
                        const meta = notifTypeMeta[n.type]
                        const NotifIcon = meta.icon
                        return (
                          <Link
                            key={n.id}
                            href={n.href}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                              <NotifIcon size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold">
              {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${!isDoctor ? 'pb-16 lg:pb-0' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      {!isDoctor && (
        <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-slate-100 flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {bottomNavKeys.map(({ key, href, icon: Icon }) => {
            const active = currentPath === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px] font-semibold transition-colors ${
                  active ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={19} className={active ? 'text-sky-600' : ''} />
                <span className="truncate max-w-[64px]">{t(key)}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* Floating SOS button */}
      <button
        onClick={() => setSosOpen(true)}
        className={`fixed right-6 z-50 flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-3 rounded-2xl shadow-lg shadow-red-600/30 transition-all hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 group ${!isDoctor ? 'bottom-20 lg:bottom-6' : 'bottom-6'}`}
        title="Emergency help"
      >
        <div className="w-5 h-5 relative flex-shrink-0">
          <Phone size={18} className="group-hover:animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-extrabold leading-none tracking-wide">{t('emergency.sos')}</p>
          <p className="text-[10px] font-medium leading-none opacity-80 mt-0.5">{t('emergency.sosLabel')}</p>
        </div>
      </button>

      {/* SOS Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSosOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <ShieldAlert size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">Emergency SOS</h3>
                    <p className="text-red-100 text-xs">India · Call or find nearby services</p>
                  </div>
                </div>
                <button onClick={() => setSosOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Quick Dial */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Dial</p>
                <div className="grid grid-cols-5 gap-2">
                  {quickDial.map(({ name, number, color }) => (
                    <a
                      key={number}
                      href={`tel:${number}`}
                      className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-white font-bold text-center transition-all ${color}`}
                    >
                      <Phone size={16} />
                      <span className="text-base font-black leading-none">{number}</span>
                      <span className="text-[9px] font-semibold opacity-90 leading-none">{name}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Find Nearby */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Find Nearby</p>
                  <button
                    onClick={shareLocation}
                    className="flex items-center gap-1 text-[10px] text-sky-600 font-semibold hover:text-sky-700"
                  >
                    <Share2 size={11} /> Share My Location
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {nearbyCategories.map(({ label, query, icon: Icon, bg, text, iconBg }) => (
                    <button
                      key={query}
                      onClick={() => findNearby(query, label)}
                      disabled={locatingFor === query}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all disabled:opacity-60 ${bg}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        {locatingFor === query
                          ? <Loader2 size={16} className={`animate-spin ${text}`} />
                          : <Icon size={16} className={text} />
                        }
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${text}`}>{label}</p>
                        <p className="text-[10px] text-slate-400">Near me</p>
                      </div>
                    </button>
                  ))}
                </div>
                {locError && (
                  <p className="mt-2 text-xs text-red-600 text-center bg-red-50 rounded-xl py-2 px-3">{locError}</p>
                )}

                {/* Inline results — shown right here in the card (no redirect) */}
                {nearby.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nearest {nearbyLabel}</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {nearby.map((p) => (
                        <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-white">
                          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                            <MapPin size={15} className="text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              <span className="font-semibold text-slate-500">{p.distanceText}</span>
                              {p.openNow === true ? <span className="text-emerald-600"> · Open</span> : p.openNow === false ? <span className="text-red-500"> · Closed</span> : ''}
                              {p.address ? ` · ${p.address}` : ''}
                            </p>
                          </div>
                          {p.phone && (
                            <a href={`tel:${p.phone}`} onClick={e => e.stopPropagation()} className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center flex-shrink-0" title="Call">
                              <Phone size={14} />
                            </a>
                          )}
                          <a href={p.directions} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-8 h-8 rounded-lg bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center flex-shrink-0" title="Directions">
                            <Share2 size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stay calm */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p className="font-semibold mb-0.5">Stay calm</p>
                  <p>Give your exact location. Stay on the line. Do not hang up until help arrives.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
