-- PPV (pay-per-view): registro de accesos comprados a live sessions de pago.
-- Aplicar vía Management API REST: POST /v1/projects/{ref}/database/query
create table if not exists public.live_access (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id    uuid not null,
  amount     numeric(10,2) not null default 0,
  currency   text not null default 'EUR',
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists live_access_user_idx on public.live_access (user_id);

alter table public.live_access enable row level security;

-- Cada usuario ve e inserta solo su propio acceso.
drop policy if exists live_access_select_own on public.live_access;
create policy live_access_select_own on public.live_access
  for select using (auth.uid() = user_id);

drop policy if exists live_access_insert_own on public.live_access;
create policy live_access_insert_own on public.live_access
  for insert with check (auth.uid() = user_id);

-- Admin/superadmin ven todo (misma función que el resto de políticas admin).
drop policy if exists live_access_admin_all on public.live_access;
create policy live_access_admin_all on public.live_access
  for all using (public.is_admin());
