-- ══════════════════════════════════════════════════════════════════════════════
-- BailaNow · SETUP MAESTRO — TODO EN UNO
-- ══════════════════════════════════════════════════════════════════════════════
-- Ejecuta este único archivo en Supabase (SQL Editor → pega todo → Run).
-- Es 100% idempotente y respeta el orden de dependencias. Puedes re-ejecutarlo
-- sin miedo: no borra datos existentes.
--
-- Contiene, en orden:
--   1) Módulos comunidad + BailaNow TV + is_admin() + datos demo   (setup-all)
--   2) Módulo Partner por ciudades                                 (partner-module)
--   3) Bandeja unificada + enlace de ciudad + redes                (partner-inbox)
--   4) Equipo RRPP/Promotores + política de comisiones             (partner-reps)
-- ══════════════════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 1/8 · COMUNIDAD + TV + is_admin() + DEMO                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- BailaNow · SETUP COMPLETO de módulos nuevos + datos demo.
-- Ejecutar UNA vez en el SQL Editor de Supabase (o vía Management API).
-- 100% idempotente: seguro de re-ejecutar. No borra datos existentes.
--
-- Incluye:
--   0) Función public.is_admin()  (de la que dependen todas las políticas RLS)
--   1) Ruta de Hoy      · rutas, ruta_members, ruta_comments
--   2) Pareja de baile  · partner_profiles, partner_likes
--   3) Retos de baile   · retos, reto_entries, reto_votes
--   4) BailaNow TV      · tv_titles, tv_lessons, tv_progress, tv_favorites
--   5) Datos demo       · clases de TV + un reto + una ruta (para que no salga vacío)

-- ══════════════════════════════════════════════════════════════════
-- 0) FUNCIÓN is_admin()  ·  role IN ('admin','superadmin')
--    Todas las políticas de abajo la usan. Debe existir SIEMPRE.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

