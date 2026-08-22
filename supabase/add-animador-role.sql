-- BailaNow · Nueva categoría de artista: "Animador/a" (animador de eventos, MC).
-- Dos cambios independientes:
--
-- 1) profiles.role es un ENUM (public.user_role) — añadir un valor a un enum
--    con ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de una transacción
--    junto a otras sentencias. Ejecuta ESTE BLOQUE SOLO, pulsa Run, y luego
--    ejecuta el resto del archivo por separado.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'animador';

-- 2) artists.type tiene un CHECK que solo permite ('dj','dancer','singer','band','instructor'),
--    pero el editor de admin (FIELDS_ARTIST) ya ofrece más valores que ese CHECK no permitía
--    (musician, artist, choreographer, event-organizer, promoter, videographer, photographer) —
--    guardar cualquiera de esos fallaba. Se amplía el CHECK para incluir todos los valores
--    reales que usa el frontend, más 'animador'. Ejecutar por separado del bloque anterior.

ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_type_check;
ALTER TABLE public.artists ADD CONSTRAINT artists_type_check
  CHECK (type IN (
    'dj','dancer','singer','musician','band','instructor','artist',
    'choreographer','event-organizer','promoter','videographer','photographer',
    'animador'
  ));
