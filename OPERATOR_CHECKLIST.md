# AntiTrader — what’s done vs what you do

## Already in the repo (no action required)

| Item | Location |
|------|-----------|
| Stack definition | `docker-compose.yml` — Twenty, n8n, bridge |
| Webhook bridge (Meta + Twilio verify → n8n) | `bridge/` |
| n8n inbound workflow (find-or-create Person by phone) | `integrations/n8n/antitrader-inbound-to-twenty.json` |
| Event shape + Twenty API notes | `integrations/EVENT_CONTRACT.md`, `integrations/TWENTY_API.md` |
| **Full-stack gap analysis & build order** | **`docs/GAP_ANALYSIS.md`** (CRM + messaging + campaigns + student-dashboard) |
| Import steps + Docker URL fix | `integrations/n8n/IMPORT.md` |
| Pipeline/field suggestions | `integrations/TWENTY_PIPELINE.md` |
| Env template | `.env.example` |
| Secret generator | `scripts/generate-secrets.sh` |
| Twenty demo People + Opportunities (trading-school funnel) | `scripts/seed-antitrader-twenty-demo.mjs` (see **`integrations/TWENTY_PIPELINE.md`**) |
| AntiTrader messaging console (operator home) | `messaging-console/` — `npm run dev` → **http://localhost:3102** (see **`docs/MESSAGING_STACK.md`**) |

---

## A. On your machine (terminal)

Run from **`AntiTrader/`**:

```bash
# 1) Ensure .env exists (use generate-secrets.sh or merge from .env.example)
# 2) Start / refresh stack
docker compose up -d

# 3) Confirm containers are up
docker compose ps

# 4) Optional: smoke-test n8n webhook → Twenty (needs TWENTY_API_KEY in .env and n8n running)
chmod +x scripts/smoke-n8n.sh
./scripts/smoke-n8n.sh
```

Restart after **any** `.env` change:

```bash
docker compose up -d --force-recreate n8n antitrader-bridge
```

---

## B. You — Twenty (browser)

1. Open **http://localhost:3020** (or your `TWENTY_HTTP_PORT`).
2. **Settings → APIs & Webhooks** → create **API key** → copy it.
3. Put in **`.env`**: `TWENTY_API_KEY=<paste>` (never commit).
4. Apply **pipeline + fields** using **`integrations/TWENTY_PIPELINE.md`** (optional but recommended).

---

## C. You — n8n (browser)

1. Open **http://localhost:5678**.
2. **Import** `integrations/n8n/antitrader-inbound-to-twenty.json`.
3. **Activate** the workflow (toggle on).
4. Confirm **`integrations/n8n/IMPORT.md`** — after `TWENTY_API_KEY` is in `.env`, **recreate n8n** (step A).

---

## D. You — connect bridge → n8n (`.env` edit)

Set (Docker network — **not** `localhost` from the bridge):

```env
N8N_FORWARD_WEBHOOK_URL=http://n8n:5678/webhook/antitrader-inbound
```

Then:

```bash
docker compose up -d --force-recreate antitrader-bridge
```

Full channel walkthrough (ngrok, Twilio, Meta): **[CHANNELS_SETUP.md](./CHANNELS_SETUP.md)**.

---

## E. You — Twilio SMS (browser + tunnel)

Twilio cannot reach `localhost`. You need a **public HTTPS URL** to **`antitrader-bridge`**.

1. Install/run **ngrok** (or similar):  
   `ngrok http 3099`  
   Note the **https** URL (e.g. `https://abc123.ngrok-free.app`).
2. In **`.env`** set **origin only**:
   ```env
   TWILIO_WEBHOOK_PUBLIC_URL=https://abc123.ngrok-free.app
   ```
   (No trailing path.)
3. In **Twilio Console** → **Phone Numbers** → your SMS number → **Messaging** configuration:
   - **A message comes in** → Webhook → **POST** →  
     `https://abc123.ngrok-free.app/webhooks/twilio/sms`
4. Restart bridge:
   ```bash
   docker compose up -d --force-recreate antitrader-bridge
   ```
5. Send a test SMS to your Twilio number; check n8n **Executions** and Twenty for a new person.

**Auth token:** already belongs in **`.env`** as `TWILIO_AUTH_TOKEN` (and `TWILIO_ACCOUNT_SID` if you use it).

---

## F. You — Meta WhatsApp (later)

1. Meta Developer app + WhatsApp product.
2. **`.env`**: `META_APP_SECRET`, same **`META_VERIFY_TOKEN`** as in Meta webhook settings.
3. Public URL for **`GET/POST .../webhooks/meta/whatsapp`** (same ngrok host or another).
4. Restart **bridge**.

---

## G. You — STAR / trading / school (later)

- Add n8n **HTTP Request** nodes to your STAR **`/api/workflow/execute`** (JWT in n8n credentials).
- Trading + school: store **`crmContactId`** / **`avatarId`** and POST events to n8n — see **`DESIGN_PLAN.md`**.

---

## Quick health checks

| URL | Expect |
|-----|--------|
| http://localhost:3020 | Twenty UI |
| http://localhost:5678 | n8n UI |
| http://localhost:3099/health | `{"ok":true}` |
