-- BailaNow · App Builder — módulos del Home gestionables por el superadmin.
-- Fuente de verdad de la sección "Más para ti" (y futuras secciones del Home).
-- Ejecutar UNA vez en el editor SQL de Supabase. 100% idempotente.

-- Reutiliza is_admin() (role in admin/superadmin). Se define por si no existe.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- 1) Tabla de módulos del Home ----------------------------------------------
create table if not exists public.home_modules (
  id uuid primary key default gen_random_uuid(),
  section          text not null default 'mas-para-ti',
  slug             text not null,
  type             text not null default 'card',   -- card | flyer | banner | hero | cta | link
  title            text not null,
  subtitle         text,
  description      text,
  icon             text default '✨',
  icon_bg          text default 'bg-pink-500',
  gradient         text default 'from-pink-500 to-rose-600',
  glow             text default 'hover:shadow-pink-500/40',
  badge            text,
  route            text not null default '/',
  image_url        text,
  image_mobile_url text,
  color            text,
  sort             int  not null default 0,
  active           boolean not null default true,
  published        boolean not null default true,
  visible_desktop  boolean not null default true,
  visible_tablet   boolean not null default true,
  visible_mobile   boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  published_at timestamptz,
  unique (section, slug)
);

create index if not exists home_modules_section_idx
  on public.home_modules (section, published, active, sort);

-- 2) updated_at automático ---------------------------------------------------
create or replace function public.touch_home_modules()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_touch_home_modules on public.home_modules;
create trigger trg_touch_home_modules before update on public.home_modules
  for each row execute function public.touch_home_modules();

-- 3) RLS ---------------------------------------------------------------------
alter table public.home_modules enable row level security;

-- Público: solo módulos publicados y activos. Admin: ve todo (incluye borradores).
drop policy if exists hm_read on public.home_modules;
create policy hm_read on public.home_modules for select
  using ((published and active) or public.is_admin());

-- Escritura: solo admin/superadmin.
drop policy if exists hm_admin on public.home_modules;
create policy hm_admin on public.home_modules for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.home_modules to anon, authenticated;

-- 4) Storage: bucket público para imágenes de módulos ------------------------
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists media_admin_write on storage.objects;
create policy media_admin_write on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());

-- 5) Seed — los 6 módulos actuales de "Más para ti" (idempotente) -----------
insert into public.home_modules (section, slug, title, subtitle, icon, icon_bg, gradient, glow, badge, route, sort) values
  ('mas-para-ti','planes',      'Planes Para Bailar',    'Encuentra personas para salir a bailar', '❤️','bg-pink-500',   'from-rose-500 to-pink-600',      'hover:shadow-rose-500/40',    'Nuevo','/rutas',        1),
  ('mas-para-ti','parejas',     'Pareja de baile',       'Busca compañero/a de baile',             '💑','bg-violet-500', 'from-fuchsia-500 to-purple-600', 'hover:shadow-fuchsia-500/40', null,   '/parejas',      2),
  ('mas-para-ti','danceflow',   'DanceFlow IA',          'Entrena con inteligencia artificial',    '🤖','bg-blue-500',   'from-indigo-600 to-blue-700',    'hover:shadow-blue-500/40',    null,   '/danceflow',    3),
  ('mas-para-ti','clases',      'Clases Online',         'Aprende desde cualquier lugar',          '🎓','bg-orange-500', 'from-amber-500 to-orange-600',   'hover:shadow-amber-500/40',   null,   '/clases',       4),
  ('mas-para-ti','bailarines',  'Bailarines',            'Contrata bailarines · reserva clases',   '🕺','bg-teal-500',   'from-emerald-500 to-teal-600',   'hover:shadow-emerald-500/40', null,   '/artistas',     5),
  ('mas-para-ti','promocionate','Promociona tu negocio', 'Publicidad, flyers, vídeos y más',       '🎤','bg-pink-500',   'from-pink-500 to-rose-600',      'hover:shadow-pink-500/40',    null,   '/promocionate', 6)
on conflict (section, slug) do nothing;

-- 6) audit log (opcional pero recomendado) -----------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id   uuid,
  action     text not null,          -- create | update | delete | publish | unpublish
  entity     text not null,          -- 'home_modules'
  entity_id  text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
drop policy if exists aal_admin on public.admin_audit_log;
create policy aal_admin on public.admin_audit_log for all
  using (public.is_admin()) with check (public.is_admin());
