import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { openai } from '@/lib/openai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized' })

  const { medicines } = req.body
  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ message: 'Please provide at least one medicine' })
  }

  const medicineList = (medicines as string[]).map(m => m.trim()).filter(Boolean)

  const prompt = `You are a clinical pharmacist AI. Analyze these medicines for interactions and safety.

Medicines: ${medicineList.join(', ')}

Return ONLY this JSON, no extra text:
{
  "overallSafety": "SAFE" | "CAUTION" | "DANGER",
  "interactions": [
    {
      "medicines": ["med1", "med2"],
      "severity": "MILD" | "MODERATE" | "SEVERE",
      "description": "What the interaction causes",
      "recommendation": "What to do"
    }
  ],
  "generalAdvice": "Overall guidance for taking these medicines",
  "importantWarnings": ["warning 1", "warning 2"],
  "shouldConsultDoctor": true | false
}

Rules:
- SAFE = no significant interactions
- CAUTION = minor interactions or individual-specific concerns
- DANGER = serious interactions requiring medical attention
- If only one medicine, analyse its general safety and common drug combinations to avoid
- Always recommend professional consultation for serious combinations`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.choices[0]?.message?.content || ''

    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = codeBlock ? codeBlock[1] : text.match(/\{[\s\S]*\}/)?.[0]

    if (jsonStr) {
      return res.status(200).json(JSON.parse(jsonStr))
    }

    return res.status(200).json({
      overallSafety: 'CAUTION',
      interactions: [],
      generalAdvice: text,
      importantWarnings: [],
      shouldConsultDoctor: true,
    })
  } catch (err: any) {
    console.error('Medicine checker error:', err)
    return res.status(500).json({
      message: `AI analysis failed: ${err.message}. Please try again.`,
    })
  }
}
