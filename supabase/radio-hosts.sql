-- ════════════════════════════════════════════════════════════════
-- LOCUTORES DE RADIO — "Locutores en vivo" de la página /radio
--
-- Aplicar en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Hasta que esta tabla exista, la sección pública sencillamente no se
-- pinta: la consulta falla y el listado se queda vacío. Y con la tabla
-- creada pero sin filas, tampoco aparece. Solo sale cuando hay locutores
-- dados de alta desde el panel de administración.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.radio_hosts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  tagline     text,          -- apodo o lema: "La Salsera", "El Kizombero"
  avatar_url  text,
  schedule    text,          -- franja informativa: "L-V 18:00-20:00"
  is_live     boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS radio_hosts_order_idx ON public.radio_hosts (sort_order);
CREATE INDEX IF NOT EXISTS radio_hosts_live_idx  ON public.radio_hosts (is_live) WHERE is_live;

ALTER TABLE public.radio_hosts ENABLE ROW LEVEL SECURITY;

-- Lectura pública: la web muestra los locutores a cualquier visitante.
DROP POLICY IF EXISTS "radio_hosts_public_read" ON public.radio_hosts;
CREATE POLICY "radio_hosts_public_read" ON public.radio_hosts
  FOR SELECT USING (true);

-- Escritura solo admin/superadmin, con la misma función que el resto del panel.
DROP POLICY IF EXISTS "radio_hosts_admin_all" ON public.radio_hosts;
CREATE POLICY "radio_hosts_admin_all" ON public.radio_hosts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Sin filas de ejemplo a propósito: los locutores se dan de alta desde
-- Admin → Radio · Locutores, con sus nombres y sus fotos de verdad.
