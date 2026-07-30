-- ══════════════════════════════════════════════════════════════════════════
-- MÓDULO PERFIL PÚBLICO DE PARTNER  (habilita A + C del frontend)
-- Cómo aplicar: Supabase → SQL Editor → pega y Run.
-- Es idempotente (se puede ejecutar varias veces sin romper nada).
-- ══════════════════════════════════════════════════════════════════════════

-- ── A) Branding del partner: slug (para la URL) + logo + portada ────────────
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS slug      text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS logo_url  text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS cover_url text;
-- (bio ya existe)

-- Slug único (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS partners_slug_key ON public.partners (lower(slug)) WHERE slug IS NOT NULL;

-- Backfill de slug desde el nombre para los partners que aún no tengan uno
UPDATE public.partners
SET slug = regexp_replace(lower(coalesce(display_name, 'partner')), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL OR slug = '';

-- ── C) Seguidores del partner ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_followers (
  partner_id uuid NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);
ALTER TABLE public.partner_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_followers_read   ON public.partner_followers;
DROP POLICY IF EXISTS partner_followers_insert ON public.partner_followers;
DROP POLICY IF EXISTS partner_followers_delete ON public.partner_followers;
-- Cualquiera puede leer (para contar seguidores)
CREATE POLICY partner_followers_read   ON public.partner_followers FOR SELECT USING (true);
-- Un usuario solo puede seguir / dejar de seguir como él mismo
CREATE POLICY partner_followers_insert ON public.partner_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY partner_followers_delete ON public.partner_followers FOR DELETE USING (auth.uid() = user_id);

-- ── RPC público: datos del partner por slug (respeta el patrón de city_partner) ─
CREATE OR REPLACE FUNCTION public.partner_by_slug(p_slug text)
RETURNS TABLE (partner_id uuid, display_name text, bio text, logo_url text, cover_url text, cities text[], socials json)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.display_name, p.bio, p.logo_url, p.cover_url, p.cities,
    coalesce(
      (SELECT json_agg(json_build_object('provider', s.provider, 'handle', s.handle))
       FROM partner_social_connections s
       WHERE s.partner_id = p.user_id AND s.connected AND s.handle IS NOT NULL),
      '[]'::json)
  FROM partners p
  WHERE lower(p.slug) = lower(p_slug) AND p.status = 'active'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.partner_by_slug(text) TO anon, authenticated;

-- Verifica:
SELECT display_name, slug, cities FROM public.partners ORDER BY created_at DESC;
