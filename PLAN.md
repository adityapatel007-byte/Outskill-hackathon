# SiteSense — 3-Day Hackathon Build Plan

**Stack:** Bolt.new (frontend) · Supabase (backend/DB/Auth) · Firecrawl (scraping) · OpenAI (AI layer)
**Team:** ASP
**Timeline:** 3 days
**Judged on:** Problem understanding · Functionality · Creativity · Presentation (UI / Aesthetics / Storytelling)

---

## 0. THE POSITIONING (read this first)

A raw "website scraper" is a commodity — judges will yawn. We are not shipping a scraper. We are shipping an **AI research analyst that reads any website for you and answers questions in seconds.**

**Product name (working):** SiteSense
**Tagline:** *Paste a URL. Ask anything. Get answers with sources.*
**One-liner (X-Y-Z):**
For **founders, marketers, and sales reps** who need to understand a company fast, I am building **SiteSense** so they can **paste any website URL and get an instant AI-generated dossier + chat with the site's content**.

**Why this positioning wins:**
- **Understanding of the Problem** ✓ — everyone has wasted 30 min crawling a competitor site to pull one fact.
- **Functionality** ✓ — scraping + AI summarization + Q&A is a clean end-to-end flow.
- **Creativity** ✓ — "chat with a website" is a wow moment, not just a data dump.
- **Presentation** ✓ — one URL input → beautiful dossier → conversational panel is easy to demo in 90 seconds.

---

## PHASE 1 — IDEATION

### 1.1 Product basics
- **Primary user:** B2B salespeople, founders doing competitor research, marketers researching briefs
- **Context:** Chrome tab open, 10 minutes before a call, needs the gist of a company's website
- **Top 3 pains today:**
  1. Reading a whole site (home, pricing, blog, about) takes 20-40 minutes
  2. Screenshots + copy-paste into ChatGPT loses structure and links
  3. Existing tools (Firecrawl, Diffbot) dump JSON, not insights

### 1.2 MVP success (end of Day 3)
- A user pastes a URL → hits Scan → in under 60 seconds sees a structured dossier (What the company does, Products, Pricing, Target audience, Tone) **and** can ask follow-up questions in a chat panel that answers with citations back to the source page.
- **Demo success metric:** run the flow live on two unseen URLs without a break.

### 1.3 Final Problem Statement (use this in every prompt, PRD line, demo intro)
> *Knowledge workers waste 20-40 minutes per company understanding what a website actually says. Existing scrapers return raw data, not answers. SiteSense turns any URL into an instant, chattable dossier with cited sources.*

### 1.4 Competitor scan (do this Day 1 morning)
Take screenshots + note 2 pros / 2 pains for each:

| Product | Check these pages | Do well | Frustrates users |
|---|---|---|---|
| **Firecrawl.dev** | Home, pricing, playground | Clean API, fast | Devs-only, raw markdown output |
| **Diffbot** | Home, features | Deep extraction | Enterprise pricing, complex UI |
| **Perplexity Pages** | Any generated page | Beautiful summaries, cited | Not URL-first, general web |

⭐ **Our differentiator:** Consumer-friendly UI + Q&A chat over one URL + shareable dossier.

### 1.5 MoSCoW scope

| Feature | M / S / C / W | Diff? | Why |
|---|---|---|---|
| URL input + scrape (Firecrawl) | **M** | – | Core |
| AI-generated dossier (summary, products, audience, tone) | **M** | ⭐ | The wow |
| Save scans to user account (Supabase) | **M** | – | Repeat use |
| Chat-with-site Q&A with source citations | **M** | ⭐ | The wow #2 |
| Auth (email magic link) | **M** | – | Needed for save |
| History dashboard | **S** | – | Second flow |
| Share dossier via public link | **S** | ⭐ | Viral loop for demo |
| Export dossier as PDF/Markdown | **C** | – | Nice-to-have |
| Compare two URLs side by side | **W** | – | Parked |
| Scheduled re-scans / change tracking | **W** | – | Parked |

