-- Contenido exclusivo (tipo Patreon): membresías de fan a creadores.
-- Aplicar vía Management API REST: POST /v1/projects/{ref}/database/query
create table if not exists public.content_access (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  user_id    uuid not null,
  amount     numeric(10,2) not null default 0,
  currency   text not null default 'EUR',
  created_at timestamptz not null default now(),
  unique (creator_id, user_id)
);

create index if not exists content_access_user_idx on public.content_access (user_id);

alter table public.content_access enable row level security;

-- Cada usuario ve e inserta solo su propia membresía.
drop policy if exists content_access_select_own on public.content_access;
create policy content_access_select_own on public.content_access
  for select using (auth.uid() = user_id);

drop policy if exists content_access_insert_own on public.content_access;
create policy content_access_insert_own on public.content_access
  for insert with check (auth.uid() = user_id);

-- Admin/superadmin ven todo (misma función que el resto de políticas admin).
drop policy if exists content_access_admin_all on public.content_access;
create policy content_access_admin_all on public.content_access
  for all using (public.is_admin());
