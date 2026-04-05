import { NextResponse } from 'next/server'

/**
 * Server-side forward to n8n webhook `antitrader-send-whatsapp` (WhatsApp Cloud API template).
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
  const templateName = typeof body.templateName === 'string' ? body.templateName.trim() : ''
  const languageCode =
    typeof body.languageCode === 'string' && body.languageCode.trim()
      ? body.languageCode.trim()
      : 'en_US'

  if (!toE164 || !templateName) {
    return NextResponse.json({ ok: false, error: 'toE164_and_templateName_required' }, { status: 400 })
  }
  if (!toE164.startsWith('+')) {
    return NextResponse.json({ ok: false, error: 'toE164_must_be_e164' }, { status: 400 })
  }

  let bodyParameters: string[] | undefined
  if (Array.isArray(body.bodyParameters)) {
    bodyParameters = body.bodyParameters.map((x) => String(x))
  } else if (typeof body.bodyParametersJson === 'string' && body.bodyParametersJson.trim()) {
    try {
      const parsed = JSON.parse(body.bodyParametersJson) as unknown
      if (!Array.isArray(parsed)) {
        return NextResponse.json({ ok: false, error: 'bodyParametersJson_must_be_json_array' }, { status: 400 })
      }
      bodyParameters = parsed.map((x) => String(x))
    } catch {
      return NextResponse.json({ ok: false, error: 'bodyParametersJson_invalid_json' }, { status: 400 })
    }
  }

  const explicit = (process.env.N8N_SEND_WHATSAPP_WEBHOOK_URL || '').trim()
  const base = (process.env.N8N_WEBHOOK_URL || 'http://127.0.0.1:5678/').replace(/\/$/, '')
  const webhookUrl = explicit || `${base}/webhook/antitrader-send-whatsapp`

  const payload: Record<string, unknown> = {
    toE164,
    templateName,
    languageCode,
    webhookSecret: secret,
  }
  if (bodyParameters && bodyParameters.length > 0) {
    payload.bodyParameters = bodyParameters
  }

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 45_000)
  let r: Response
  try {
    r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