### 1.6 Locked scope
- **Must-have flow (ship it or die):** Sign in → paste URL → scrape → AI dossier + chat → save to history
- **Should-haves:** History dashboard, public share link
- **Parked deliberately:** compare mode, change tracking, PDF export

---

## PHASE 2 — BUILDING

### 2.1 Architecture

**Frontend (Bolt.new — React + Tailwind):**
- `/` Landing (hero + URL input as CTA)
- `/auth` Magic-link sign-in (Supabase)
- `/app` URL input + recent scans sidebar
- `/scan/:id` Dossier view (structured cards + chat panel on right)
- `/share/:publicId` Read-only shareable dossier

**Backend (Supabase Edge Functions):**
- `POST /scrape` → calls Firecrawl `/scrape` → stores raw markdown in `scans.raw_content`
- `POST /analyze` → sends raw content to OpenAI `gpt-5-nano` with structured JSON prompt → stores in `scans.dossier_json`
- `POST /chat` → RAG-style: sends user question + `raw_content` chunk to OpenAI → returns answer + source anchor

**Data store (Supabase Postgres):**
```
users             (id, email, created_at)
scans             (id, user_id, url, title, raw_content, dossier_json,
                   public_id nullable, created_at)
chat_messages     (id, scan_id, role [user/assistant], content, created_at)
```

**External APIs:**
- Firecrawl API (scraping) — https://firecrawl.dev
- OpenAI API (`gpt-5-nano` for cost/speed, `text-embedding-3-small` if we do RAG)
- Supabase (auth + DB + edge functions)

### 2.2 Screens & actions

| Screen | User | Key actions | Data shown |
|---|---|---|---|
| Landing | Anyone | Click "Try free" | Hero, sample dossier preview |
| Auth | Anon | Enter email → magic link | – |
| App home | Logged in | Paste URL, click Scan | Recent scans list |
| Scan detail | Logged in | View dossier, ask questions, copy share link | Dossier cards + chat |
| Share page | Anyone with link | Read dossier | Read-only dossier |

### 2.3 The Bolt Starting Prompt (copy-paste on Day 1 evening)

```
Build a web app called SiteSense using React + Tailwind + Supabase.

PRODUCT
SiteSense turns any website URL into an AI-generated dossier plus a chat panel to ask questions about that site. Target users: B2B salespeople, founders, marketers doing quick company research.

STACK
- Frontend: React (Vite), Tailwind, shadcn/ui, framer-motion for micro-interactions
- Backend: Supabase (Auth via magic link, Postgres, Edge Functions)
- Scraping: Firecrawl API (I will provide FIRECRAWL_API_KEY)
- AI: OpenAI gpt-5-nano (I will provide OPENAI_API_KEY)

SCREENS
1. Landing (/) — dark hero, big URL input as primary CTA, one animated sample dossier below
2. Auth (/auth) — magic link email input
3. App (/app) — logged-in view: URL input at top, "Recent scans" list below
4. Scan detail (/scan/:id) — two columns: left = dossier cards (Summary, What they do, Products/Services, Target audience, Tone/voice, Key links); right = chat panel where user asks questions about the site, answers cite the source URL
5. Public share (/share/:publicId) — read-only dossier, no chat, "Powered by SiteSense" footer

DATA MODEL (Supabase)
- users (id, email, created_at)
- scans (id, user_id, url, title, raw_content text, dossier_json jsonb, public_id text nullable, created_at)
- chat_messages (id, scan_id, role, content, created_at)

CORE FLOW
User pastes URL on /app → POST to edge function `scrape` → Firecrawl returns markdown → save to scans.raw_content → POST to edge function `analyze` → OpenAI returns structured JSON dossier → save to scans.dossier_json → redirect to /scan/:id. On that page, user can type questions in the chat panel → POST to edge function `chat` with question + raw_content → OpenAI answers with a citation link back to the URL.

DESIGN
- Dark mode default (bg #0a0a0a, accent lime #b4ff39 matching the eval slide vibe)
- Serif display font for headings (Instrument Serif or similar), Inter for body
- Cards with subtle borders, generous whitespace
- Loading state: animated shimmer + "Reading the site..." → "Understanding what they do..." → "Building your dossier..." — feels magical, not slow
- Smooth page transitions with framer-motion

MUST-HAVE FLOW
Signed-in user pastes URL → sees dossier + chat within 60s.

Start by scaffolding all screens with mocked data, then wire Supabase auth, then the edge functions.
```

