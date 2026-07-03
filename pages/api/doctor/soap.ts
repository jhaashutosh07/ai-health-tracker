import { NextApiRequest, NextApiResponse } from 'next'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { tryParse } from '@/lib/assessment'
import { requireVerifiedDoctor } from '@/lib/doctorAuth'

// Turns a raw consultation transcript into structured SOAP notes + an Rx draft.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const doctor = await requireVerifiedDoctor(req, res)
  if (!doctor) return // response already sent

  const { transcript } = req.body
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 15) {
    return res.status(400).json({ message: 'Please provide a longer consultation transcript.' })
  }

  const prompt = `You are a clinical scribe. From the doctor-patient consultation transcript below, produce structured SOAP notes and a prescription draft for the doctor to review and edit.
Respond ONLY with JSON:
{
  "subjective": "patient's reported symptoms, history, concerns",
  "objective": "exam findings / vitals mentioned (write 'Not documented' if none)",
  "assessment": "likely diagnosis / differential as discussed",
  "plan": "investigations, advice, follow-up",
  "prescription": [ { "name": "Drug (Indian brand if apt)", "dosage": "e.g. 500mg", "frequency": "e.g. BD", "duration": "e.g. 5 days", "instructions": "e.g. after food" } ],
  "completed": true
}
Rules: use ONLY what's in the transcript — do not invent findings or drugs not discussed; if the plan/prescription isn't clear, leave the array empty and say so in 'plan'. This is a draft for a licensed doctor to verify.

TRANSCRIPT:
${transcript.slice(0, 6000)}`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.choices[0]?.message?.content || ''
    const json = raw.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw
    const parsed = tryParse(json)
    if (!parsed) return res.status(200).json({ result: { subjective: raw, objective: '', assessment: '', plan: '', prescription: [] } })
    return res.status(200).json({ result: parsed })
  } catch (err: any) {
    console.error('SOAP error:', err)
    return res.status(500).json({ message: 'Could not generate notes right now.' })
  }
}
