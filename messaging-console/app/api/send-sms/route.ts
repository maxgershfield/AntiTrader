import { NextResponse } from 'next/server'

/**
 * Server-side forward to n8n webhook `antitrader-send-sms`.
 * N8N_ANTITRADER_OUTBOUND_SECRET never leaves this process — the browser only sends toE164 + message.
 *
 * URL: N8N_SEND_SMS_WEBHOOK_URL, or N8N_WEBHOOK_URL + /webhook/antitrader-send-sms
 */
export async function POST(req: Request) {
  const secret = process.env.N8N_ANTITRADER_OUTBOUND_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'server_not_configured', detail: 'Set N8N_ANTITRADER_OUTBOUND_SECRET in .env.local' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const op = process.env.MESSAGING_CONSOLE_OPERATOR_PASSWORD
  if (op) {
    const pw = typeof body.operatorPassword === 'string' ? body.operatorPassword : ''
    if (pw !== op) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const toE164 = typeof body.toE164 === 'string' ? body.toE164.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!toE164 || !message) {
    return NextResponse.json({ ok: false, error: 'toE164_and_message_required' }, { status: 400 })
  }
  if (!toE164.startsWith('+')) {
    return NextResponse.json({ ok: false, error: 'toE164_must_be_e164' }, { status: 400 })
  }
  if (message.length > 1600) {
    return NextResponse.json({ ok: false, error: 'message_too_long' }, { status: 400 })
  }

  const explicit = (process.env.N8N_SEND_SMS_WEBHOOK_URL || '').trim()
  const base = (process.env.N8N_WEBHOOK_URL || 'http://127.0.0.1:5678/').replace(/\/$/, '')
  const webhookUrl = explicit || `${base}/webhook/antitrader-send-sms`

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 30_000)
  let r: Response
  try {
    r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toE164, message, webhookSecret: secret }),
      signal: ctrl.signal,
    })
  } catch (e: unknown) {
    clearTimeout(t)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: 'n8n_unreachable', detail: msg }, { status: 503 })
  }
  clearTimeout(t)

  const text = await r.text()
  let n8nBody: unknown
  try {
    n8nBody = text ? JSON.parse(text) : null
  } catch {
    n8nBody = { raw: text }
  }

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'n8n_error', n8nStatus: r.status, n8n: n8nBody },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, n8n: n8nBody })
}
