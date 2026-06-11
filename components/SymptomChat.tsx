'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Mic, MicOff, ImagePlus, AlertTriangle, Pill, Leaf, ShieldAlert, Clock, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Condition {
  name: string
  probability: number
  reasoning: string
}

interface Medicine {
  name: string
  type: 'OTC' | 'PRESCRIPTION' | 'ADVICE'
  purpose: string
  dosage: string
  warning?: string
}

interface Assessment {
  symptoms: string[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  possibleConditions: (Condition | string)[]
  medicineSuggestions?: Medicine[]
  nonMedicineApproaches?: string[]
  redFlags?: string[]
  recoveryTimeline?: string
  recommendation: string
  advice: string
  completed: boolean
}

interface SymptomChatProps {
  onAssessmentComplete?: (assessment: Assessment, symptomLogId: string) => void
  initialMessage?: string
}

const severityConfig = {
  LOW:      { label: 'Low Risk',  bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  MEDIUM:   { label: 'Moderate', bg: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200 text-amber-800' },
  HIGH:     { label: 'High Risk', bg: 'bg-orange-500',  light: 'bg-orange-50 border-orange-200 text-orange-800' },
  CRITICAL: { label: 'Critical',  bg: 'bg-red-600',     light: 'bg-red-50 border-red-200 text-red-800' },
}

function ProbabilityBar({ condition, index }: { condition: Condition; index: number }) {
  const colors = ['bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500']
  const color = colors[index % colors.length]
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-700">{condition.name}</span>
        <span className="text-xs font-bold text-slate-600">{condition.probability}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${condition.probability}%` }}
        />
      </div>
      {condition.reasoning && (
        <p className="text-[11px] text-slate-500 leading-relaxed">{condition.reasoning}</p>
      )}
    </div>
  )
}

function AssessmentCard({ assessment, symptomLogId }: { assessment: Assessment; symptomLogId?: string }) {
  const [showMeds, setShowMeds] = useState(true)
  const [showNonMed, setShowNonMed] = useState(true)
  const sev = severityConfig[assessment.severity] ?? severityConfig.LOW

  const conditions: Condition[] = assessment.possibleConditions.map(c =>
    typeof c === 'string' ? { name: c, probability: 0, reasoning: '' } : c
  )

  const medicines = assessment.medicineSuggestions || []
  const nonMed = assessment.nonMedicineApproaches || []
  const redFlags = assessment.redFlags || []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-sky-400" />
          <span className="text-white font-semibold text-sm">AI Health Assessment</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${sev.bg}`}>
          {sev.label}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Symptoms */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reported Symptoms</p>
          <div className="flex flex-wrap gap-1.5">
            {assessment.symptoms.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-700 font-medium">{s}</span>
            ))}
          </div>
        </div>

