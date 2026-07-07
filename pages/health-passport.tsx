import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Droplet, AlertTriangle, Phone, Printer, Settings, ShieldCheck } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Info { name: string | null; bloodType: string | null; allergies: string[]; emergencyContactName: string | null; emergencyContactPhone: string | null; emergencyToken?: string }

export default function HealthPassport() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [info, setInfo] = useState<Info | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile/emergency-info').then(r => r.ok ? r.json() : null).then(setInfo).catch(() => {})
  }, [status])

  if (status === 'loading') return null
  const cardUrl = typeof window !== 'undefined' && info?.emergencyToken ? `${window.location.origin}/emergency/${info.emergencyToken}` : ''

  return (
    <AppShell title="Health Passport" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Health Passport' }]}>
      <div className="p-6 lg:p-8 max-w-xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0"><QrCode size={22} className="text-white" /></div>
            <div><h1 className="text-2xl font-bold text-slate-900">Health Passport</h1><p className="text-slate-500 text-sm mt-1">Show this QR to any doctor or first responder to share your key medical info instantly.</p></div>
          </div>
          <button onClick={() => window.print()} className="btn btn-outline gap-2 text-sm"><Printer size={14} /> Print</button>
        </div>

        {/* Passport card */}
        <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white">
          <div className="brand-gradient px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2"><ShieldCheck size={18} /><span className="font-bold tracking-wide">HEALTH PASSPORT</span></div>
            <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">HealthAI</span>
          </div>
          <div className="p-6 flex flex-col sm:flex-row gap-6 items-center">
            <div className="p-3 bg-white rounded-2xl border border-slate-100 flex-shrink-0">
              {cardUrl ? <QRCodeSVG value={cardUrl} size={140} /> : <div className="w-[140px] h-[140px] bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400 text-center px-3">Add emergency info in Settings</div>}
            </div>
            <div className="flex-1 min-w-0 w-full space-y-2.5">
              <div><p className="text-[10px] text-slate-400 uppercase tracking-widest">Name</p><p className="font-bold text-slate-900 text-lg">{info?.name || session?.user?.name || '—'}</p></div>
              <div className="flex items-center gap-2 text-sm"><Droplet size={13} className="text-red-500" /><span className="text-slate-500">Blood:</span> <span className="font-bold text-slate-800">{info?.bloodType || '—'}</span></div>
              <div className="flex items-start gap-2 text-sm"><AlertTriangle size={13} className="text-amber-500 mt-0.5" /><span><span className="text-slate-500">Allergies:</span> <span className="font-medium text-slate-800">{info?.allergies?.length ? info.allergies.join(', ') : 'None recorded'}</span></span></div>
              {(info?.emergencyContactName || info?.emergencyContactPhone) && (
                <div className="flex items-center gap-2 text-sm"><Phone size={13} className="text-sky-500" /><span className="text-slate-500">ICE:</span> <span className="font-medium text-slate-800">{info?.emergencyContactName} {info?.emergencyContactPhone}</span></div>
              )}
            </div>
          </div>
          <div className="px-6 pb-5"><p className="text-[10px] text-slate-400">Scan the QR to open a live medical card. Patient-provided info — verify with records where possible.</p></div>
        </div>

        {(!info?.bloodType && !info?.allergies?.length) && (
          <Link href="/settings" className="print:hidden card p-4 flex items-center gap-3 hover:border-sky-200 card-hover">
            <Settings size={18} className="text-sky-500" />
            <span className="text-sm text-slate-600">Add your blood type, allergies & emergency contact in Settings to complete your passport.</span>
          </Link>
        )}
      </div>
    </AppShell>
  )
}
