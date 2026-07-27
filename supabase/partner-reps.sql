-- BailaNow · EQUIPO del Partner: RRPP y Promotores por ciudad.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
-- Requiere partner-module.sql (tabla partners, partner_tasks, is_admin()).
--
-- El partner crea RRPP/Promotores de su ciudad y les asigna comisión, PERO
-- el máximo lo fija BailaNow (superadmin) en partner_rep_policies. Un trigger
-- recorta cualquier comisión que supere ese tope: la política se cumple a
-- nivel de base de datos, no solo en la interfaz.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ══════════════════════════════════════════════════════════════════
-- 1) POLÍTICA de comisiones (la establece BailaNow · fila única id=1)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_rep_policies (
  id int primary key default 1,
  max_rrpp_percent numeric(5,2) not null default 20,
  max_promoter_percent numeric(5,2) not null default 15,
  default_rrpp_percent numeric(5,2) not null default 10,
  default_promoter_percent numeric(5,2) not null default 8,
  notes text,
  updated_at timestamptz not null default now(),
  constraint partner_rep_policies_singleton check (id = 1)
);
insert into public.partner_rep_policies (id) values (1) on conflict (id) do nothing;

alter table public.partner_rep_policies enable row level security;
-- Cualquiera puede LEER la política (el partner necesita conocer los topes); solo admin la edita.
drop policy if exists prp_read on public.partner_rep_policies;
create policy prp_read on public.partner_rep_policies for select using (true);
drop policy if exists prp_admin on public.partner_rep_policies;
create policy prp_admin on public.partner_rep_policies for all using (public.is_admin()) with check (public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 2) RRPP / PROMOTORES creados por el partner
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_reps (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,                        -- partner dueño del equipo
  user_id uuid,                                    -- opcional: si el rep es usuario de la app
  role text not null default 'rrpp',               -- rrpp | promoter
  name text not null,
  contact text,                                    -- email / teléfono / @usuario
  city text,
  commission_percent numeric(5,2) not null default 0,
  status text not null default 'active',           -- active | suspended
  created_at timestamptz not null default now()
);
create index if not exists partner_reps_partner_idx on public.partner_reps (partner_id, status);

alter table public.partner_reps enable row level security;
drop policy if exists preps_read on public.partner_reps;
create policy preps_read on public.partner_reps for select
  using (auth.uid() = partner_id or auth.uid() = user_id or public.is_admin());
drop policy if exists preps_write on public.partner_reps;
create policy preps_write on public.partner_reps for all
  using (auth.uid() = partner_id or public.is_admin())
  with check (auth.uid() = partner_id or public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 3) TRIGGER · aplica el tope de BailaNow a la comisión del rep
--    (recorta al máximo permitido según el rol; nadie puede superarlo)
-- ══════════════════════════════════════════════════════════════════
create or replace function public.enforce_partner_rep_policy()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_pct numeric;
begin
  select case when new.role = 'promoter' then max_promoter_percent else max_rrpp_percent end
    into max_pct
  from public.partner_rep_policies where id = 1;

  if max_pct is null then max_pct := 100; end if;
  if new.commission_percent is null or new.commission_percent < 0 then
    new.commission_percent := 0;
  elsif new.commission_percent > max_pct then
    new.commission_percent := max_pct;      -- recorte al tope de la política
  end if;
  return new;
end $$;

drop trigger if exists trg_partner_rep_policy on public.partner_reps;
create trigger trg_partner_rep_policy
  before insert or update on public.partner_reps
  for each row execute function public.enforce_partner_rep_policy();

-- ══════════════════════════════════════════════════════════════════
-- 4) Atribuir una gestión a un RRPP/Promotor (para calcular su comisión)
-- ══════════════════════════════════════════════════════════════════
alter table public.partner_tasks add column if not exists rep_id uuid;
create index if not exists partner_tasks_rep_idx on public.partner_tasks (rep_id);
