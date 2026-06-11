import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldAlert, Plus, X, Save, ExternalLink, Activity } from 'lucide-react'

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
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed])
    }
    setAllergyInput('')
  }

  const removeAllergy = (item: string) => {
    setAllergies(allergies.filter(a => a !== item))
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Emergency Card Setup */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-red-600 text-white p-5 flex items-center gap-3">
            <ShieldAlert size={24} />
            <div>
              <h2 className="text-xl font-bold">Emergency Medical Card</h2>
              <p className="text-red-100 text-sm">
                This info is shown to first responders via a public QR code — no login needed.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Blood Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Type</label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_TYPES.map(bt => (
                  <button
                    key={bt}
                    onClick={() => setBloodType(bt === bloodType ? '' : bt)}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors ${
                      bloodType === bt
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Known Allergies</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={e => setAllergyInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addAllergy()}
                  placeholder="e.g. Penicillin, Peanuts"
                  className="flex-1 input"
                />
                <button onClick={addAllergy} className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1">
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allergies.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                    {a}
                    <button onClick={() => removeAllergy(a)} className="hover:text-orange-600">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {allergies.length === 0 && (
                  <p className="text-sm text-gray-400">No allergies added yet</p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={e => setEmergencyContactName(e.target.value)}
                  placeholder="Full name"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={e => setEmergencyContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input w-full"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Emergency Info'}
            </button>
          </div>
        </div>

        {/* QR Code & Card Preview */}
        {session?.user?.id && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Emergency Card QR Code</h3>
            <p className="text-sm text-gray-500 mb-5">
              Print or save this QR code. First responders can scan it to see your emergency info — no app or login needed.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border">
                <QRCodeSVG value={cardUrl} size={160} />
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 break-all font-mono bg-gray-50 p-3 rounded-lg border">
                  {cardUrl}
                </p>
                <a
                  href={cardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 w-fit"
                >
                  <ExternalLink size={16} />
                  Preview Emergency Card
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
