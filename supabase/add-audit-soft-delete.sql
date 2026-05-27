-- ════════════════════════════════════════════════════════════════
-- Audit log + soft deletes + idempotency keys
-- Críticos para SaaS production-ready
-- ════════════════════════════════════════════════════════════════

-- ─── AUDIT LOGS ────────────────────────────────────────────────
-- Cada acción admin/sensible queda registrada con quién, qué, cuándo
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  actor_role  text,
  action      text NOT NULL,            -- 'create' | 'update' | 'delete' | 'login' | 'permission_change' | ...
  entity      text NOT NULL,            -- 'profile' | 'event' | 'venue' | 'booking' | ...
  entity_id   text,
  before_state jsonb,
  after_state  jsonb,
  diff        jsonb,
  ip          text,
  user_agent  text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')));

CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── SOFT DELETES ──────────────────────────────────────────────
-- Añade deleted_at a tablas críticas. NULL = vivo, timestamptz = borrado
ALTER TABLE public.profiles  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.artists   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.venues    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.events    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.bookings  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_alive_idx ON public.profiles (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS artists_alive_idx  ON public.artists  (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS venues_alive_idx   ON public.venues   (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS events_alive_idx   ON public.events   (id) WHERE deleted_at IS NULL;

-- Vista de items vivos (lecturas públicas usan estas)
CREATE OR REPLACE VIEW public.profiles_alive AS SELECT * FROM public.profiles WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.artists_alive  AS SELECT * FROM public.artists  WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.venues_alive   AS SELECT * FROM public.venues   WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.events_alive   AS SELECT * FROM public.events   WHERE deleted_at IS NULL;

-- ─── IDEMPOTENCY KEYS (anti doble cobro / doble post) ─────────
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key         text PRIMARY KEY,
  actor_id    uuid,
  endpoint    text,
  request_hash text,
  response    jsonb,
  status      integer,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS idempotency_expires_idx ON public.idempotency_keys (expires_at);

-- Función para limpiar keys viejas (correr periódicamente)
CREATE OR REPLACE FUNCTION public.cleanup_idempotency_keys() RETURNS void AS $$
BEGIN DELETE FROM public.idempotency_keys WHERE expires_at < now(); END $$ LANGUAGE plpgsql;

-- ─── HEALTH METRICS (para /api/health) ────────────────────────
CREATE OR REPLACE VIEW public.health_metrics AS
SELECT
  (SELECT count(*) FROM public.profiles WHERE deleted_at IS NULL) AS active_users,
  (SELECT count(*) FROM public.artists  WHERE deleted_at IS NULL) AS active_artists,
  (SELECT count(*) FROM public.venues   WHERE deleted_at IS NULL) AS active_venues,
  (SELECT count(*) FROM public.events   WHERE deleted_at IS NULL) AS active_events,
  (SELECT count(*) FROM public.bookings WHERE created_at > now() - interval '24 hours') AS bookings_24h,
  (SELECT count(*) FROM public.transactions WHERE created_at > now() - interval '24 hours') AS transactions_24h,
  (SELECT count(*) FROM public.live_sessions WHERE status = 'live') AS lives_now,
  now() AS checked_at;
