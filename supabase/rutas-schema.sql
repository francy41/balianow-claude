-- Ruta de Hoy — rutas grupales en mapa. Aplicar en el SQL Editor de Supabase.

create table if not exists public.rutas (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  creator_name text,
  title text not null,
  city text not null,
  description text,
  date date,
  time text,
  stops jsonb not null default '[]',   -- [{ name, address, lat, lng }]
  created_at timestamptz not null default now()
);

create table if not exists public.ruta_members (
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  created_at timestamptz not null default now(),
  primary key (ruta_id, user_id)
);

create index if not exists rutas_city_idx on public.rutas (city);
create index if not exists rutas_date_idx on public.rutas (date);

alter table public.rutas enable row level security;
alter table public.ruta_members enable row level security;

-- Rutas: lectura pública; solo el creador (o admin) las gestiona.
drop policy if exists rutas_read on public.rutas;
create policy rutas_read on public.rutas for select using (true);
drop policy if exists rutas_write on public.rutas;
create policy rutas_write on public.rutas
  for all using (auth.uid() = creator_id or public.is_admin())
  with check (auth.uid() = creator_id or public.is_admin());

-- Miembros: lectura pública; cada usuario gestiona su propia asistencia.
drop policy if exists ruta_members_read on public.ruta_members;
create policy ruta_members_read on public.ruta_members for select using (true);
drop policy if exists ruta_members_own on public.ruta_members;
create policy ruta_members_own on public.ruta_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
