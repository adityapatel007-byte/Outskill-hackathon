# Wiring SiteSense to Supabase

This adds real storage + AI analysis behind the existing `api.ts` seam. The UI
components don't change — only `api.ts`, plus two new backend pieces:
Supabase tables and two Edge Functions.

## 1. Create a Supabase project

If you don't have one yet: https://supabase.com/dashboard → New project.
Grab the values from **Project Settings → API**:
- Project URL → `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `anon` public key → `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`

## 2. Apply the database schema

In the Supabase dashboard: **SQL Editor → New query**, paste the contents of
`supabase/schema.sql`, and run it. This creates:

- `public.scans` — one row per scanned site (`url`, `title`, `dossier` jsonb, `public_id`)
- `public.chat_messages` — chat history per scan, with an optional `citation` jsonb
- Row Level Security so each user only sees their own scans (plus public read
  once a scan's `public_id` is set)
- A `toggle_share(scan_id)` RPC used by the "Share" button

If you'd rather use the CLI:
```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```
(or just paste `schema.sql` into the SQL editor — same effect either way.)

## 3. Enable email auth

**Authentication → Providers → Email** — should be on by default. The app
uses magic links (`signInWithOtp`), so no password provider is needed.

## 4. Deploy the Edge Functions

The two functions live in `supabase/functions/`:

- `scrape-analyze` — takes `{ url }`, fetches the homepage + a few likely
  internal pages (pricing/about/product/...), asks Claude to build the
  `Dossier` JSON, and inserts a `scans` row.
- `chat` — takes `{ scan_id, question }`, answers grounded in that scan's
  stored dossier, and inserts both the user + assistant `chat_messages` rows.

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# Secrets the functions need at runtime:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# Optional — defaults to claude-3-5-haiku-latest, override if you want a
# different model (see https://docs.claude.com/en/docs/about-claude/models):
supabase secrets set ANTHROPIC_MODEL=claude-3-5-haiku-latest

supabase functions deploy scrape-analyze
supabase functions deploy chat
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically into Edge
Functions by the platform — you don't need to set those as secrets yourself.

## 5. Point the frontend at your project

```bash
cd ui
cp .env.example .env
# then edit .env with your project's VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
# and set VITE_USE_MOCK=false
npm run dev
```

## What each piece maps to in `api.ts`

| Function | Backed by |
| --- | --- |
| `listScans` / `getScan` / `getSharedScan` | `select` on `scans` (RLS-scoped) |
| `runScan` | invokes `scrape-analyze` Edge Function |
| `getMessages` | `select` on `chat_messages` |
| `askQuestion` | invokes `chat` Edge Function |
| `clearMessages` | `delete` on `chat_messages` |
| `toggleShare` | `rpc("toggle_share")` |

## Notes / things you may want to change

- **Scraping depth**: `_shared/scrape.ts` fetches the homepage plus up to 3
  matched internal pages (pricing/about/product/customers/FAQ), capped at
  6,000 characters each. Tune `maxPages` / `maxCharsPerPage` in
  `scrape-analyze/index.ts` if sites need deeper coverage.
- **Sites that block server-side fetches** (heavy JS rendering, bot
  protection) will return thin or empty text. A headless-browser scraping
  service (e.g. Browserless, ScrapingBee) can be swapped in behind the same
  `scrapeSite()` function signature if you hit this.
- **Model choice**: `ANTHROPIC_MODEL` is a plain env var — swap it without a
  redeploy-of-code, just `supabase secrets set` and the function picks it up
  on next invocation.
