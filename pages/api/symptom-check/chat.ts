import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { anthropic, SYMPTOM_CHECKER_SYSTEM_PROMPT } from '@/lib/claude'
import { prisma } from '@/lib/prisma'

const DEMO_MODE = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here'

function generateDemoResponse(messages: any[]): string {
  const messageCount = messages.filter((m: any) => m.role === 'user').length
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content?.toLowerCase() || ''

  if (messageCount === 1) {
    return "Hello! I'm your AI health assistant powered by Claude. I'll help you understand your symptoms. Can you tell me what symptoms you're experiencing?"
  }
  if (messageCount === 2) {
    return "I understand. How long have you been experiencing these symptoms? Please specify in hours or days."
  }
  if (messageCount === 3) {
    return "On a scale of 1-10, how severe would you rate your symptoms? (1 being mild, 10 being very severe)"
  }
  if (messageCount === 4) {
    return "Have you experienced any other symptoms along with this? For example: fever, nausea, dizziness, or fatigue?"
  }
  if (messageCount === 5) {
    return "Do you have any existing medical conditions or are you currently taking any medications?"
  }
  if (messageCount >= 6) {
    const symptoms = extractSymptomsFromMessages(messages)
    const severity = determineSeverity(messages)
    return JSON.stringify({
      symptoms,
      severity,
      possibleConditions: ["Common cold", "Viral infection", "Flu"],
      recommendation: "see-doctor-soon",
      advice: "Based on your symptoms, I recommend scheduling an appointment with your doctor within the next 1-2 days. In the meantime, get plenty of rest, stay hydrated, and monitor your symptoms. If symptoms worsen or you experience difficulty breathing, chest pain, or high fever, seek immediate medical attention.",
      completed: true,
    })
  }
  return "Could you provide more details about your symptoms?"
}

function extractSymptomsFromMessages(messages: any[]): string[] {
  const commonSymptoms = ['headache', 'fever', 'cough', 'fatigue', 'sore throat', 'nausea', 'dizziness', 'pain']
  const userMessages = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content.toLowerCase()).join(' ')
  return commonSymptoms.filter(symptom => userMessages.includes(symptom))
}

function determineSeverity(messages: any[]): string {
  const userMessages = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content.toLowerCase()).join(' ')
  if (userMessages.includes('severe') || userMessages.includes('10') || userMessages.includes('9') || userMessages.includes('8')) {
    return 'HIGH'
  } else if (userMessages.includes('moderate') || userMessages.includes('5') || userMessages.includes('6') || userMessages.includes('7')) {
    return 'MEDIUM'
  }
  return 'LOW'
}

async function callClaude(messages: any[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: SYMPTOM_CHECKER_SYSTEM_PROMPT,
    messages: messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })
  return response.content[0]?.type === 'text' ? response.content[0].text : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { messages } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Invalid messages format' })
    }

    let aiResponse = ''

    if (DEMO_MODE) {
      aiResponse = generateDemoResponse(messages)
    } else {
      try {
        aiResponse = await callClaude(messages)
      } catch (apiError: any) {
        console.error('Claude API error, falling back to demo:', apiError.message)
        aiResponse = generateDemoResponse(messages)
      }
    }

    let assessment = null
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        assessment = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      // Not JSON yet, continue conversation
    }

    if (assessment?.completed) {
      const symptomLog = await prisma.symptomLog.create({
        data: {
          userId: session.user.id,
          symptoms: JSON.stringify(assessment.symptoms || []),
          description: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
          chatHistory: JSON.stringify(messages),
          severity: assessment.severity || 'LOW',
          aiDiagnosis: assessment.possibleConditions?.join(', ') || '',
          recommendation: assessment.advice || '',
        },
      })

      return res.status(200).json({
        message: aiResponse,
        assessment,
        symptomLogId: symptomLog.id,
        completed: true,
      })
    }

    return res.status(200).json({ message: aiResponse, completed: false })
  } catch (error: any) {
    console.error('Symptom check error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
