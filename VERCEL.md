# Deploy on Vercel

The **student skybox dashboard** is static HTML under **`student-dashboard/`**.

1. Import the GitHub repo [maxgershfield/AntiTrader](https://github.com/maxgershfield/AntiTrader) in [Vercel](https://vercel.com/new).
2. **Framework preset:** Other (static). No build command; **root directory** = repo root (or set **Root Directory** to `student-dashboard` and drop the rewrite — see below).
3. Root **`vercel.json`** maps **`/`** → **`/student-dashboard/student-dashboard.html`** so the production URL opens the dashboard.

**Optional:** In Vercel project settings, set **Root Directory** to `student-dashboard` and remove or simplify root `vercel.json` so only that folder is deployed (smaller surface area).

**Not for Vercel as a single static site:** `messaging-console/` (Next.js — deploy as a separate Vercel project with **Root Directory** `messaging-console` and `npm run build`), and Docker services (`docker-compose.yml`) run on your own host.

Optional: set environment variables in Vercel only if you add server-side config later; the student dashboard is static and uses `?apiUrl=` / JWT in the browser for OASIS.
