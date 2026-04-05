# Twenty — recommended pipeline & fields (AntiTrader)

Apply these **inside Twenty** (Settings → Data model / Objects / Pipeline as your UI allows). Exact clicks vary by Twenty version; use this as the **target model**.

## Opportunity stages (Twenty REST enum ↔ AntiTrader workflow)

Twenty’s default **Opportunity** `stage` values are fixed enums (e.g. `NEW`, `SCREENING`, `MEETING`, `PROPOSAL`, `CUSTOMER`). Map your **sales story** to those stages in the UI and in API calls; use **deal name** + **Person `jobTitle`** for the extra nuance (webinar vs call) until you add custom fields.

| AntiTrader story step | Typical `stage` | Example deal name (seed script) |
|------------------------|-------------------|-----------------------------------|
| Ad / landing + form capture | `NEW` | Lead · Funnel (ads → landing + UTM) |
| Outreach + video / qualified | `SCREENING` | Qualified · outreach + video |
| Webinar invite & attendance | `MEETING` | Webinar · invite, show-up, replay |
| Discovery / sales call | `PROPOSAL` | Discovery call · needs & fit |
| Paid / enrolled + account | `CUSTOMER` | Enrolled · account + lesson plan access |
| Active student / retention | `CUSTOMER` | Active student · sim trades + notifications |

**Demo data:** From `AntiTrader/`, with `TWENTY_API_KEY` in `.env`, run:

```bash
source .env
TWENTY_SEED_BASE="${SERVER_URL:-http://localhost:3020}" node scripts/seed-antitrader-twenty-demo.mjs
```

That rewrites placeholder People and Opportunities to match the table above (ids are **workspace-specific** — edit the script if you reset Twenty).

## Pipeline stages (suggested order)

| Order | Stage | Notes |
|-------|--------|--------|
| 1 | **New** | First touch, not yet qualified |
| 2 | **Qualified** | Fits ICP, ready for conversation |
| 3 | **Call booked** | Meeting or call scheduled |
| 4 | **School enrolled** | If school is a path — or use a tag instead |
| 5 | **Trading KYC** | If trading path — compliance step |
| 6 | **Won** | Converted / paying |
| 7 | **Lost** | Closed lost |

Rename or merge stages to match how you actually sell; keep **Won** / **Lost** for reporting.

## Custom fields (on Person or Lead — match your workspace)

Create fields (or equivalent labels) so integrations can stay consistent:

| Field | Purpose |
|--------|---------|
| **avatarId** | OASIS Avatar UUID (string) |
| **source** | e.g. `whatsapp`, `sms`, `school`, `trading` |
| **schoolProgram** | Optional program name |
| **tradingTier** | Optional tier / product |

**Phone** is usually built-in — align with **`normalized.phoneE164`** from the bridge.

After you add fields, your **REST playground** will show the exact JSON keys for **POST /rest/people** — prefer those keys in n8n over guessing.
