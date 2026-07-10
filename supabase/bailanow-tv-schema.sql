-- BailaNow TV — Catálogo y consumo (MVP Fase 1)
-- Aplicar vía SQL Editor del panel de Supabase (o Management API).

create table if not exists public.tv_titles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,                        -- profiles.id del creador (nullable en semilla)
  type text not null default 'clase',     -- clase | curso | programa | masterclass
  title text not null,
  slug text unique,
  description text,
  style text,                             -- salsa | bachata | merengue | kizomba | ...
  level text,                             -- principiante | intermedio | avanzado | profesional
  cover_url text,
  access text not null default 'basico',  -- free | basico | premium
  status text not null default 'draft',   -- draft | review | published
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
  video_url text,                         -- HLS/mp4 (o Mux playback id en el futuro)
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

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.tv_titles enable row level security;
alter table public.tv_lessons enable row level security;
alter table public.tv_progress enable row level security;
alter table public.tv_favorites enable row level security;

-- Catálogo publicado: lectura pública; creador/admin gestionan lo suyo.
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

-- Progreso y favoritos: cada usuario solo el suyo.
drop policy if exists tv_progress_own on public.tv_progress;
create policy tv_progress_own on public.tv_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tv_favorites_own on public.tv_favorites;
create policy tv_favorites_own on public.tv_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
