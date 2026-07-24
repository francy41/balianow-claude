-- Buscar pareja de baile (match). Aplicar en el SQL Editor de Supabase.

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

-- Perfiles: se ven los activos; cada uno gestiona el suyo.
drop policy if exists partner_profiles_read on public.partner_profiles;
create policy partner_profiles_read on public.partner_profiles
  for select using (active or auth.uid() = user_id or public.is_admin());
drop policy if exists partner_profiles_own on public.partner_profiles;
create policy partner_profiles_own on public.partner_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Likes: cada usuario ve los suyos y los que recibe (para detectar match).
drop policy if exists partner_likes_read on public.partner_likes;
create policy partner_likes_read on public.partner_likes
  for select using (auth.uid() = from_user or auth.uid() = to_user);
drop policy if exists partner_likes_insert on public.partner_likes;
create policy partner_likes_insert on public.partner_likes
  for insert with check (auth.uid() = from_user);
drop policy if exists partner_likes_delete on public.partner_likes;
create policy partner_likes_delete on public.partner_likes
  for delete using (auth.uid() = from_user);
