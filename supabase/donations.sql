-- BailaNow · DONACIONES (registro + total recaudado).
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
-- Las donaciones se registran vía el webhook de Stripe (checkout.session.completed
-- con metadata.type='donation'), que usa service_role y salta RLS.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  amount numeric(10,2) not null default 0,
  currency text not null default 'eur',
  email text,
  message text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
create index if not exists donations_created_idx on public.donations (created_at desc);

alter table public.donations enable row level security;
-- Solo admin/superadmin lee las donaciones (el webhook escribe con service_role).
drop policy if exists donations_admin on public.donations;
create policy donations_admin on public.donations for select using (public.is_admin());

-- Resumen (total recaudado + nº) para el panel, sin exponer filas.
create or replace function public.get_donations_summary()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', coalesce(sum(amount), 0),
    'count', count(*),
    'this_month', coalesce(sum(amount) filter (where created_at >= date_trunc('month', now())), 0)
  )
  from public.donations where status = 'completed';
$$;
grant execute on function public.get_donations_summary() to authenticated;
