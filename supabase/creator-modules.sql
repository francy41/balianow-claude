-- BailaNow · MÓDULOS de creador (pago único: 20€/módulo o 50€ Pack Full).
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

create table if not exists public.creator_module_purchases (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  module_id text not null,               -- reservas | contratacion | pagos | cursos | transmisiones | perfil-pro | full
  price numeric(10,2) not null default 0,
  status text not null default 'active', -- active
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists creator_module_purchases_creator_idx on public.creator_module_purchases (creator_id);

alter table public.creator_module_purchases enable row level security;
-- El creador ve sus módulos; el admin todo. Se insertan vía webhook (service_role).
drop policy if exists cmp_read on public.creator_module_purchases;
create policy cmp_read on public.creator_module_purchases for select using (auth.uid() = creator_id or public.is_admin());
drop policy if exists cmp_admin on public.creator_module_purchases;
create policy cmp_admin on public.creator_module_purchases for all using (public.is_admin()) with check (public.is_admin());

-- ¿Tiene el creador un módulo activo? (el Pack Full desbloquea todos)
create or replace function public.has_module(p_uid uuid, p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.creator_module_purchases
    where creator_id = p_uid and status = 'active' and (module_id = 'full' or module_id = p_module)
  );
$$;
grant execute on function public.has_module(uuid, text) to authenticated;
