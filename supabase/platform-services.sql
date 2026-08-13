-- BailaNow · Módulo "Comprar servicios" para dashboards de dueños de perfil.
-- Catálogo de servicios que ofrece la plataforma (flyers, vídeos, campañas...)
-- gestionable desde SuperAdmin, y pedidos que hacen los usuarios desde su Dashboard.
-- Ejecutar UNA vez. 100% idempotente.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- 1) Catálogo de servicios --------------------------------------------------
create table if not exists public.platform_services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  icon text default '🎨',
  image_url text,
  category text default 'marketing',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists platform_services_active_idx on public.platform_services(active, sort);

create or replace function public.touch_platform_services()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_touch_platform_services on public.platform_services;
create trigger trg_touch_platform_services before update on public.platform_services
  for each row execute function public.touch_platform_services();

alter table public.platform_services enable row level security;
drop policy if exists ps_read on public.platform_services;
create policy ps_read on public.platform_services for select using (active or public.is_admin());
drop policy if exists ps_admin on public.platform_services;
create policy ps_admin on public.platform_services for all
  using (public.is_admin()) with check (public.is_admin());
grant select on public.platform_services to anon, authenticated;

-- 2) Pedidos de servicio ------------------------------------------------------
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.platform_services(id) on delete set null,
  buyer_id uuid not null,
  service_name text not null,   -- copia del nombre por si el servicio cambia/borra
  price numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending',        -- pending|in_progress|delivered|cancelled
  payment_status text not null default 'unpaid',  -- unpaid|paid
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_orders_buyer_idx on public.service_orders(buyer_id, created_at desc);

create or replace function public.touch_service_orders()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_touch_service_orders on public.service_orders;
create trigger trg_touch_service_orders before update on public.service_orders
  for each row execute function public.touch_service_orders();

alter table public.service_orders enable row level security;
drop policy if exists so_insert on public.service_orders;
create policy so_insert on public.service_orders for insert
  with check (buyer_id = auth.uid());
drop policy if exists so_select on public.service_orders;
create policy so_select on public.service_orders for select
  using (buyer_id = auth.uid() or public.is_admin());
drop policy if exists so_update on public.service_orders;
create policy so_update on public.service_orders for update
  using (public.is_admin()) with check (public.is_admin());
grant insert, select on public.service_orders to authenticated;

-- 3) Seed — 5 servicios de ejemplo (idempotente) -----------------------------
insert into public.platform_services (name, description, price, icon, category, sort) values
  ('Flyer', 'Diseño de flyer profesional para tu evento o promoción.', 25, '🖼️', 'diseño', 1),
  ('Flyer con movimiento', 'Flyer animado (vídeo corto) para redes sociales.', 45, '🎬', 'diseño', 2),
  ('Edición de vídeos', 'Edición profesional de tus vídeos para redes o promoción.', 60, '🎞️', 'video', 3),
  ('Crea tu campaña en Meta y Google', 'Configuración y lanzamiento de campaña publicitaria en Meta Ads y Google Ads.', 150, '📈', 'publicidad', 4),
  ('Publícate en páginas de redes sociales', 'Publicación de tu contenido en páginas y comunidades asociadas.', 35, '📣', 'promoción', 5)
on conflict (name) do nothing;
