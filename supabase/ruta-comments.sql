-- Chat del grupo para cada Ruta de Hoy. Aplicar en el SQL Editor de Supabase.
create table if not exists public.ruta_comments (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists ruta_comments_ruta_idx on public.ruta_comments (ruta_id, created_at);

alter table public.ruta_comments enable row level security;

drop policy if exists ruta_comments_read on public.ruta_comments;
create policy ruta_comments_read on public.ruta_comments for select using (true);

drop policy if exists ruta_comments_insert on public.ruta_comments;
create policy ruta_comments_insert on public.ruta_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists ruta_comments_delete on public.ruta_comments;
create policy ruta_comments_delete on public.ruta_comments
  for delete using (auth.uid() = user_id or public.is_admin());
