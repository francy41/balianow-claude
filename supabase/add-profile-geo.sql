-- ============================================================
-- BailaNow — Add geo + tags/styles columns to `profiles`
-- Permite que perfiles aparezcan en "Cerca de mí" / Mapa
-- y que se vinculen con filtros de estilos/tags
-- ============================================================
-- Run in Supabase Dashboard → SQL Editor → New query
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lat        DOUBLE PRECISION;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lng        DOUBLE PRECISION;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags       TEXT[] DEFAULT '{}';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS styles     TEXT[] DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill lat/lng desde la ciudad para perfiles existentes (top 30 ciudades)
WITH city_coords (city, lat, lng) AS (
  VALUES
    ('Madrid',         40.4168,  -3.7038),
    ('Barcelona',      41.3851,   2.1734),
    ('Valencia',       39.4699,  -0.3763),
    ('Sevilla',        37.3891,  -5.9845),
    ('Bilbao',         43.2630,  -2.9350),
    ('Málaga',         36.7213,  -4.4214),
    ('Malaga',         36.7213,  -4.4214),
    ('Granada',        37.1773,  -3.5986),
    ('Zaragoza',       41.6488,  -0.8891),
    ('Paris',          48.8566,   2.3522),
    ('París',          48.8566,   2.3522),
    ('Londres',        51.5074,  -0.1278),
    ('London',         51.5074,  -0.1278),
    ('Berlín',         52.5200,  13.4050),
    ('Berlin',         52.5200,  13.4050),
    ('Roma',           41.9028,  12.4964),
    ('Rome',           41.9028,  12.4964),
    ('Milano',         45.4642,   9.1900),
    ('Milán',          45.4642,   9.1900),
    ('Miami',          25.7617, -80.1918),
    ('New York',       40.7128, -74.0060),
    ('Cali',            3.4516, -76.5320),
    ('Bogotá',          4.7110, -74.0721),
    ('Bogota',          4.7110, -74.0721),
    ('Medellín',        6.2476, -75.5658),
    ('Medellin',        6.2476, -75.5658),
    ('La Habana',      23.1136, -82.3666),
    ('Habana',         23.1136, -82.3666),
    ('Santo Domingo',  18.4861, -69.9312),
    ('Buenos Aires',  -34.6037, -58.3816),
    ('Lima',          -12.0464, -77.0428),
    ('México DF',      19.4326, -99.1332),
    ('Mexico DF',      19.4326, -99.1332),
    ('CDMX',           19.4326, -99.1332)
)
UPDATE public.profiles p
SET    lat = cc.lat,
       lng = cc.lng
FROM   city_coords cc
WHERE  p.lat IS NULL
  AND  (LOWER(TRIM(p.location)) = LOWER(cc.city) OR LOWER(TRIM(p.city)) = LOWER(cc.city));

-- Index para queries geográficas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng ON public.profiles(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role    ON public.profiles(role);
