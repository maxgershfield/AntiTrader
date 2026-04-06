# AntiTrader

CRM + funnel stack (Twenty + n8n + webhook bridge) aligned with `DESIGN_PLAN.md`.

**Build blueprint (have vs need, phased plan):** **[docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md)** — sales CRM, messaging, campaigns, student-dashboard integration.

**Start here:** **[SETUP_STEPS.md](./SETUP_STEPS.md)** — first-time install.

**Client demo (SMS + WhatsApp + sales):** **[docs/DEMO_MIKE.md](./docs/DEMO_MIKE.md)** — short script for a live walkthrough.

**Ongoing:** **[OPERATOR_CHECKLIST.md](./OPERATOR_CHECKLIST.md)** — what’s already in the repo vs **your** steps (Twenty, n8n, Twilio/ngrok, Meta, STAR).

**Channels (Twilio + Meta → bridge → n8n):** **[CHANNELS_SETUP.md](./CHANNELS_SETUP.md)**.

**Messaging stack (n8n vs inbox UIs):** **[docs/MESSAGING_STACK.md](./docs/MESSAGING_STACK.md)**. **AntiTrader-themed operator home:** **[messaging-console/](./messaging-console/)** (port **3102**).

**Secrets:** run **`./scripts/generate-secrets.sh`** to create `.env` + `.secrets/secrets-log.md` (both gitignored). See **[SECRETS_NOTE.md](./SECRETS_NOTE.md)**.

## What’s included

| Piece | Port (default) | Role |
|--------|----------------|------|
| **Twenty** | 3020 | CRM (contacts, pipeline stages — **source of truth** for sales journey) |
| **n8n** | 5678 | Integrations: Twenty, SMS/WhatsApp replies, **future** webinar/Calendly webhooks |
| **antitrader-bridge** | 3099 | Verified **Meta WhatsApp**, **Twilio SMS**, **funnel** page + submit, **Stripe** webhooks → n8n |
| **messaging-console** | 3102 | Operator UI: bridge health, **Compose SMS / WhatsApp** → n8n (`/api/send-sms`, `/api/send-whatsapp`), links to n8n & Twenty — `npm run dev` in **`messaging-console/`** |

**Event shapes (bridge + n8n):** **`integrations/EVENT_CONTRACT.md`**. **Funnel + Stripe P0:** **`integrations/FUNNEL_P0.md`**. **End-to-end sales journey vs stack:** same **`EVENT_CONTRACT.md`** (section *Sales journey*).

## Quick start

1. Copy env and edit secrets:

   ```bash
   cd AntiTrader
   cp .env.example .env
   # Set APP_SECRET, N8N_ENCRYPTION_KEY, PG_DATABASE_PASSWORD (see Twenty docs: avoid special chars in DB password)
   ```

2. Start stack:

   ```bash
   docker compose up -d
   ```

