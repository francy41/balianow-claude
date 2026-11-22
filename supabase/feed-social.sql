-- ════════════════════════════════════════════════════════════════
-- BailaNow · Feed social (publicaciones con foto y vídeo)
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Idempotente. NO toca `community_posts`, que es otra cosa: un tablón de
-- anuncios de texto con moderación previa. Este módulo es el muro de fotos.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- SE EXTIENDE `posts`, NO SE CREA OTRA TABLA
--
-- `public.posts` ya existía (id, user_id, type, title, content, media_url,
-- city, likes, admin_status, created_at), vacía y sin una sola línea de código
-- que la usara. Crear un `feed_posts` al lado habría dejado dos ideas de "post"
-- conviviendo para siempre. Se extiende la que hay.
--
-- Sus políticas estaban abiertas de par en par. `Users can insert posts` tenía
-- `with check (true)`: cualquiera podía insertar una publicación a nombre de
-- OTRA persona. Como no hay ni una fila, cerrarlo ahora no rompe nada.
--
-- Otras decisiones:
--
-- · Los contadores de "me gusta" y comentarios van GUARDADOS en la fila y los
--   mantienen triggers. Contarlos al vuelo obliga a una consulta por
--   publicación en cada carga del feed, y eso se nota desde el primer centenar.
--
-- · Un negocio publica desde la cuenta de quien lo gestiona, con `venue_id`
--   apuntando a su local. La autoría real nunca se pierde: si hay que moderar,
--   se sabe qué persona lo subió, no solo qué local.
--
-- · El bloqueo corta en los dos sentidos y en todo: publicaciones, comentarios
--   y "me gusta". De poco sirve bloquear a alguien si sigue apareciendo en tu
--   feed o comentando tus fotos.
--
-- · El dueño de una publicación puede retirar comentarios ajenos EN SU
--   publicación. Es lo que de verdad usa la gente cuando alguien se pasa, mucho
--   antes de llegar a un reporte.
-- ────────────────────────────────────────────────────────────────

alter table public.posts add column if not exists venue_id uuid references public.venues(id) on delete set null;
-- [{ url, kind: 'image' | 'video', w, h }] — carrusel sin necesitar otra tabla.
-- `media_url` se conserva: lo que hubiera seguirá funcionando.
alter table public.posts add column if not exists media jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists comments_count int not null default 0;
alter table public.posts add column if not exists deleted_at timestamptz;

-- Una publicación sin autor no se puede moderar ni atribuir.
alter table public.posts alter column user_id set not null;

do $$
begin
  alter table public.posts add constraint posts_media_tope check (jsonb_array_length(media) <= 10);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.posts add constraint posts_autor_fk
    foreign key (user_id) references auth.users(id) on delete cascade;
exception when duplicate_object then null;
end $$;

create index if not exists posts_feed_idx
  on public.posts (created_at desc) where deleted_at is null;
create index if not exists posts_autor_idx
  on public.posts (user_id, created_at desc) where deleted_at is null;
create index if not exists posts_local_idx
  on public.posts (venue_id, created_at desc) where deleted_at is null and venue_id is not null;


create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes (user_id);


