'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Calendar } from 'lucide-react'

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
      content: 'Hello! I\'m your AI health assistant. I\'ll help you understand your symptoms. To get started, please tell me what symptoms you\'re experiencing.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: data.message },
      ])

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
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex gap-3 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div
                className={`px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <Loader2 className="animate-spin" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Assessment Summary */}
        {assessment && (
          <div className="border-t pt-4 mt-4">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="text-primary-600" />
                Assessment Summary
              </h3>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Severity Level</p>
                <span
                  className={`inline-block px-4 py-2 rounded-lg border font-semibold ${getSeverityColor(
                    assessment.severity
                  )}`}
                >
                  {assessment.severity}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Reported Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {assessment.symptoms.map((symptom, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                    >
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
                      Based on your symptoms, we recommend scheduling a consultation with a
                      healthcare provider.
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
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your symptoms..."
            className="flex-1 input"
            disabled={loading}
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
