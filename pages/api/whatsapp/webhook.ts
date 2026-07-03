import { NextApiRequest, NextApiResponse } from 'next'
import { openai, CHAT_MODEL } from '@/lib/openai'
import { sendWhatsAppText } from '@/lib/whatsapp'

// WhatsApp Cloud API webhook — lets users text symptoms to the app's WhatsApp
// number and get AI health guidance back.
//   GET  -> Meta verification handshake (hub.challenge)
//   POST -> incoming messages; reply via the WhatsApp send API
export const config = { api: { bodyParser: true } }

const SYSTEM = `You are a helpful WhatsApp health assistant for users in India. Reply in the SAME language the user writes in.
- Keep replies short and clear for chat (2-5 sentences). No markdown headers.
- Give practical guidance and common OTC/self-care advice; use Indian context.
- You are NOT a doctor — don't give a firm diagnosis. Recommend seeing a doctor for anything serious/persistent.
- For emergencies (chest pain, breathing trouble, stroke signs, severe bleeding): tell them to call 112 immediately, first.`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Verification handshake
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }
    return res.status(403).send('Forbidden')
  }

  if (req.method !== 'POST') return res.status(405).end()

  // Acknowledge fast so Meta doesn't retry; process below.
  res.status(200).json({ received: true })

  try {
    const entry = req.body?.entry?.[0]
    const value = entry?.changes?.[0]?.value
    const message = value?.messages?.[0]
    if (!message || message.type !== 'text') return

    const from = message.from as string
    const text = message.text?.body as string
    if (!from || !text) return

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_completion_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
    })
    const reply = response.choices[0]?.message?.content?.trim() || 'Sorry, please try again.'
    await sendWhatsAppText(from, reply)
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
  }
}
