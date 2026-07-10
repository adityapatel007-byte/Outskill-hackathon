# SiteSense — 6-Person Team Split

Read `PLAN.md` first. This doc says **who owns what**, what the **contracts between people** are, and **daily handoffs** so no one blocks anyone else.

**Team size:** 6 (you + 5)
**Golden rule:** Every parcel owns a *deliverable*, not a *task*. If someone else needs your work, it's your job to hand them a working thing, not a promise.

---

## THE SPLIT AT A GLANCE

| # | Parcel | Owner | Ships |
|---|---|---|---|
| **1** | **Frontend & UX** | **You (ASP)** | All screens, Bolt project, animations, look-and-feel |
| **2** | Supabase Infra + Auth + Schema | Person 2 | Working DB, magic-link login, RLS policies |
| **3** | Scraping Service (Firecrawl edge fn) | Person 3 | `POST /scrape` that returns clean markdown |
| **4** | AI Dossier (Analyze edge fn) | Person 4 | `POST /analyze` that returns structured JSON |
| **5** | AI Chat + Citations (Chat edge fn) | Person 5 | `POST /chat` with grounded, cited answers |
| **6** | Product, Demo, Pitch, Submission | Person 6 | Positioning, deck, Loom, portal submission |

Each parcel has its own section below with scope, deliverables, day-by-day, and the exact API contract they must expose to their neighbors.

---

## PARCEL 1 — FRONTEND & UX (You / ASP)

**You own everything the user sees.**

