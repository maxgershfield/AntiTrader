/**
 * AntiTrader bridge — verified ingress for Meta (WhatsApp), Twilio (SMS), Stripe webhooks,
 * and a static funnel page + JSON submit → n8n.
 */
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import Stripe from 'stripe'
import twilio from 'twilio'
import { attachNormalized } from './normalize.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.BRIDGE_PORT || 3099)
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || ''
const N8N_FORWARD_WEBHOOK_URL = process.env.N8N_FORWARD_WEBHOOK_URL || ''
const N8N_FUNNEL_WEBHOOK_URL = process.env.N8N_FUNNEL_WEBHOOK_URL || ''
const N8N_STRIPE_WEBHOOK_URL = process.env.N8N_STRIPE_WEBHOOK_URL || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const STRIPE_API_KEY = process.env.STRIPE_API_KEY || ''
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

const stripeClient = STRIPE_API_KEY ? new Stripe(STRIPE_API_KEY) : null

function log(level, msg, extra) {
  if (level === 'debug' && LOG_LEVEL !== 'debug') return
  const line = extra !== undefined ? `${msg} ${JSON.stringify(extra)}` : msg
  console.log(`[antitrader-bridge] ${line}`)
}

function verifyMetaSignature(rawBody, signatureHeader) {
  if (!META_APP_SECRET) {
    log('warn', 'META_APP_SECRET not set; skipping signature verification (dev only)')
    return true
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    log('warn', 'missing or invalid X-Hub-Signature-256')
    return false
  }
  const expected = signatureHeader.slice('sha256='.length)
  const hmac = crypto.createHmac('sha256', META_APP_SECRET)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(digest, 'hex'))
  } catch {
    return false
  }
}

async function forwardToJsonWebhook(url, payload) {
  if (!url) {
    log('info', 'forward URL not set; event not forwarded')
    return { forwarded: false }
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`n8n forward failed: ${res.status} ${text}`)
  }
  return { forwarded: true }
}

const app = express()

app.use('/webhooks/twilio/sms', express.urlencoded({ extended: false }))

app.use(
  '/webhooks/meta/whatsapp',
  express.raw({ type: 'application/json', limit: '2mb' }),
  (req, res, next) => {
    req.rawBody = req.body
    try {
      req.metaJson = req.body.length ? JSON.parse(req.body.toString('utf8')) : {}
    } catch {
      req.metaJson = null
    }
    next()
  }
)

app.use('/funnel', express.static(path.join(__dirname, 'public-funnel')))

app.post('/funnel/submit', express.json({ limit: '100kb' }), async (req, res) => {
  const envelope = {
    source: 'funnel_form',
    receivedAt: new Date().toISOString(),
    payload: req.body,
  }
  try {
    await forwardToJsonWebhook(N8N_FUNNEL_WEBHOOK_URL, envelope)
    res.json({ ok: true })
  } catch (e) {
    log('warn', 'funnel forward error', { message: e.message })
    res.status(500).json({ ok: false, error: 'forward_failed' })
  }
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'antitrader-bridge' })
})

app.get('/webhooks/meta/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && token && META_VERIFY_TOKEN && token === META_VERIFY_TOKEN) {
    log('info', 'Meta webhook verified')
    return res.status(200).send(challenge)
  }
  log('warn', 'Meta verification failed or META_VERIFY_TOKEN not configured')
  return res.sendStatus(403)
})

app.post('/webhooks/meta/whatsapp', async (req, res) => {
  const sig = req.get('x-hub-signature-256') || ''
  const raw = req.rawBody instanceof Buffer ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}))
  if (!verifyMetaSignature(raw, sig)) {
    log('warn', 'Invalid Meta signature')
    return res.sendStatus(401)
  }
  if (!req.metaJson) {
    return res.status(400).json({ error: 'invalid_json' })
  }

  const envelope = {
    source: 'meta_whatsapp',
    receivedAt: new Date().toISOString(),
    payload: req.metaJson,
    ...attachNormalized('meta_whatsapp', req.metaJson),
  }

  try {
    await forwardToJsonWebhook(N8N_FORWARD_WEBHOOK_URL, envelope)
    res.sendStatus(200)
  } catch (e) {
    log('warn', 'forward error', { message: e.message })
    res.sendStatus(500)
  }
})

app.post('/webhooks/twilio/sms', async (req, res) => {
  const sig = req.get('x-twilio-signature') || ''
  const base =
    process.env.TWILIO_WEBHOOK_PUBLIC_URL?.replace(/\/$/, '') ||
    `${req.protocol}://${req.get('host')}`
  const url = `${base}${req.originalUrl}`
  const params = req.body

  if (TWILIO_AUTH_TOKEN) {
    const ok = twilio.validateRequest(TWILIO_AUTH_TOKEN, sig, url, params)
    if (!ok) {
      log('warn', 'Invalid Twilio signature', { urlUsedForValidation: url })
      return res.sendStatus(403)
    }
  } else {
    log('warn', 'TWILIO_AUTH_TOKEN not set; skipping signature verification (dev only)')
  }

  log('info', 'twilio sms inbound (signature ok)', {
    MessageSid: params.MessageSid,
    To: params.To,
  })

  const slim = {
    MessageSid: params.MessageSid,
    From: params.From,
    To: params.To,
    Body: params.Body,
    NumMedia: params.NumMedia,
  }
  const envelope = {
    source: 'twilio_sms',
    receivedAt: new Date().toISOString(),
    payload: slim,
    ...attachNormalized('twilio_sms', slim),
  }

  try {
    await forwardToJsonWebhook(N8N_FORWARD_WEBHOOK_URL, envelope)
    res.type('text/plain').send('')
  } catch (e) {
    log('warn', 'forward error', { message: e.message })
    res.sendStatus(500)
  }
})

app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    if (!STRIPE_WEBHOOK_SECRET || !stripeClient) {
      log('warn', 'Stripe webhook disabled (set STRIPE_WEBHOOK_SECRET and STRIPE_API_KEY)')
      return res.status(503).json({ error: 'stripe_not_configured' })
    }
    const sig = req.get('stripe-signature') || ''
    const rawBuf = req.body instanceof Buffer ? req.body : Buffer.alloc(0)
    let event
    try {
      event = stripeClient.webhooks.constructEvent(rawBuf, sig, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      log('warn', 'Invalid Stripe signature', { message: err.message })
      return res.sendStatus(400)
    }

    const envelope = {
      source: 'stripe',
      receivedAt: new Date().toISOString(),
      stripeEventId: event.id,
      stripeType: event.type,
      payload: event.data.object,
    }

    try {
      await forwardToJsonWebhook(N8N_STRIPE_WEBHOOK_URL, envelope)
      res.json({ received: true })
    } catch (e) {
      log('warn', 'stripe forward error', { message: e.message })
      res.status(500).json({ error: 'forward_failed' })
    }
  }
)

app.listen(PORT, '0.0.0.0', () => {
  log('info', `listening on ${PORT}`)
})
