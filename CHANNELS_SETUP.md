# AntiTrader — connect Twilio SMS & Meta WhatsApp

Prerequisites (all channels):

1. **Stack running:** `docker compose up -d` from `AntiTrader/`.
2. **n8n workflow** imported, **active**, **published** (see `integrations/n8n/IMPORT.md`).
3. **Twenty API key** in `.env` (`TWENTY_API_KEY`); n8n container recreated after changing `.env`.

---

## Twilio SMS first (recommended order)

Twilio cannot call `localhost`. You need a **public HTTPS URL** to the bridge (ngrok is the usual choice).

### Checklist

1. **Twilio account** — [Console](https://console.twilio.com/) → buy or use a **phone number with SMS** capability (some numbers are voice-only).

2. **Bridge → n8n** — In **`.env`**:

   ```env
   N8N_FORWARD_WEBHOOK_URL=http://n8n:5678/webhook/antitrader-inbound
   ```

3. **Expose the bridge** — From `AntiTrader/`:

   ```bash
   ngrok http 3099
   ```

   Copy the **https** forwarding URL **origin only** (no path, no trailing slash), e.g. `https://abc123.ngrok-free.app`.

4. **Twilio credentials in `.env`** — From Console → **Account** → **API keys & tokens**:

   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WEBHOOK_PUBLIC_URL=https://abc123.ngrok-free.app
   ```

   **`TWILIO_ACCOUNT_SID`** is optional for the bridge (only needed if you call Twilio APIs elsewhere); **`TWILIO_AUTH_TOKEN`** is required for **`X-Twilio-Signature`** validation.

   **Test vs live token:** Twilio may show **Test credentials** separately from **Live** API credentials. Inbound SMS webhooks are signed with the **Auth Token** Twilio expects for your account. If the bridge returns **403** after a real SMS, set `TWILIO_AUTH_TOKEN` to the **Live** Auth Token from the main credentials page (not only the Test Auth Token).

   **Critical:** `TWILIO_WEBHOOK_PUBLIC_URL` must be the **same origin** Twilio will use when it POSTs. Twilio’s signature covers the **full** webhook URL:  
   `{TWILIO_WEBHOOK_PUBLIC_URL}/webhooks/twilio/sms`  
   If this does not match exactly (wrong scheme, extra slash, wrong host), the bridge returns **403**.

5. **Reload the bridge** so it picks up env:

   ```bash
   docker compose up -d --build --force-recreate antitrader-bridge
   ```

6. **Configure the number** — Twilio Console → **Phone Numbers** → **Manage** → **Active numbers** → your SMS number → **Configure** tab → **Messaging configuration**:

   - **“A message comes in”** → **Webhook** → **HTTP POST**
   - **URL:** `https://abc123.ngrok-free.app/webhooks/twilio/sms`  
     (replace with your ngrok host; path must be exactly `/webhooks/twilio/sms`.)

7. **Send a test SMS** to your Twilio number from your phone.

8. **Verify** — `docker compose logs antitrader-bridge --tail=50`, then **n8n → Executions**, then **Twenty** for a new Person (`Lead` + last 4 digits).

### Helpers in this repo

| Script | Purpose |
|--------|--------|
| `./scripts/sync-ngrok-tunnel-to-env.sh` | Reads **https** URL from **ngrok** (`http://127.0.0.1:4040`) and writes `TWILIO_WEBHOOK_PUBLIC_URL` in `.env`. Run whenever ngrok restarts with a new URL. |
| `./scripts/set-twilio-messaging-webhook.sh` | Calls Twilio’s REST API to set **Messaging** `SmsUrl` to `{TWILIO_WEBHOOK_PUBLIC_URL}/webhooks/twilio/sms` (optional `PHONE_NUMBER=+1…`). |
| `./scripts/twilio-diagnostics.sh` | **Read-only:** prints account, **incoming numbers + `SmsUrl`**, and **recent Messages** via Twilio REST (needs **Live** credentials — Test keys return **20008**). Run from `AntiTrader/`. |

**No remote Twilio login for Cursor:** nothing in this repo can “sign in” to Twilio on your behalf. Use **`twilio-diagnostics.sh`** locally (with **Live** `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` in `.env`) to see the same data as parts of the Console API, plus **`docker compose logs antitrader-bridge`** (the bridge now logs **`twilio sms inbound`** when a request passes signature check).

**Test vs Live API:** Twilio’s **Test Account Credentials** return **403 / error 20008** (“Resource not accessible with Test Account Credentials”) for **Incoming Phone Numbers** APIs. You **cannot** auto-configure the number via API with test keys — use the **Console** (steps 6–8 above), **or** temporarily use **Live** `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` in `.env` and run `set-twilio-messaging-webhook.sh`.

### Trial accounts

- Trial Twilio often **only delivers SMS to verified caller IDs** — add your mobile under **Phone Numbers → Verified Caller IDs** if messages do not arrive.
- Outbound-only tests: you can still trigger **inbound** by SMS **to** your Twilio number from a verified number.

### Local smoke (no real Twilio request)

If **`TWILIO_AUTH_TOKEN` is unset** in the bridge environment, signature verification is skipped (**dev only**). Then:

```bash
./scripts/smoke-bridge-twilio.sh
```

With **`TWILIO_AUTH_TOKEN` set** (production-like), that script will usually get **403** unless you generate a valid Twilio signature — use a real SMS instead.

---

## Meta WhatsApp Cloud API (after Twilio)

Reuse the **same** public HTTPS origin and ngrok tunnel; only the **path** changes (`/webhooks/meta/whatsapp`).

1. **`.env`**
   - `META_VERIFY_TOKEN` — any secret string you choose; must match Meta’s **Verify token** in the app webhook settings.
   - `META_APP_SECRET` — App **Settings → Basic → App secret** (used to verify `X-Hub-Signature-256` on **POST**).

2. **Meta Developer** → your app → **WhatsApp** → **Configuration** (or Webhooks):
   - **Callback URL:** `https://abc123.ngrok-free.app/webhooks/meta/whatsapp`
   - **Verify token:** same as `META_VERIFY_TOKEN`

3. Subscribe to **`messages`** (and any fields your product needs).

4. Recreate bridge:

   ```bash
   docker compose up -d --force-recreate antitrader-bridge
   ```

5. Meta sends a **GET** to verify; then **POST**s with a signature. Check bridge logs and n8n executions.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| Twilio **403** | `TWILIO_WEBHOOK_PUBLIC_URL` matches the URL Twilio POSTs to (scheme + host + path). |
| Meta **403** on GET | `META_VERIFY_TOKEN` mismatch or not passed into the container (`docker compose` env). |
| Meta **401** on POST | Wrong `META_APP_SECRET` or body altered before HMAC (proxy must not rewrite JSON). |
| n8n never runs | `N8N_FORWARD_WEBHOOK_URL` set, workflow **active**, n8n reachable from bridge (`docker compose logs antitrader-bridge`). |
| Person not in Twenty | n8n execution error on **POST /rest/people** — check `TWENTY_API_KEY` and Twenty REST body (composite `name` / `phones`). |

Event shape: **`integrations/EVENT_CONTRACT.md`**.