-- ══════════════════════════════════════════════════════════════════
-- 1) RUTA DE HOY
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.rutas (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  creator_name text,
  title text not null,
  city text not null,
  description text,
  date date,
  time text,
  stops jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.ruta_members (
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  created_at timestamptz not null default now(),
  primary key (ruta_id, user_id)
);

create table if not exists public.ruta_comments (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.rutas enable row level security;
alter table public.ruta_members enable row level security;
alter table public.ruta_comments enable row level security;

drop policy if exists rutas_read on public.rutas;
create policy rutas_read on public.rutas for select using (true);
drop policy if exists rutas_write on public.rutas;
create policy rutas_write on public.rutas for all
  using (auth.uid() = creator_id or public.is_admin())
  with check (auth.uid() = creator_id or public.is_admin());

drop policy if exists ruta_members_read on public.ruta_members;
create policy ruta_members_read on public.ruta_members for select using (true);
drop policy if exists ruta_members_own on public.ruta_members;
create policy ruta_members_own on public.ruta_members for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ruta_comments_read on public.ruta_comments;
create policy ruta_comments_read on public.ruta_comments for select using (true);
drop policy if exists ruta_comments_insert on public.ruta_comments;
create policy ruta_comments_insert on public.ruta_comments for insert with check (auth.uid() = user_id);
drop policy if exists ruta_comments_delete on public.ruta_comments;
create policy ruta_comments_delete on public.ruta_comments for delete using (auth.uid() = user_id or public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 2) PAREJA DE BAILE (match)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_profiles (
  user_id uuid primary key,
  name text,
  avatar text,
  city text,
  level text,
  styles text[] not null default '{}',
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_likes (
  from_user uuid not null,
  to_user uuid not null,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);

create index if not exists partner_profiles_city_idx on public.partner_profiles (city);

alter table public.partner_profiles enable row level security;
alter table public.partner_likes enable row level security;

drop policy if exists partner_profiles_read on public.partner_profiles;
create policy partner_profiles_read on public.partner_profiles
  for select using (active or auth.uid() = user_id or public.is_admin());
drop policy if exists partner_profiles_own on public.partner_profiles;
create policy partner_profiles_own on public.partner_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists partner_likes_read on public.partner_likes;
create policy partner_likes_read on public.partner_likes
  for select using (auth.uid() = from_user or auth.uid() = to_user);
drop policy if exists partner_likes_insert on public.partner_likes;
create policy partner_likes_insert on public.partner_likes
  for insert with check (auth.uid() = from_user);
drop policy if exists partner_likes_delete on public.partner_likes;
create policy partner_likes_delete on public.partner_likes
  for delete using (auth.uid() = from_user);

-- ══════════════════════════════════════════════════════════════════
-- 3) RETOS DE BAILE
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.retos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,
  title text not null,
  description text,
  style text,
  cover_url text,
  starts date,
  ends date,
  created_at timestamptz not null default now()
);

create table if not exists public.reto_entries (
  id uuid primary key default gen_random_uuid(),
  reto_id uuid not null references public.retos(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  user_avatar text,
  video_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  unique (reto_id, user_id)
);

create table if not exists public.reto_votes (
  entry_id uuid not null references public.reto_entries(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

alter table public.retos enable row level security;
alter table public.reto_entries enable row level security;
alter table public.reto_votes enable row level security;

drop policy if exists retos_read on public.retos;
create policy retos_read on public.retos for select using (true);
drop policy if exists retos_write on public.retos;
create policy retos_write on public.retos for all using (public.is_admin() or auth.uid()=creator_id) with check (public.is_admin() or auth.uid()=creator_id);

drop policy if exists reto_entries_read on public.reto_entries;
create policy reto_entries_read on public.reto_entries for select using (true);
drop policy if exists reto_entries_own on public.reto_entries;
create policy reto_entries_own on public.reto_entries for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id);

drop policy if exists reto_votes_read on public.reto_votes;
create policy reto_votes_read on public.reto_votes for select using (true);
drop policy if exists reto_votes_own on public.reto_votes;
create policy reto_votes_own on public.reto_votes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- ══════════════════════════════════════════════════════════════════
-- 4) BAILANOW TV
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.tv_titles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,
  type text not null default 'clase',
  title text not null,
  slug text unique,
  description text,
  style text,
  level text,
  cover_url text,
  access text not null default 'basico',
  status text not null default 'draft',
  featured boolean not null default false,
  rating numeric(3,2) default 0,
  views int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tv_lessons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.tv_titles(id) on delete cascade,
  position int not null default 1,
  name text not null,
  video_url text,
  duration_seconds int default 0,
  access text not null default 'basico',
  created_at timestamptz not null default now()
);

create table if not exists public.tv_progress (
  user_id uuid not null,
  lesson_id uuid not null references public.tv_lessons(id) on delete cascade,
  position_seconds int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.tv_favorites (
  user_id uuid not null,
  title_id uuid not null references public.tv_titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create index if not exists tv_titles_style_idx on public.tv_titles (style);
create index if not exists tv_titles_status_idx on public.tv_titles (status);
create index if not exists tv_lessons_title_idx on public.tv_lessons (title_id, position);

alter table public.tv_titles enable row level security;
alter table public.tv_lessons enable row level security;
alter table public.tv_progress enable row level security;
alter table public.tv_favorites enable row level security;

drop policy if exists tv_titles_read on public.tv_titles;
create policy tv_titles_read on public.tv_titles
  for select using (status = 'published' or public.is_admin() or auth.uid() = creator_id);
drop policy if exists tv_titles_write on public.tv_titles;
create policy tv_titles_write on public.tv_titles
  for all using (public.is_admin() or auth.uid() = creator_id)
  with check (public.is_admin() or auth.uid() = creator_id);

drop policy if exists tv_lessons_read on public.tv_lessons;
create policy tv_lessons_read on public.tv_lessons
  for select using (
    exists (select 1 from public.tv_titles t
            where t.id = title_id and (t.status = 'published' or public.is_admin() or t.creator_id = auth.uid()))
  );
drop policy if exists tv_lessons_write on public.tv_lessons;
create policy tv_lessons_write on public.tv_lessons
  for all using (
    public.is_admin() or exists (select 1 from public.tv_titles t where t.id = title_id and t.creator_id = auth.uid())
  ) with check (
    public.is_admin() or exists (select 1 from public.tv_titles t where t.id = title_id and t.creator_id = auth.uid())
  );

drop policy if exists tv_progress_own on public.tv_progress;
create policy tv_progress_own on public.tv_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists tv_favorites_own on public.tv_favorites;
create policy tv_favorites_own on public.tv_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- 5) DATOS DEMO  ·  para que TV, Retos y Rutas no salgan vacíos.
--    UUIDs fijos + on conflict do nothing  →  seguro de re-ejecutar.
--    Borra estas filas cuando tengas contenido real (ver al final).
-- ══════════════════════════════════════════════════════════════════

-- 5.1) Clases de BailaNow TV (publicadas y gratis, se ven sin sesión)
insert into public.tv_titles (id, type, title, slug, description, style, level, access, status, featured, cover_url, rating, views) values
  ('d0000000-0000-4000-a000-000000000001', 'clase', 'Salsa para principiantes', 'salsa-principiantes',
   'Aprende los pasos básicos de la salsa cubana desde cero: tiempo, giros y el famoso "dile que no".',
   'salsa', 'principiante', 'free', 'published', true,
   'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80', 4.8, 1240),
  ('d0000000-0000-4000-a000-000000000002', 'clase', 'Bachata sensual: fundamentos', 'bachata-sensual',
   'Domina la conexión, las ondas de cuerpo y la musicalidad de la bachata sensual moderna.',
   'bachata', 'intermedio', 'free', 'published', false,
   'https://images.unsplash.com/photo-1546427660-eb346c344ba5?w=800&q=80', 4.9, 980),
  ('d0000000-0000-4000-a000-000000000003', 'clase', 'Kizomba: primeros pasos', 'kizomba-basico',
   'Introducción a la kizomba: postura, caminata y conexión en pareja.',
   'kizomba', 'principiante', 'basico', 'published', false,
   'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80', 4.7, 610)
on conflict (id) do nothing;

-- 5.2) Lecciones de cada clase demo
insert into public.tv_lessons (id, title_id, position, name, video_url, duration_seconds, access) values
  ('e0000000-0000-4000-a000-000000000001', 'd0000000-0000-4000-a000-000000000001', 1, 'El paso básico', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 480, 'free'),
  ('e0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000001', 2, 'El giro de la dama', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 540, 'free'),
  ('e0000000-0000-4000-a000-000000000003', 'd0000000-0000-4000-a000-000000000001', 3, 'Dile que no', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 600, 'free'),
  ('e0000000-0000-4000-a000-000000000004', 'd0000000-0000-4000-a000-000000000002', 1, 'Postura y conexión', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 420, 'free'),
  ('e0000000-0000-4000-a000-000000000005', 'd0000000-0000-4000-a000-000000000002', 2, 'Ondas de cuerpo', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 510, 'free'),
  ('e0000000-0000-4000-a000-000000000006', 'd0000000-0000-4000-a000-000000000003', 1, 'La caminata kizomba', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 450, 'basico')
