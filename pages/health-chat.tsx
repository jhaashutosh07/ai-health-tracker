import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Send, Sparkles, User, Loader2, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import AppShell from '@/components/AppShell'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'Summarize my health for a new doctor',
  'When did I last report a fever?',
  'How is my medication adherence?',
  'Are my vitals trending in the right direction?',
]

export default function HealthChat() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const updated: Message[] = [...messages, { role: 'user', content }]
    setMessages(updated)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/health-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessages([...updated, { role: 'assistant', content: data.message }])
    } catch (err: any) {
      setMessages([...updated, { role: 'assistant', content: `Sorry — ${err.message}. Please try again.` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Ask HealthAI">
      <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center pt-12 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center mb-4">
                <Brain size={26} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Ask anything about your health data</h1>
              <p className="text-sm text-slate-500 mt-2 max-w-md">
                I can see your symptom checks, vitals, medications, adherence, appointments, and prescriptions — and answer questions grounded in your actual records.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-7 w-full max-w-lg">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="card p-3.5 text-left text-xs font-medium text-slate-700 hover:border-violet-200 hover:shadow-md transition-all flex items-center gap-2.5"
                  >
                    <Sparkles size={13} className="text-violet-500 flex-shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2.5 max-w-[88%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-gradient-to-br from-violet-500 to-sky-500 text-white'
                  }`}>
                    {m.role === 'user' ? <User size={14} /> : <Brain size={14} />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="chat-markdown"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                  <Brain size={14} className="text-white" />
                </div>
                <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="animate-spin text-slate-500" size={15} />
                  <span className="text-sm text-slate-500">Reading your records…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-100 bg-white p-3.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && send()}
              placeholder="Ask about your symptoms, vitals, medications…"
              className="flex-1 input text-sm"
              disabled={loading}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 flex-shrink-0">
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Grounded in your HealthAI records · Powered by GPT-4o · Not medical advice
          </p>
        </div>
      </div>
    </AppShell>
  )
}
