-- ════════════════════════════════════════════════════════════════
-- Migración: añade geo + tags + styles a profiles
-- Idempotente: usa IF NOT EXISTS, se puede ejecutar varias veces
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lat       double precision,
  ADD COLUMN IF NOT EXISTS lng       double precision,
  ADD COLUMN IF NOT EXISTS tags      text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS styles    text[]  DEFAULT '{}';

CREATE INDEX IF NOT EXISTS profiles_geo_idx   ON public.profiles (lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_role_idx  ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_city_idx  ON public.profiles (city);

-- Backfill coordenadas para perfiles existentes que tengan ciudad pero no lat/lng
UPDATE public.profiles p SET lat = c.lat, lng = c.lng
FROM (VALUES
  ('Madrid',      40.4168, -3.7038),
  ('Barcelona',   41.3851,  2.1734),
  ('Valencia',    39.4699, -0.3763),
  ('Sevilla',     37.3891, -5.9845),
  ('Zaragoza',    41.6488, -0.8891),
  ('Málaga',      36.7213, -4.4214),
  ('Bilbao',      43.2630, -2.9350),
  ('Palma',       39.5696,  2.6502),
  ('Murcia',      37.9922, -1.1307),
  ('Granada',     37.1773, -3.5986),
  ('Alicante',    38.3452, -0.4810),
  ('Córdoba',     37.8882, -4.7794),
  ('Vigo',        42.2406, -8.7207),
  ('Gijón',       43.5453, -5.6619),
  ('La Coruña',   43.3623, -8.4115),
  ('Pamplona',    42.8125, -1.6458),
  ('Santander',   43.4623, -3.8099),
  ('Lisboa',      38.7223, -9.1393),
  ('Porto',       41.1579, -8.6291),
  ('París',       48.8566,  2.3522),
  ('Roma',        41.9028, 12.4964),
  ('Milán',       45.4642,  9.1900),
  ('Berlín',      52.5200, 13.4050),
  ('Londres',     51.5074, -0.1278),
  ('Bruselas',    50.8503,  4.3517),
  ('Ámsterdam',   52.3676,  4.9041),
  ('Buenos Aires',-34.6037,-58.3816),
  ('Bogotá',       4.7110,-74.0721),
  ('Lima',       -12.0464,-77.0428),
  ('Ciudad de México',19.4326,-99.1332),
  ('La Habana',   23.1136,-82.3666),
  ('Caracas',     10.4806,-66.9036),
  ('Quito',       -0.1807,-78.4678),
  ('Santiago',   -33.4489,-70.6693),
  ('San Juan',    18.4655,-66.1057),
  ('Miami',       25.7617,-80.1918),
  ('Nueva York',  40.7128,-74.0060)
) AS c(city, lat, lng)
WHERE p.lat IS NULL
  AND p.city IS NOT NULL
  AND LOWER(TRIM(p.city)) = LOWER(c.city);
