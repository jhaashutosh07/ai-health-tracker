import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Camera, Loader2, Upload, AlertTriangle, CheckCircle2, Stethoscope, ArrowRight, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'

interface DiagResult {
  type?: string
  observation: string
  possibleConditions: { name: string; note: string }[]
  severity: 'low' | 'medium' | 'high'
  recommendation?: string
  advice: string
  redFlags?: string[]
}

const KINDS = ['Skin / rash', 'Wound', 'Eye', 'Lab report', 'Prescription', 'Other']

const sevMeta: Record<string, { label: string; cls: string }> = {
  low: { label: 'Low concern', cls: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Moderate', cls: 'bg-amber-100 text-amber-700' },
  high: { label: 'High concern', cls: 'bg-red-100 text-red-700' },
}

export default function ImageDiagnosis() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [base64, setBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('')
  const [kind, setKind] = useState('Skin / rash')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagResult | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  const onFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB.'); return }
    setResult(null)
    setMimeType(file.type)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      setBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const analyze = async () => {
    if (!base64) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/image-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType, kind }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setResult(data.result)
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return null
  const sev = result ? (sevMeta[result.severity] || sevMeta.low) : null

  return (
    <AppShell title="Image Diagnosis" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Image Diagnosis' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Camera size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Image Diagnosis</h1>
            <p className="text-slate-500 text-sm mt-1">Upload a photo of a skin condition, wound, rash, or a lab report / prescription for an AI assessment. Not a medical diagnosis.</p>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {KINDS.map(k => (
              <button key={k} onClick={() => setKind(k)} className={`text-xs font-medium px-3 py-1.5 rounded-full border-2 transition-all ${kind === k ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {k}
              </button>
            ))}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />

          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="preview" className="max-h-72 rounded-xl border border-slate-200 mx-auto" />
              <div className="flex gap-2 justify-center">
                <button onClick={() => fileRef.current?.click()} className="btn btn-outline gap-2 text-sm"><Upload size={14} /> Change</button>
                <button onClick={analyze} disabled={loading} className="btn btn-primary gap-2 text-sm disabled:opacity-50">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : <><Stethoscope size={14} /> Analyze image</>}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-2xl py-12 flex flex-col items-center gap-2 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-all">
              <Upload size={28} />
              <span className="text-sm font-medium">Tap to upload an image</span>
              <span className="text-xs">JPG, PNG or WEBP · max 10MB</span>
            </button>
          )}
        </div>

        {result && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">AI Assessment</h2>
              {sev && <span className={`text-xs font-bold px-3 py-1 rounded-full ${sev.cls}`}>{sev.label}</span>}
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">What's visible</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.observation}</p>
            </div>

            {result.possibleConditions?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Possible explanations</p>
                <ul className="space-y-2">
                  {result.possibleConditions.map((c, i) => (
                    <li key={i} className="text-sm text-slate-700"><span className="font-semibold">{c.name}</span>{c.note ? ` — ${c.note}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.advice && (
              <div className="bg-sky-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">What to do</p>
                <p className="text-sm text-slate-700 leading-relaxed">{result.advice}</p>
              </div>
            )}

            {result.redFlags && result.redFlags.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2"><AlertTriangle size={13} className="text-red-600" /><p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Seek care immediately if</p></div>
                <ul className="space-y-1.5">
                  {result.redFlags.map((f, i) => <li key={i} className="text-sm text-red-700 flex items-start gap-2"><ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />{f}</li>)}
                </ul>
              </div>
            )}

            <Link href="/find-doctors" className="btn btn-primary gap-2 text-sm w-fit">
              <Stethoscope size={14} /> Find a doctor <ArrowRight size={13} />
            </Link>

            <p className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-2 border-t border-slate-100">
              <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" />
              This is an AI assessment for guidance only, not a medical diagnosis. Consult a doctor for confirmation.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
