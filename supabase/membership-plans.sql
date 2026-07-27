-- BailaNow · MEMBRESÍAS de baile (Individual / Pareja / Familiar) + asientos.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
--
-- Los planes usan la tabla `subscriptions` existente (plan = individual|pareja|familiar).
-- Aquí gestionamos los MIEMBROS extra (asientos) del titular y el acceso a TV/cursos.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- Miembros invitados por el titular de un plan pareja/familiar.
create table if not exists public.plan_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,                 -- titular de la suscripción
  plan text not null,                     -- pareja | familiar
  email text not null,
  member_id uuid,                         -- se rellena cuando el invitado entra
  status text not null default 'invited', -- invited | active | removed
  created_at timestamptz not null default now(),
  unique (owner_id, email)
);
create index if not exists plan_members_owner_idx on public.plan_members (owner_id);
create index if not exists plan_members_email_idx on public.plan_members (lower(email));

alter table public.plan_members enable row level security;
-- El titular gestiona sus miembros; el invitado ve/acepta los suyos.
drop policy if exists pm_owner on public.plan_members;
create policy pm_owner on public.plan_members for all
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());
drop policy if exists pm_member_read on public.plan_members;
create policy pm_member_read on public.plan_members for select
  using (auth.uid() = member_id or lower(email) = lower(coalesce((select email from public.profiles where id = auth.uid()), '')));

-- Vincula al usuario actual con las invitaciones hechas a su email (al entrar).
create or replace function public.claim_memberships()
returns int language plpgsql security definer set search_path = public as $$
declare my_email text; n int;
begin
  select email into my_email from public.profiles where id = auth.uid();
  if my_email is null then return 0; end if;
  update public.plan_members
    set member_id = auth.uid(), status = 'active'
  where member_id is null and status <> 'removed' and lower(email) = lower(my_email);
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.claim_memberships() to authenticated;

-- ¿Tiene el usuario acceso a TV/cursos por membresía? (titular activo o miembro activo)
create or replace function public.has_membership_access(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1 from public.subscriptions s
      where s.user_id = p_uid and s.status = 'active'
        and s.plan in ('individual', 'pareja', 'familiar')
    )
    or exists (
      select 1 from public.plan_members m
      join public.subscriptions s on s.user_id = m.owner_id and s.status = 'active' and s.plan = m.plan
      where m.status <> 'removed'
        and (m.member_id = p_uid
             or lower(m.email) = lower(coalesce((select email from public.profiles where id = p_uid), '')))
    );
$$;
grant execute on function public.has_membership_access(uuid) to authenticated, anon;
