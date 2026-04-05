# AntiTrader — event envelope (bridge → n8n)

The integration pattern is: **one JSON envelope per event**, forwarded to **n8n** (or received by an n8n **Webhook** node directly). n8n then **find-or-creates** a Twenty **Person**, updates **pipeline stage**, and sends **SMS/WhatsApp/email** as needed.

## Common fields

Every **bridge** forward includes:

- **`source`** — string discriminator (see below).
- **`receivedAt`** — ISO 8601 timestamp.
- **`payload`** — provider-specific object (form body, Stripe object, Twilio fields, Meta JSON).

Some sources add top-level fields (e.g. Stripe adds `stripeEventId`, `stripeType`).

---

## 1. Inbound chat (verified on the bridge)

```json
{
  "source": "meta_whatsapp | twilio_sms",
  "receivedAt": "2026-04-04T12:00:00.000Z",
  "payload": {},
  "normalized": {
    "channel": "whatsapp | sms",
    "phoneE164": "+447700900123",
    "text": "message body if text",
    "messageId": "provider message id",
    "rawHint": null
  }
}
```

- **`meta_whatsapp`**: `payload` is the raw Meta **WhatsApp** webhook JSON (entry/changes).
- **`twilio_sms`**: `payload` contains `MessageSid`, `From`, `To`, `Body`, `NumMedia`.
- **`normalized`**: best-effort fields for n8n/Twenty. May be partial for non-text WhatsApp message types.

**Idempotency:** Meta and Twilio may retry; use provider ids (`MessageSid`, message ids inside Meta payload) before creating duplicate People or activities.

---

## 2. Funnel form (UTM + lead capture)

Forwarded to `N8N_FUNNEL_WEBHOOK_URL` (see **`FUNNEL_P0.md`**).

```json
{
  "source": "funnel_form",
  "receivedAt": "2026-04-04T12:00:00.000Z",
  "payload": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "utm_source": "",
    "utm_medium": "",
    "utm_campaign": "",
    "utm_content": ""
  }
}
```

**Downstream:** create/update Person; store attribution (today often **`jobTitle`** line until custom fields exist).

---

## 3. Stripe (signed webhook on the bridge)

Forwarded to `N8N_STRIPE_WEBHOOK_URL` after signature verification.

```json
{
  "source": "stripe",
  "receivedAt": "2026-04-04T12:00:00.000Z",
  "stripeEventId": "evt_...",
  "stripeType": "checkout.session.completed",
  "payload": {}
}
```

`payload` is **`event.data.object`** (e.g. Checkout **Session**). Use **`stripeEventId`** and the Checkout **Session `id`** for idempotent handling in n8n.

**Shipped workflow (`stripe-bridge`):** For **`checkout.session.completed`**, n8n **find-or-creates** by **primary email** (GET → PATCH or POST). If the Person already has **`jobTitle`** containing **`session=<checkout session id>`**, the execution returns **`skipped_idempotent`** (handles Stripe webhook retries without duplicating the same payment line).

---

## 4. Outbound SMS (n8n webhook → Twilio)

Server-side automation (or a trusted backend) POSTs to **`/webhook/antitrader-send-sms`** with a **shared secret**. Do **not** expose the secret in browsers or client apps.

**Auth (one of):**

- JSON **`webhookSecret`** equal to **`N8N_ANTITRADER_OUTBOUND_SECRET`** on the n8n container, or
- Header **`X-Antitrader-Webhook-Secret`** with the same value.

**Body (JSON):**

| Field | Required | Description |
|--------|----------|-------------|
| **`toE164`** | Yes | Destination in E.164 (e.g. `+447700900123`). Alias: **`to`**. |
| **`message`** | Yes | SMS text. Alias: **`body`** (prefer **`message`** to avoid ambiguity with HTTP body wrapping). |
| **`webhookSecret`** | If not using header | Must match **`N8N_ANTITRADER_OUTBOUND_SECRET`**. |

**n8n env:** **`TWILIO_ACCOUNT_SID`**, **`TWILIO_AUTH_TOKEN`**, **`TWILIO_MESSAGING_FROM`** (E.164 sender), plus **`N8N_ANTITRADER_OUTBOUND_SECRET`**. See **`docker-compose.yml`** (n8n service) and **`.env.example`**.

**Example:**

```json
{
  "toE164": "+447700900123",
  "message": "Thanks — we received your message.",
  "webhookSecret": "<same as N8N_ANTITRADER_OUTBOUND_SECRET>"
}
```

---

## 5. Outbound WhatsApp (template, Cloud API)

Server-side automation POSTs to **`/webhook/antitrader-send-whatsapp`** with the **same** shared secret as SMS (**`N8N_ANTITRADER_OUTBOUND_SECRET`**). Outside the **24-hour customer service window**, only **approved template** messages may be sent ([WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)).

**Auth:** Same as **§4** — JSON **`webhookSecret`** or header **`X-Antitrader-Webhook-Secret`**.

**Body (JSON):**

