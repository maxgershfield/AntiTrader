/**
 * Best-effort normalization of Meta WhatsApp + Twilio payloads for downstream n8n / Twenty.
 * Field names align with integrations/EVENT_CONTRACT.md (extended with `normalized`).
 */

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

/** WhatsApp Cloud API often uses wa_id without +; prefer E.164 when possible */
export function normalizeMetaWhatsapp(payload) {
  const out = {
    channel: 'whatsapp',
    phoneE164: null,
    text: null,
    messageId: null,
    rawHint: null,
  }
  try {
    const entry = payload?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const msg = value?.messages?.[0]
    if (msg?.id) out.messageId = msg.id
    if (msg?.type === 'text' && msg.text?.body) out.text = msg.text.body
    const from = msg?.from || value?.contacts?.[0]?.wa_id
    if (from) {
      const d = digitsOnly(from)
      if (d.length >= 8) out.phoneE164 = `+${d}`
      else out.phoneE164 = from.startsWith('+') ? from : `+${d}`
    }
    if (!out.text && msg?.type) out.rawHint = `type:${msg.type}`
  } catch {
    out.rawHint = 'parse_error'
  }
  return out
}

export function normalizeTwilioSms(payload) {
  const from = payload?.From || ''
  const body = payload?.Body || ''
  const sid = payload?.MessageSid || null
  let phoneE164 = from.trim()
  if (phoneE164 && !phoneE164.startsWith('+')) {
    const d = digitsOnly(phoneE164)
    if (d.length >= 10) phoneE164 = `+${d}`
  }
  return {
    channel: 'sms',
    phoneE164: phoneE164 || null,
    text: body || null,
    messageId: sid,
    rawHint: null,
  }
}

export function attachNormalized(source, payload) {
  if (source === 'meta_whatsapp') {
    return { normalized: normalizeMetaWhatsapp(payload) }
  }
  if (source === 'twilio_sms') {
    return { normalized: normalizeTwilioSms(payload) }
  }
  return { normalized: null }
}