### Scope
- Bolt.new project + repo ownership
- All screens per `PLAN.md` §2.1 (landing, auth, app, scan detail, share)
- Tailwind + shadcn/ui + framer-motion polish
- Wiring UI to Supabase client + calling the 3 edge functions
- Empty states, loading states, error states
- Responsive check (desktop-first, but doesn't break on tablet)

### Deliverables
- Working Bolt project deployed to a public URL (Netlify)
- All 5 screens navigable
- URL input → scrape → dossier → chat → share works end-to-end in the UI
- Dark theme + lime accent matching the eval slide vibe

### Day-by-day
- **Day 1 PM:** Create Bolt project, paste starting prompt from `PLAN.md` §2.3, scaffold all screens with mocked data.
- **Day 2 AM:** Wire Supabase client (uses Person 2's config). Auth flow live.
- **Day 2 PM:** Wire URL input → Person 3's `/scrape` → Person 4's `/analyze`. Show real dossier.
- **Day 3 AM:** Wire chat panel to Person 5's `/chat`. Loading + error states.
- **Day 3 PM:** UI polish, animations, deploy final build.

### What you need from others
- From **P2**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, working auth
- From **P3-P5**: edge function URLs + the exact request/response shapes below

### What you deliver to others
- A deployed URL P6 can use in the pitch deck and Loom
- Feedback on API shapes — if you can't render it in the UI, they need to change it

---

## PARCEL 2 — SUPABASE INFRA, AUTH, SCHEMA (Person 2)

**Owns the plumbing. Everyone else depends on this being right on Day 1.**

### Scope
- Create Supabase project (free tier is fine)
- Run the SQL from `PLAN.md` §3.1
- Configure Auth → enable email magic link, set redirect URL
- Set up Row-Level Security policies (already in the SQL)
- Store the 3 API keys as edge function secrets: `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `SITE_URL`
- Create a shared `.env.example` so everyone knows the env vars

### Deliverables
- Supabase project URL + anon key shared in a private team channel
- Schema live, tested with a dummy insert
- Magic-link login working (P1 tests from Bolt)
- All API keys stored as edge secrets so P3/P4/P5 can `Deno.env.get(...)` them

### Day-by-day
- **Day 1 AM:** Create project, run schema, enable auth. Share creds by end of morning.
- **Day 1 PM:** Verify RLS with two test users — user A cannot see user B's scans.
- **Day 2 AM:** Support P3/P4/P5 as they push edge functions. Debug any auth/CORS issues.
- **Day 2 PM:** Add `public_id` share flow — RPC or trigger that generates a nanoid on demand.
- **Day 3 AM:** Backup + monitor. Watch for RLS bugs during testing.
- **Day 3 PM:** On call for last-minute infra issues.

### Contract to team
Shared on day 1 in team chat:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ... (P3/P4/P5 only)
```

---

## PARCEL 3 — SCRAPING SERVICE (Person 3)

**Owns the Firecrawl edge function. The mouth of the pipeline.**

### Scope
- Supabase edge function `scrape`
- Calls Firecrawl `/scrape` endpoint
- Cleans/truncates markdown to ~12k characters
- Writes to `scans` table (user_id from auth header, url, title, raw_content)
- Returns `scan_id`
- Handles Firecrawl errors gracefully (paywalls, timeouts, blocked sites)

### Deliverables
- Deployed edge function: `POST /functions/v1/scrape`
- Handles the 5 curated demo URLs without error
- Friendly error object when scrape fails

### API Contract
```
POST /functions/v1/scrape
Headers: Authorization: Bearer <user_jwt>
Body: { "url": "https://stripe.com" }

200 OK
{ "scan_id": "uuid", "title": "Stripe" }

4xx / 5xx
{ "error": "This site blocks scrapers. Try another URL." }
```

### Day-by-day
- **Day 1 PM:** Sign up for Firecrawl, get API key, hand to P2.
- **Day 2 AM:** Write the edge function. Test with `curl` against 5 URLs.
- **Day 2 PM:** Handoff to P1 with the URL + contract above. Fix any bugs P1 finds.
- **Day 3 AM:** Robustness — handle timeouts, JS-heavy sites, 404s.
- **Day 3 PM:** On call for demo bugs.

---

## PARCEL 4 — AI DOSSIER (Person 4)

**Owns the "wow" moment. This is what judges see first.**

### Scope
- Supabase edge function `analyze`
- Reads `scans.raw_content` by `scan_id`
- Calls OpenAI `gpt-5-nano` with the prompt in `PLAN.md` §3.2 + JSON schema
- Uses Responses API with `reasoning: { effort: "minimal" }` for speed
- Stores result in `scans.dossier_json`
- Returns the parsed dossier
- **Prompt-tunes the output** — this is the creative bar. The dossier must feel specific, not generic.

### Deliverables
- Deployed edge function: `POST /functions/v1/analyze`
- A dossier that reads like a good analyst wrote it, not ChatGPT boilerplate
- JSON always parses (schema-enforced)

### API Contract
```
POST /functions/v1/analyze
Headers: Authorization: Bearer <user_jwt>
Body: { "scan_id": "uuid" }

200 OK
{
  "dossier": {
    "summary": "...",
    "products": [...],
    "target_audience": "...",
    "pricing_hint": "...",
    "tone": "...",
    "key_pages": [...],
    "notable_claims": [...]
  }
}
```

### Day-by-day
- **Day 1 PM:** OpenAI account + $10 credit. Test the prompt in the Playground on 3 real sites.
- **Day 2 AM:** Wire the edge function. Enforce JSON schema so it never breaks P1's UI.
- **Day 2 PM:** Iterate the prompt. Compare output on 5 sites — kill generic phrases like "innovative solutions."
- **Day 3 AM:** Add fallback if JSON parse fails (retry once with a stricter system message).
- **Day 3 PM:** Cache dossier for the 2 demo URLs so demo never hits a cold API.

---

## PARCEL 5 — AI CHAT + CITATIONS (Person 5)

**Owns wow moment #2. The magic that separates us from Perplexity.**

### Scope
- Supabase edge function `chat`
- Takes a `scan_id` + user question
- Sends `raw_content` + question to OpenAI `gpt-5-nano` with prompt in `PLAN.md` §3.3
- Ensures every answer ends with a source citation `[see: {url}]`
- Writes user + assistant messages to `chat_messages` table
- Streams the response if there's time; otherwise returns the full string
- **This is the second demo wow.** Answers must be tight and cited.

### Deliverables
- Deployed edge function: `POST /functions/v1/chat`
- Answers ground themselves in the scraped content — no hallucinations
- Every answer has a visible source link

### API Contract
```
POST /functions/v1/chat
Headers: Authorization: Bearer <user_jwt>
Body: { "scan_id": "uuid", "question": "What's their refund policy?" }

200 OK
{
  "answer": "Stripe offers refunds within 30 days for standard accounts. [see: https://stripe.com/refunds]",
  "message_id": "uuid"
}
```

### Day-by-day
- **Day 1 PM:** Read `PLAN.md` §3.3. Draft the system prompt.
- **Day 2 PM:** Wire the edge function. Hardcode a demo `scan_id` + question and test.
- **Day 3 AM:** Handoff to P1 for chat panel wiring. Iterate on prompt so answers stay short and cited.
- **Day 3 PM:** Add "The site doesn't mention this." as the graceful unknown answer.

---

## PARCEL 6 — PRODUCT, DEMO, PITCH, SUBMISSION (Person 6)

**Owns everything the judges see outside the product itself.** Do not underestimate this — presentation is 25% of the score.

### Scope
- Own the **problem statement + positioning** (they may push back on `PLAN.md` §0 — good)
- Own **competitor research** (`PLAN.md` §1.4) — screenshots + notes
- Own **pitch deck** using the AIAP template
- Own **Loom recording** (2-3 min, script in `PLAN.md` §Demo)
- Own **submission** through the AI Accelerator Hackathon Portal
- Curate the **5 clean demo URLs** — test each against P3's scraper
- Coordinate + unblock: run a 15-min standup twice a day

### Deliverables
- Filled AIAP pitch deck (PDF + link)
- Loom video uploaded and unlisted (share link ready)
- Portal submission confirmed
- List of 5 tested demo URLs (2 for the Loom, 3 as backup)
- Standup notes each day so nobody duplicates work

### Day-by-day
- **Day 1 AM:** Competitor screenshots + feature analysis. Refine positioning if needed.
- **Day 1 PM:** Start filling pitch deck. Draft demo script.
- **Day 2 AM:** Test the 5 demo URLs against P3's endpoint. Kill any that break.
- **Day 2 PM:** Deck v1 done. Rehearse demo script.
- **Day 3 AM:** Watch P1's UI polish. Update deck screenshots.
- **Day 3 PM:** Record Loom on the deployed URL. Submit through portal. Confirm submission.

---

## DAILY HANDOFF PROTOCOL

**Twice-daily 10-min standup** (P6 runs it). Each person answers three questions:
1. What did I ship since last standup?
2. What am I blocked on?
3. Who needs something from me today?

### The critical path (do NOT let these slip)

| By end of… | This must exist |
|---|---|
| **Day 1 lunch** | Positioning frozen, Supabase creds shared, API keys distributed |
| **Day 1 EOD** | Bolt scaffold up, schema deployed, all 3 devs have "hello world" edge functions running |
| **Day 2 lunch** | `scrape` + `analyze` return real data. P1 can render a dossier from real URL. |
| **Day 2 EOD** | Full flow works ugly end-to-end. Chat wired. |
| **Day 3 lunch** | UI polished. Demo URLs cached. Deck v1 done. |
| **Day 3 EOD** | Deployed URL live, Loom recorded, submission confirmed. |

---

## DEPENDENCY MAP

```
P2 (infra) ─────┬──> P1 (frontend)
                ├──> P3 (scrape)
                ├──> P4 (analyze)
                └──> P5 (chat)

P3 (scrape) ────┬──> P1 (URL input flow)
                └──> P4 (needs raw_content)

P4 (analyze) ───> P1 (dossier UI)

P5 (chat) ──────> P1 (chat panel)

P6 (product) ──> uses P1's deployed URL for deck + Loom
```

**Nobody but P2 blocks everyone.** So P2 must finish setup by Day 1 lunch or the whole team slows down.

---

## COMMUNICATION RULES

- **One shared channel** (Discord/WhatsApp/Slack) for the whole team
- **One shared repo** (GitHub, per playbook §G1) — P1 or P6 is code owner
- **API keys go in a locked doc**, never in chat
- **When you deploy an edge function, post the URL + a curl example**
- **When you break something, say it immediately** — no one gets angry, we just re-plan

---

## IF YOU'RE DOWN A PERSON

Fewer than 6? Collapse in this order:
- **Merge P4 + P5** (both are OpenAI edge functions — same skill set) → 5 people
- **Merge P2 into P6** (infra is mostly Day 1 → then free for product) → 4 people
- **P1 (you) picks up P3** if you're comfortable with the Firecrawl call → 3 people

Do NOT merge P6 into anything unless absolutely required. Losing pitch/demo ownership loses you 25% of the score.
