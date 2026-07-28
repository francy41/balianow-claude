-- BailaNow · SOLICITUDES para unirse (artistas, bailarines, músicos, locales,
-- promotores). Todas pasan por APROBACIÓN del superadmin antes de crear/activar perfil.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                       -- si ya tiene cuenta al solicitar
  name text,
  email text not null,
  phone text,
  role text not null default 'dancer',  -- artist | dancer | dj | venue | promoter | musician
  city text,
  portfolio_url text,
  message text,
  status text not null default 'pending',   -- pending | approved | rejected
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists creator_applications_status_idx on public.creator_applications (status);

alter table public.creator_applications enable row level security;
-- Cualquiera puede ENVIAR una solicitud (formulario público de captación).
drop policy if exists ca_insert on public.creator_applications;
create policy ca_insert on public.creator_applications for insert with check (true);
-- La lee/gestiona el admin (y el propio solicitante si tiene cuenta).
drop policy if exists ca_read on public.creator_applications;
create policy ca_read on public.creator_applications for select using (public.is_admin() or auth.uid() = user_id);
drop policy if exists ca_admin on public.creator_applications;
create policy ca_admin on public.creator_applications for update using (public.is_admin()) with check (public.is_admin());

-- Al aprobar, si el solicitante ya tiene cuenta, se le marca el perfil como verificado.
create or replace function public.approve_creator_application(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  update public.creator_applications
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id returning user_id into uid;
  if uid is not null then
    update public.profiles set verified = true where id = uid;
  end if;
end $$;
grant execute on function public.approve_creator_application(uuid) to authenticated;
