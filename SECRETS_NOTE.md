# Secrets handling (AntiTrader)

## Where secrets live

| Location | In git? | Purpose |
|----------|---------|---------|
| `.env` | **No** (gitignored) | Values consumed by `docker compose` |
| `.secrets/secrets-log.md` | **No** (gitignored) | Human-readable log + encryption notes (created by script) |
| `.env.example` | **Yes** | Placeholders only — no real secrets |

## Generate or rotate

From `AntiTrader/`:

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

This overwrites `.env` and `.secrets/secrets-log.md` with new random values.

**Warning:** Changing **`N8N_ENCRYPTION_KEY`** after n8n has stored credentials can **invalidate** encrypted data in the n8n volume. Back up the `n8n-data` Docker volume before rotating that key.

## What you still add by hand

- **META_APP_SECRET** — from [Meta Developer](https://developers.facebook.com/) (WhatsApp app).
- **TWILIO_AUTH_TOKEN** — from [Twilio Console](https://console.twilio.com/).
- **N8N_FORWARD_WEBHOOK_URL** — after you create an n8n Webhook node.

Put those into `.env` and append the same to your password manager; optionally update `.secrets/secrets-log.md` locally (do not commit).

## Encryption (plain language)

- **Postgres password** protects database login; volume encryption depends on your host/disk setup.
- **APP_SECRET** secures Twenty’s server-side signing/session behavior.
- **N8N_ENCRYPTION_KEY** encrypts **n8n’s stored credentials** at rest inside n8n’s data dir.
- **HTTPS** in production (reverse proxy) protects secrets in transit between browsers and services.

No committed file in this repo contains production secrets.
