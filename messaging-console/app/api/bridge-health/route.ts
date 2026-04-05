import { NextResponse } from 'next/server'

/**
 * Server-side proxy to antitrader-bridge /health (avoids browser CORS).
 * Set ANTITRADER_BRIDGE_URL (e.g. http://localhost:3099 or http://host.docker.internal:3099).
 */
export async function GET() {
  const base = (process.env.ANTITRADER_BRIDGE_URL || 'http://127.0.0.1:3099').replace(/\/$/, '')
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(`${base}/health`, { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(t)
    const text = await r.text()
    let bridge: unknown
    try {
      bridge = JSON.parse(text)
    } catch {
      bridge = { raw: text }
    }
    return NextResponse.json({ ok: r.ok, status: r.status, bridge, base })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg, base }, { status: 503 })
  }
}