on conflict (id) do nothing;

-- 5.3) Un reto de baile activo
insert into public.retos (id, title, description, style, cover_url, starts, ends) values
  ('c0000000-0000-4000-a000-000000000001', 'Reto #BailaNowSalsa',
   'Sube tu mejor combinación de salsa de 30 segundos. Los más votados ganan visibilidad en la home.',
   'salsa', 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80',
   current_date, current_date + interval '30 days')
on conflict (id) do nothing;

-- 5.4) Una ruta de hoy (usa un admin/superadmin real como creador)
insert into public.rutas (id, creator_id, creator_name, title, city, description, date, time, stops)
select
  'a0000000-0000-4000-a000-000000000001', p.id, coalesce(p.full_name, 'BailaNow'),
  'Ruta salsera del sábado', coalesce(p.city, p.location, 'Madrid'),
  'Empezamos con una clase gratis y seguimos de social por los mejores locales de la ciudad.',
  current_date, '21:00',
  '[{"name":"Clase de bienvenida","time":"21:00"},{"name":"Social salsa","time":"22:30"},{"name":"After bachata","time":"01:00"}]'::jsonb
from public.profiles p
where p.role in ('admin', 'superadmin')
order by p.created_at asc
limit 1
on conflict (id) do nothing;

-- ── Para BORRAR los datos demo cuando ya tengas contenido real, ejecuta:
-- delete from public.tv_titles where id like 'd0000000-%';
-- delete from public.retos     where id = 'c0000000-0000-4000-a000-000000000001';
-- delete from public.rutas     where id = 'a0000000-0000-4000-a000-000000000001';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 2/8 · MÓDULO PARTNER POR CIUDADES                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
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


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 3/8 · BANDEJA UNIFICADA + ENLACE DE CIUDAD + REDES                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- BailaNow · BANDEJA UNIFICADA del Partner + enlace de ciudad + redes sociales.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
-- Requiere que partner-module.sql ya se haya ejecutado (tabla partners, is_admin()).
--
-- Todo lo que llega por el enlace de ciudad (bailanow.com/Madrid) o por las
-- redes conectadas del partner cae en UNA bandeja: partner_inquiries.
-- El partner responde desde su panel; las respuestas van a partner_inquiry_messages.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ══════════════════════════════════════════════════════════════════
-- 1) BANDEJA · cada fila = una pregunta/lead entrante (de cualquier canal)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  city text,
  channel text not null default 'web',            -- web | instagram | facebook | whatsapp | tiktok
  contact_name text,
  contact_handle text,                            -- @usuario, email o teléfono
  contact_email text,
  subject text,
  message text not null,
  status text not null default 'new',             -- new | answered | closed
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index if not exists partner_inquiries_partner_idx on public.partner_inquiries (partner_id, status);
create index if not exists partner_inquiries_channel_idx on public.partner_inquiries (channel);

