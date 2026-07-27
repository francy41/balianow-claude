-- BailaNow · RECURSOS para partners (biblioteca por categorías).
-- Ejecutar UNA vez (después de partner-module.sql). 100% idempotente.
--
-- La central (superadmin) publica recursos por categoría (plan de trabajo,
-- política, formaciones, contratos, diseños gráficos, etc.) y los partners los
-- consultan desde su dashboard. Solo lectura para el partner; escribe el admin.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

create table if not exists public.partner_resources (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'otros',   -- plan_trabajo | politica | formaciones | contratos | disenos | otros
  title text not null,
  description text,
  url text,                                 -- enlace a documento / vídeo / imagen / carpeta
  kind text not null default 'link',        -- link | doc | video | image
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists partner_resources_category_idx on public.partner_resources (category, sort);

alter table public.partner_resources enable row level security;

-- Lectura: cualquier partner activo (o admin). Escritura: solo admin.
drop policy if exists pres_read on public.partner_resources;
create policy pres_read on public.partner_resources for select using (
  public.is_admin() or exists (select 1 from public.partners p where p.user_id = auth.uid())
);
drop policy if exists pres_admin on public.partner_resources;
create policy pres_admin on public.partner_resources for all
  using (public.is_admin()) with check (public.is_admin());
