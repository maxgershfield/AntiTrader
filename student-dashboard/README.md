# AntiTrader School — student skybox dashboard

## What this is

A **single-page student dashboard** for **AntiTrader School**: full-screen **360° equirectangular skybox** (Blockade Labs) as the background, with a **Pulmón Verde–style HUD** (identity, curriculum progress, activity, OASIS JWT sign-in). Same URL patterns as `worldgen-oasis-demo` / conservation passport: `?skyboxUrl=`, `?worldId=` + `?apiUrl=`, optional `?demo=1`.

This is **not** served by the AntiTrader Docker bridge by default — run a **static HTTP server** from this folder (or any host) so `default-skybox.json` and the skybox image can load (CORS + `fetch`).

## Files

| File | Role |
|------|------|
| `student-dashboard.html` | UI + Three.js viewer + OASIS hooks (`antitrader_oasis_jwt`). |
| `default-skybox.json` | Generated: `{ "file_url", "thumb_url", "prompt", ... }` from Blockade. |
| `scripts/generate_skybox.py` | Calls Blockade via `worldgen-oasis-demo/blockade_client.py`; loads API key from `worldgen-oasis-demo/.env`. |
| `prompts/beach_sunset_skybox.md` | Notes on the current default skybox concept; **canonical prompt lives in `scripts/generate_skybox.py`** (`PROMPT`). |

## Regenerate skybox image

From repo root (`OASIS_CLEAN`):

```bash
pip install requests
python3 AntiTrader/student-dashboard/scripts/generate_skybox.py
```

Edits **`default-skybox.json`** in this folder.

## Run locally

```bash
cd AntiTrader/student-dashboard
python3 -m http.server 8765
```

Open: `http://localhost:8765/student-dashboard.html?demo=1`  
(`?demo=1` skips the sign-in gate.)

## OASIS

- Default API base: `https://api.oasisweb4.com` (override with `window.AT_OASIS_API_URL` before load).
- JWT: `localStorage` key **`antitrader_oasis_jwt`**.
- Avatar metadata for live data: nested **`metadata.atSchool`** (modules, streak, activity, etc.) — see `mapStudentFromOasis` in `student-dashboard.html`.

## Related repo paths

- Blockade client: `worldgen-oasis-demo/blockade_client.py`
- Interop doc: `worldgen-oasis-demo/BLOCKADE_LABS_INTEROP.md`
- Pulmón reference UI: `Hitchhikers/Pulmon_Verde/portals/public/conservation-passport.html`
