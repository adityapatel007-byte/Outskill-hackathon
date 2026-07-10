-- SiteSense database schema
-- Run this in the Supabase SQL editor, or via:
--   supabase db push
--
-- Mirrors ui/src/types.ts:
--   Dossier      -> stored as jsonb on scans.dossier
--   Scan         -> scans table
--   ChatMessage  -> chat_messages table

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- scans
-- ---------------------------------------------------------------------------
create table if not exists public.scans (
  id          text primary key default ('scan_' || replace(gen_random_uuid()::text, '-', '')),
  user_id     uuid references auth.users (id) on delete cascade not null,
  url         text not null,
  title       text not null,
  dossier     jsonb not null,          -- Dossier shape (summary, products, target_audience, ...)
  public_id   text unique,             -- set by toggle_share(); null = not shared
  created_at  timestamptz not null default now()
);

create index if not exists scans_user_id_idx on public.scans (user_id);
create index if not exists scans_created_at_idx on public.scans (created_at desc);
create index if not exists scans_public_id_idx on public.scans (public_id) where public_id is not null;

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id          text primary key default ('m_' || replace(gen_random_uuid()::text, '-', '')),
  scan_id     text not null references public.scans (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  citation    jsonb,                   -- KeyPage shape: { label, url }, nullable
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_scan_id_idx on public.chat_messages (scan_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.scans enable row level security;
alter table public.chat_messages enable row level security;

-- Owners can do everything with their own scans.
create policy "scans: owner select" on public.scans
  for select using (auth.uid() = user_id);

create policy "scans: owner insert" on public.scans
  for insert with check (auth.uid() = user_id);

create policy "scans: owner update" on public.scans
  for update using (auth.uid() = user_id);

create policy "scans: owner delete" on public.scans
  for delete using (auth.uid() = user_id);

-- Anyone (including anon) can read a scan once it has been shared publicly.
create policy "scans: public read shared" on public.scans
  for select using (public_id is not null);

-- Chat messages follow the parent scan's ownership.
create policy "chat_messages: owner select" on public.chat_messages
  for select using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );

create policy "chat_messages: owner insert" on public.chat_messages
  for insert with check (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );

create policy "chat_messages: owner delete" on public.chat_messages
  for delete using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid())
  );

-- Public read of chat messages for shared scans (Share.tsx is read-only anyway,
-- but this keeps the option open if it ever needs the transcript too).
create policy "chat_messages: public read shared" on public.chat_messages
  for select using (
    exists (select 1 from public.scans s where s.id = scan_id and s.public_id is not null)
  );

-- ---------------------------------------------------------------------------
-- toggle_share RPC — flips a scan's public_id on/off, called from the client.
-- ---------------------------------------------------------------------------
create or replace function public.toggle_share(scan_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_public_id text;
  new_public_id text;
begin
  select public_id into current_public_id
  from public.scans
  where id = scan_id and user_id = auth.uid();

  if not found then
    raise exception 'Scan not found or not owned by caller';
  end if;

  if current_public_id is not null then
    return current_public_id;
  end if;

  new_public_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  update public.scans
  set public_id = new_public_id
  where id = scan_id;

  return new_public_id;
end;
$$;

grant execute on function public.toggle_share(text) to authenticated;
