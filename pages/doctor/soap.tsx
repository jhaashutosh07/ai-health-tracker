import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { FileText, Mic, MicOff, Loader2, Sparkles, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'

interface Rx { name: string; dosage: string; frequency: string; duration: string; instructions: string }
interface Soap { subjective: string; objective: string; assessment: string; plan: string; prescription: Rx[] }

export default function SoapNotes() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [soap, setSoap] = useState<Soap | null>(null)
  const recRef = useRef<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
    else if (session && session.user.role !== 'DOCTOR') router.push('/dashboard')
  }, [session, status, router])

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Speech recognition not supported in this browser.'); return }
    const rec = new SR(); recRef.current = rec
    rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = false
    rec.onresult = (e: any) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript + ' '
      setTranscript(prev => (prev + ' ' + text).trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start(); setListening(true)
  }

  const generate = async () => {
    if (transcript.trim().length < 15) { toast.error('Record or paste a longer transcript first.'); return }
    setLoading(true); setSoap(null)
    try {
      const res = await fetch('/api/doctor/soap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setSoap(data.result)
    } catch (e: any) { toast.error(e.message || 'Failed to generate notes.') } finally { setLoading(false) }
  }

  if (status === 'loading') return null

  const Section = ({ t, v }: { t: string; v: string }) => (
    <div className="mb-4">
      <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">{t}</p>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{v || '—'}</p>
    </div>
  )

  return (
    <AppShell title="AI SOAP Notes" breadcrumb={[{ label: 'Dashboard', href: '/doctors/dashboard' }, { label: 'AI SOAP Notes' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center flex-shrink-0"><FileText size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Consultation Scribe</h1>
            <p className="text-slate-500 text-sm mt-1">Record or paste the consultation — AI drafts structured SOAP notes and a prescription for you to review and edit.</p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Consultation transcript</p>
            <button onClick={toggleMic} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${listening ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {listening ? <><MicOff size={13} /> Stop recording</> : <><Mic size={13} /> Record</>}
            </button>
          </div>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={7} placeholder="Speak (Record) or paste the doctor–patient conversation here…" className="input resize-none text-sm" />
          <button onClick={generate} disabled={loading} className="btn btn-primary gap-2 disabled:opacity-50">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate SOAP notes</>}
          </button>
        </div>

        {soap && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4"><ClipboardCheck size={17} className="text-emerald-500" /><h2 className="font-bold text-slate-900">SOAP Note (draft)</h2></div>
            <Section t="Subjective" v={soap.subjective} />
            <Section t="Objective" v={soap.objective} />
            <Section t="Assessment" v={soap.assessment} />
            <Section t="Plan" v={soap.plan} />
            {soap.prescription?.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-2">Prescription draft</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-1.5 pr-3">Medicine</th><th className="py-1.5 pr-3">Dosage</th><th className="py-1.5 pr-3">Freq</th><th className="py-1.5 pr-3">Duration</th><th className="py-1.5">Notes</th></tr></thead>
                    <tbody>{soap.prescription.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100"><td className="py-1.5 pr-3 font-medium">{r.name}</td><td className="py-1.5 pr-3">{r.dosage}</td><td className="py-1.5 pr-3">{r.frequency}</td><td className="py-1.5 pr-3">{r.duration}</td><td className="py-1.5">{r.instructions}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">AI-generated draft from the transcript. Review, correct, and confirm before clinical use.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
