-- ════════════════════════════════════════════════════════════════
-- Progreso del alumno en DanceFlow
-- Una fila por paso superado y por clase completada.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.dance_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  genre         text,
  level         text,
  choreographer text,
  step_name     text,
  score         int default 0,     -- nota final del paso
  sync          int default -1,    -- % DTW (-1 si no aplica)
  rhythm        int default 0,     -- % ritmo/movimiento
  stars         int default 0,
  class_complete boolean default false,
  created_at    timestamptz default now()
);

create index if not exists idx_dance_progress_user on public.dance_progress(user_id, created_at desc);

alter table public.dance_progress enable row level security;

drop policy if exists "own progress read" on public.dance_progress;
create policy "own progress read" on public.dance_progress
  for select using (auth.uid() = user_id);

drop policy if exists "own progress insert" on public.dance_progress;
create policy "own progress insert" on public.dance_progress
  for insert with check (auth.uid() = user_id);

-- Vista de resumen por usuario (clases completadas, estrellas, sync medio)
create or replace view public.dance_progress_summary as
select
  user_id,
  count(*) filter (where class_complete) as classes_completed,
  coalesce(sum(stars), 0)                as total_stars,
  coalesce(round(avg(sync) filter (where sync >= 0)), 0) as avg_sync,
  coalesce(round(avg(score)), 0)         as avg_score,
  count(*) filter (where not class_complete) as steps_passed,
  max(created_at)                        as last_active
from public.dance_progress
group by user_id;
