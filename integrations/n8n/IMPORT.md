# Import AntiTrader n8n workflow

## Prerequisites

1. **Twenty** is running; you created an **API key** (Settings → APIs & Webhooks).
2. **`.env`** in `AntiTrader/` contains:
   - `TWENTY_API_KEY=<your key>`
   - `TWENTY_INTERNAL_BASE=http://twenty-server:3000` (default for Docker Compose)
3. **Restart n8n** after changing env:
   ```bash
   cd AntiTrader
   docker compose up -d --force-recreate n8n
   ```

## Import

### Option A — UI (n8n 2.x)

1. Open n8n: **http://localhost:5678**
2. **Workflows** → **⋯** → **Import from File** → choose **`antitrader-inbound-to-twenty.json`**
3. **Publish** the workflow (n8n 2.x requires publish for production webhooks — not only “active”).
4. **Restart** the n8n container: `docker compose restart n8n` (from `AntiTrader/`).

### Option B — CLI (same repo)

From **`AntiTrader/`**:

```bash
chmod +x scripts/import-n8n-workflow.sh
./scripts/import-n8n-workflow.sh
```

Wait ~30s after restart, then run **`./scripts/smoke-n8n.sh`**.

The workflow files include stable **`id`** values so CLI import satisfies n8n’s database (`workflow_entity.id`).

**Included JSON workflows (after import):**

| File | Webhook path |
|------|----------------|
| `antitrader-inbound-to-twenty.json` | `antitrader-inbound` |
| `antitrader-funnel-to-twenty.json` | `funnel-capture` |
| `antitrader-stripe-to-twenty.json` | `stripe-bridge` |
| `antitrader-sales-journey-to-twenty.json` | `sales-journey` |
| `antitrader-send-sms-twilio.json` | `antitrader-send-sms` |
| `antitrader-send-whatsapp-template.json` | `antitrader-send-whatsapp` |

## Webhook URLs

- **Production** (active workflow):  
  `http://localhost:5678/webhook/antitrader-inbound`  
  (or your public `N8N_WEBHOOK_URL` + `webhook/antitrader-inbound`)

- **Sales journey** (Calendly / webinar / Zapier → n8n directly):  
  `http://localhost:5678/webhook/sales-journey`  
  Smoke test: **`./scripts/smoke-sales-journey.sh`**

- **Outbound SMS** (Twilio REST from n8n; requires secret + Twilio env on n8n):  
  `http://localhost:5678/webhook/antitrader-send-sms`  
  Smoke test: **`./scripts/smoke-send-sms.sh`** (optional; sends a real SMS if credentials are set)

- **Outbound WhatsApp** (Cloud API template; Meta token + phone number id on n8n):  
  `http://localhost:5678/webhook/antitrader-send-whatsapp`  
  Smoke test: **`./scripts/smoke-send-whatsapp.sh`** (set **`SMOKE_WA_TO_E164`**, template **`hello_world`** by default)

- **Test** (from Webhook node panel): use the **Test URL** while clicking **Listen for test event**.

## Point the bridge at n8n

The **bridge** runs **inside Docker**. It must call n8n by **Compose service name**, not `localhost`:

Set in **`.env`**:

```env
N8N_FORWARD_WEBHOOK_URL=http://n8n:5678/webhook/antitrader-inbound
```

Use **`webhook-test/...`** only if you are using the test listener — for normal operation use **`webhook/...`** with the workflow **active**.

Restart bridge:

```bash
docker compose up -d --force-recreate antitrader-bridge
```

## Smoke test (no Meta/Twilio)

From your **host** (browser/curl), n8n is on localhost:

```bash
curl -sS -X POST http://localhost:5678/webhook/antitrader-inbound \
  -H "Content-Type: application/json" \
  -d '{"source":"manual","receivedAt":"2026-04-04T12:00:00.000Z","payload":{},"normalized":{"channel":"sms","phoneE164":"+447700900000","text":"hello","messageId":"test-1"}}'
```

Check Twenty for a new **Person** (name `Lead` + last 4 digits).

## If POST /rest/people fails

Twenty’s REST body is **workspace-specific**. Open **Settings → APIs & Webhooks → REST playground** and compare required fields. Adjust the **Build Twenty body** Code node to match (e.g. `email`, custom fields).

## Dedupe (inbound + funnel + Stripe)

**Inbound**, **funnel**, and **Stripe** workflows **find-or-create**: **GET** `/rest/people?filter=…`, **PATCH** when a match exists (append to `jobTitle`), **POST** only when none. **Stripe** also returns **`skipped_idempotent`** when `jobTitle` already contains `session=<id>` (same checkout session retried).
