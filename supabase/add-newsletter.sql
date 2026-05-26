-- ════════════════════════════════════════════════════════════════
-- Tabla newsletter_subscribers: emails recolectados desde el form web
-- Un trigger/workflow en GHL puede leer estos via webhook
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  name       text,
  source     text DEFAULT 'web',
  tags       text[] DEFAULT '{}',
  synced_to_ghl boolean DEFAULT false,
  ghl_contact_id text,
  unsubscribed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_email_idx  ON public.newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS newsletter_synced_idx ON public.newsletter_subscribers (synced_to_ghl) WHERE synced_to_ghl = false;

-- RLS: cualquiera puede SUSCRIBIRSE (insert), solo admins LEEN
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_insert" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_select_admin" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_update_admin" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_upsert" ON public.newsletter_subscribers;

-- Cualquiera puede INSERT (es el form público)
CREATE POLICY "newsletter_insert" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Cualquiera puede UPDATE si actualiza su propio email (para re-suscribirse)
CREATE POLICY "newsletter_upsert" ON public.newsletter_subscribers
  FOR UPDATE USING (true) WITH CHECK (true);

-- Solo admins/superadmins LEEN la lista
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','superadmin')
    )
  );

-- Touch updated_at en cada update
CREATE OR REPLACE FUNCTION public.touch_newsletter_updated() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_newsletter_updated ON public.newsletter_subscribers;
CREATE TRIGGER trg_touch_newsletter_updated
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.touch_newsletter_updated();
