# Demo for Mike — SMS + WhatsApp + sales flow (simple)

**Goal:** Show one coherent story: **messages land in one place (Twenty CRM)**, **attribution** comes from the funnel, and **sales progression** is visible (pipeline / journey line).

**Time:** ~10 minutes. **Audience:** client — no n8n internals required.

---

## The story (one sentence)

> “Whether someone texts us on **SMS** or **WhatsApp**, or fills the **landing form**, we **dedupe** into **one Person** in Twenty and **log** each touch — then **sales** sees the same record and can move the deal.”

---

## Before you open the room (5–15 min)

| Step | Action |
|------|--------|
| 1 | `cd AntiTrader && docker compose ps` — **Twenty**, **n8n**, **bridge** running. |
| 2 | n8n workflows **imported + active** — run `./scripts/import-n8n-workflow.sh` once if unsure. |
| 3 | **Twenty** open: [http://localhost:3020](http://localhost:3020) → **People** (and **Opportunities** if you use pipeline). |
| 4 | **Messaging console** (optional but nice): `cd messaging-console && npm run dev` → [http://localhost:3102](http://localhost:3102). |
| 5 | **Real channels (pick what you have):** Twilio SMS and/or Meta WhatsApp **webhooks** pointing at your public bridge URL (ngrok) — see **`CHANNELS_SETUP.md`**. If not configured, use **Plan B** below. |

---

## Plan A — Live SMS + WhatsApp inbound (best)

1. **SMS:** Send a text to your Twilio number (or trigger a real inbound).  
   **Show:** Bridge → n8n execution → **Twenty** → Person updated/created; **`jobTitle`** gains an **Inbound \| twilio_sms \| …** line.

2. **WhatsApp:** Send a WhatsApp to the business number (or show Meta test).  
   **Show:** Same **Person** if same **E.164** phone (dedupe path), or a second Person — explain **phone = identity key**.

3. **Funnel / ads:** Open the bridge funnel page with UTM, submit **email + phone** that matches your demo lead.  
   **Show:** **Find-or-create** by **email** merges **UTM** into `jobTitle` — “same person, richer history.”

4. **Sales flow:** In Twenty, open the **Opportunity** (or create one) and drag stage **New → Qualified** (or your stages — see **`integrations/TWENTY_PIPELINE.md`**).  
   **Alternative:** Run **`./scripts/smoke-sales-journey.sh`** and show **`jobTitle`** gaining a **Journey \| …** line — “external tools (Calendly, etc.) can fire this later.”

5. **Outbound (optional):** From **messaging-console**, **Compose SMS** or **WhatsApp template** to Mike’s handset — “reply path from the operator UI, not the Twilio console.”

---

## Plan B — Laptop only (no live Twilio/Meta)

1. **Simulate inbound SMS:**  
   `./scripts/smoke-n8n.sh`  
   **Show:** n8n **Executions** + Twenty **People** — new/updated Person.

2. **Simulate funnel:**  
   `curl` POST to `/funnel/submit` on the bridge (see **`integrations/FUNNEL_P0.md`**) or use the static funnel in the browser.

3. **Simulate sales touch:**  
   `./scripts/smoke-sales-journey.sh`  
   **Show:** `jobTitle` append **Journey \| …**

4. **Show the diagram:** Same stack — **bridge** (verified ingress) → **n8n** (rules) → **Twenty** (source of truth). **Compose** is the outbound path.

---

## What to say if something breaks

- **“The CRM is the source of truth; channels are pipes.”** n8n is where we wire pipes without rewriting the app each time.  
- **Dedupe:** phone for SMS/WhatsApp; email for funnel — **merge** is **PATCH** on `jobTitle` until custom fields are added.  
- **Tomorrow’s hardening:** stricter fields, STAR hooks, enrollment — see **`docs/GAP_ANALYSIS.md`**.

---

## Quick links (local)

| What | URL |
|------|-----|
| Twenty CRM | http://localhost:3020 |
| n8n | http://localhost:5678 |
| Messaging console | http://localhost:3102 |
| Bridge health | http://localhost:3099/health |

**Event shapes:** `integrations/EVENT_CONTRACT.md`
