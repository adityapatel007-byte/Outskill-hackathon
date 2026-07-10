# SiteSense — Frontend (Parcel 1)

The UI for SiteSense: paste a URL → AI dossier → chat-with-site with cited sources.
Design direction **"Analyst's Desk Lamp"** — warm, calm, accessible; light default with a warm-dark toggle.

## Run

```bash
cd ui
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · Motion · React Three Fiber (the "Lens" moment).

## Screens

| Route | File | What |
|---|---|---|
| `/` | `pages/Landing.tsx` | Hero + URL input + sample dossier |
| `/auth` | `pages/Auth.tsx` | Magic-link sign-in |
| `/app` | `pages/AppHome.tsx` | URL input + recent scans |
| `/scan/:id` | `pages/ScanDetail.tsx` | Dossier (left) + chat (right) |
| `/share/:publicId` | `pages/Share.tsx` | Read-only shared dossier |

## Wiring the backend (P2–P5)

**Everything talks to `src/lib/api.ts` — the single seam.** It currently runs on the
in-memory mock in `src/lib/mock.ts`. To go live:

1. Set `VITE_USE_MOCK=false` in `ui/.env` (or flip `USE_MOCK` in `api.ts`).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` and create a
   Supabase client in `api.ts`.
3. Replace the `throw new Error("Live … not wired yet")` branch in each function with
   the real call. Contracts (from `TEAM.md`):
   - `runScan(url)` → `POST /scrape` then `POST /analyze` → returns a `Scan`.
   - `askQuestion(scanId, q)` → `POST /chat` → `{ answer, message_id }` (+ citation).
   - `toggleShare(scanId)` → RPC that sets `public_id`.

Types live in `src/types.ts` and mirror `PLAN.md §3.2`. The component layer never
changes — only `api.ts`.

## Accessibility notes (do not regress)

Light default, WCAG-AA contrast, 17px base text, visible focus rings, `prefers-reduced-motion`
honored, no color-only signals. Built for users of every age.