create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null check (length(trim(text)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists post_comments_post_idx
  on public.post_comments (post_id, created_at) where deleted_at is null;


-- Seguir personas. `venue_follows` ya existía para locales; esto es para gente.
create table if not exists public.user_follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_autoseguir check (follower_id <> following_id)
);

create index if not exists user_follows_seguido_idx on public.user_follows (following_id);


-- ════════════════════════════════════════════════════════════════
-- CONTADORES
-- ════════════════════════════════════════════════════════════════

create or replace function public.recontar_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes = coalesce(likes, 0) + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set likes = greatest(coalesce(likes, 0) - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists post_likes_contador on public.post_likes;
create trigger post_likes_contador after insert or delete on public.post_likes
  for each row execute function public.recontar_likes();


create or replace function public.recontar_comentarios()
returns trigger language plpgsql security definer set search_path = public as $$
declare delta int := 0;
begin
  if tg_op = 'INSERT' then
    delta := 1;
  elsif tg_op = 'DELETE' then
    delta := -1;
  elsif tg_op = 'UPDATE' then
    -- Los comentarios se retiran marcando deleted_at, no borrando la fila.
    if old.deleted_at is null and new.deleted_at is not null then delta := -1;
    elsif old.deleted_at is not null and new.deleted_at is null then delta := 1;
    end if;
  end if;
  if delta <> 0 then
    update public.posts
       set comments_count = greatest(comments_count + delta, 0)
     where id = coalesce(new.post_id, old.post_id);
  end if;
  return null;
end $$;

drop trigger if exists post_comments_contador on public.post_comments;
create trigger post_comments_contador after insert or delete or update on public.post_comments
  for each row execute function public.recontar_comentarios();


-- ════════════════════════════════════════════════════════════════
-- PERMISOS
-- ════════════════════════════════════════════════════════════════

alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;
alter table public.user_follows  enable row level security;

-- ¿Se puede ver esta publicación? Lo usan varias políticas, así que vive aquí.
-- security definer para poder mirar `profiles` sin depender de su RLS.
create or replace function public.post_visible(p_autor uuid, p_borrado timestamptz, p_estado text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_borrado is null
     and coalesce(p_estado, 'approved') = 'approved'
     and not public.esta_suspendido(p_autor)
     and not public.hay_bloqueo(auth.uid(), p_autor);
$$;

grant execute on function public.post_visible(uuid, timestamptz, text) to authenticated, anon;


-- Las antiguas dejaban leer y escribir cualquier cosa a cualquiera.
drop policy if exists "Posts select" on public.posts;
drop policy if exists "Public can view approved posts" on public.posts;
drop policy if exists "Users can insert posts" on public.posts;
drop policy if exists "Admins can do everything on posts" on public.posts;

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or public.post_visible(user_id, deleted_at, admin_status)
  );

-- Publicar: en nombre propio, y solo en un local que de verdad gestionas.
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
  for insert with check (
    user_id = auth.uid()
    and not public.esta_suspendido(auth.uid())
    and (
      venue_id is null
      or exists (select 1 from public.venues v where v.id = venue_id and v.user_id = auth.uid())
    )
  );

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts
  for delete using (user_id = auth.uid() or public.is_admin());


drop policy if exists post_likes_read on public.post_likes;
create policy post_likes_read on public.post_likes for select using (true);

drop policy if exists post_likes_insert on public.post_likes;
create policy post_likes_insert on public.post_likes
  for insert with check (
    user_id = auth.uid()
    and not public.esta_suspendido(auth.uid())
    and exists (
      select 1 from public.posts p
       where p.id = post_id and public.post_visible(p.user_id, p.deleted_at, p.admin_status)
    )
  );

drop policy if exists post_likes_delete on public.post_likes;
create policy post_likes_delete on public.post_likes
  for delete using (user_id = auth.uid());


drop policy if exists post_comments_read on public.post_comments;
create policy post_comments_read on public.post_comments
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or (deleted_at is null and not public.hay_bloqueo(auth.uid(), user_id)
        and not public.esta_suspendido(user_id))
  );

drop policy if exists post_comments_insert on public.post_comments;
create policy post_comments_insert on public.post_comments
  for insert with check (
    user_id = auth.uid()
    and not public.esta_suspendido(auth.uid())
    and exists (
      select 1 from public.posts p
       where p.id = post_id and public.post_visible(p.user_id, p.deleted_at, p.admin_status)
    )
  );

-- Lo retira quien lo escribió, el dueño de la publicación, o el equipo.
drop policy if exists post_comments_update on public.post_comments;
create policy post_comments_update on public.post_comments
  for update using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  ) with check (true);


drop policy if exists user_follows_read on public.user_follows;
create policy user_follows_read on public.user_follows for select using (true);

drop policy if exists user_follows_insert on public.user_follows;
create policy user_follows_insert on public.user_follows
  for insert with check (
    follower_id = auth.uid()
    and not public.esta_suspendido(auth.uid())
    and not public.hay_bloqueo(auth.uid(), following_id)
  );

drop policy if exists user_follows_delete on public.user_follows;
create policy user_follows_delete on public.user_follows
  for delete using (follower_id = auth.uid());


-- Bloquear a alguien también deja de seguirle, en los dos sentidos.
create or replace function public.limpiar_seguimientos_al_bloquear()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.user_follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end $$;

drop trigger if exists al_bloquear_seguimientos on public.user_blocks;
create trigger al_bloquear_seguimientos after insert on public.user_blocks
  for each row execute function public.limpiar_seguimientos_al_bloquear();
