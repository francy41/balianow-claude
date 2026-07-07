-- ════════════════════════════════════════════════════════════════════
--  BailaNow — Ejemplos por categoría para el foro de comunidad
--  Ejecutar en Supabase → SQL Editor (una sola vez).
--  Categorías: salir | bailarines | cantantes | musicos | djs | eventos | sugerencias
-- ════════════════════════════════════════════════════════════════════

insert into public.community_posts (user_name, full_text, location, category, status) values
  ('Marcos Lía',      '¿Salimos a bailar esta noche? Busco grupo para una discoteca latina en Madrid. ¡Ambiente salsero!',   'Madrid',        'salir',       'APROBADO'),
  ('Nuria Pastor',    '¿Alguien se apunta a bailar bachata el viernes? Somos 3 y buscamos más gente en Barcelona.',           'Barcelona',     'salir',       'APROBADO'),
  ('Eventos LatinCH', 'Busco bailarines de salsa para un evento en Suiza (Zúrich). Remunerado, fin de semana.',              'Zúrich',        'bailarines',  'APROBADO'),
  ('Diego Salsa',     'Soy bailarín de salsa profesional, disponible para shows en Buenos Aires. Portfolio disponible.',      'Buenos Aires',  'bailarines',  'APROBADO'),
  ('Marta Vocal',     'Busco cantantes de bachata para una colaboración en Madrid. Proyecto serio con estudio propio.',       'Madrid',        'cantantes',   'APROBADO'),
  ('Orquesta Timba',  'Busco músico pianista de salsa en Valencia para orquesta estable. Ensayos semanales.',                'Valencia',      'musicos',     'APROBADO'),
  ('Luis Trompeta',   'Soy músico trompetista de salsa, ofrezco mis servicios en Madrid y toda España. +10 años de exp.',    'Madrid',        'musicos',     'APROBADO'),
  ('Club Aguacate',   'Busco DJs de salsa y timba en Medellín para noches fijas los sábados. ¡Escríbeme!',                   'Medellín',      'djs',         'APROBADO'),
  ('DJ Caramelo',     'Soy DJ de salsa y bachata, disponible para eventos privados en Sevilla y alrededores.',               'Sevilla',       'djs',         'APROBADO'),
  ('Festival Latino', 'OFERTA: Entradas early bird para el Festival Latino de Valencia. Descuento del 30% esta semana.',     'Valencia',      'eventos',     'APROBADO'),
  ('Ana Ideas',       'Sugerencia: estaría genial poder filtrar los eventos por estilo (salsa, bachata, kizomba).',          'Online',        'sugerencias', 'APROBADO'),
  ('Pablo Feedback',  'Sugerencia: añadir un mapa con las discotecas latinas abiertas ahora mismo. ¡Sería top!',            'Online',        'sugerencias', 'APROBADO')
on conflict do nothing;
