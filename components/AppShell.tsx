'use client'

import { ReactNode, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
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
} from 'lucide-react'

const patientNav = [
  { label: 'Dashboard',         href: '/dashboard',         icon: Activity },
  { label: 'Symptom Check',     href: '/symptom-check',     icon: ClipboardList },
  { label: 'Medicine Checker',  href: '/medicine-checker',  icon: Pill },
  { label: 'Mood Tracker',      href: '/mood-tracker',      icon: Smile },
  { label: 'Appointments',      href: '/appointments',      icon: Calendar },
  { label: 'Find Doctors',      href: '/find-doctors',      icon: Users },
  { label: 'Medical Records',   href: '/medical-records',   icon: FileText },
  { label: 'Analytics',         href: '/analytics',         icon: BarChart2 },
]

const doctorNav = [
  { label: 'Dashboard',    href: '/doctors/dashboard', icon: Activity },
  { label: 'Appointments', href: '/doctors/dashboard', icon: Calendar },
]

const emergencyNumbers = [
  { name: 'Emergency Services', number: '112', primary: true },
  { name: 'Ambulance',          number: '102', primary: false },
  { name: 'Ambulance (EMRI)',   number: '108', primary: false },
  { name: 'Police',             number: '100', primary: false },
  { name: 'Fire Brigade',       number: '101', primary: false },
]

interface AppShellProps {
  children: ReactNode
  title?: string
  breadcrumb?: { label: string; href?: string }[]
}

export default function AppShell({ children, title, breadcrumb }: AppShellProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)

  const isDoctor = session?.user?.role === 'DOCTOR'
  const nav = isDoctor ? doctorNav : patientNav
  const currentPath = router.pathname

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-slate-900 w-64 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">HealthAI</span>
        <span className="ml-auto bg-sky-500/20 text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">
          Claude
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = currentPath === href
          return (
            <Link
              key={href + label}
              href={href}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              {label}
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
              Settings
            </Link>
            <Link
              href={`/emergency/${session?.user?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item"
            >
              <ShieldAlert size={17} />
              Emergency Card
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
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all">
              <Bell size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold">
              {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Floating SOS button */}
      <button
        onClick={() => setSosOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-3 rounded-2xl shadow-lg shadow-red-600/30 transition-all hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 group"
        title="Emergency help"
      >
        <div className="w-5 h-5 relative flex-shrink-0">
          <Phone size={18} className="group-hover:animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-extrabold leading-none tracking-wide">SOS</p>
          <p className="text-[10px] font-medium leading-none opacity-80 mt-0.5">Emergency</p>
        </div>
      </button>

      {/* SOS Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSosOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Phone size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Emergency Help</h3>
                    <p className="text-red-100 text-xs">India emergency numbers</p>
                  </div>
                </div>
                <button
                  onClick={() => setSosOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Numbers */}
            <div className="p-5 space-y-3">
              {emergencyNumbers.map(({ name, number, primary }) => (
                <div
                  key={number}
                  className={`flex items-center justify-between p-3.5 rounded-2xl ${
                    primary ? 'bg-red-50 border-2 border-red-200' : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-medium ${primary ? 'text-red-600' : 'text-slate-500'}`}>{name}</p>
                    <p className={`text-2xl font-black tracking-tight ${primary ? 'text-red-700' : 'text-slate-800'}`}>
                      {number}
                    </p>
                  </div>
                  <a
                    href={`tel:${number}`}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      primary
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    <Phone size={14} />
                    Call
                  </a>
                </div>
              ))}
            </div>

            {/* Stay calm tip */}
            <div className="px-5 pb-5">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p className="font-semibold mb-1">Stay calm</p>
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
