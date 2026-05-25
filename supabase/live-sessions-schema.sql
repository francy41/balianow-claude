-- ============================================================
-- BailaNow — Live Sessions schema
-- Permite que cualquier creador (DJ, bailarín, instructor, artista,
-- venue) inicie un live con 4 modelos de monetización:
--   - free        (gratuito)
--   - paid        (entrada de pago, único)
--   - reservation (requiere reserva previa: clases programadas)
--   - donation    (entrada libre + propinas en vivo)
--
-- Cada live tiene preview_url (clip de 60s) que se muestra al usuario
-- antes de entrar al stream.
-- ============================================================
-- Run AFTER schema.sql + oauth-trigger.sql.
-- Idempotente.
-- ============================================================

-- 1. LIVE_SESSIONS
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'show'
                  CHECK (category IN ('show','class','event','jam','workshop')),
  pricing_mode    TEXT NOT NULL DEFAULT 'free'
                  CHECK (pricing_mode IN ('free','paid','reservation','donation')),
  price           NUMERIC(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'EUR',
  cover_url       TEXT DEFAULT '',
  preview_url     TEXT DEFAULT '',   -- clip 60s (mp4/webm/youtube)
  jitsi_room      TEXT,              -- generado al crear (uuid)
  stream_url      TEXT,              -- si stream externo
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','live','ended','cancelled')),
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  viewers_count   INT DEFAULT 0,
  peak_viewers    INT DEFAULT 0,
  total_revenue   NUMERIC(10,2) DEFAULT 0,
  tags            TEXT[] DEFAULT '{}',
  styles          TEXT[] DEFAULT '{}',
  city            TEXT DEFAULT '',
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LIVE_TICKETS (acceso a lives de pago / reserva)
CREATE TABLE IF NOT EXISTS public.live_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paid   NUMERIC(10,2) DEFAULT 0,
  currency      TEXT DEFAULT 'EUR',
  payment_id    TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','refunded','used')),
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- 3. LIVE_DONATIONS (propinas durante el live)
CREATE TABLE IF NOT EXISTS public.live_donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name     TEXT,
  amount        NUMERIC(10,2) NOT NULL,
  currency      TEXT DEFAULT 'EUR',
  message       TEXT,
  payment_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_live_sessions_host    ON public.live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status  ON public.live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_sched   ON public.live_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_cat     ON public.live_sessions(category);
CREATE INDEX IF NOT EXISTS idx_live_tickets_session  ON public.live_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_user     ON public.live_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_live_donations_session ON public.live_donations(session_id);

-- 5. RLS — public read sesiones live, host gestiona
ALTER TABLE public.live_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read live sessions" ON public.live_sessions;
CREATE POLICY "Public read live sessions" ON public.live_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Host manage own sessions" ON public.live_sessions;
CREATE POLICY "Host manage own sessions" ON public.live_sessions
  FOR ALL USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users read own tickets" ON public.live_tickets;
CREATE POLICY "Users read own tickets" ON public.live_tickets FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT host_id FROM public.live_sessions WHERE id = session_id));

DROP POLICY IF EXISTS "Users buy ticket" ON public.live_tickets;
CREATE POLICY "Users buy ticket" ON public.live_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read donations" ON public.live_donations;
CREATE POLICY "Public read donations" ON public.live_donations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users donate" ON public.live_donations;
CREATE POLICY "Users donate" ON public.live_donations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.live_sessions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Helper view: live sessions con datos del host pre-unidos
CREATE OR REPLACE VIEW public.live_sessions_enriched AS
SELECT
  ls.*,
  COALESCE(p.full_name, p.name, 'Creador') AS host_name,
  COALESCE(p.avatar_url, p.avatar, '')      AS host_avatar,
  COALESCE(p.role, 'user')                  AS host_role,
  COALESCE(p.location, p.city, '')          AS host_city
FROM public.live_sessions ls
LEFT JOIN public.profiles p ON p.id = ls.host_id;

GRANT SELECT ON public.live_sessions_enriched TO anon, authenticated;
