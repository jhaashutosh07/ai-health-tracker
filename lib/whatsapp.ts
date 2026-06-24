// WhatsApp Cloud API (Meta) sender — used by Emergency SOS.
//
// Env:
//   WHATSAPP_ACCESS_TOKEN     (required) — Meta access token
//   WHATSAPP_PHONE_NUMBER_ID  (required) — the test/business phone number id
//   WHATSAPP_API_VERSION      (optional) — defaults to v21.0
//   WHATSAPP_TEMPLATE_NAME    (optional) — an approved template name; if set we
//                                          send a template (works business-initiated,
//                                          outside the 24h session window).
//   WHATSAPP_TEMPLATE_LANG    (optional) — template language code, default en_US
//
// Note on Meta's rules: a plain text message only delivers if the recipient
// messaged your number within the last 24h (the "customer service window").
// For true business-initiated alerts to a contact who hasn't messaged you, use
// an approved TEMPLATE (set WHATSAPP_TEMPLATE_NAME). For a demo, adding the
// contact as a test recipient + using the text path is the quickest route.

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0'

export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

// Meta expects digits with country code, no '+'/spaces. Assume India (91) for
// bare 10-digit numbers.
function normalizeTo(phone: string): string {
  let p = (phone || '').replace(/[^\d]/g, '')
  if (p.length === 10) p = '91' + p
  return p
}

type SendResult = { success: boolean; id?: string; error?: string }

async function call(payload: any): Promise<SendResult> {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: data?.error?.message || `WhatsApp HTTP ${res.status}` }
    return { success: true, id: data?.messages?.[0]?.id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'WhatsApp request failed' }
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  if (!whatsappConfigured()) return { success: false, error: 'WhatsApp not configured' }
  return call({ messaging_product: 'whatsapp', to: normalizeTo(to), type: 'text', text: { preview_url: true, body } })
}

export async function sendWhatsAppTemplate(to: string, name: string, lang: string, bodyParams: string[]): Promise<SendResult> {
  if (!whatsappConfigured()) return { success: false, error: 'WhatsApp not configured' }
  return call({
    messaging_product: 'whatsapp',
    to: normalizeTo(to),
    type: 'template',
    template: {
      name,
      language: { code: lang },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map(t => ({ type: 'text', text: t })) }]
        : [],
    },
  })
}

// Picks template vs text automatically based on config.
export async function sendEmergencyWhatsApp(to: string, textBody: string, templateParams: string[]): Promise<SendResult> {
  const tplName = process.env.WHATSAPP_TEMPLATE_NAME
  if (tplName) {
    const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US'
    return sendWhatsAppTemplate(to, tplName, lang, templateParams)
  }
  return sendWhatsAppText(to, textBody)
}