### 2.4 Day 1 & Day 2 outcomes
**Day 1 (End of):** Positioning locked · problem statement final · competitor screenshots taken · PRD + starting prompt ready · Bolt project created · Supabase project provisioned with schema.
**Day 2 (End of):** Full must-have flow works end-to-end at least once (even rough). Auth works. Firecrawl → dossier → chat all wired.

---

## PHASE 3 — BACKEND, POLISH, DEMO

### 3.1 Supabase schema (paste into SQL editor)
```sql
create table scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  title text,
  raw_content text,
  dossier_json jsonb,
  public_id text unique,
  created_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id) on delete cascade,
  role text check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- RLS
alter table scans enable row level security;
alter table chat_messages enable row level security;

create policy "own scans" on scans for all using (auth.uid() = user_id);
create policy "public read" on scans for select using (public_id is not null);
create policy "own messages" on chat_messages for all
  using (exists (select 1 from scans where scans.id = chat_messages.scan_id and scans.user_id = auth.uid()));
```

### 3.2 The dossier prompt (OpenAI)
```
You are a business research analyst. Given the markdown content of a website below, produce a JSON dossier with these keys:
{
  "summary": "2-3 sentence plain-English summary of what this company does",
  "products": ["list", "of", "products or services"],
  "target_audience": "who this is built for",
  "pricing_hint": "free / freemium / paid / enterprise / unknown",
  "tone": "one word describing their voice (e.g. playful, technical, luxury)",
  "key_pages": [{"label": "Pricing", "url": "..."}],
  "notable_claims": ["3 specific claims or numbers from the site"]
}
Only use facts present in the content. If unknown, say "unknown".

WEBSITE MARKDOWN:
<<<content>>>
```

### 3.3 The chat prompt (OpenAI)
```
You are answering questions about the website at {url}. Use ONLY the content below. If the answer is not there, say "The site doesn't mention this." End every answer with a source: [see: {url}].

WEBSITE CONTENT:
<<<raw_content>>>

USER QUESTION:
<<<question>>>
```

### 3.4 Automations table

| Trigger | Service | What happens |
|---|---|---|
| User submits URL | Supabase edge function | Firecrawl scrape → store raw_content |
| Scrape complete | Supabase edge function | OpenAI analyze → store dossier_json → redirect |
| User asks question | Supabase edge function | OpenAI chat → append to chat_messages |
| User clicks "Share" | Supabase RPC | Generate `public_id` (nanoid) → return URL |

### 3.5 The "wow" AI feature (pick one to spotlight in demo)
**Chat-with-site with cited sources** — after the dossier loads, ask *"What's their refund policy?"* live on stage. The answer appears with a `[see: /refund-policy]` link. This is the moment judges remember.

### 3.6 CRUD checklist

| Entity | C | R | U | D | Notes |
|---|---|---|---|---|---|
| scans | ✓ (create on scrape) | ✓ (history + detail) | ✓ (toggle public) | ✓ (from history) | – |
| chat_messages | ✓ (on send) | ✓ (in panel) | – | ✓ (clear chat button) | – |

### 3.7 Test script (run twice Day 3 morning)
> A logged-in salesperson wants to prep for a call with Stripe.
> Screens: `/app` → paste `https://stripe.com` → wait for dossier → ask "what's their main product for startups?" → click Share → open share link in incognito.

Log bugs, fix with targeted Bolt prompts, re-run.

### 3.8 Stability checklist
- [ ] Full flow runs end-to-end twice with no manual intervention
- [ ] No dead buttons
- [ ] Loading states are graceful (Firecrawl can take 15-30s)
- [ ] Errors show a friendly message (e.g. "This site blocks scrapers — try another")
- [ ] Share link works logged-out in a private window

