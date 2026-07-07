import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Msg { role: 'user' | 'assistant'; content: string }

// Global "ask anything" assistant, grounded in the user's own records via /api/health-chat.
export default function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: "Hi! I'm your HealthAI assistant. Ask me about your health, your records, or how to use the app." }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/health-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.message || 'Sorry, please try again.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  return (
    <>
      {/* Launcher — bottom-left so it doesn't collide with the SOS button (bottom-right).
          Raised on mobile to clear the bottom nav. */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed left-5 bottom-20 lg:bottom-5 z-40 w-14 h-14 rounded-full brand-gradient text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
          style={{ boxShadow: '0 12px 30px -6px rgba(99,102,241,0.6)' }} aria-label="Open AI assistant">
          <Sparkles size={22} />
          <span className="absolute inset-0 rounded-full brand-gradient animate-ping opacity-20" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed left-4 bottom-20 lg:left-5 lg:bottom-5 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[560px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white fade-up">
          <div className="brand-gradient text-white px-4 py-3 flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><Bot size={16} /></div>
            <div className="flex-1"><p className="font-bold text-sm leading-none">HealthAI Assistant</p><p className="text-[11px] text-white/70 mt-0.5">Grounded in your records</p></div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700 chat-markdown'}`}>
                  {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5"><Loader2 size={14} className="animate-spin text-violet-500" /></div></div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); send() }} className="p-2.5 border-t border-slate-100 flex gap-2 bg-white flex-shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything…" className="input text-sm flex-1" disabled={loading} />
            <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary px-3 disabled:opacity-40"><Send size={15} /></button>
          </form>
        </div>
      )}
    </>
  )
}