| Field | Required | Description |
|--------|----------|-------------|
| **`toE164`** | Yes | Destination in E.164; normalized to digits for Graph API **`to`**. |
| **`templateName`** | Yes | Approved template name in Meta Business. Alias: **`template`**. |
| **`languageCode`** | No | Default **`en_US`**. Must match the template locale. Alias: **`language`**. |
| **`bodyParameters`** | No | JSON array of strings for template body `{{1}}`, `{{2}}`, … in order. |

**n8n env:** **`WHATSAPP_CLOUD_ACCESS_TOKEN`** (Graph API user access token with `whatsapp_business_messaging`), **`WHATSAPP_PHONE_NUMBER_ID`**, optional **`WHATSAPP_GRAPH_API_VERSION`** (default **`v21.0`**), plus **`N8N_ANTITRADER_OUTBOUND_SECRET`**.

**Example:**

```json
{
  "toE164": "+447700900123",
  "templateName": "hello_world",
  "languageCode": "en_US",
  "bodyParameters": ["Ada"],
  "webhookSecret": "<same as N8N_ANTITRADER_OUTBOUND_SECRET>"
}
```

**messaging-console:** **`POST /api/send-whatsapp`** forwards to n8n with the secret from server env only.

---

## 6. Sales journey (trading school) — how the stack supports it

This is the **spine** we discussed: ads → lead → outreach → webinar → call → account / paid. Nothing here requires a new bridge endpoint; **n8n** is the right place to add steps as you grow.

| Journey step | What to use | Notes |
|--------------|-------------|--------|
| **Ads + landing / form** | Bridge **`/funnel`** → n8n **`funnel-capture`** | UTM in query + form; envelope **`source: funnel_form`**. |
| **Inbound SMS/WhatsApp** | Twilio/Meta → bridge → n8n **`antitrader-inbound`** | Reply handling + **`normalized.phoneE164`**. |
| **Outbound SMS (Twilio)** | n8n **`antitrader-send-sms`** | **§4** — shared secret + Twilio env on n8n; **not** callable from the browser. |
| **Outbound WhatsApp (template)** | n8n **`antitrader-send-whatsapp`** | **§5** — same secret + WhatsApp Cloud API env on n8n; **messaging-console** uses **`/api/send-whatsapp`**. |
| **Webinar register / attend** | n8n **Webhook** (new workflow) from Zoom/GoToWebinar/etc., or Zapier → n8n | Prefer **direct n8n webhook** + secret header; no bridge unless you need signature verification the provider supports. |
| **Discovery call booked** | Calendly/Microsoft Bookings → n8n webhook | Same pattern: HTTP POST into n8n, then **find Person by email/phone**, set Twenty **stage** or **task**. |
| **Payment / enrollment** | Stripe → bridge **`/webhooks/stripe`** → n8n **`stripe-bridge`** | **`checkout.session.completed`** (and more event types later in the Code node). |
| **Account + lesson plan** | Your app or STAR | n8n **HTTP Request** after Person exists (e.g. `crmContactId` in payload) — see **`DESIGN_PLAN.md`**. |

**Twenty** is the **source of truth for stage**: define a **pipeline** and stages (see **`TWENTY_PIPELINE.md`**). n8n should **PATCH** person or **Opportunity** when a journey webhook fires, not duplicate business rules in the bridge.

**Convention for “extra” n8n webhooks** (Calendly, webinar, internal forms): use a stable JSON shape so one workflow can branch:

```json
{
  "source": "calendly | webinar | manual",
  "receivedAt": "2026-04-04T12:00:00.000Z",
  "journeyStage": "webinar_registered | call_booked | enrolled",
  "payload": {
    "email": "user@example.com",
    "phoneE164": "+44...",
    "externalId": "calendly-invitee-uuid",
    "meta": {}
  }
}
```

**Shipped in this repo:** **`integrations/n8n/antitrader-sales-journey-to-twenty.json`** — webhook path **`sales-journey`** (import via **`./scripts/import-n8n-workflow.sh`**). It finds a Person by **primary email** or **primary phone** (`GET /rest/people?filter=…`), **PATCH**es **`jobTitle`** when found (appends a `Journey | <stage> | <source> | …` segment), otherwise **POST** creates a Person. Configure **pipeline stages** in Twenty (`TWENTY_PIPELINE.md`); `jobTitle` is a trace until you model stages on Opportunities or custom fields.

For **additional** tools or branching logic, add more n8n workflows + Twenty REST calls; only add **bridge** routes when a vendor requires **your** public URL and **verified** signatures (Stripe/Meta/Twilio).

---

## Downstream checklist (all sources)

1. **Normalize** phone to **E.164** when present.
2. **Find or create** a Twenty **Person** (by phone and/or email); avoid duplicate creates (idempotency keys above).
3. **Move pipeline / log activity** when `journeyStage` or Stripe events warrant it.
4. **Emit** internal OASIS events (`lead.created`, `message.inbound`, …) when STAR is wired.
