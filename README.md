# SiteSense

**Paste a URL. Ask anything. Get answers with sources.**

SiteSense turns any website into an instant, chattable dossier with cited sources —
an AI research analyst that reads a site for you and answers questions in seconds.

## Repo layout

This is a monorepo. Each part is production-grade and independently deployable.

```
.
├── ui/         Frontend — Vite + React + TS + Tailwind + Motion + R3F  (built)
├── backend/    API — Supabase + Firecrawl + OpenAI edge functions       (coming)
├── PLAN.md     Product plan & positioning
└── TEAM.md     Team split & API contracts
```

The frontend runs standalone on mock data today (`ui/src/lib/api.ts`, `USE_MOCK`
flag). The backend is being built separately as a self-contained, deployable service;
the two are wired together only by flipping that flag — so neither can break the other.

## Frontend

```bash
cd ui
npm install
npm run dev      # http://localhost:5173
```

See [ui/README.md](ui/README.md) for screens, stack, and backend-wiring steps.
