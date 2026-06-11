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
} from 'lucide-react'

const patientNav = [
  { label: 'Dashboard',       href: '/dashboard',       icon: Activity },
  { label: 'Symptom Check',   href: '/symptom-check',   icon: ClipboardList },
  { label: 'Appointments',    href: '/appointments',    icon: Calendar },
  { label: 'Find Doctors',    href: '/find-doctors',    icon: Users },
  { label: 'Medical Records', href: '/medical-records', icon: FileText },
  { label: 'Analytics',       href: '/analytics',       icon: BarChart2 },
]

const doctorNav = [
  { label: 'Dashboard',    href: '/doctors/dashboard', icon: Activity },
  { label: 'Appointments', href: '/doctors/dashboard', icon: Calendar },
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
    </div>
  )
}