3. Open **Twenty**: [http://localhost:3020](http://localhost:3020) — complete first-run signup (creates workspace).

4. Open **n8n**: [http://localhost:5678](http://localhost:5678) — create owner account on first visit.

5. **Bridge health**: [http://localhost:3099/health](http://localhost:3099/health)

## Webhook URLs (for Meta / Twilio)

Step-by-step: **[CHANNELS_SETUP.md](./CHANNELS_SETUP.md)** (ngrok, `.env`, Twilio console, Meta app).

Use a public URL (e.g. ngrok) in production:

- Meta: `GET/POST https://<public>/webhooks/meta/whatsapp` — set the same **Verify token** in Meta as `META_VERIFY_TOKEN` in `.env`.
- Twilio SMS: `POST https://<public>/webhooks/twilio/sms` — set `TWILIO_WEBHOOK_PUBLIC_URL` to the public origin (e.g. `https://xxxx.ngrok.io`) so signature validation matches.

**Bridge → n8n (Docker):** set `N8N_FORWARD_WEBHOOK_URL=http://n8n:5678/webhook/antitrader-inbound` (not `localhost`) so `antitrader-bridge` can reach n8n on the Compose network. See **`integrations/n8n/IMPORT.md`**.

## OASIS / STAR

Point n8n HTTP nodes at your STAR WebAPI (`/api/workflow/execute`, etc.) once JWT and base URL are configured in n8n credentials — not auto-wired in this compose.

## What to build next (suggested order)

Use **`docs/GAP_ANALYSIS.md`** for the **full phased plan** (Phases 0–6), exit criteria, and file map. Short list:

1. **Import workflows** — `./scripts/import-n8n-workflow.sh` (inbound, funnel, Stripe, sales-journey, outbound SMS) or follow **`integrations/n8n/IMPORT.md`**; set `TWENTY_API_KEY`, **`N8N_FORWARD_WEBHOOK_URL`**, **`N8N_FUNNEL_WEBHOOK_URL`**, **`N8N_STRIPE_WEBHOOK_URL`**, and for outbound SMS **`N8N_ANTITRADER_OUTBOUND_SECRET`**, **`TWILIO_MESSAGING_FROM`**, and Twilio credentials on the **n8n** container.
2. **Pipeline + fields in Twenty** — follow **`integrations/TWENTY_PIPELINE.md`**; map **sales stages** (lead → webinar → call → enrolled) in Twenty so n8n only **updates stage**, not reinvents CRM.
3. **De-dupe / upsert** — **inbound, funnel, and Stripe** workflows find-or-create via Twenty **GET** + **PATCH**/**POST** (see **IMPORT.md** and **GAP_ANALYSIS § Phase 1**); Stripe skips duplicate session lines on webhook retries.
4. **Sales journey webhook** — import includes **`sales-journey`** (`antitrader-sales-journey-to-twenty.json`): POST JSON per **`integrations/EVENT_CONTRACT.md`**; point Calendly / webinar / Zapier at **`http://n8n:5678/webhook/sales-journey`** (or public n8n URL). Run **`./scripts/smoke-sales-journey.sh`** to verify. Outbound: Twilio SMS **`antitrader-send-sms`** (`./scripts/smoke-send-sms.sh`), WhatsApp template **`antitrader-send-whatsapp`** (Meta token + phone number id on n8n).
5. **Stage → STAR** — n8n HTTP to `POST /api/workflow/execute` on stage change or SOP completion.
6. **Trading + school** — webhooks with `avatarId` + `crmContactId` (`DESIGN_PLAN.md`); **enrollment → `metadata.atSchool`** per **GAP_ANALYSIS § Phase 3**.

## Repo layout

```
AntiTrader/
├── DESIGN_PLAN.md
├── docs/
│   ├── DEMO_MIKE.md         # Client demo script: SMS + WhatsApp + sales flow
│   ├── GAP_ANALYSIS.md      # Have vs need; phased build blueprint
│   └── MESSAGING_STACK.md
├── README.md
├── CHANNELS_SETUP.md       # Twilio + Meta + ngrok → bridge → n8n
├── SETUP_STEPS.md
├── OPERATOR_CHECKLIST.md   # repo vs your steps
├── docker-compose.yml
├── .env.example
├── scripts/
│   ├── generate-secrets.sh
│   ├── smoke-n8n.sh        # POST sample JSON to n8n webhook (host)
│   ├── smoke-sales-journey.sh  # POST sample journey event → webhook/sales-journey
│   ├── smoke-send-sms.sh       # POST outbound SMS webhook (Twilio; needs secret + TO)
│   ├── smoke-send-whatsapp.sh  # POST outbound WhatsApp template webhook (Meta + secret + TO)
│   ├── seed-antitrader-twenty-demo.mjs  # Replace Twenty placeholder People/Opportunities (trading-school demo)
│   ├── smoke-bridge-twilio.sh  # POST sample form to bridge /webhooks/twilio/sms (host)
│   ├── sync-ngrok-tunnel-to-env.sh   # ngrok https URL → TWILIO_WEBHOOK_PUBLIC_URL in .env
│   ├── set-twilio-messaging-webhook.sh  # Twilio API: set SmsUrl (needs Live API creds)
│   └── twilio-diagnostics.sh       # Twilio REST: numbers + recent messages (needs Live API creds)
├── bridge/
├── messaging-console/   # Next.js operator home (see docs/MESSAGING_STACK.md)
└── integrations/
    ├── n8n/
    ├── TWENTY_PIPELINE.md
    ├── FUNNEL_P0.md
    └── EVENT_CONTRACT.md
```
