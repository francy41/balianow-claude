-- ════════════════════════════════════════════════════════════════
-- Estudio Coreográfico (Choreography Planner)
-- Productions con escenario, bailarines, keyframes, música y formaciones.
-- Todo el contenido del editor se guarda en `data` (JSONB) para flexibilidad.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.dance_productions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete cascade,
  name        text not null,
  event_date  date,
  cover_emoji text default '💃',
  data        jsonb not null default '{}'::jsonb,
  is_public   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_dance_productions_owner on public.dance_productions(owner_id);
create index if not exists idx_dance_productions_public on public.dance_productions(is_public) where is_public = true;

alter table public.dance_productions enable row level security;

-- El dueño tiene control total sobre sus producciones
drop policy if exists "own productions" on public.dance_productions;
create policy "own productions" on public.dance_productions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Lectura pública si la producción se marca como pública (para compartir)
drop policy if exists "public read productions" on public.dance_productions;
create policy "public read productions" on public.dance_productions
  for select using (is_public = true);

-- trigger updated_at
create or replace function public.touch_dance_production() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_touch_dance_production on public.dance_productions;
create trigger trg_touch_dance_production before update on public.dance_productions
  for each row execute function public.touch_dance_production();
