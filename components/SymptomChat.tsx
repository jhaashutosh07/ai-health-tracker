'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Mic, MicOff, ImagePlus, Volume2, VolumeX } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getT } from '@/lib/i18n/translations'

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

interface Assessment {
  symptoms: string[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  possibleConditions: ({ name: string; probability: number; reasoning: string } | string)[]
  medicineSuggestions?: any[]
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

const SPEECH_LANG: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
}

export default function SymptomChat({ onAssessmentComplete, initialMessage }: SymptomChatProps) {
  const { lang, t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getT(lang)('symptom.greeting') },
  ])

  // Reset greeting when language changes (only if conversation hasn't started)
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: t('symptom.greeting') }]
      }
      return prev
    })
  }, [lang, t])
  const [input, setInput] = useState(initialMessage || '')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speakEnabled, setSpeakEnabled] = useState(false)
  const [imageAnalyzing, setImageAnalyzing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])
  useEffect(() => () => {
    recognitionRef.current?.stop()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LANG[lang] || 'en-IN'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  const toggleSpeak = () => {
    if (speakEnabled) window.speechSynthesis?.cancel()
    setSpeakEnabled(v => !v)
  }

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
        body: JSON.stringify({ messages: updatedMessages, lang }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to get response')

      // Strip any JSON code block that leaked through
      const cleanMessage = (data.message || '')
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim()

      if (cleanMessage) {
        setMessages([...updatedMessages, { role: 'assistant', content: cleanMessage }])
        if (speakEnabled) speak(cleanMessage)
      }

      if (data.assessment && data.completed) {
        setCompleted(true)
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
      toast.error('Voice input is not supported in this browser. Please use Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = SPEECH_LANG[lang] || 'en-IN'
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
      toast.error('Please upload a JPEG, PNG, GIF, or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.')
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
        toast.error('Failed to analyze image. Please describe your symptoms manually.')
      } finally {
        setImageAnalyzing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col h-full">
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
                {message.role === 'assistant' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {(loading || imageAnalyzing) && (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-slate-600" />
              </div>
              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="animate-spin text-slate-500" size={16} />
                <span className="text-sm text-slate-500">
                  {imageAnalyzing ? t('symptom.analysingImage') : t('symptom.thinking')}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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
          <button onClick={toggleSpeak} title={speakEnabled ? 'Stop reading replies aloud' : 'Read replies aloud'} className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${speakEnabled ? 'bg-sky-100 hover:bg-sky-200 text-sky-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
            {speakEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={completed ? t('symptom.completed') : isListening ? t('symptom.listening') : t('symptom.placeholder')}
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