-- ══════════════════════════════════════════════════════════════════
-- 2) MENSAJES del hilo (respuestas del partner; entrantes extra vía integración)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.partner_inquiries(id) on delete cascade,
  from_partner boolean not null default true,     -- true = respuesta del partner
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists partner_inquiry_messages_idx on public.partner_inquiry_messages (inquiry_id, created_at);

-- ══════════════════════════════════════════════════════════════════
-- 3) REDES SOCIALES conectadas del partner (los DMs caen en la bandeja)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_social_connections (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  provider text not null,                          -- instagram | facebook | whatsapp | tiktok
  handle text,
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (partner_id, provider)
);
create index if not exists partner_social_partner_idx on public.partner_social_connections (partner_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════
alter table public.partner_inquiries          enable row level security;
alter table public.partner_inquiry_messages   enable row level security;
alter table public.partner_social_connections enable row level security;

-- Bandeja: cualquiera puede CREAR una consulta (formulario público de la ciudad);
-- solo el partner dueño (o admin) la lee, actualiza y borra.
drop policy if exists pi_insert on public.partner_inquiries;
create policy pi_insert on public.partner_inquiries for insert with check (true);
drop policy if exists pi_read on public.partner_inquiries;
create policy pi_read on public.partner_inquiries for select using (auth.uid() = partner_id or public.is_admin());
drop policy if exists pi_update on public.partner_inquiries;
create policy pi_update on public.partner_inquiries for update using (auth.uid() = partner_id or public.is_admin()) with check (auth.uid() = partner_id or public.is_admin());
drop policy if exists pi_delete on public.partner_inquiries;
create policy pi_delete on public.partner_inquiries for delete using (auth.uid() = partner_id or public.is_admin());

-- Mensajes del hilo: los lee el partner/admin del hilo; solo el partner/admin
-- publica respuestas (from_partner). Los entrantes extra los inserta la
-- integración con la clave de servicio (bypassa RLS).
drop policy if exists pim_read on public.partner_inquiry_messages;
create policy pim_read on public.partner_inquiry_messages for select using (
  exists (select 1 from public.partner_inquiries i where i.id = inquiry_id and (i.partner_id = auth.uid() or public.is_admin()))
);
drop policy if exists pim_insert on public.partner_inquiry_messages;
create policy pim_insert on public.partner_inquiry_messages for insert with check (
  from_partner = true and
  exists (select 1 from public.partner_inquiries i where i.id = inquiry_id and (i.partner_id = auth.uid() or public.is_admin()))
);

-- Redes sociales: solo el propio partner (y admin).
drop policy if exists psc_own on public.partner_social_connections;
create policy psc_own on public.partner_social_connections for all
  using (auth.uid() = partner_id or public.is_admin())
  with check (auth.uid() = partner_id or public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 4) RESOLVER PARTNER DE UNA CIUDAD (para la página pública /Ciudad)
--    SECURITY DEFINER: expone SOLO lo mínimo, sin filtrar comisiones ni datos.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.city_partner(p_city text)
returns table (partner_id uuid, display_name text, socials jsonb)
language sql stable security definer set search_path = public as $$
  select
    p.user_id,
    p.display_name,
    coalesce(
      (select jsonb_agg(jsonb_build_object('provider', s.provider, 'handle', s.handle))
       from public.partner_social_connections s
       where s.partner_id = p.user_id and s.connected),
      '[]'::jsonb
    )
  from public.partners p
  where p.status = 'active'
    and exists (select 1 from unnest(p.cities) c where lower(c) = lower(p_city))
  order by p.created_at asc
  limit 1;
$$;
grant execute on function public.city_partner(text) to anon, authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 4/8 · EQUIPO RRPP/PROMOTORES + POLÍTICA DE COMISIONES               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
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


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 5/8 · ENRUTADO DE REDES SOCIALES (para las Edge Functions)          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- BailaNow · Enrutado de redes sociales para la bandeja del partner.
-- Ejecutar UNA vez (después de partner-inbox.sql). 100% idempotente.
--
-- Añade cómo identificar a qué partner pertenece un mensaje entrante de Meta
-- (Instagram/Facebook/WhatsApp) y dónde guardar los tokens de forma SEGURA
-- (tabla sin acceso desde el cliente: solo las Edge Functions con service_role).

-- 1) Identificador de la cuenta en cada red (page_id / ig_id / phone_number_id).
--    El webhook entrante trae este id; así sabemos de qué partner es el mensaje.
alter table public.partner_social_connections add column if not exists account_id text;
create index if not exists partner_social_account_idx on public.partner_social_connections (account_id);

