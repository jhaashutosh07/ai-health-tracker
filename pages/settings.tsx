import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldAlert, Plus, X, Save, ExternalLink, CheckCircle2 } from 'lucide-react'
import AppShell from '@/components/AppShell'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Settings() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [allergyInput, setAllergyInput] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/profile/emergency-info?userId=${session.user.id}`)
      .then(r => r.json())
      .then(data => {
        setBloodType(data.bloodType || '')
        setAllergies(data.allergies || [])
        setEmergencyContactName(data.emergencyContactName || '')
        setEmergencyContactPhone(data.emergencyContactPhone || '')
      })
      .catch(() => {})
  }, [session?.user?.id])

  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergies.includes(trimmed)) setAllergies([...allergies, trimmed])
    setAllergyInput('')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/profile/emergency-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloodType, allergies, emergencyContactName, emergencyContactPhone }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const cardUrl = typeof window !== 'undefined' && session?.user?.id
    ? `${window.location.origin}/emergency/${session.user.id}`
    : ''

  if (status === 'loading') return null

  return (
    <AppShell
      title="Settings"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
    >
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Emergency Card Setup */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Emergency Medical Card</h2>
              <p className="text-red-100 text-sm mt-0.5">
                Shown to first responders via QR code — no login needed.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Blood Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Blood Type</label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_TYPES.map(bt => (
                  <button
                    key={bt}
                    onClick={() => setBloodType(bt === bloodType ? '' : bt)}
                    className={`w-14 h-10 rounded-xl border-2 text-sm font-bold transition-all ${
                      bloodType === bt
                        ? 'bg-red-500 border-red-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-red-300'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Known Allergies</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={e => setAllergyInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addAllergy()}
                  placeholder="e.g. Penicillin, Peanuts, Latex…"
                  className="input flex-1"
                />
                <button onClick={addAllergy} className="btn btn-outline gap-1.5">
                  <Plus size={15} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {allergies.map((a, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 px-3 py-1 rounded-full text-sm">
                    {a}
                    <button onClick={() => setAllergies(allergies.filter((_, j) => j !== i))} className="hover:text-orange-500 ml-0.5">
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {allergies.length === 0 && (
                  <p className="text-xs text-slate-400 self-center">No allergies added yet</p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={e => setEmergencyContactName(e.target.value)}
                  placeholder="Full name"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={e => setEmergencyContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary gap-2"
              >
                {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save emergency info'}
              </button>
              {saved && <p className="text-sm text-emerald-600 font-medium">Changes saved successfully</p>}
            </div>
          </div>
        </div>

        {/* QR Code card */}
        {session?.user?.id && (
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Your Emergency Card QR Code</h3>
            <p className="text-sm text-slate-500 mb-6">
              Print and carry this QR code. First responders scan it to see your critical info — no app or account needed.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex-shrink-0">
                <QRCodeSVG value={cardUrl} size={150} />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Card URL</p>
                  <code className="block text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl break-all font-mono">
                    {cardUrl}
                  </code>
                </div>

                <a
                  href={cardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-danger gap-2 w-fit"
                >
                  <ExternalLink size={14} />
                  Preview emergency card
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
