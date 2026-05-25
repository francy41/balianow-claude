-- ════════════════════════════════════════════════════════════════
-- LIVE SESSIONS: streaming + preview 60s + 4 modos de cobro
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'show',  -- show | class | event | jam | workshop
  pricing_mode    text NOT NULL DEFAULT 'free',  -- free | paid | reservation | donation
  price           numeric(10,2) DEFAULT 0,
  currency        text DEFAULT 'EUR',
  cover_url       text,
  preview_url     text,           -- clip de 60s
  jitsi_room      text NOT NULL,  -- nombre único de la sala
  status          text NOT NULL DEFAULT 'scheduled', -- scheduled | live | ended | cancelled
  scheduled_at    timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,
  styles          text[] DEFAULT '{}',
  tags            text[] DEFAULT '{}',
  city            text,
  lat             double precision,
  lng             double precision,
  viewers_count   integer DEFAULT 0,
  total_donations numeric(10,2) DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_sessions_status_idx   ON public.live_sessions (status);
CREATE INDEX IF NOT EXISTS live_sessions_category_idx ON public.live_sessions (category);
CREATE INDEX IF NOT EXISTS live_sessions_host_idx     ON public.live_sessions (host_id);
CREATE INDEX IF NOT EXISTS live_sessions_geo_idx      ON public.live_sessions (lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS live_sessions_started_idx  ON public.live_sessions (started_at DESC);

-- ── tickets (pago único + reservas) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_tickets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount         numeric(10,2) NOT NULL DEFAULT 0,
  currency       text DEFAULT 'EUR',
  status         text NOT NULL DEFAULT 'pending', -- pending | paid | refunded | cancelled
  payment_id     text,
  payment_method text,
  is_reservation boolean DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_tickets_user_idx    ON public.live_tickets (user_id);
CREATE INDEX IF NOT EXISTS live_tickets_session_idx ON public.live_tickets (session_id);

-- ── donaciones (tips en tiempo real) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_donations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name  text,
  amount      numeric(10,2) NOT NULL,
  currency    text DEFAULT 'EUR',
  message     text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_donations_session_idx ON public.live_donations (session_id, created_at DESC);

-- ── trigger: actualizar total_donations al insertar ─────────────
CREATE OR REPLACE FUNCTION public.bump_live_donations() RETURNS trigger AS $$
BEGIN
  UPDATE public.live_sessions
  SET total_donations = COALESCE(total_donations, 0) + NEW.amount,
      updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_live_donations ON public.live_donations;
CREATE TRIGGER trg_bump_live_donations
  AFTER INSERT ON public.live_donations
  FOR EACH ROW EXECUTE FUNCTION public.bump_live_donations();

-- ── vista enriquecida con datos del host ─────────────────────────
CREATE OR REPLACE VIEW public.live_sessions_enriched AS
SELECT
  s.*,
  p.name      AS host_name,
  p.avatar_url AS host_avatar,
  p.role      AS host_role,
  p.city      AS host_city
FROM public.live_sessions s
LEFT JOIN public.profiles p ON p.id = s.host_id;

-- ════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.live_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_tickets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_donations  ENABLE ROW LEVEL SECURITY;

-- live_sessions: lectura pública, escritura solo el host
DROP POLICY IF EXISTS "live_sessions_select"  ON public.live_sessions;
DROP POLICY IF EXISTS "live_sessions_insert"  ON public.live_sessions;
DROP POLICY IF EXISTS "live_sessions_update"  ON public.live_sessions;
DROP POLICY IF EXISTS "live_sessions_delete"  ON public.live_sessions;

CREATE POLICY "live_sessions_select" ON public.live_sessions
  FOR SELECT USING (true);
CREATE POLICY "live_sessions_insert" ON public.live_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "live_sessions_update" ON public.live_sessions
  FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "live_sessions_delete" ON public.live_sessions
  FOR DELETE USING (auth.uid() = host_id);

-- live_tickets: usuario ve los suyos + el host ve los de su sesión
DROP POLICY IF EXISTS "live_tickets_select" ON public.live_tickets;
DROP POLICY IF EXISTS "live_tickets_insert" ON public.live_tickets;

CREATE POLICY "live_tickets_select" ON public.live_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT host_id FROM public.live_sessions WHERE id = session_id)
  );
CREATE POLICY "live_tickets_insert" ON public.live_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- live_donations: lectura pública (para feed), insert autenticado
DROP POLICY IF EXISTS "live_donations_select" ON public.live_donations;
DROP POLICY IF EXISTS "live_donations_insert" ON public.live_donations;

CREATE POLICY "live_donations_select" ON public.live_donations
  FOR SELECT USING (true);
CREATE POLICY "live_donations_insert" ON public.live_donations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
