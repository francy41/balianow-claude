-- Retos de baile (challenges + votos + ranking). Aplicar en el SQL Editor.

create table if not exists public.retos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,
  title text not null,
  description text,
  style text,
  cover_url text,
  starts date,
  ends date,
  created_at timestamptz not null default now()
);

create table if not exists public.reto_entries (
  id uuid primary key default gen_random_uuid(),
  reto_id uuid not null references public.retos(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  user_avatar text,
  video_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  unique (reto_id, user_id)
);

create table if not exists public.reto_votes (
  entry_id uuid not null references public.reto_entries(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

alter table public.retos enable row level security;
alter table public.reto_entries enable row level security;
alter table public.reto_votes enable row level security;

drop policy if exists retos_read on public.retos;
create policy retos_read on public.retos for select using (true);
drop policy if exists retos_write on public.retos;
create policy retos_write on public.retos for all using (public.is_admin() or auth.uid()=creator_id) with check (public.is_admin() or auth.uid()=creator_id);

drop policy if exists reto_entries_read on public.reto_entries;
create policy reto_entries_read on public.reto_entries for select using (true);
drop policy if exists reto_entries_own on public.reto_entries;
create policy reto_entries_own on public.reto_entries for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id);

drop policy if exists reto_votes_read on public.reto_votes;
create policy reto_votes_read on public.reto_votes for select using (true);
drop policy if exists reto_votes_own on public.reto_votes;
create policy reto_votes_own on public.reto_votes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
