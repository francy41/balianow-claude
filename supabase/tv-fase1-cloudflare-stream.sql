-- ════════════════════════════════════════════════════════════════
-- BailaNow TV · Fase 1 — vídeo real con Cloudflare Stream
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Idempotente. No borra nada: `video_url` se conserva para los vídeos externos
-- que ya hubiera (YouTube, mp4 sueltos). Los nuevos van por `video_uid`.
-- ════════════════════════════════════════════════════════════════

-- UID del vídeo en Cloudflare Stream. Es solo un identificador: sin la firma
-- que emite la función tv-playback no sirve para reproducir nada.
alter table public.tv_lessons add column if not exists video_uid text;

-- Cloudflare tarda en transcodificar. Hasta que termina, la lección existe
-- pero no se puede ver. tv-playback lo consulta y lo corrige solo.
alter table public.tv_lessons add column if not exists video_ready boolean not null default false;

create index if not exists tv_lessons_video_uid_idx on public.tv_lessons (video_uid)
  where video_uid is not null;

-- Las lecciones que ya tuvieran un vídeo externo se dan por listas: no pasan
-- por Cloudflare y no hay nada que esperar.
update public.tv_lessons set video_ready = true
 where video_ready = false and video_url is not null and video_url <> '';


-- ────────────────────────────────────────────────────────────────
-- El UID no debe llegar al navegador.
--
-- Da igual que sin firma no se pueda reproducir: cuanto menos se publique del
-- almacenamiento, menos superficie hay. El catálogo lee las lecciones por una
-- vista que lo omite, y la tabla deja de ser legible en abierto.
-- ────────────────────────────────────────────────────────────────
create or replace view public.tv_lessons_publicas as
  select id, title_id, position, name, duration_seconds, access,
         (video_uid is not null and video_ready) or
         (video_url is not null and video_url <> '') as tiene_video,
         created_at
    from public.tv_lessons;

grant select on public.tv_lessons_publicas to anon, authenticated;

-- La vista se ejecuta con los permisos de quien consulta, no del propietario.
-- Sin esto una vista puede saltarse el RLS de la tabla que hay debajo.
alter view public.tv_lessons_publicas set (security_invoker = true);

alter table public.tv_lessons enable row level security;

-- Lectura directa de la tabla: solo el creador del título y los administradores.
-- El público usa la vista.
drop policy if exists tv_lessons_read on public.tv_lessons;
create policy tv_lessons_read on public.tv_lessons
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.tv_titles t
       where t.id = tv_lessons.title_id and t.creator_id = auth.uid()
    )
  );

-- Escritura: el creador sobre lo suyo, y los administradores sobre todo.
-- Las subidas van por la función tv-upload, que usa service_role y salta esto.
drop policy if exists tv_lessons_write on public.tv_lessons;
create policy tv_lessons_write on public.tv_lessons
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.tv_titles t
       where t.id = tv_lessons.title_id and t.creator_id = auth.uid()
    )
  ) with check (
    public.is_admin()
    or exists (
      select 1 from public.tv_titles t
       where t.id = tv_lessons.title_id and t.creator_id = auth.uid()
    )
  );
