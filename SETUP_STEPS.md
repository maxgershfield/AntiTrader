# AntiTrader — steps to run (checklist)

Follow in order. Skip sections marked **(later)** until the basics work.

---

## A. On your machine

1. **Install** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin).
2. **Clone / open** this repo and go to the AntiTrader folder:
   ```bash
   cd AntiTrader
   ```
3. **Generate secrets and `.env` (recommended):**
   ```bash
   chmod +x scripts/generate-secrets.sh
   ./scripts/generate-secrets.sh
   ```
   This creates **`.env`** (gitignored) and **`.secrets/secrets-log.md`** (gitignored) with random **Postgres password**, **APP_SECRET**, **N8N_ENCRYPTION_KEY**, and **META_VERIFY_TOKEN**, plus a short **encryption/signing** note in the log.

   **Alternative:** `cp .env.example .env` and fill values by hand (see **SECRETS_NOTE.md**).

---

## B. Secrets checklist

| Variable | How it’s set |
|----------|----------------|
| `PG_DATABASE_PASSWORD`, `APP_SECRET`, `N8N_ENCRYPTION_KEY`, `META_VERIFY_TOKEN` | Set automatically by **`scripts/generate-secrets.sh`** |
| `SERVER_URL` | Default `http://localhost:3020` in generated `.env` — change if you use another host/port |
| `META_APP_SECRET`, `TWILIO_AUTH_TOKEN` | Add manually from Meta / Twilio when you connect those (see **SECRETS_NOTE.md**) |

**Never commit** `.env` or `.secrets/`. Use a password manager for the same values. Read **SECRETS_NOTE.md** for rotation and n8n key warnings.

---

## C. Start the stack

```bash
docker compose up -d
```

Wait until containers are healthy (first start can take a few minutes while images download).

---

## D. First-time setup — Twenty (CRM)

1. Open **http://localhost:3020** (or your `TWENTY_HTTP_PORT`).
2. Complete **sign-up** and create your **workspace**.
3. In Twenty: **Settings → APIs & Webhooks** → **Create API key** → copy it once (store in a password manager).
4. Open the **REST API playground** (linked from the same settings area) — you will use this to see **exact** paths and fields for *your* workspace when you build n8n.

---

## E. First-time setup — n8n

1. Open **http://localhost:5678** (or your `N8N_HTTP_PORT`).
2. Create the **owner account** (first visit).
3. **(Later)** Build the workflow described in `integrations/n8n/WORKFLOW_STEPS.md` and paste the **Webhook Test URL** into `.env` as `N8N_FORWARD_WEBHOOK_URL`, then run:
   ```bash
   docker compose up -d --force-recreate antitrader-bridge
   ```

---

## F. Check the bridge

1. Open **http://localhost:3099/health** — you should see JSON with `"ok": true`.
2. Until `N8N_FORWARD_WEBHOOK_URL` is set, the bridge **still accepts** webhooks but only logs (no n8n forward).

---

## G. Meta WhatsApp (when you are ready)

1. In [Meta for Developers](https://developers.facebook.com/), create/use an app with **WhatsApp** product.
2. Get **Phone number ID**, **WhatsApp Business Account ID**, **Permanent access token** (per Meta docs).
3. Set **`META_APP_SECRET`** in `.env` (App Secret from the app).
4. Choose a **`META_VERIFY_TOKEN`** (any random string you invent) — same value in Meta’s webhook **Verify token** field.
5. Expose the bridge publicly (e.g. **ngrok**):  
   `https://YOUR-NGROKOK-ID.ngrok.io/webhooks/meta/whatsapp`
6. In Meta: set **Callback URL** to that URL, **Verify token** = `META_VERIFY_TOKEN`.
7. Subscribe to **`messages`** (and any fields Meta requires for your use case).
8. Set **`TWILIO_WEBHOOK_PUBLIC_URL`** only if needed for Twilio; for Meta, the public URL is mainly for Meta hitting **your** bridge.

Restart bridge after env changes:

```bash
docker compose up -d --force-recreate antitrader-bridge
```

---

## H. Twilio SMS (when you are ready)

1. Create a [Twilio](https://www.twilio.com/) account; buy a phone number with **SMS**.
2. Set **`TWILIO_AUTH_TOKEN`** in `.env`.
3. In Twilio console: configure **Messaging** webhook URL to:  
   `https://YOUR-PUBLIC-HOST/webhooks/twilio/sms`
4. Set **`TWILIO_WEBHOOK_PUBLIC_URL`** to the **origin only** (e.g. `https://YOUR-NGROKOK-ID.ngrok.io`) so signature validation matches (see `README.md`).
5. Restart the bridge (same command as above).

---

## I. Connect n8n to Twenty

1. Follow **`integrations/n8n/WORKFLOW_STEPS.md`** to build: **Webhook → HTTP Request** (search/create Person) using your **API key** and **playground** URLs.
2. Use fields from the forwarded body: **`normalized.phoneE164`**, **`normalized.text`**, **`source`** — see **`integrations/EVENT_CONTRACT.md`**.

---

## J. Connect to OASIS / STAR **(later)**

1. Run STAR WebAPI (or use your deployed URL).
2. In n8n, add **HTTP Request** nodes with **Bearer** auth to `POST /api/workflow/execute` (or your SOP trigger) — see **`SOP/README.md`** in the repo for workflow concepts.
3. Pass **`avatarId`** and **`crmContactId`** (Twenty person id) in the JSON body once both exist.

---

## K. Trading app + school **(later)**

1. Store **`avatarId`** + **`crmContactId`** (Twenty person id) on the user profile in each app.
2. On key events (signup, KYC, enrollment), **POST** a small JSON payload to **n8n** (webhook) or your bridge (add a route if needed) with `event`, `avatarId`, `crmContactId`.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Twenty won’t start | `docker compose logs twenty-server` — DB password, `APP_SECRET`, ports not in use. |
| n8n forgets data | `n8n-data` volume; don’t delete volume without backup. |
| Meta verification fails | `META_VERIFY_TOKEN` matches Meta UI; public URL reachable. |
| Twilio 403 on bridge | `TWILIO_WEBHOOK_PUBLIC_URL` matches the URL Twilio signs. |
| Bridge doesn’t forward | `N8N_FORWARD_WEBHOOK_URL` set and bridge recreated. |

---

## Stop / start

```bash
cd AntiTrader
docker compose down          # stop
docker compose up -d         # start again
```
