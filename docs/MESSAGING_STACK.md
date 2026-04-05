# AntiTrader — messaging stack (recommendation)

## n8n vs union-messaging (are they the same?)

**No — different jobs.**

| | **n8n** | **union-messaging** (The Union) |
|---|--------|--------------------------------|
| **What it is** | Workflow automation: triggers, HTTP nodes, branching, retries, CRM calls | A **product**: Next.js UI + REST API + message store + WhatsApp sends |
| **Who uses it** | Builders / operators who edit workflows | End users (Mike/Jefferson-style admins) in a dedicated inbox |
| **Messaging** | You **model** flows (e.g. inbound webhook → Twenty → Slack). No built-in “inbox UI”. | **Compose, threads, broadcasts, automations** screens out of the box |
| **In AntiTrader today** | **Yes** — bridge → n8n → Twenty, funnel, Stripe, sales-journey | **No** — lives under `The Union/`, not AntiTrader |

So: **n8n is the integration bus** (similar *role* to the *backend* part of a messaging system, but not a replacement for a full operator console). **union-messaging** is closer to a **turnkey messaging app** — we are **not** forking it; we **document** how AntiTrader uses n8n + bridge, and ship an **AntiTrader-themed console** in-repo as the home for operators (`messaging-console/`).

---

## Recommended stack for “messaging easy” (all AntiTrader-first)

1. **Keep** — **antitrader-bridge** (verified ingress: Meta WhatsApp, Twilio SMS, funnel, Stripe).
2. **Keep** — **n8n** (automations, Twenty sync, future email/Calendly — **one** place for workflow logic).
3. **Keep** — **Twenty** (CRM source of truth, pipeline).
4. **Add (in this repo)** — **`messaging-console/`** — AntiTrader operator **home**: health, links to n8n & Twenty, room to grow (compose, thread list) without depending on The Union repo.
5. **Later (optional)** — Dedicated **`/api/messaging/*`** service (Express/Fastify) **inside** `AntiTrader/` if you outgrow “n8n + bridge only” and need a unified send/receive store like `union-api`. Until then, **n8n + bridge + Twenty** is enough for automation; the console documents and surfaces it.

**Optional** from `DESIGN_PLAN.md`: **Chatwoot** if you want a full omnichannel inbox OSS — still behind Twilio/Meta; evaluate only if n8n + Twenty + console feels tight.

---

## What to build next (order)

| Phase | Deliverable |
|-------|----------------|
| **Now** | Run **`messaging-console`** locally; use **`EVENT_CONTRACT.md`** for all webhook shapes. |
| **Done** | **Compose SMS** — **`POST /api/send-sms`** → **`/webhook/antitrader-send-sms`**. **Compose WhatsApp template** — **`POST /api/send-whatsapp`** → **`/webhook/antitrader-send-whatsapp`** (secrets server-side only). |
| **Next** | Add **read-only** **Twenty person** deep links or **activity** from CRM (URLs only). |
| **Then** | **Threads / message store** (Twenty Notes or `antitrader-messaging-store`) or **one** small `AntiTrader/` API if you outgrow n8n-only sends. |

---

## Theming

- **Console**: moss / gold / void palette (aligned with `student-dashboard/`).
- **Docs & scripts**: prefix **AntiTrader** in titles; no The Union branding in AntiTrader paths.
