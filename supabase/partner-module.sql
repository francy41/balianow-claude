-- BailaNow · MÓDULO PARTNER POR CIUDADES.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
--
-- Partner = colaborador que gestiona eventos/contenido de su(s) ciudad(es),
-- gana comisiones por cada gestión, tiene formas de pago y retiros, envía
-- contenido a la central para editar, y chatea con soporte del superadmin.
-- Alta con aprobación: registrarse como "partner" crea una SOLICITUD; el
-- superadmin la aprueba y ahí se le asigna el rol y su comisión.

-- ══════════════════════════════════════════════════════════════════
-- 0) Función is_admin() (de la que dependen las políticas). Idempotente.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ══════════════════════════════════════════════════════════════════
-- 1) SOLICITUDES DE PARTNER
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text,
  email text,
  phone text,
  city text not null,
  is_content_creator boolean not null default false,
  can_edit_video boolean not null default false,
  portfolio_url text,
  motivation text,
  status text not null default 'pending',        -- pending | approved | rejected
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists partner_applications_status_idx on public.partner_applications (status);

-- ══════════════════════════════════════════════════════════════════
-- 2) PARTNERS ACTIVOS (rol asignado tras aprobación)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partners (
  user_id uuid primary key,
  display_name text,
  cities text[] not null default '{}',
  commission_percent numeric(5,2) not null default 10,
  status text not null default 'active',          -- active | suspended
  bio text,
  phone text,
  created_at timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════
-- 3) GESTIONES / TRABAJOS de cada partner (pendientes y completadas)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_tasks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  city text,
  title text not null,
  type text not null default 'other',             -- event | venue | artist | content | promo | other
  status text not null default 'pending',         -- pending | in_progress | completed
  amount numeric(10,2) not null default 0,        -- valor de la gestión
  commission numeric(10,2) not null default 0,    -- lo que gana el partner
  related_id uuid,                                 -- opcional: id de evento/venue/etc.
  notes text,
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists partner_tasks_partner_idx on public.partner_tasks (partner_id, status);

-- ══════════════════════════════════════════════════════════════════
-- 4) FORMAS DE PAGO del partner
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_payout_methods (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  type text not null default 'paypal',            -- paypal | bank | other
  label text,
  details text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists partner_payout_methods_partner_idx on public.partner_payout_methods (partner_id);

-- ══════════════════════════════════════════════════════════════════
-- 5) RETIROS del partner
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_withdrawals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  method text,
  amount numeric(10,2) not null,
  status text not null default 'pending',          -- pending | paid | rejected
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  requested_at timestamptz not null default now()
);
create index if not exists partner_withdrawals_partner_idx on public.partner_withdrawals (partner_id, status);

-- ══════════════════════════════════════════════════════════════════
-- 6) CONTENIDO enviado a la central (grabaciones para editar/publicar)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_content (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  city text,
  title text not null,
  description text,
  video_url text,
  needs_editing boolean not null default false,    -- true → la central lo edita
  status text not null default 'submitted',        -- submitted | in_editing | published | rejected
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_content_status_idx on public.partner_content (status);

-- ══════════════════════════════════════════════════════════════════
-- RLS · el partner ve/gestiona lo suyo (partner_id = auth.uid()),
--       el admin/superadmin ve y gestiona todo.
-- ══════════════════════════════════════════════════════════════════
alter table public.partner_applications  enable row level security;
alter table public.partners               enable row level security;
alter table public.partner_tasks          enable row level security;
alter table public.partner_payout_methods enable row level security;
alter table public.partner_withdrawals    enable row level security;
alter table public.partner_content        enable row level security;

-- Solicitudes: el usuario crea/lee la suya; el admin lo ve y decide todo.
drop policy if exists pa_insert on public.partner_applications;
create policy pa_insert on public.partner_applications for insert with check (auth.uid() = user_id);
drop policy if exists pa_read on public.partner_applications;
create policy pa_read on public.partner_applications for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists pa_admin on public.partner_applications;
create policy pa_admin on public.partner_applications for update using (public.is_admin()) with check (public.is_admin());

-- Partners: el partner lee lo suyo; solo el admin escribe (asigna comisión/ciudades).
drop policy if exists partners_read on public.partners;
create policy partners_read on public.partners for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists partners_admin on public.partners;
create policy partners_admin on public.partners for all using (public.is_admin()) with check (public.is_admin());

-- Gestiones: el partner gestiona las suyas; el admin todas.
drop policy if exists ptasks_own on public.partner_tasks;
create policy ptasks_own on public.partner_tasks for all
  using (auth.uid() = partner_id or public.is_admin())
  with check (auth.uid() = partner_id or public.is_admin());

-- Formas de pago: solo el propio partner (el admin puede leerlas).
drop policy if exists ppm_own on public.partner_payout_methods;
create policy ppm_own on public.partner_payout_methods for all
  using (auth.uid() = partner_id or public.is_admin())
  with check (auth.uid() = partner_id);

-- Retiros: el partner crea/lee los suyos; solo el admin cambia el estado.
drop policy if exists pw_read on public.partner_withdrawals;
create policy pw_read on public.partner_withdrawals for select using (auth.uid() = partner_id or public.is_admin());
drop policy if exists pw_insert on public.partner_withdrawals;
create policy pw_insert on public.partner_withdrawals for insert with check (auth.uid() = partner_id);
drop policy if exists pw_admin on public.partner_withdrawals;
create policy pw_admin on public.partner_withdrawals for update using (public.is_admin()) with check (public.is_admin());

-- Contenido: el partner sube/edita el suyo; el admin gestiona todo.
drop policy if exists pc_own on public.partner_content;
create policy pc_own on public.partner_content for all
  using (auth.uid() = partner_id or public.is_admin())
  with check (auth.uid() = partner_id or public.is_admin());
