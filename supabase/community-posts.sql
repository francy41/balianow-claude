-- ════════════════════════════════════════════════════════════════════
--  BailaNow — Tabla community_posts (Ruta de Hoy / Ofertas y Demandas)
--  Posts de la comunidad: ofertas y demandas que se muestran en la home.
--  Ejecutar en Supabase → SQL Editor (una sola vez).
-- ════════════════════════════════════════════════════════════════════

-- 1) Tabla
create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  user_name  text not null,
  full_text  text not null,
  location   text,
  category   text not null default 'comunidad',
  status     text not null default 'PENDIENTE',  -- PENDIENTE | APROBADO | RECHAZADO
  created_at timestamptz not null default now()
);

create index if not exists community_posts_status_created_idx
  on public.community_posts (status, created_at desc);

-- 2) Seguridad a nivel de fila
alter table public.community_posts enable row level security;

-- Lectura pública: cualquiera ve solo los posts APROBADOS
drop policy if exists "community read approved" on public.community_posts;
create policy "community read approved" on public.community_posts
  for select using (status = 'APROBADO' or public.is_admin());

-- Insertar: un usuario autenticado puede publicar (queda PENDIENTE hasta aprobación)
drop policy if exists "community insert own" on public.community_posts;
create policy "community insert own" on public.community_posts
  for insert with check (
    public.is_admin()
    or (auth.uid() = user_id and status = 'PENDIENTE')
  );

-- Admin: control total (aprobar, rechazar, editar, borrar)
drop policy if exists "community admin all" on public.community_posts;
create policy "community admin all" on public.community_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Datos de ejemplo (ofertas y demandas)
insert into public.community_posts (user_name, full_text, location, category, status) values
  ('Elena García',      'Primera vez en Madrid, busco un local donde bailar bachata esta noche. ¡Alguien que me recomiende el mejor lugar!', 'Madrid',            'localidades', 'APROBADO'),
  ('Miguel Ángel',      '¿Alguien para practicar ruedas de casino? Tengo nivel intermedio y busco pareja para entrenamiento en Barcelona.',   'Barcelona',         'bailarines',  'APROBADO'),
  ('Sofía Tomás',       'OFERTA: Tengo 2 entradas extra para el concierto de Grupo Mania en Medellín. ¡Rápido, se agotan en minutos!',        'Medellín',          'eventos',     'APROBADO'),
  ('Daniel Cruz',       '¿Cuál es la mejor discoteca latina abierta ahora en Valencia? Queremos bailar sábado por la noche.',                'Valencia',          'localidades', 'APROBADO'),
  ('María Vargas',      'Buscamos grupo para ir a Tropical House Nightclub. ¡Somos 4 personas de Cali! ¿Quién quiere unirse?',              'Cali',              'eventos',     'APROBADO'),
  ('Carlos Méndez',     'El viernes voy a Madrid, ¿dónde puedo salir a bailar? Prefiero salsa y ambiente latino auténtico.',                'Madrid',            'artistas',    'APROBADO'),
  ('Laura Silva',       'Busco pareja para ir a la social de salsa de este jueves. ¡Nivel intermedio! ¿Quién está interesado?',            'Barcelona',         'bailarines',  'APROBADO'),
  ('David Rojas',       '¿Algún evento de Kizomba esta semana? Quiero aprender con alguien experimentado en Valencia.',                    'Valencia',          'eventos',     'APROBADO'),
  ('Ana Belén',         'OFERTA: Doy clases particulares de bachata sensual, primera clase gratis. Zona centro de Sevilla.',               'Sevilla',           'artistas',    'APROBADO'),
  ('Javier Núñez',      'Comparto coche a la fiesta latina de Zaragoza este sábado, salgo desde Madrid. ¡3 plazas libres!',                'Madrid',            'comunidad',   'APROBADO'),
  ('Camila Restrepo',   'Busco academia de salsa caleña para principiantes en Bogotá. ¿Recomendaciones con buen ambiente?',                'Bogotá',            'localidades', 'APROBADO'),
  ('Roberto Díaz',      'OFERTA: Vendo par de zapatos de baile latino, talla 42, casi nuevos. Precio a convenir en Barcelona.',            'Barcelona',         'comunidad',   'APROBADO'),
  ('Lucía Fernández',   'Somos un grupo de 6 buscando DJ de salsa y timba para una fiesta privada en Valencia el mes que viene.',          'Valencia',          'artistas',    'APROBADO'),
  ('Andrés Molina',     '¿Dónde hay social de bachata dominicana los domingos en Miami? Nivel avanzado, busco ambiente auténtico.',        'Miami',             'localidades', 'APROBADO'),
  ('Valentina Ruiz',    'OFERTA: 4 entradas con descuento para el Congreso Latino de Cali. ¡Aprovechen antes del viernes!',                'Cali',              'eventos',     'APROBADO'),
  ('Gabriel Ortiz',     'Busco pareja de baile femenina para competición de salsa en Ciudad de México. Ensayos 2 veces por semana.',       'Ciudad de México',  'bailarines',  'APROBADO'),
  ('Paula Gómez',       '¿Alguien va al festival de kizomba de Buenos Aires? Busco compañía para compartir alojamiento.',                   'Buenos Aires',      'eventos',     'APROBADO'),
  ('Sergio Ramírez',    'OFERTA: Organizo taller intensivo de rueda de casino este finde en Madrid. Plazas limitadas, apúntate.',          'Madrid',            'artistas',    'APROBADO')
on conflict do nothing;
