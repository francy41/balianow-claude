-- ════════════════════════════════════════════════════════════════
-- BailaNow · Reputación de baile
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- "Me encantó bailar con él, baila muy bien." Reseñas visibles en el perfil,
-- para hombres y mujeres igual.
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- DOS DECISIONES QUE EVITAN QUE ESTO SE CONVIERTA EN UN ARMA
--
-- 1. SOLO RESEÑA QUIEN COINCIDIÓ. Hace falta haber estado en el mismo local la
--    misma noche, y con la presencia verificada si te la exigen. Sin esto,
--    cualquiera podría puntuar a gente que no ha visto en su vida: fábrica de
--    reseñas falsas por un lado, y vía de acoso por el otro.
--
-- 2. SOLO HAY ELOGIO. No hay estrellas ni nota. Puntuar personas del 1 al 5 en
--    un contexto de ligue acaba en rankings de gente y en castigo por rechazar
--    a alguien. Aquí se dice lo bueno o no se dice nada; lo malo va por el
--    sistema de reportes, que ya existe y lo lee el equipo, no el público.
--
-- Una reseña por persona y pareja, editable. Así nadie acumula veinte
-- comentarios sobre la misma persona.
-- ────────────────────────────────────────────────────────────────

create table if not exists public.dance_reviews (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references auth.users(id) on delete cascade,
  target_id  uuid not null references auth.users(id) on delete cascade,
  -- Solo para auditoría. NO se publica: "A reseñó a B en Azúcar el sábado"
  -- sería el historial de ubicación que este módulo evita a propósito.
  venue_id   uuid references public.venues(id) on delete set null,
  tags       text[] not null default '{}',
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dance_reviews_unica unique (author_id, target_id),
  constraint dance_reviews_no_autoresena check (author_id <> target_id),
  constraint dance_reviews_algo check (array_length(tags, 1) > 0 or coalesce(trim(comment), '') <> '')
);

create index if not exists dance_reviews_destino_idx
  on public.dance_reviews (target_id, created_at desc);


-- ── ¿Coincidieron de verdad? ──
-- Mismo local, misma noche. Y la presencia de quien escribe tiene que contar:
-- verificada, salvo que sea mujer, igual que para ver la lista.
--
-- La prueba son las filas de presencia, que se borran a los 7 días. Es decir:
-- hay una semana para escribir la reseña. Es a propósito — se reseña la noche
-- que acabas de vivir, y no se guarda un registro perpetuo de quién coincidió
-- con quién.
create or replace function public.puede_resenar(p_autor uuid, p_destino uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_autor <> p_destino
     and not public.esta_suspendido(p_autor)
     and not public.hay_bloqueo(p_autor, p_destino)
     and exists (
       select 1
         from public.venue_checkins ca
         join public.venue_checkins cb
           on cb.venue_id = ca.venue_id
          and cb.noche = ca.noche
          and cb.user_id = p_destino
         join public.profiles pa on pa.id = p_autor
        where ca.user_id = p_autor
          and (pa.gender = 'mujer' or ca.verified)
     );
$$;

grant execute on function public.puede_resenar(uuid, uuid) to authenticated;


-- Una semana de margen para reseñar, en lugar de dos días. Sigue sin ser un
-- historial: una semana de presencias caducadas y nada más.
create or replace function public.limpiar_checkins()
returns void language sql security definer set search_path = public as $$
  delete from public.venue_checkins where expires_at < now() - interval '7 days';
$$;


-- ════════════════════════════════════════════════════════════════
-- PERMISOS
-- ════════════════════════════════════════════════════════════════

alter table public.dance_reviews enable row level security;

-- La reputación es pública: para eso está. Se oculta solo si hay un bloqueo
-- entre quien escribe y quien la recibe — si no, bloquear a alguien no
-- impediría que su comentario siguiera en tu perfil.
drop policy if exists dance_reviews_read on public.dance_reviews;
create policy dance_reviews_read on public.dance_reviews
  for select using (
    not public.hay_bloqueo(author_id, target_id)
  );

drop policy if exists dance_reviews_insert on public.dance_reviews;
create policy dance_reviews_insert on public.dance_reviews
  for insert with check (
    author_id = auth.uid() and public.puede_resenar(author_id, target_id)
  );

-- Se puede corregir y retirar lo propio. Quien la recibe no puede borrarla:
-- si pudiera, la reputación no valdría nada. Si es abusiva, se reporta.
drop policy if exists dance_reviews_update on public.dance_reviews;
create policy dance_reviews_update on public.dance_reviews
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists dance_reviews_delete on public.dance_reviews;
create policy dance_reviews_delete on public.dance_reviews
  for delete using (author_id = auth.uid() or public.is_admin());


create or replace function public.tocar_resena()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists dance_reviews_touch on public.dance_reviews;
create trigger dance_reviews_touch before update on public.dance_reviews
  for each row execute function public.tocar_resena();


-- ── Las reseñas de un perfil, con el nombre de quien las escribió ──
create or replace function public.resenas_de(p_user uuid)
returns table (
  id uuid,
  autor_id uuid,
  autor text,
  autor_avatar text,
  tags text[],
  comment text,
  cuando timestamptz,
  es_mia boolean
) language sql stable security definer set search_path = public as $$
  select r.id, r.author_id, pa.full_name, pa.avatar_url,
         r.tags, r.comment, r.created_at,
         r.author_id = auth.uid()
    from public.dance_reviews r
    join public.profiles pa on pa.id = r.author_id
   where r.target_id = p_user
     and not public.hay_bloqueo(r.author_id, r.target_id)
     and not public.hay_bloqueo(auth.uid(), r.author_id)
     and coalesce(pa.status, '') <> 'suspended'
   order by r.created_at desc
   limit 100;
$$;

grant execute on function public.resenas_de(uuid) to authenticated, anon;


-- ── Resumen para la cabecera del perfil ──
-- Cuántas reseñas y las tres cualidades más repetidas. Es lo que se mira de un
-- vistazo; la lista completa va debajo.
create or replace function public.reputacion_de(p_user uuid)
returns table (total int, top_tags text[])
language sql stable security definer set search_path = public as $$
  with vis as (
    select r.* from public.dance_reviews r
      join public.profiles pa on pa.id = r.author_id
     where r.target_id = p_user
       and not public.hay_bloqueo(r.author_id, r.target_id)
       and coalesce(pa.status, '') <> 'suspended'
  ),
  conteo as (
    select unnest(tags) as tag, count(*) as n from vis group by 1 order by n desc, tag limit 3
  )
  select (select count(*)::int from vis),
         coalesce((select array_agg(tag order by n desc, tag) from conteo), '{}');
$$;

grant execute on function public.reputacion_de(uuid) to authenticated, anon;
