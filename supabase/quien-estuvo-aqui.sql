-- ════════════════════════════════════════════════════════════════
-- BailaNow · Quién estuvo aquí — presencia en locales y contacto
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Resuelve un problema real: bailas toda la noche con alguien y te vas sin
-- saber su nombre. Marcas que estás en el local, y luego puedes ver a quién
-- más estuvo allí esa noche y pedirle contacto.
--
-- Idempotente. No toca nada de lo existente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- LA DECISIÓN QUE MANDA SOBRE TODO LO DEMÁS: RECIPROCIDAD
--
-- Una lista de "quién estuvo en este local" es el historial de ubicación de
-- personas reales. Publicarlo en abierto convierte la aplicación en una
-- herramienta para seguir a alguien: sus locales, sus noches, sus costumbres.
-- En el contexto de la noche eso es peligroso, y sobre todo para las mujeres.
--
-- La regla que lo corta: SOLO VE QUIÉN ESTUVO QUIEN TAMBIÉN ESTUVO.
-- No se puede husmear un local sin haber ido, y solo se ve mientras las dos
-- presencias siguen vigentes — una ventana móvil de 12 horas, no un calendario,
-- así que una noche que cruza la medianoche sigue siendo la misma noche.
--
-- Además: la presencia caduca sola, nadie aparece por geolocalización
-- automática (solo si lo marca), y hay bloqueo y reporte desde el primer día.
-- ────────────────────────────────────────────────────────────────

create table if not exists public.venue_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  venue_id   uuid not null references public.venues(id) on delete cascade,
  -- 'todos'   → me ven los demás que estuvieron
  -- 'privado' → veo la lista, pero nadie me ve a mí
  visibility text not null default 'todos' check (visibility in ('todos', 'privado')),
  -- La noche a la que pertenece la presencia. Se resta el desfase horario para
  -- que quien llega a las 02:00 cuente en la noche que empezó el día anterior,
  -- que es como la gente habla de salir.
  noche      date not null default ((now() at time zone 'Europe/Madrid') - interval '6 hours')::date,
  created_at timestamptz not null default now(),
  -- Caduca sola. Sin esto, la tabla acaba siendo un historial permanente de
  -- dónde ha estado cada uno, que es justo lo que no queremos guardar.
  expires_at timestamptz not null default now() + interval '12 hours'
);

-- Una persona, un local, una noche.
create unique index if not exists venue_checkins_unicos
  on public.venue_checkins (user_id, venue_id, noche);

create index if not exists venue_checkins_local_idx
  on public.venue_checkins (venue_id, expires_at desc);


-- ── Bloqueos. Antes que ninguna función social, porque después es tarde. ──
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_autobloqueo check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

create table if not exists public.user_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  context     text,
  status      text not null default 'pendiente' check (status in ('pendiente','revisado','accion_tomada','descartado')),
  created_at  timestamptz not null default now()
);


-- ── ¿Hay bloqueo entre estos dos, en cualquier dirección? ──
create or replace function public.hay_bloqueo(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_blocks
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function public.hay_bloqueo(uuid, uuid) to authenticated;


-- ── ¿Estoy yo ahora mismo marcado en este local? ──
--
-- Esto tiene que ser una función con security definer, no una subconsulta dentro
-- de la política. Una política sobre venue_checkins que consulte venue_checkins
-- se aplica también a su propia subconsulta y recursa sin fin. La función se
-- salta el RLS, que es lo correcto aquí: solo mira MIS propias filas.
create or replace function public.estuve_en(p_venue uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.venue_checkins
     where user_id = auth.uid() and venue_id = p_venue and expires_at > now()
  );
$$;

grant execute on function public.estuve_en(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════
-- PERMISOS
-- ════════════════════════════════════════════════════════════════

alter table public.venue_checkins enable row level security;
alter table public.user_blocks    enable row level security;
alter table public.user_reports   enable row level security;

-- Aquí vive la reciprocidad. Se ve una presencia ajena solo si:
--   · sigue vigente (no caducada)
--   · su dueño eligió ser visible
--   · YO sigo marcado en ese mismo local
--   · no hay bloqueo entre los dos
drop policy if exists venue_checkins_read on public.venue_checkins;
create policy venue_checkins_read on public.venue_checkins
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      expires_at > now()
      and visibility = 'todos'
      and public.estuve_en(venue_id)
      and not public.hay_bloqueo(auth.uid(), user_id)
    )
  );

-- Cada cual marca su propia presencia, y nadie la marca por él.
drop policy if exists venue_checkins_insert on public.venue_checkins;
create policy venue_checkins_insert on public.venue_checkins
  for insert with check (user_id = auth.uid());

drop policy if exists venue_checkins_update on public.venue_checkins;
create policy venue_checkins_update on public.venue_checkins
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Poder marcharse sin dejar rastro es parte de la seguridad.
drop policy if exists venue_checkins_delete on public.venue_checkins;
create policy venue_checkins_delete on public.venue_checkins
  for delete using (user_id = auth.uid());


drop policy if exists user_blocks_propios on public.user_blocks;
create policy user_blocks_propios on public.user_blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists user_reports_insert on public.user_reports;
create policy user_reports_insert on public.user_reports
  for insert with check (reporter_id = auth.uid());

-- Los reportes los lee quien los envió y el equipo. Nunca el reportado.
drop policy if exists user_reports_read on public.user_reports;
create policy user_reports_read on public.user_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists user_reports_admin on public.user_reports;
create policy user_reports_admin on public.user_reports
  for update using (public.is_admin()) with check (public.is_admin());


-- ── Un bloqueo también borra el "me gusta", en los dos sentidos. ──
create or replace function public.limpiar_al_bloquear()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.partner_likes
   where (from_user = new.blocker_id and to_user = new.blocked_id)
      or (from_user = new.blocked_id and to_user = new.blocker_id);
  return new;
end $$;

drop trigger if exists al_bloquear on public.user_blocks;
create trigger al_bloquear after insert on public.user_blocks
  for each row execute function public.limpiar_al_bloquear();


-- ── Quién estuvo en un local. La reciprocidad la aplica el RLS de arriba, así
--    que esta función va SIN security definer: no puede saltársela. ──
create or replace function public.quien_estuvo(p_venue_id uuid)
returns table (
  user_id uuid,
  nombre text,
  avatar text,
  ciudad text,
  cuando timestamptz,
  ya_le_di_like boolean,
  es_match boolean
) language sql stable set search_path = public as $$
  select c.user_id,
         p.full_name,
         p.avatar_url,
         p.city,
         c.created_at,
         exists (select 1 from public.partner_likes l
                  where l.from_user = auth.uid() and l.to_user = c.user_id),
         exists (select 1 from public.partner_likes l
                  where l.from_user = auth.uid() and l.to_user = c.user_id)
         and exists (select 1 from public.partner_likes l2
                  where l2.from_user = c.user_id and l2.to_user = auth.uid())
    from public.venue_checkins c
    join public.profiles p on p.id = c.user_id
   where c.venue_id = p_venue_id
     and c.user_id <> auth.uid()
     and c.expires_at > now()
   order by c.created_at desc
   limit 100;
$$;

grant execute on function public.quien_estuvo(uuid) to authenticated;


-- ── Limpieza. Las presencias caducadas no se conservan. ──
create or replace function public.limpiar_checkins()
returns void language sql security definer set search_path = public as $$
  delete from public.venue_checkins where expires_at < now() - interval '2 days';
$$;
