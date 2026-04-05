# Deploy on Vercel

1. Import the GitHub repo [maxgershfield/AntiTrader](https://github.com/maxgershfield/AntiTrader) in [Vercel](https://vercel.com/new).
2. **Framework preset:** Other (static). No build command; **Output** is the repo root.
3. `vercel.json` maps `/` → `/student-dashboard.html` so the site loads at the project URL root.

Optional: set environment variables in Vercel only if you add server-side config later; this app is static and uses `?apiUrl=` / JWT in the browser for OASIS.
