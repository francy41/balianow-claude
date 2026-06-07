-- ════════════════════════════════════════════════════════════════
-- DANCEFLOW — Módulo de baile con avatares IA + ranking mundial
-- Integrado dentro de BailaNow
-- ════════════════════════════════════════════════════════════════

-- ─── COREÓGRAFOS / AVATARES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dance_choreographers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  mode         text NOT NULL DEFAULT 'solo',     -- solo | pareja
  age_range    text,
  specialty    text[],                           -- géneros
  personality  text,
  avatar_emoji text DEFAULT '💃',
  avatar_url   text,
  gradient     text DEFAULT 'from-pink-500 to-fuchsia-600',
  rating       numeric(3,2) DEFAULT 4.8,
  review_count integer DEFAULT 0,
  bio          text,
  active       boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dance_choreo_mode_idx ON public.dance_choreographers (mode) WHERE active;

-- ─── SESIONES DE BAILE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dance_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choreographer_id uuid REFERENCES public.dance_choreographers(id),
  genre           text,
  sub_style       text,
  scenario        text DEFAULT 'discoteca',
  difficulty      text DEFAULT 'beginner',
  duration_seconds integer DEFAULT 0,
  score           integer DEFAULT 0,              -- puntos ganados esta sesión
  progress_pct    integer DEFAULT 0,
  status          text DEFAULT 'active',          -- active | completed
  started_at      timestamptz DEFAULT now(),
  ended_at        timestamptz
);

CREATE INDEX IF NOT EXISTS dance_sessions_user_idx ON public.dance_sessions (user_id, started_at DESC);

-- ─── SCORES / RANKING ──────────────────────────────────────────
-- Acumulado por usuario para el ranking mundial
CREATE TABLE IF NOT EXISTS public.dance_scores (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text,
  avatar_url       text,
  country_code     text DEFAULT 'ES',             -- ISO 3166-1 alpha-2
  country_name     text DEFAULT 'España',
  total_points     integer DEFAULT 0,
  sessions_count   integer DEFAULT 0,
  best_genre       text,
  level            integer DEFAULT 1,
  streak_days      integer DEFAULT 0,
  last_session_at  timestamptz,
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dance_scores_points_idx  ON public.dance_scores (total_points DESC);
CREATE INDEX IF NOT EXISTS dance_scores_country_idx ON public.dance_scores (country_code, total_points DESC);

-- ─── VISTA: Ranking mundial enriquecido ────────────────────────
CREATE OR REPLACE VIEW public.dance_world_leaderboard AS
SELECT
  s.user_id,
  COALESCE(s.display_name, p.full_name, 'Bailarín') AS name,
  COALESCE(s.avatar_url, p.avatar_url)              AS avatar,
  s.country_code,
  s.country_name,
  s.total_points,
  s.sessions_count,
  s.best_genre,
  s.level,
  s.streak_days,
  RANK() OVER (ORDER BY s.total_points DESC)                       AS world_rank,
  RANK() OVER (PARTITION BY s.country_code ORDER BY s.total_points DESC) AS country_rank
FROM public.dance_scores s
LEFT JOIN public.profiles p ON p.id = s.user_id
WHERE s.total_points > 0;

-- ─── VISTA: Ranking por país (agregado) ────────────────────────
CREATE OR REPLACE VIEW public.dance_country_ranking AS
SELECT
  country_code,
  country_name,
  count(*)               AS players,
  sum(total_points)      AS country_points,
  max(total_points)      AS top_score,
  RANK() OVER (ORDER BY sum(total_points) DESC) AS country_position
FROM public.dance_scores
WHERE total_points > 0
GROUP BY country_code, country_name;

-- ─── Función: sumar puntos tras una sesión ─────────────────────
CREATE OR REPLACE FUNCTION public.dance_add_points(
  p_user_id uuid,
  p_points integer,
  p_genre text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_avatar text DEFAULT NULL,
  p_country_code text DEFAULT NULL,
  p_country_name text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.dance_scores (user_id, display_name, avatar_url, country_code, country_name, total_points, sessions_count, best_genre, last_session_at, updated_at)
  VALUES (
    p_user_id, p_name, p_avatar,
    COALESCE(p_country_code, 'ES'), COALESCE(p_country_name, 'España'),
    p_points, 1, p_genre, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points   = public.dance_scores.total_points + p_points,
    sessions_count = public.dance_scores.sessions_count + 1,
    best_genre     = COALESCE(p_genre, public.dance_scores.best_genre),
    level          = GREATEST(1, (public.dance_scores.total_points + p_points) / 1000 + 1),
    display_name   = COALESCE(p_name, public.dance_scores.display_name),
    avatar_url     = COALESCE(p_avatar, public.dance_scores.avatar_url),
    country_code   = COALESCE(p_country_code, public.dance_scores.country_code),
    country_name   = COALESCE(p_country_name, public.dance_scores.country_name),
    last_session_at = now(),
    updated_at     = now();
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.dance_choreographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_scores         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dance_choreo_select" ON public.dance_choreographers;
CREATE POLICY "dance_choreo_select" ON public.dance_choreographers FOR SELECT USING (true);

DROP POLICY IF EXISTS "dance_sessions_own" ON public.dance_sessions;
CREATE POLICY "dance_sessions_own" ON public.dance_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dance_scores_select" ON public.dance_scores;
DROP POLICY IF EXISTS "dance_scores_own_write" ON public.dance_scores;
-- ranking es público (lectura), escritura solo propio
CREATE POLICY "dance_scores_select" ON public.dance_scores FOR SELECT USING (true);
CREATE POLICY "dance_scores_own_write" ON public.dance_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
