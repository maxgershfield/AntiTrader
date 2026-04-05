# n8n starter workflow (manual build)

Importing raw JSON across n8n versions is fragile; build this once in the UI, then **Export** to save `AntiTrader-inbound.json` in this folder.

## 1. Webhook trigger

1. New workflow → add **Webhook** node.
2. **POST**, path e.g. `antitrader-inbound`, **Raw body** off (JSON parsed).
3. Execute workflow → copy **Test URL** → set `N8N_FORWARD_WEBHOOK_URL` in AntiTrader `.env` to this URL.
4. Restart `antitrader-bridge` so forwards hit this webhook.

## 2. Validate shape (optional)

Add **IF** or **Code** node: require `$json.body.normalized.phoneE164` (or use **Webhook** “Using ‘Respond to Webhook’” only after downstream success).

## 3. Twenty — search or create Person

Add **HTTP Request** node:

- **Method**: GET or POST per your Twenty playground (e.g. filter people by phone field).
- **URL**: `{{ $env.TWENTY_BASE }}/rest/...` — store `TWENTY_BASE` and `TWENTY_API_KEY` in n8n **Credentials** (Header Auth: `Authorization: Bearer …`).

If no match → second **HTTP Request** to create Person with `firstName`/`phone`/`email` as your schema allows.

## 4. STAR / OASIS (optional)

Add **HTTP Request** to your STAR WebAPI:

- e.g. `POST /api/workflow/execute` with Bearer JWT stored in n8n credentials.

Only after Twenty person id is known — pass `crmContactId` in workflow input.

## 5. Respond

Webhook node → **Respond to Webhook** with 200 JSON `{ "ok": true }` if you use “Wait for response” mode; otherwise bridge only needs n8n to return 200 (default).

## 6. Export

**Download** workflow JSON into `integrations/n8n/` for the team.
