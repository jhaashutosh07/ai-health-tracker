import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Printer, ArrowLeft, Loader2, FileText } from 'lucide-react'

interface Report {
  patientName: string
  patientEmail: string
  generatedOn: string
  summary: string
  data: {
    symptomChecks: { date: string; symptoms: any; severity: string; recommendation?: string }[]
    vitals: { date: string; type: string; reading: string; context?: string }[]
    medications: { name: string; dosage: string; frequency: string }[]
    appointments: { date: string; doctor: string; status: string; reason: string }[]
    conditions: { condition: string; diagnosis?: string }[]
  }
}

export default function HealthReport() {
  const { status } = useSession()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/health-report')
      .then(r => (r.ok ? r.json() : null))
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-sky-500" /></div>
  }
  if (!report) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Could not load your report.</div>
  }

  const fmt = (s: any) => Array.isArray(s) ? s.join(', ') : String(s)

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Controls (hidden in print) */}
      <div className="print:hidden sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Dashboard</Link>
        <button onClick={() => window.print()} className="btn btn-primary gap-2 text-sm"><Printer size={15} /> Download / Print PDF</button>
      </div>

      {/* Printable sheet */}
      <div className="max-w-3xl mx-auto bg-white my-6 p-10 shadow-sm print:my-0 print:shadow-none print:p-0" style={{ fontSize: 13 }}>
        <div className="flex items-center gap-3 border-b-2 border-sky-500 pb-4 mb-6">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center"><FileText size={20} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">HealthAI — Patient Health Summary</h1>
            <p className="text-xs text-slate-500">For sharing with a doctor · Generated {new Date(report.generatedOn).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm"><strong>Patient:</strong> {report.patientName}{report.patientEmail ? ` · ${report.patientEmail}` : ''}</p>
        </div>

        {report.summary && (
          <div className="prose prose-sm max-w-none mb-8 text-slate-700">
            <ReactMarkdown>{report.summary}</ReactMarkdown>
          </div>
        )}

        <Section title="Current Medications" empty={report.data.medications.length === 0}>
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-1.5 pr-3">Medicine</th><th className="py-1.5 pr-3">Dosage</th><th className="py-1.5">Frequency</th></tr></thead>
            <tbody>{report.data.medications.map((m, i) => (
              <tr key={i} className="border-b border-slate-100"><td className="py-1.5 pr-3 font-medium">{m.name}</td><td className="py-1.5 pr-3">{m.dosage}</td><td className="py-1.5">{m.frequency}</td></tr>
            ))}</tbody>
          </table>
        </Section>

        <Section title="Recent Symptom Assessments" empty={report.data.symptomChecks.length === 0}>
          {report.data.symptomChecks.map((s, i) => (
            <p key={i} className="mb-1.5"><strong>{s.date}</strong> — {fmt(s.symptoms)} <span className="text-slate-500">({s.severity})</span>{s.recommendation ? ` · ${s.recommendation}` : ''}</p>
          ))}
        </Section>

        <Section title="Recent Vitals" empty={report.data.vitals.length === 0}>
          {report.data.vitals.map((v, i) => (
            <p key={i} className="mb-1"><strong>{v.date}</strong> — {v.type}: {v.reading}{v.context ? ` (${v.context})` : ''}</p>
          ))}
        </Section>

        <Section title="Appointments" empty={report.data.appointments.length === 0}>
          {report.data.appointments.map((a, i) => (
            <p key={i} className="mb-1"><strong>{a.date}</strong> — {a.doctor} · {a.status} · {a.reason}</p>
          ))}
        </Section>

        <Section title="Medical History" empty={report.data.conditions.length === 0}>
          {report.data.conditions.map((c, i) => (
            <p key={i} className="mb-1"><strong>{c.condition}</strong>{c.diagnosis ? ` — ${c.diagnosis}` : ''}</p>
          ))}
        </Section>

        <p className="text-[11px] text-slate-400 border-t border-slate-200 pt-4 mt-8">
          Generated by HealthAI from patient-entered data and AI assessments. For informational use; not a substitute for clinical evaluation.
        </p>
      </div>
    </div>
  )
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  if (empty) return null
  return (
    <div className="mb-6 break-inside-avoid">
      <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">{title}</h2>
      <div className="text-slate-700">{children}</div>
    </div>
  )
}
