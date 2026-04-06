'use client'

import { useEffect, useState, type FormEvent } from 'react'

type HealthPayload = {
  ok: boolean
  status?: number
  bridge?: { ok?: boolean; service?: string }
  base?: string
  error?: string
}

type SendResult =
  | { ok: true }
  | { ok: false; error: string; detail?: string; n8nStatus?: number; n8n?: unknown }

const card: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--moss-border)',
  borderRadius: 12,
  padding: '1.25rem 1.35rem',
  maxWidth: 420,
}

const h1: React.CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: '1.65rem',
  fontWeight: 400,
  color: 'var(--moss2)',
  letterSpacing: '0.06em',
  margin: '0 0 0.35rem',
}

/** Public UI links only — set NEXT_PUBLIC_N8N_UI_URL in .env.local if n8n is not on localhost:5678 */
const n8nUiBase = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_N8N_UI_URL) || 'http://localhost:5678'

export default function Home() {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [toE164, setToE164] = useState('')
  const [message, setMessage] = useState('')
  const [operatorPassword, setOperatorPassword] = useState('')
  const [sendSmsBusy, setSendSmsBusy] = useState(false)
  const [sendSmsResult, setSendSmsResult] = useState<SendResult | null>(null)

  const [waToE164, setWaToE164] = useState('')
  const [waTemplateName, setWaTemplateName] = useState('')
  const [waLanguageCode, setWaLanguageCode] = useState('en_US')
  const [waBodyParamsJson, setWaBodyParamsJson] = useState('')
  const [sendWaBusy, setSendWaBusy] = useState(false)
  const [sendWaResult, setSendWaResult] = useState<SendResult | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/bridge-health', { cache: 'no-store' })
        const j = (await r.json()) as HealthPayload
        if (!cancelled) setHealth(j)
      } catch {
        if (!cancelled) setHealth({ ok: false, error: 'fetch failed' })
      }
    }
    load()
    const id = setInterval(load, 10_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const bridgeOk = health?.ok && health?.bridge && typeof health.bridge === 'object' && (health.bridge as { ok?: boolean }).ok === true

  function buildOpPayload<T extends Record<string, unknown>>(base: T): T & { operatorPassword?: string } {
    if (!operatorPassword.trim()) return base
    return { ...base, operatorPassword: operatorPassword.trim() }
  }

  async function handleSendSms(e: FormEvent) {
    e.preventDefault()
    setSendSmsBusy(true)
    setSendSmsResult(null)
    try {
      const payload = buildOpPayload({
        toE164: toE164.trim(),
        message: message.trim(),
      })
      const r = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = (await r.json()) as Record<string, unknown>
      if (r.ok && j.ok === true) {
        setSendSmsResult({ ok: true })
        setMessage('')
      } else {
        setSendSmsResult({
          ok: false,
          error: typeof j.error === 'string' ? j.error : 'send_failed',
          detail: typeof j.detail === 'string' ? j.detail : undefined,
          n8nStatus: typeof j.n8nStatus === 'number' ? j.n8nStatus : undefined,
          n8n: j.n8n,
        })
      }
    } catch {
      setSendSmsResult({ ok: false, error: 'fetch_failed' })
    } finally {
      setSendSmsBusy(false)
    }
  }

  async function handleSendWhatsApp(e: FormEvent) {
    e.preventDefault()
    setSendWaBusy(true)
    setSendWaResult(null)
    try {
      const payload = buildOpPayload({
        toE164: waToE164.trim(),
        templateName: waTemplateName.trim(),
        languageCode: waLanguageCode.trim() || 'en_US',
        ...(waBodyParamsJson.trim()
          ? { bodyParametersJson: waBodyParamsJson.trim() }
          : {}),
      })
      const r = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = (await r.json()) as Record<string, unknown>
      if (r.ok && j.ok === true) {
        setSendWaResult({ ok: true })
      } else {
        setSendWaResult({
          ok: false,
          error: typeof j.error === 'string' ? j.error : 'send_failed',
          detail: typeof j.detail === 'string' ? j.detail : undefined,
          n8nStatus: typeof j.n8nStatus === 'number' ? j.n8nStatus : undefined,
          n8n: j.n8n,
        })
      }
    } catch {
      setSendWaResult({ ok: false, error: 'fetch_failed' })
    } finally {
      setSendWaBusy(false)
    }
  }

  return (
    <div style={{ padding: '2.5rem 2rem 4rem', maxWidth: 1100 }}>
      <header style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dim)', margin: '0 0 0.5rem' }}>
          AntiTrader
        </p>
        <h1 style={h1}>Messaging console</h1>
        <p style={{ color: 'var(--dim)', maxWidth: 560, margin: 0, lineHeight: 1.55 }}>
          Central operator view for this repo&apos;s stack: <strong style={{ color: 'var(--gold2)' }}>bridge</strong> ingress,{' '}
          <strong style={{ color: 'var(--gold2)' }}>n8n</strong> automations, <strong style={{ color: 'var(--gold2)' }}>Twenty</strong> CRM. See{' '}
          <code style={{ color: 'var(--moss2)' }}>docs/MESSAGING_STACK.md</code> for how this compares to union-style apps.
        </p>
      </header>

      <section
        style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.15rem',
          borderRadius: 12,
          border: '1px solid rgba(212, 168, 75, 0.35)',
          background: 'rgba(212, 168, 75, 0.06)',
          maxWidth: 720,
        }}
      >
        <div
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '0.5rem',
          }}
        >
          Client demo — SMS, WhatsApp, sales flow
        </div>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--dim)', fontSize: '0.78rem', lineHeight: 1.65 }}>
          <li>
            <strong style={{ color: 'var(--gold2)' }}>Inbound</strong> SMS &amp; WhatsApp → bridge → n8n →{' '}
            <strong style={{ color: 'var(--moss2)' }}>Twenty</strong> (one contact; history on{' '}
            <code style={{ color: 'var(--moss2)' }}>jobTitle</code>).
          </li>
          <li>
            <strong style={{ color: 'var(--gold2)' }}>Funnel</strong> / UTM → same CRM (merge by email).
          </li>
          <li>
            <strong style={{ color: 'var(--gold2)' }}>Sales</strong>: opportunity stages in Twenty + optional{' '}
            <code style={{ color: 'var(--moss2)' }}>sales-journey</code> webhook.
          </li>
        </ol>
        <p style={{ margin: '0.65rem 0 0', fontSize: '0.7rem', color: 'var(--dim)' }}>
          Step-by-step script: <code style={{ color: 'var(--moss2)' }}>docs/DEMO_MIKE.md</code>
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        <div style={card}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '0.75rem' }}>
            antitrader-bridge
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: bridgeOk ? 'var(--moss2)' : '#e88' }}>
            {health === null ? '…' : bridgeOk ? 'OK' : 'Down'}
          </div>
          <p style={{ color: 'var(--dim)', fontSize: '0.75rem', margin: '0.75rem 0 0' }}>
            {health?.base ? `Target: ${health.base}` : '—'}
            {health?.error ? ` · ${health.error}` : ''}
          </p>
        </div>

        <div style={card}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '0.75rem' }}>
            n8n
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.95rem' }}>
            <a href={`${n8nUiBase}/`} target="_blank" rel="noreferrer">
              Open workflows →
            </a>
            <a href={`${n8nUiBase}/executions`} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--dim)' }}>
              Executions
            </a>
          </div>
          <p style={{ color: 'var(--dim)', fontSize: '0.75rem', margin: '0.75rem 0 0' }}>
            Webhooks: funnel-capture, stripe-bridge, sales-journey, antitrader-inbound, antitrader-send-sms, antitrader-send-whatsapp.
          </p>
        </div>

        <div style={{ ...card, gridColumn: '1 / -1', maxWidth: 560 }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '0.75rem' }}>
            Compose SMS (Twilio via n8n)
          </div>
          <p style={{ color: 'var(--dim)', fontSize: '0.75rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Sends through the server-only <code style={{ color: 'var(--moss2)' }}>/api/send-sms</code> route (n8n webhook secret stays on the server). Requires n8n workflow{' '}
            <code style={{ color: 'var(--moss2)' }}>antitrader-send-sms</code> and env in <code style={{ color: 'var(--moss2)' }}>.env.local</code>.
          </p>
          <form onSubmit={handleSendSms} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>To (E.164)</span>
              <input
                name="toE164"
                value={toE164}
                onChange={(e) => setToE164(e.target.value)}
                placeholder="+447700900000"
                autoComplete="tel"
                required
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Message</span>
              <textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your SMS body…"
                required
                rows={4}
                maxLength={1600}
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Operator password (optional)</span>
              <input
                name="operatorPassword"
                type="password"
                value={operatorPassword}
                onChange={(e) => setOperatorPassword(e.target.value)}
                placeholder="Only if MESSAGING_CONSOLE_OPERATOR_PASSWORD is set"
                autoComplete="off"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
            </label>
            <button
              type="submit"
              disabled={sendSmsBusy}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--moss)',
                border: 'none',
                borderRadius: 8,
                padding: '0.55rem 1.1rem',
                color: '#04060c',
                fontFamily: 'inherit',
                fontWeight: 600,
                cursor: sendSmsBusy ? 'wait' : 'pointer',
                opacity: sendSmsBusy ? 0.7 : 1,
              }}
            >
              {sendSmsBusy ? 'Sending…' : 'Send SMS'}
            </button>
          </form>
          {sendSmsResult?.ok === true && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--moss2)' }}>Sent. Check n8n execution and the device.</p>
          )}
          {sendSmsResult?.ok === false && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#e88', lineHeight: 1.45 }}>
              {sendSmsResult.error}
              {sendSmsResult.detail ? ` — ${sendSmsResult.detail}` : ''}
              {sendSmsResult.n8nStatus != null ? ` (n8n HTTP ${sendSmsResult.n8nStatus})` : ''}
            </p>
          )}
        </div>

        <div style={{ ...card, gridColumn: '1 / -1', maxWidth: 560 }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '0.75rem' }}>
            Compose WhatsApp (template via Cloud API)
          </div>
          <p style={{ color: 'var(--dim)', fontSize: '0.75rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Uses <code style={{ color: 'var(--moss2)' }}>/api/send-whatsapp</code> → n8n <code style={{ color: 'var(--moss2)' }}>antitrader-send-whatsapp</code>. Template must be approved in Meta Business; outside the 24h session window only
            <strong style={{ color: 'var(--gold2)' }}> template </strong>
            sends are allowed.
          </p>
          <form onSubmit={handleSendWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>To (E.164)</span>
              <input
                value={waToE164}
                onChange={(e) => setWaToE164(e.target.value)}
                placeholder="+447700900000"
                autoComplete="tel"
                required
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Template name (Meta)</span>
              <input
                value={waTemplateName}
                onChange={(e) => setWaTemplateName(e.target.value)}
                placeholder="hello_world"
                required
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Language code</span>
              <input
                value={waLanguageCode}
                onChange={(e) => setWaLanguageCode(e.target.value)}
                placeholder="en_US"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>Body parameters (optional JSON array)</span>
              <textarea
                value={waBodyParamsJson}
                onChange={(e) => setWaBodyParamsJson(e.target.value)}
                placeholder='["First name","Order #123"]'
                rows={2}
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--moss-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.65rem',
                  color: '#e8f0f8',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </label>
            <button
              type="submit"
              disabled={sendWaBusy}
              style={{
                alignSelf: 'flex-start',
                background: 'rgba(61, 143, 154, 0.85)',
                border: '1px solid var(--moss-border)',
                borderRadius: 8,
                padding: '0.55rem 1.1rem',
                color: '#e8f0f8',
                fontFamily: 'inherit',
                fontWeight: 600,
                cursor: sendWaBusy ? 'wait' : 'pointer',
                opacity: sendWaBusy ? 0.7 : 1,
              }}
            >
              {sendWaBusy ? 'Sending…' : 'Send WhatsApp template'}
            </button>
          </form>
          {sendWaResult?.ok === true && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--moss2)' }}>Queued. Check n8n execution and WhatsApp on the device.</p>
          )}
          {sendWaResult?.ok === false && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#e88', lineHeight: 1.45 }}>
              {sendWaResult.error}
              {sendWaResult.detail ? ` — ${sendWaResult.detail}` : ''}
              {sendWaResult.n8nStatus != null ? ` (n8n HTTP ${sendWaResult.n8nStatus})` : ''}
            </p>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '0.75rem' }}>
            Twenty CRM
          </div>
          <a href="http://localhost:3020" target="_blank" rel="noreferrer" style={{ fontSize: '1rem' }}>
            Open CRM →
          </a>
          <p style={{ color: 'var(--dim)', fontSize: '0.75rem', margin: '0.75rem 0 0' }}>
            People, opportunities, pipeline — source of truth.
          </p>
        </div>

        <div style={card}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '0.75rem' }}>
            Student dashboard
          </div>
          <p style={{ color: 'var(--dim)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
            Skybox HUD (OASIS). Wire school activity feed to messaging in a later phase.
          </p>
          <code style={{ fontSize: '0.6rem', color: 'var(--moss2)' }}>student-dashboard/student-dashboard.html</code>
        </div>
      </div>

      <p style={{ marginTop: '2.5rem', fontSize: '0.72rem', color: 'var(--dim)', maxWidth: 640 }}>
        <strong style={{ color: 'var(--gold)' }}>Next:</strong> threads / message store (Twenty Notes or dedicated store) — see <code>docs/MESSAGING_STACK.md</code> and{' '}
        <code>docs/GAP_ANALYSIS.md</code>.
      </p>
    </div>
  )
}
