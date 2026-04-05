# P0 vertical: UTM funnel + Stripe paid signal → Twenty

This stack extends the AntiTrader bridge so **lead capture** and **Stripe checkout completion** create **People** in Twenty via n8n, matching the inbound SMS/WhatsApp pattern.

For **all** envelope shapes and how this fits the wider **sales journey** (webinar, call, enrollment), see **`EVENT_CONTRACT.md`**.

## What runs where

| Path | Bridge | n8n webhook (default path) | Twenty |
|------|--------|----------------------------|--------|
| `GET /funnel`, `POST /funnel/submit` | Serves static form + forwards JSON envelope | `POST /webhook/funnel-capture` | Find-or-create Person (GET by email, PATCH or POST) |
| `POST /webhooks/stripe` | Verifies Stripe signature, forwards envelope | `POST /webhook/stripe-bridge` | Find-or-create by email (GET, PATCH or POST; idempotent by Stripe session id) |

Envelope from the bridge is always JSON. Funnel: `{ "source": "funnel_form", "receivedAt", "payload" }` (form fields in `payload`). Stripe: `{ "source": "stripe", "receivedAt", "stripeEventId", "stripeType", "payload" }` (`payload` is the Stripe object, e.g. Checkout Session).

## Environment (`.env`)

Set on **`antitrader-bridge`** (see `.env.example`):

- **`N8N_FUNNEL_WEBHOOK_URL`** — e.g. `http://n8n:5678/webhook/funnel-capture` (Docker network uses hostname `n8n`).
- **`N8N_STRIPE_WEBHOOK_URL`** — e.g. `http://n8n:5678/webhook/stripe-bridge`.
- **`STRIPE_API_KEY`** — secret key; required to construct the Stripe client used for webhook verification.
- **`STRIPE_WEBHOOK_SECRET`** — signing secret from Stripe Dashboard (Developers → Webhooks → endpoint) or from `stripe listen --forward-to`.

Without `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET`, `POST /webhooks/stripe` returns **503** `stripe_not_configured`.

n8n already needs **`TWENTY_INTERNAL_BASE`**, **`TWENTY_API_KEY`**, and **`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`** (set in `docker-compose.yml`).

## Import workflows

From the AntiTrader repo root (stack up):

```bash
./scripts/import-n8n-workflow.sh
```

This imports five workflows by fixed id: inbound SMS/WhatsApp, funnel, Stripe, sales-journey, and outbound SMS (`antitrader-send-sms`). Restart is included.

## Attribution in Twenty

Until you add custom fields, **UTM parameters** are stored on the Person **`jobTitle`** as a single line, e.g. `Funnel | utm_source=x | utm_medium=cpc`. Stripe checkouts use `jobTitle` like `Stripe | checkout.session.completed | session=cs_...`.

The Stripe workflow handles **`checkout.session.completed`** only, and only when an **email** is present on the session. It **GET**s by primary email, **PATCH**es `jobTitle` (and phone if missing) when a Person exists, **POST**s otherwise. **Idempotency:** if `jobTitle` already contains `session=<checkout session id>`, the run returns **`skipped_idempotent`** (Stripe retries). Adjust the Code node if your Stripe objects differ.

## Public URLs

- **Funnel**: `https://<bridge-public-host>/funnel?utm_source=...` (same host as the bridge; form posts to `/funnel/submit` on that host).
- **Stripe webhook**: `https://<bridge-public-host>/webhooks/stripe` — configure in Stripe Dashboard; use **Stripe CLI** locally: `stripe listen --forward-to localhost:3099/webhooks/stripe` and set the CLI webhook secret in `STRIPE_WEBHOOK_SECRET`.

## Smoke tests

With workflows active and env set:

```bash
curl -sS -X POST "http://localhost:3099/funnel/submit" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","phone":"","utm_source":"doc"}'
```

Check n8n **Executions** and Twenty **People**.

Stripe: trigger a test `checkout.session.completed` or use Stripe CLI to send a signed event to the bridge URL.