---

## THE DEMO (3-5 min Loom)

### Script
1. **Hook (15s):** "Every time I hop on a sales call, I burn 30 minutes reading the prospect's website. So we built SiteSense."
2. **Problem (20s):** Show a browser with 8 tabs open on a company site. "This is the problem. Existing scrapers return raw JSON, not answers."
3. **Live walk (90s):**
   - Paste a URL judges won't have seen (e.g. `notion.so`).
   - Watch the loading states ("Reading the site... Understanding... Building dossier...").
   - Dossier appears — narrate the summary + products cards.
   - Type in the chat: *"What's their pricing for teams?"* — answer appears with citation.
   - Click Share, open the link in an incognito tab.
4. **Second URL (30s):** Do it again with a totally different site to prove it's not scripted.
5. **What's next (15s):** "Next: compare two competitors side-by-side, and scheduled re-scans that email you when a company changes their pricing page."

### Demo checklist
- [ ] Two clean test URLs ready
- [ ] Local dev + deployed URL both work
- [ ] Chat panel has 2-3 good sample questions cached
- [ ] Public share link tested logged-out
- [ ] Screen is clean (no other tabs), laptop plugged in

---

## DAY-BY-DAY SCHEDULE

### Day 1 — Ideation + Setup (target: 6-8 hrs)
- **Morning:** Read this plan → freeze positioning → do competitor screenshots (Firecrawl / Diffbot / Perplexity)
- **Midday:** Create Supabase project, get URL + anon key. Create Firecrawl account, get API key. Create OpenAI account, add $10 credit.
- **Afternoon:** Create Bolt project. Paste the starting prompt (§2.3). Let it scaffold.
- **Evening:** Wire Supabase auth. Verify magic link login works.

### Day 2 — Build the flow (target: 8-10 hrs)
- **Morning:** Supabase schema (§3.1). Test insert manually.
- **Midday:** Edge function `scrape` — Firecrawl call. Test with `curl`.
- **Afternoon:** Edge function `analyze` — OpenAI dossier call with the prompt in §3.2. Verify JSON parses.
- **Evening:** Edge function `chat`. Wire chat panel UI. Full flow should now work end-to-end (ugly is fine).

### Day 3 — Polish + Demo (target: 6-8 hrs)
- **Morning:** Fix bugs from test script (§3.7). Loading states. Error states.
- **Midday:** Public share links (should-have). History dashboard polish.
- **Afternoon:** UI polish — spacing, typography, animations. Match the dark/lime vibe from the eval slide.
- **Evening:** Record 3-min Loom (§Demo Script). Fill pitch deck. Submit through the AI Accelerator Hackathon Portal.

---

## SUBMISSION CHECKLIST (from playbook)

- [ ] Live product link (deploy via Bolt → Netlify)
- [ ] 2-3 min Loom walkthrough
- [ ] Pitch deck using the AIAP template
- [ ] Team details
- [ ] Submit via the Project Submission Portal (WhatsApp/email don't count)

---

## RISKS + MITIGATIONS

| Risk | Mitigation |
|---|---|
| Firecrawl fails on some sites (paywalls, JS-heavy) | Curate 5 known-good demo URLs. Show friendly error UI. |
| OpenAI cost blowup during testing | Use `gpt-5-nano`. Truncate raw_content to ~8k tokens. |
| Auth flow breaks last minute | Have a pre-seeded demo account with sample scans as backup |
| Bolt regenerates and breaks something | Commit to GitHub at end of each day (playbook §G1) |
| Dossier is bland / generic | Prompt-engineer the JSON structure to force specific claims |

---

## NEXT STEPS (do this now)

1. Confirm the SiteSense positioning (or push back if you want a different angle).
2. Sign up for: Bolt.new, Supabase, Firecrawl, OpenAI.
3. Grab the 3 API keys and stash them somewhere safe.
4. Day 1 kicks off with the starting prompt in §2.3.

Ping me when you're ready to move — I can help you draft the pitch deck, write the Firecrawl edge function code, or refine the dossier prompt.
