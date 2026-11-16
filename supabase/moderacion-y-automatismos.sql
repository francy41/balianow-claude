-- ════════════════════════════════════════════════════════════════
-- BailaNow · Moderación con efecto y automatismos
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Cierra lo que quedaba abierto: una suspensión que de verdad suspende, el
-- margen configurable entre seguir un local y marcarse, la limpieza
-- programada y el registro de quién moderó qué.
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;


-- ────────────────────────────────────────────────────────────────
-- UNA SUSPENSIÓN QUE NO SUSPENDE NADA ES TEATRO
--
-- Marcar `status = 'suspended'` no servía de nada por sí solo: la persona
-- seguía apareciendo en los locales, dando likes y escribiendo. Aquí se le da
-- efecto en los cuatro sitios donde actúa.
--
-- Lo que NO hace: impedir el inicio de sesión. Eso vive en auth y se hace desde
-- el panel de Supabase. Esto corta la parte social, que es la que daña.
-- ────────────────────────────────────────────────────────────────

create or replace function public.esta_suspendido(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select status = 'suspended' or deleted_at is not null
       from public.profiles where id = p_user),
    false);
$$;

grant execute on function public.esta_suspendido(uuid) to authenticated;


-- ── Registro de moderación ──
-- Sin esto, "acción tomada" era una palabra sin autor. Ahora consta quién,
-- a quién, cuándo y por qué.
create table if not exists public.moderation_actions (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references auth.users(id),
  target_id  uuid references auth.users(id),
  action     text not null check (action in ('suspender', 'reactivar')),
  reason     text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_target_idx
  on public.moderation_actions (target_id, created_at desc);

alter table public.moderation_actions enable row level security;

drop policy if exists moderation_actions_admin on public.moderation_actions;
create policy moderation_actions_admin on public.moderation_actions
  for select using (public.is_admin());


-- ── Suspender y reactivar ──
create or replace function public.suspender_usuario(p_user uuid, p_motivo text)
returns boolean language plpgsql security definer set search_path = public as $$
declare rol_objetivo text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede suspender';
  end if;
  if p_user = auth.uid() then
    raise exception 'No puedes suspenderte a ti mismo';
  end if;

  -- Un administrador no suspende a otro administrador: evita que una cuenta
  -- comprometida deje al equipo fuera de su propio panel.
  select role::text into rol_objetivo from public.profiles where id = p_user;
  if rol_objetivo in ('admin', 'superadmin') then
    raise exception 'No se puede suspender a un administrador';
  end if;

  update public.profiles set status = 'suspended' where id = p_user;

  -- Desaparece de los locales en el momento, sin esperar a que caduque.
  delete from public.venue_checkins where user_id = p_user;

  insert into public.moderation_actions (admin_id, target_id, action, reason)
    values (auth.uid(), p_user, 'suspender', nullif(trim(p_motivo), ''));
  return true;
end $$;

grant execute on function public.suspender_usuario(uuid, text) to authenticated;


create or replace function public.reactivar_usuario(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede reactivar';
  end if;
  update public.profiles set status = 'active' where id = p_user;
  insert into public.moderation_actions (admin_id, target_id, action)
    values (auth.uid(), p_user, 'reactivar');
  return true;
end $$;

grant execute on function public.reactivar_usuario(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- EL MARGEN, CONFIGURABLE
-- ════════════════════════════════════════════════════════════════

-- Antes bastaba con que el seguimiento no fuera posterior a la presencia, y eso
-- no era casi nada: se podía pulsar "Seguir" y "Estoy aquí" seguidos. Ahora el
-- seguimiento tiene que ser anterior por un margen, y el margen se cambia desde
-- el panel sin tocar código.
create or replace function public.config_num(p_key text, p_default numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare t text; n numeric;
begin
  select value #>> '{}' into t from public.site_config where key = p_key;
  if t is null or t = '' then return p_default; end if;
  begin
    n := t::numeric;
  exception when others then
    return p_default;
  end;
  return n;
end $$;

grant execute on function public.config_num(text, numeric) to authenticated, anon;

insert into public.site_config (key, value)
  values ('checkin_margen_seguir_minutos', '120'::jsonb)
  on conflict (key) do nothing;


-- ── La puerta, con suspensión y margen ──
create or replace function public.presencia_valida(p_user uuid, p_venue uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.venue_checkins c
      join public.profiles p on p.id = c.user_id
     where c.user_id = p_user
       and c.venue_id = p_venue
       and c.expires_at > now()
       and coalesce(p.status, '') <> 'suspended'
       and p.deleted_at is null
       and (
         p.gender = 'mujer'
         or (
           c.verified
           and exists (
             select 1 from public.venue_follows f
              where f.user_id = p_user
                and f.venue_id = p_venue
                and f.created_at <= c.created_at
                     - make_interval(mins => public.config_num('checkin_margen_seguir_minutos', 120)::int)
           )
         )
       )
  );
$$;


-- ── Mi situación, con el margen reflejado ──
-- `sigo_antes` ahora significa "sigo con el margen cumplido", que es lo que de
-- verdad decide. Si no, la pantalla diría que cumples cuando no.
create or replace function public.mi_estado_en_local(p_venue uuid)
returns table (
  marcado boolean, verificado boolean, via text, sigo boolean, sigo_antes boolean,
  genero text, necesita_verificacion boolean, puedo_ver boolean,
  margen_minutos int, suspendido boolean
) language sql stable security definer set search_path = public as $$
  with yo as (
    select coalesce(p.gender, '') as genero,
           coalesce(p.status, '') = 'suspended' or p.deleted_at is not null as susp
      from public.profiles p where p.id = auth.uid()
  ),
  mi as (
    select c.* from public.venue_checkins c
     where c.user_id = auth.uid() and c.venue_id = p_venue and c.expires_at > now()
     limit 1
  ),
  sig as (
    select f.created_at from public.venue_follows f
     where f.user_id = auth.uid() and f.venue_id = p_venue limit 1
  )
  select (select count(*) from mi) > 0,
         coalesce((select verified from mi), false),
         (select verified_via from mi),
         (select count(*) from sig) > 0,
         coalesce((select s.created_at <= m.created_at
                     - make_interval(mins => public.config_num('checkin_margen_seguir_minutos', 120)::int)
                   from sig s, mi m), false),
         (select genero from yo),
         coalesce((select genero from yo), '') <> 'mujer',
         public.presencia_valida(auth.uid(), p_venue),
         public.config_num('checkin_margen_seguir_minutos', 120)::int,
         coalesce((select susp from yo), false);
$$;

grant execute on function public.mi_estado_en_local(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- LA SUSPENSIÓN, APLICADA DONDE ACTÚA
-- ════════════════════════════════════════════════════════════════

-- Marcarse en un local.
drop policy if exists venue_checkins_insert on public.venue_checkins;
create policy venue_checkins_insert on public.venue_checkins
  for insert with check (
    user_id = auth.uid() and not public.esta_suspendido(auth.uid())
  );

-- Dar likes. De paso se cierra un hueco: hasta ahora alguien bloqueado podía
-- seguir dando likes (no veía a la persona, pero el like entraba).
drop policy if exists partner_likes_insert on public.partner_likes;
create policy partner_likes_insert on public.partner_likes
  for insert with check (
    auth.uid() = from_user
    and from_user <> to_user
    and not public.esta_suspendido(from_user)
    and not public.hay_bloqueo(from_user, to_user)
  );

-- Escribir mensajes.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and not public.esta_suspendido(sender_id)
    and public.hay_match(sender_id, receiver_id)
    and not public.hay_bloqueo(sender_id, receiver_id)
  );

-- Reportar sigue permitido a quien está suspendido: quitarle la voz para
-- denunciar no protege a nadie.


-- ════════════════════════════════════════════════════════════════
-- LIMPIEZA PROGRAMADA
-- ════════════════════════════════════════════════════════════════

-- Las presencias caducadas no son visibles para nadie, pero seguían en la
-- tabla indefinidamente porque nada ejecutaba la limpieza. Ahora sí.
do $$
begin
  perform cron.unschedule('bailanow-limpiar-checkins');
exception when others then null;
end $$;

select cron.schedule(
  'bailanow-limpiar-checkins',
  '23 5 * * *',
  $$select public.limpiar_checkins()$$
);


-- ── Reportes para el panel, ahora con el estado de la cuenta ──
create or replace function public.reportes_admin()
returns table (
  id uuid, reporter_id uuid, reporter text, reported_id uuid, reported text,
  reported_avatar text, reason text, context text, status text,
  created_at timestamptz, veces_reportado int,
  reported_suspendido boolean, reported_rol text
) language sql stable security definer set search_path = public as $$
  select r.id, r.reporter_id, pr.full_name, r.reported_id, pd.full_name, pd.avatar_url,
         r.reason, r.context, r.status, r.created_at,
         (select count(*)::int from public.user_reports x where x.reported_id = r.reported_id),
         coalesce(pd.status, '') = 'suspended' or pd.deleted_at is not null,
         pd.role::text
    from public.user_reports r
    left join public.profiles pr on pr.id = r.reporter_id
    left join public.profiles pd on pd.id = r.reported_id
   where public.is_admin()
   order by r.created_at desc
   limit 500;
$$;

grant execute on function public.reportes_admin() to authenticated;


-- ── Historial de moderación de una persona ──
create or replace function public.historial_moderacion(p_user uuid)
returns table (accion text, motivo text, admin text, cuando timestamptz)
language sql stable security definer set search_path = public as $$
  select m.action, m.reason, pa.full_name, m.created_at
    from public.moderation_actions m
    left join public.profiles pa on pa.id = m.admin_id
   where m.target_id = p_user and public.is_admin()
   order by m.created_at desc
   limit 50;
$$;

grant execute on function public.historial_moderacion(uuid) to authenticated;