-- 2) Tokens de acceso (SECRETOS) — tabla aislada, nunca expuesta al navegador.
--    Con RLS activado y solo política de admin, el cliente anónimo/usuario NO puede
--    leerla; las Edge Functions usan service_role y saltan RLS.
create table if not exists public.partner_social_tokens (
  partner_id uuid not null,
  provider text not null,                          -- instagram | facebook | whatsapp
  access_token text,                               -- token de página / WhatsApp
  account_id text,                                 -- page_id / ig_id
  phone_number_id text,                            -- solo WhatsApp
  updated_at timestamptz not null default now(),
  primary key (partner_id, provider)
);

alter table public.partner_social_tokens enable row level security;
-- Solo admin/superadmin puede gestionar tokens desde el panel o el SQL editor.
-- (service_role de las Edge Functions ignora RLS.)
drop policy if exists pst_admin on public.partner_social_tokens;
create policy pst_admin on public.partner_social_tokens for all
  using (public.is_admin()) with check (public.is_admin());


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 6/8 · CONECTOR GHL (GoHighLevel) — ghl_location_id en partners       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- BailaNow · Conector GHL (GoHighLevel) para la bandeja del partner.
-- Ejecutar UNA vez (después de partner-inbox.sql). 100% idempotente.
--
-- GHL ya trae inbox unificado (IG/FB/WhatsApp/SMS/Email). Solo necesitamos saber
-- qué "location" de GHL corresponde a cada partner para enrutar los mensajes.
-- El token de la API de GHL se guarda en partner_social_tokens (provider='ghl').

