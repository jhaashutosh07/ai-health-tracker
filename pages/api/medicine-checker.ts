import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { anthropic } from '@/lib/claude'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { medicines } = req.body
  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ message: 'Please provide at least one medicine' })
  }

  const medicineList = medicines.map((m: string) => m.trim()).filter(Boolean)

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    return res.status(200).json({
      overallSafety: 'CAUTION',
      interactions: [],
      generalAdvice: 'AI analysis is currently unavailable. Please consult your doctor or pharmacist about drug interactions.',
      importantWarnings: ['Always check with a qualified healthcare professional before combining medications.'],
      shouldConsultDoctor: true,
      demoMode: true,
    })
  }

  try {
    const prompt = `You are a clinical pharmacist AI. Analyze the following medicines for potential drug interactions, contraindications, and safety concerns.

Medicines: ${medicineList.join(', ')}

Provide a thorough safety analysis in this exact JSON format:
{
  "overallSafety": "SAFE" | "CAUTION" | "DANGER",
  "interactions": [
    {
      "medicines": ["medicine1", "medicine2"],
      "severity": "MILD" | "MODERATE" | "SEVERE",
      "description": "What the interaction causes",
      "recommendation": "What to do about it"
    }
  ],
  "generalAdvice": "Overall guidance for taking these medicines together",
  "importantWarnings": ["Warning 1", "Warning 2"],
  "shouldConsultDoctor": true | false
}

Guidelines:
- SAFE: No significant interactions found
- CAUTION: Minor interactions or individual-specific concerns
- DANGER: Significant interactions that could cause serious harm
- Be specific and clinically accurate
- If only one medicine provided, analyze its general safety, side effects, and common interactions to watch for
- Always recommend professional consultation for serious combinations`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return res.status(200).json(result)
    }

    return res.status(200).json({
      overallSafety: 'CAUTION',
      interactions: [],
      generalAdvice: text,
      importantWarnings: [],
      shouldConsultDoctor: true,
    })
  } catch (error: any) {
    console.error('Medicine checker error:', error)
    return res.status(500).json({ message: 'Failed to analyze medicines. Please try again.' })
  }
}
