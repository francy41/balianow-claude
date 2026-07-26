-- BailaNow · Migración única de módulos nuevos.
-- Crea TODAS las tablas de: Ruta de Hoy, Pareja de baile, Retos de baile y BailaNow TV.
-- Seguro de re-ejecutar (idempotente). Aplicar en el SQL Editor de Supabase.

-- ══════════════════════════════════════════════════════════════════
-- 1) RUTA DE HOY
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.rutas (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  creator_name text,
  title text not null,
  city text not null,
  description text,
  date date,
  time text,
  stops jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.ruta_members (
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  created_at timestamptz not null default now(),
  primary key (ruta_id, user_id)
);

create table if not exists public.ruta_comments (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.rutas enable row level security;
alter table public.ruta_members enable row level security;
alter table public.ruta_comments enable row level security;

drop policy if exists rutas_read on public.rutas;
create policy rutas_read on public.rutas for select using (true);
drop policy if exists rutas_write on public.rutas;
create policy rutas_write on public.rutas for all
  using (auth.uid() = creator_id or public.is_admin())
  with check (auth.uid() = creator_id or public.is_admin());

drop policy if exists ruta_members_read on public.ruta_members;
create policy ruta_members_read on public.ruta_members for select using (true);
drop policy if exists ruta_members_own on public.ruta_members;
create policy ruta_members_own on public.ruta_members for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ruta_comments_read on public.ruta_comments;
create policy ruta_comments_read on public.ruta_comments for select using (true);
drop policy if exists ruta_comments_insert on public.ruta_comments;
create policy ruta_comments_insert on public.ruta_comments for insert with check (auth.uid() = user_id);
drop policy if exists ruta_comments_delete on public.ruta_comments;
create policy ruta_comments_delete on public.ruta_comments for delete using (auth.uid() = user_id or public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 2) PAREJA DE BAILE (match)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_profiles (
  user_id uuid primary key,
  name text,
  avatar text,
  city text,
  level text,
  styles text[] not null default '{}',
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_likes (
  from_user uuid not null,
  to_user uuid not null,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);

create index if not exists partner_profiles_city_idx on public.partner_profiles (city);

alter table public.partner_profiles enable row level security;
alter table public.partner_likes enable row level security;

drop policy if exists partner_profiles_read on public.partner_profiles;
create policy partner_profiles_read on public.partner_profiles
  for select using (active or auth.uid() = user_id or public.is_admin());
drop policy if exists partner_profiles_own on public.partner_profiles;
create policy partner_profiles_own on public.partner_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists partner_likes_read on public.partner_likes;
create policy partner_likes_read on public.partner_likes
  for select using (auth.uid() = from_user or auth.uid() = to_user);
drop policy if exists partner_likes_insert on public.partner_likes;
create policy partner_likes_insert on public.partner_likes
  for insert with check (auth.uid() = from_user);
drop policy if exists partner_likes_delete on public.partner_likes;
create policy partner_likes_delete on public.partner_likes
  for delete using (auth.uid() = from_user);

-- ══════════════════════════════════════════════════════════════════
-- 3) RETOS DE BAILE
-- ══════════════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════════════
-- 4) BAILANOW TV
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.tv_titles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,
  type text not null default 'clase',
  title text not null,
  slug text unique,
  description text,
  style text,
  level text,
  cover_url text,
  access text not null default 'basico',
  status text not null default 'draft',
  featured boolean not null default false,
  rating numeric(3,2) default 0,
  views int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tv_lessons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.tv_titles(id) on delete cascade,
  position int not null default 1,
  name text not null,
  video_url text,
  duration_seconds int default 0,
  access text not null default 'basico',
  created_at timestamptz not null default now()
);

create table if not exists public.tv_progress (
  user_id uuid not null,
  lesson_id uuid not null references public.tv_lessons(id) on delete cascade,
  position_seconds int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.tv_favorites (
  user_id uuid not null,
  title_id uuid not null references public.tv_titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create index if not exists tv_titles_style_idx on public.tv_titles (style);
create index if not exists tv_titles_status_idx on public.tv_titles (status);
create index if not exists tv_lessons_title_idx on public.tv_lessons (title_id, position);

alter table public.tv_titles enable row level security;
alter table public.tv_lessons enable row level security;
alter table public.tv_progress enable row level security;
alter table public.tv_favorites enable row level security;

drop policy if exists tv_titles_read on public.tv_titles;
create policy tv_titles_read on public.tv_titles
  for select using (status = 'published' or public.is_admin() or auth.uid() = creator_id);
drop policy if exists tv_titles_write on public.tv_titles;
create policy tv_titles_write on public.tv_titles
  for all using (public.is_admin() or auth.uid() = creator_id)
  with check (public.is_admin() or auth.uid() = creator_id);

drop policy if exists tv_lessons_read on public.tv_lessons;
create policy tv_lessons_read on public.tv_lessons
  for select using (
    exists (select 1 from public.tv_titles t
            where t.id = title_id and (t.status = 'published' or public.is_admin() or t.creator_id = auth.uid()))
  );
drop policy if exists tv_lessons_write on public.tv_lessons;
create policy tv_lessons_write on public.tv_lessons
  for all using (
    public.is_admin() or exists (select 1 from public.tv_titles t where t.id = title_id and t.creator_id = auth.uid())
  ) with check (
    public.is_admin() or exists (select 1 from public.tv_titles t where t.id = title_id and t.creator_id = auth.uid())
  );

drop policy if exists tv_progress_own on public.tv_progress;
create policy tv_progress_own on public.tv_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists tv_favorites_own on public.tv_favorites;
create policy tv_favorites_own on public.tv_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