alter table public.partners add column if not exists ghl_location_id text;
create index if not exists partners_ghl_location_idx on public.partners (ghl_location_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 7/8 · RECURSOS PARA PARTNERS (biblioteca por categorías)             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
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


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOQUE 8/8 · NOTIFICACIONES EN TIEMPO REAL (ventas, consultas, retiros)     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- BailaNow · Notificaciones en TIEMPO REAL para dashboards (creadores, vendedores, partners).
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
--
-- 1) Asegura la tabla notifications + RLS.
-- 2) La activa en Realtime (supabase_realtime) para que lleguen al instante.
-- 3) Triggers que crean notificaciones automáticas en: nuevas consultas (bandeja
--    del partner), nuevas ventas (escrow) y cambios de estado de retiros.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ── 1) Tabla ──────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'info',        -- sale | consulta | withdrawal | booking | payment | refund | info
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select using (auth.uid() = user_id);
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert with check (public.is_admin() or auth.uid() = user_id);

-- ── 2) Realtime ───────────────────────────────────────────────────
-- Añadir la tabla a la publicación de realtime (ignora si ya está añadida).
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when others then null;
end $$;

-- Helper para insertar notificaciones desde triggers (SECURITY DEFINER = salta RLS).
create or replace function public.push_notification(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
end $$;

-- ── 3a) Consultas nuevas → notifica al partner ────────────────────
create or replace function public.notify_partner_inquiry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.push_notification(
    new.partner_id, 'consulta', 'Nueva consulta',
    coalesce(new.contact_name, 'Alguien') || ': ' || left(coalesce(new.message,''), 80),
    '/partner');
  return new;
end $$;
drop trigger if exists trg_notify_inquiry on public.partner_inquiries;
create trigger trg_notify_inquiry after insert on public.partner_inquiries
  for each row execute function public.notify_partner_inquiry();

-- ── 3b) Retiros del partner: cambio de estado → notifica ──────────
create or replace function public.notify_partner_withdrawal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.push_notification(
      new.partner_id, 'withdrawal', 'Retiro ' ||
      case new.status when 'paid' then 'pagado ✔️' when 'rejected' then 'rechazado' else new.status end,
      'Importe: €' || new.amount, '/partner');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_withdrawal on public.partner_withdrawals;
create trigger trg_notify_withdrawal after update on public.partner_withdrawals
  for each row execute function public.notify_partner_withdrawal();

-- ── 3c) Ventas (escrow) → notifica al vendedor. DEFENSIVO: solo si
--        existe la tabla escrows con columna payee_id. ─────────────
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='escrows' and column_name='payee_id') then
    execute $f$
      create or replace function public.notify_escrow_sale()
      returns trigger language plpgsql security definer set search_path = public as $inner$
      begin
        perform public.push_notification(
          new.payee_id, 'sale', 'Nueva venta 💸',
          'Has recibido un pago de €' || coalesce(new.amount::text,'0') ||
          case when new.concept is not null then ' · ' || new.concept else '' end,
          '/dashboard');
        return new;
      end $inner$;
    $f$;
    execute 'drop trigger if exists trg_notify_sale on public.escrows';
    execute 'create trigger trg_notify_sale after insert on public.escrows for each row execute function public.notify_escrow_sale()';
  end if;
end $$;
