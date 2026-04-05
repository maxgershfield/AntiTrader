# AntiTrader — messaging console

Operator **home** for the AntiTrader stack: bridge health, links to **n8n** and **Twenty**, same visual language as `student-dashboard/` (moss / gold / void).

This is **not** a full WhatsApp inbox (that pattern lives in The Union’s `union-messaging` + `union-api`). Here we keep **everything** under the AntiTrader repo and document the split in **`docs/MESSAGING_STACK.md`**.

## Run

```bash
cd messaging-console
cp .env.example .env.local
# Edit .env.local if bridge is not on localhost:3099
npm install
npm run dev
```

Open **http://localhost:3102**.

## Env

| Variable | Purpose |
|----------|---------|
| `ANTITRADER_BRIDGE_URL` | Base URL for `antitrader-bridge` (used by `/api/bridge-health` server proxy). |
| `N8N_ANTITRADER_OUTBOUND_SECRET` | Same value as on the **n8n** service; used by **`/api/send-sms`** to authenticate to n8n (never exposed to the browser). |
| `N8N_WEBHOOK_URL` | Base URL for n8n (default `http://127.0.0.1:5678/`). Compose builds `…/webhook/antitrader-send-sms` unless `N8N_SEND_SMS_WEBHOOK_URL` is set. |
| `N8N_SEND_SMS_WEBHOOK_URL` | Optional full URL to the outbound-SMS webhook (overrides `N8N_WEBHOOK_URL` + path). |
| `N8N_SEND_WHATSAPP_WEBHOOK_URL` | Optional full URL to the outbound-WhatsApp webhook (overrides `N8N_WEBHOOK_URL` + `/webhook/antitrader-send-whatsapp`). |
| `MESSAGING_CONSOLE_OPERATOR_PASSWORD` | Optional. If set, the Compose form must include the same value in the operator password field (simple gate; still put the app behind a VPN in production). |
| `NEXT_PUBLIC_N8N_UI_URL` | Optional. Base URL for n8n UI links (default `http://localhost:5678`). |

Import **`antitrader-send-sms-twilio.json`** and **`antitrader-send-whatsapp-template.json`** in n8n; set Twilio + WhatsApp Cloud API env + `N8N_ANTITRADER_OUTBOUND_SECRET` on the n8n container — see **`../integrations/n8n/IMPORT.md`**.

## Build

```bash
npm run build && npm run start
```