        {/* Conditions with probability */}
        {conditions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Possible Conditions</p>
            <div className="space-y-3">
              {conditions.map((c, i) => (
                <ProbabilityBar key={i} condition={c} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Medicine suggestions */}
        {medicines.length > 0 && (
          <div>
            <button
              onClick={() => setShowMeds(!showMeds)}
              className="flex items-center justify-between w-full mb-2"
            >
              <div className="flex items-center gap-1.5">
                <Pill size={13} className="text-sky-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medicine Suggestions</p>
              </div>
              {showMeds ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            {showMeds && (
              <div className="space-y-2">
                {medicines.map((m, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${
                    m.type === 'ADVICE' ? 'bg-amber-50 border-amber-100' :
                    m.type === 'PRESCRIPTION' ? 'bg-violet-50 border-violet-100' :
                    'bg-sky-50 border-sky-100'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{m.name}</p>
                      {m.type !== 'ADVICE' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          m.type === 'PRESCRIPTION'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}>{m.type}</span>
                      )}
                    </div>
                    {m.purpose && <p className="text-[11px] text-slate-500 mt-0.5">{m.purpose}</p>}
                    {m.dosage && <p className="text-[11px] text-slate-600 mt-1 font-medium">{m.dosage}</p>}
                    {m.warning && (
                      <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                        <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />{m.warning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Non-medicine approaches */}
        {nonMed.length > 0 && (
          <div>
            <button
              onClick={() => setShowNonMed(!showNonMed)}
              className="flex items-center justify-between w-full mb-2"
            >
              <div className="flex items-center gap-1.5">
                <Leaf size={13} className="text-emerald-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Natural Approaches</p>
              </div>
              {showNonMed ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            {showNonMed && (
              <ul className="space-y-1.5">
                {nonMed.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-px">{i + 1}</div>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Red flags */}
        {redFlags.length > 0 && (
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert size={13} className="text-red-600" />
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Seek Immediate Care If</p>
            </div>
            <ul className="space-y-1">
              {redFlags.map((flag, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5">•</span>{flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recovery timeline */}
        {assessment.recoveryTimeline && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
            <Clock size={13} className="text-slate-500 flex-shrink-0" />
            <p className="text-xs text-slate-600"><span className="font-semibold">Recovery:</span> {assessment.recoveryTimeline}</p>
          </div>
        )}

        {/* Book appointment CTA */}
        {(assessment.severity === 'MEDIUM' || assessment.severity === 'HIGH' || assessment.severity === 'CRITICAL') && (
          <Link
            href={`/appointments/new${symptomLogId ? `?symptomLogId=${symptomLogId}` : ''}`}
            className="flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all"
          >
            <Calendar size={14} /> Book a Doctor Appointment
          </Link>
        )}
      </div>
    </div>
  )
}

export default function SymptomChat({ onAssessmentComplete, initialMessage }: SymptomChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI health assistant. I'm here to help you understand what you're going through.\n\nYou can type your symptoms, use the 🎤 mic to speak, or even 📷 upload a photo of something you're concerned about.\n\nSo — what's been bothering you?",
    },
  ])
  const [input, setInput] = useState(initialMessage || '')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [imageAnalyzing, setImageAnalyzing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [symptomLogId, setSymptomLogId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => { scrollToBottom() }, [messages, assessment])
  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/symptom-check/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to get response')

      setMessages([...updatedMessages, { role: 'assistant', content: data.message }])

      if (data.assessment && data.completed) {
        setCompleted(true)
        setAssessment(data.assessment)
        setSymptomLogId(data.symptomLogId)
        if (onAssessmentComplete) {
          onAssessmentComplete(data.assessment, data.symptomLogId)
        }
      }
    } catch (error: any) {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: `I ran into an issue: ${error.message}. Please try again.` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPEG, PNG, GIF, or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB.')
      return
    }
    setImageAnalyzing(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch('/api/symptom-check/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType: file.type }),
        })
        const data = await res.json()
        if (data.description) setInput(prev => prev ? prev + ' ' + data.description : data.description)
      } catch {
        alert('Failed to analyze image. Please describe your symptoms manually.')
      } finally {
        setImageAnalyzing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2.5 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                message.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {message.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-sm'
                  : 'bg-slate-100 text-slate-900 rounded-tl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Rich assessment card rendered in chat */}
        {assessment && (
          <div className="flex justify-start">
            <div className="flex gap-2.5 max-w-[92%]">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-sky-400" />
              </div>
              <AssessmentCard assessment={assessment} symptomLogId={symptomLogId} />
            </div>
          </div>
        )}

        {(loading || imageAnalyzing) && (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-slate-600" />
              </div>
              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="animate-spin text-slate-500" size={16} />
                <span className="text-sm text-slate-500">
                  {imageAnalyzing ? 'Analyzing image…' : 'Thinking…'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 bg-white p-3.5">
        {isListening && (
          <div className="mb-2.5 flex items-center gap-2 text-xs text-red-600 font-semibold animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
            Listening… speak now
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={loading || imageAnalyzing || completed} title="Upload a symptom image" className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition-colors flex-shrink-0">
            <ImagePlus size={17} />
          </button>
          <button onClick={toggleVoice} disabled={loading || completed} title={isListening ? 'Stop recording' : 'Speak your symptoms'} className={`p-2.5 rounded-xl disabled:opacity-40 transition-colors flex-shrink-0 ${isListening ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
            {isListening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={completed ? 'Assessment complete — start a new chat to check again' : isListening ? 'Listening…' : 'Describe your symptoms…'}
            className="flex-1 input text-sm"
            disabled={loading || isListening || completed}
          />
          <button onClick={handleSend} disabled={loading || !input.trim() || completed} className="btn btn-primary disabled:opacity-50 flex-shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
