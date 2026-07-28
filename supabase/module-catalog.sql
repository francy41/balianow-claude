-- BailaNow · CATÁLOGO de módulos de creador gestionable por el superadmin.
-- Ejecutar UNA vez (después de creator-modules.sql). 100% idempotente.
-- El superadmin puede activar/desactivar y cambiar precios: global (a todos)
-- o con overrides por ROL o por USUARIO concreto.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- 1) Catálogo global (precio y disponibilidad para todos)
create table if not exists public.module_catalog (
  module_id text primary key,
  name text not null,
  emoji text,
  description text,
  price numeric(10,2) not null default 20,
  active boolean not null default true,
  is_full boolean not null default false,
  sort int not null default 0
);

insert into public.module_catalog (module_id, name, emoji, description, price, is_full, sort) values
  ('reservas',      'Reservas',              '📅', 'Calendario y reservas online para tus clases y shows.', 20, false, 1),
  ('contratacion',  'Zona de contratación',  '🤝', 'Recibe solicitudes y cierra bolos desde tu perfil.',     20, false, 2),
  ('pagos',         'Pasarelas de pago',     '💳', 'Cobra con tarjeta y PayPal, con escrow seguro.',          20, false, 3),
  ('cursos',        'Cursos y clases',       '🎓', 'Publica y vende tus cursos de baile.',                    20, false, 4),
  ('transmisiones', 'Transmisiones online',  '📡', 'Directos y clases en vídeo para tu comunidad.',           20, false, 5),
  ('perfil-pro',    'Perfil PRO destacado',  '⭐', 'Aparece destacado y con tu enlace personalizado.',        20, false, 6),
  ('full',          'Pack Full',             '🚀', 'Todos los módulos incluidos. Todo en uno.',               50, true,  0)
on conflict (module_id) do nothing;

alter table public.module_catalog enable row level security;
drop policy if exists mc_read on public.module_catalog;
create policy mc_read on public.module_catalog for select using (true);
drop policy if exists mc_admin on public.module_catalog;
create policy mc_admin on public.module_catalog for all using (public.is_admin()) with check (public.is_admin());

-- 2) Overrides por perfil: precio/estado distinto para un ROL o un USUARIO concreto
create table if not exists public.module_overrides (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  scope_type text not null,          -- role | user
  scope_value text not null,         -- el rol (ej. 'venue') o el uuid del usuario
  price numeric(10,2),               -- null = usa el precio del catálogo
  active boolean,                    -- null = usa el estado del catálogo
  created_at timestamptz not null default now(),
  unique (module_id, scope_type, scope_value)
);

alter table public.module_overrides enable row level security;
drop policy if exists mo_read on public.module_overrides;
create policy mo_read on public.module_overrides for select using (true);
drop policy if exists mo_admin on public.module_overrides;
create policy mo_admin on public.module_overrides for all using (public.is_admin()) with check (public.is_admin());
