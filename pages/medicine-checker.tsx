import { useState, useEffect, KeyboardEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import {
  Pill,
  Plus,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'

interface Interaction {
  medicines: string[]
  severity: 'MILD' | 'MODERATE' | 'SEVERE'
  description: string
  recommendation: string
}

interface CheckResult {
  overallSafety: 'SAFE' | 'CAUTION' | 'DANGER'
  interactions: Interaction[]
  generalAdvice: string
  importantWarnings: string[]
  shouldConsultDoctor: boolean
  demoMode?: boolean
}

const safetyConfig = {
  SAFE: {
    label: 'Safe Combination',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CAUTION: {
    label: 'Use with Caution',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  DANGER: {
    label: 'Dangerous Combination',
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
}

const severityConfig = {
  MILD:     { label: 'Mild',     cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  MODERATE: { label: 'Moderate', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  SEVERE:   { label: 'Severe',   cls: 'bg-red-100 text-red-700 border-red-200' },
}

const commonMeds = [
  'Aspirin', 'Paracetamol', 'Ibuprofen', 'Metformin', 'Atorvastatin',
  'Amlodipine', 'Omeprazole', 'Cetirizine', 'Amoxicillin', 'Azithromycin',
]

export default function MedicineChecker() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [medicines, setMedicines] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [expandedInteraction, setExpandedInteraction] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  const addMedicine = (name?: string) => {
    const val = (name || inputValue).trim()
    if (!val) return
    if (medicines.find(m => m.toLowerCase() === val.toLowerCase())) {
      setInputValue('')
      return
    }
    setMedicines(prev => [...prev, val])
    setInputValue('')
    setResult(null)
  }

  const removeMedicine = (idx: number) => {
    setMedicines(prev => prev.filter((_, i) => i !== idx))
    setResult(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addMedicine()
    }
  }

  const checkInteractions = async () => {
    if (medicines.length === 0) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/medicine-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setResult(data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to check interactions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <AppShell title="Medicine Checker">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-sky-500/40 border-t-sky-500 animate-spin" />
            Loading…
          </div>
        </div>
      </AppShell>
    )
  }

  const safety = result ? safetyConfig[result.overallSafety] : null
  const SafetyIcon = safety?.icon

  return (
    <AppShell
      title="Medicine Interaction Checker"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Medicine Checker' }]}
    >
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Pill size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Medicine Interaction Checker</h1>
            <p className="text-slate-500 text-sm mt-1">
              Powered by AI — add your medications to check for interactions, contraindications, and safety concerns.
            </p>
          </div>
        </div>

        {/* Input card */}
        <div className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Add medicines</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type medicine name and press Enter…"
                className="flex-1 input"
                list="med-suggestions"
              />
              <datalist id="med-suggestions">
                {commonMeds.map(m => <option key={m} value={m} />)}
              </datalist>
              <button
                onClick={() => addMedicine()}
                disabled={!inputValue.trim()}
                className="btn btn-primary gap-2 disabled:opacity-40"
              >
                <Plus size={16} /> Add
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Press Enter or comma to add quickly</p>
          </div>

          {/* Common suggestions */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Common medicines</p>
            <div className="flex flex-wrap gap-2">
              {commonMeds.map(med => (
                <button
                  key={med}
                  onClick={() => addMedicine(med)}
                  disabled={medicines.some(m => m.toLowerCase() === med.toLowerCase())}
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                >
                  {med}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine chips */}
          {medicines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Your medicines ({medicines.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {medicines.map((med, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-800 rounded-full text-sm font-medium"
                  >
                    <Pill size={13} />
                    {med}
                    <button
                      onClick={() => removeMedicine(idx)}
                      className="hover:text-red-500 transition-colors ml-0.5"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={checkInteractions}
            disabled={medicines.length === 0 || loading}
            className="btn btn-primary w-full justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing with AI…
              </>
            ) : (
              <>
                <Search size={16} />
                Check Interactions
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && safety && SafetyIcon && (
          <div className="space-y-4 fade-up">
            {/* Overall safety banner */}
            <div className={`card border p-5 ${safety.bg} ${safety.border}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${safety.bg}`}>
                  <SafetyIcon size={22} className={safety.text} />
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-lg ${safety.text}`}>{safety.label}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{result.generalAdvice}</p>
                </div>
                {result.demoMode && (
                  <span className="badge bg-slate-100 text-slate-500 border-slate-200 text-xs">Demo</span>
                )}
              </div>
            </div>

            {/* Interactions */}
            {result.interactions.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">
                    Found {result.interactions.length} interaction{result.interactions.length > 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {result.interactions.map((interaction, idx) => {
                    const sev = severityConfig[interaction.severity] || severityConfig.MILD
                    const isExpanded = expandedInteraction === idx
                    return (
                      <div key={idx} className="p-5">
                        <button
                          className="w-full text-left"
                          onClick={() => setExpandedInteraction(isExpanded ? null : idx)}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${sev.cls} flex-shrink-0`}>
                                {sev.label}
                              </span>
                              <span className="text-sm font-medium text-slate-800 truncate">
                                {interaction.medicines.join(' + ')}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-4 space-y-3 pl-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">What happens</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{interaction.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{interaction.recommendation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {result.interactions.length === 0 && result.overallSafety === 'SAFE' && (
              <div className="card p-5 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-slate-700">No significant interactions found between these medicines.</p>
              </div>
            )}

            {/* Warnings */}
            {result.importantWarnings.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <p className="font-semibold text-slate-900 text-sm">Important warnings</p>
                </div>
                <ul className="space-y-2">
                  {result.importantWarnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Consult doctor */}
            {result.shouldConsultDoctor && (
              <div className="card p-5 bg-sky-50 border-sky-100 flex items-start gap-3">
                <Info size={18} className="text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-900 text-sm">Consult your doctor or pharmacist</p>
                  <p className="text-xs text-sky-700 mt-1 leading-relaxed">
                    This AI analysis is for informational purposes only. Always verify medication combinations with a qualified healthcare professional before making any changes.
                  </p>
                </div>
              </div>
            )}

            {/* Powered by */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={13} />
              Powered by OpenAI GPT-4o · Not a substitute for professional medical advice
            </div>
          </div>
        )}

        {/* Empty state tips */}
        {!result && medicines.length === 0 && (
          <div className="card p-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">How it works</p>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Add the medicines you are taking or planning to take' },
                { step: '2', text: 'Click "Check Interactions" to analyze with AI' },
                { step: '3', text: 'Review the safety report with interaction details and recommendations' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {step}
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
