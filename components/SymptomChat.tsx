'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Calendar, Mic, MicOff, ImagePlus } from 'lucide-react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  possibleConditions: string[]
  recommendation: string
  advice: string
  completed: boolean
}

interface SymptomChatProps {
  onAssessmentComplete?: (assessment: Assessment, symptomLogId: string) => void
}

export default function SymptomChat({ onAssessmentComplete }: SymptomChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI health assistant powered by Claude. I'll help you understand your symptoms.\n\nYou can type, use the 🎤 microphone button to speak, or upload an image of your symptom. To get started — what symptoms are you experiencing?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [imageAnalyzing, setImageAnalyzing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

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

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get response')
      }

      setMessages([...updatedMessages, { role: 'assistant', content: data.message }])

      if (data.assessment && data.completed) {
        setAssessment(data.assessment)
        if (onAssessmentComplete) {
          onAssessmentComplete(data.assessment, data.symptomLogId)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' },
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
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' + transcript : transcript))
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
        if (data.description) {
          setInput(prev => (prev ? prev + ' ' + data.description : data.description))
        }
      } catch {
        alert('Failed to analyze image. Please describe your symptoms manually.')
      } finally {
        setImageAnalyzing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div
                className={`px-4 py-3 rounded-lg ${
                  message.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {(loading || imageAnalyzing) && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm text-gray-500">
                  {imageAnalyzing ? 'Analyzing image...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {assessment && (
          <div className="border-t pt-4 mt-4">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="text-primary-600" />
                Assessment Summary
              </h3>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Severity Level</p>
                <span className={`inline-block px-4 py-2 rounded-lg border font-semibold ${getSeverityColor(assessment.severity)}`}>
                  {assessment.severity}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Reported Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {assessment.symptoms.map((symptom, idx) => (
                    <span key={idx} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Possible Conditions</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {assessment.possibleConditions.map((condition, idx) => (
                    <li key={idx}>{condition}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recommendation</p>
                <p className="text-gray-600">{assessment.advice}</p>
              </div>

              {assessment.severity !== 'LOW' && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-start gap-3">
                  <Calendar className="text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-primary-900">Ready to book an appointment?</p>
                    <p className="text-sm text-primary-700 mt-1">
                      Based on your symptoms, we recommend scheduling a consultation with a healthcare provider.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        {isListening && (
          <div className="mb-2 flex items-center gap-2 text-sm text-red-600 font-medium animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
            Listening... Speak now
          </div>
        )}
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || imageAnalyzing || !!assessment}
            title="Upload a symptom image for AI analysis"
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-40 p-2"
          >
            <ImagePlus size={18} />
          </button>

          {/* Voice input button */}
          <button
            onClick={toggleVoice}
            disabled={loading || !!assessment}
            title={isListening ? 'Stop recording' : 'Speak your symptoms'}
            className={`btn p-2 disabled:opacity-40 ${
              isListening
                ? 'bg-red-100 hover:bg-red-200 text-red-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Listening...' : 'Type or speak your symptoms...'}
            className="flex-1 input"
            disabled={loading || isListening}
          />

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
