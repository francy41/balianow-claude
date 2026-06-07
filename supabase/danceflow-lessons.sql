-- ════════════════════════════════════════════════════════════════
-- DanceFlow — Lecciones / Pasos (videos reales por bailarín, en secuencia)
-- Cada coreógrafo tiene varios pasos; cada paso = 1 video real.
-- El profe IA (voz) guía y el usuario sigue el video del paso.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.dance_lessons (
  id            uuid primary key default gen_random_uuid(),
  choreographer_id uuid references public.dance_choreographers(id) on delete cascade,
  genre         text not null default 'Bachata',
  sub_style     text,
  level         text not null default 'principiante',  -- principiante | intermedio | avanzado
  step_number   int  not null default 1,               -- orden dentro de la clase
  step_name     text not null,                          -- "Paso básico", "Vuelta de la dama"...
  description   text,                                   -- nota corta (lo que dice el profe)
  count_cue     text,                                   -- conteo: "1,2,3 - pausa - 5,6,7 - pausa"
  video_url     text not null,                          -- video real (mp4/storage o YouTube)
  duration_sec  int default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists idx_dance_lessons_choreo on public.dance_lessons(choreographer_id);
create index if not exists idx_dance_lessons_order on public.dance_lessons(choreographer_id, level, step_number);

-- RLS: lectura pública, escritura solo admin
alter table public.dance_lessons enable row level security;

drop policy if exists "lessons public read" on public.dance_lessons;
create policy "lessons public read" on public.dance_lessons
  for select using (true);

drop policy if exists "lessons admin write" on public.dance_lessons;
create policy "lessons admin write" on public.dance_lessons
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
  );
