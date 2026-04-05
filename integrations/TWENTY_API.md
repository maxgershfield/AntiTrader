# Twenty CRM — API usage (AntiTrader)

Twenty exposes **workspace-specific** REST/GraphQL docs. Self-hosted base URL is your `SERVER_URL` (e.g. `http://localhost:3020`).

## Setup

1. Open Twenty → **Settings → APIs & Webhooks**.
2. **Create API key** — copy once; assign a **Role** with permission to create/read People (and Opportunities if you use pipeline).
3. Use the in-app **REST API playground** for exact paths and fields for *your* workspace (custom fields appear there).

Official overview: [docs.twenty.com — APIs](https://docs.twenty.com/developers/extend/api)

## Typical calls (adjust paths from your playground)

```bash
export TWENTY_BASE="http://localhost:3020"
export TWENTY_TOKEN="your_api_key"

curl -sS -H "Authorization: Bearer $TWENTY_TOKEN" \
  -H "Content-Type: application/json" \
  "$TWENTY_BASE/rest/people" 
```

Create/update shapes depend on your schema — **do not guess fields**; copy from the playground.

## Limits

Twenty documents **~100 requests/minute** per API key — batch where possible.

## AntiTrader flow

1. **Bridge** → n8n receives `normalized.phoneE164` and `normalized.text`.
2. n8n **searches** People by phone (filter query from playground) or **creates** a Person.
3. Optional: create a **Note** or **Task** activity if your model supports it via REST.
