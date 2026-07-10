-- ============================================================
-- SiteSense — Supabase schema
-- Run this in Supabase SQL Editor (or via `supabase db push`).
-- Requires: pgcrypto (for gen_random_uuid) — enabled by default on Supabase.
-- ============================================================

-- ------------------------------------------------------------
-- 1. scans — one row per "paste a URL" run
-- ------------------------------------------------------------
create table if not exists public.scans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  url           text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'scraping', 'analyzing', 'ready', 'error')),
  error_message text,

  -- The structured dossier produced by /analyze.
  -- Kept as JSONB so this migration doesn't need to change if you tweak fields;
  -- shape it to match ui/src/types.ts exactly, e.g.:
  -- {
  --   "summary": "...",
  --   "what_they_do": "...",
  --   "products": ["..."],
  --   "audience": "...",
  --   "pricing": "...",
  --   "tone": "...",
  --   "notable_claims": ["..."]
  -- }
  dossier       jsonb,

  is_public     boolean not null default false,
  public_id     uuid unique,               -- set by toggle_share() below

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists scans_user_id_idx on public.scans (user_id);
create index if not exists scans_public_id_idx on public.scans (public_id);

-- ------------------------------------------------------------
-- 2. scraped_pages — raw/cleaned content per crawled page,
--    this is what chat citations point back to.
-- ------------------------------------------------------------
create table if not exists public.scraped_pages (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references public.scans(id) on delete cascade,
  url         text not null,
  title       text,
  page_label  text,        -- e.g. "Home", "Pricing", "About" — shown in [ see: Pricing ]
  content     text,        -- cleaned/extracted text used for RAG + citations
  created_at  timestamptz not null default now()
);

create index if not exists scraped_pages_scan_id_idx on public.scraped_pages (scan_id);

-- ------------------------------------------------------------
-- 3. chat_messages — the "chat with the site" thread per scan
-- ------------------------------------------------------------
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references public.scans(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,

  -- citation back to the source page, e.g.:
  -- { "page_id": "...", "url": "...", "label": "Pricing", "snippet": "..." }
  citation    jsonb,

  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_scan_id_idx on public.chat_messages (scan_id);

-- ------------------------------------------------------------
-- 4. updated_at trigger for scans
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists scans_set_updated_at on public.scans;
create trigger scans_set_updated_at
  before update on public.scans
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5. Row Level Security
-- ------------------------------------------------------------
alter table public.scans          enable row level security;
alter table public.scraped_pages  enable row level security;
alter table public.chat_messages  enable row level security;

-- scans: owners can do everything; anyone (incl. anon) can read a public scan
create policy "scans_select_own_or_public"
  on public.scans for select
  using (auth.uid() = user_id or is_public = true);

create policy "scans_insert_own"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "scans_update_own"
  on public.scans for update
  using (auth.uid() = user_id);

create policy "scans_delete_own"
  on public.scans for delete
  using (auth.uid() = user_id);

-- scraped_pages: readable if you own the parent scan, or the parent scan is public
create policy "pages_select_owned_or_public"
  on public.scraped_pages for select
  using (
    exists (
      select 1 from public.scans s
      where s.id = scan_id
        and (s.user_id = auth.uid() or s.is_public = true)
    )
  );

create policy "pages_insert_owned"
  on public.scraped_pages for insert
  with check (
    exists (
      select 1 from public.scans s
      where s.id = scan_id and s.user_id = auth.uid()
    )
  );

-- chat_messages: readable if you own the parent scan, or it's public (read-only share view);
-- only the owner can insert new messages (chatting counts against the owner's session)
create policy "messages_select_owned_or_public"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.scans s
      where s.id = scan_id
        and (s.user_id = auth.uid() or s.is_public = true)
    )
  );

create policy "messages_insert_owned"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.scans s
      where s.id = scan_id and s.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 6. toggle_share RPC — matches README contract:
--    "toggleShare(scanId) → RPC that sets public_id"
-- ------------------------------------------------------------
create or replace function public.toggle_share(p_scan_id uuid)
returns table (is_public boolean, public_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_is_public boolean;
  v_public_id uuid;
begin
  select user_id, s.is_public, s.public_id
    into v_owner, v_is_public, v_public_id
    from public.scans s
    where s.id = p_scan_id;

  if v_owner is null then
    raise exception 'Scan not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Not authorized to share this scan';
  end if;

  if v_is_public then
    -- turn sharing off, keep public_id around in case they re-enable
    update public.scans set is_public = false where id = p_scan_id;
    return query select false, v_public_id;
  else
    if v_public_id is null then
      v_public_id := gen_random_uuid();
    end if;
    update public.scans
      set is_public = true, public_id = v_public_id
      where id = p_scan_id;
    return query select true, v_public_id;
  end if;
end;
$$;

grant execute on function public.toggle_share(uuid) to authenticated;
