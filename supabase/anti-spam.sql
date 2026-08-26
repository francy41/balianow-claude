-- ════════════════════════════════════════════════════════════════
-- BailaNow · Hallazgo C5 de AUDITORIA.md — anti-spam en el servidor
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Hasta ahora el único freno era `checkClientRateLimit()` en el navegador
-- (src/lib/security.ts), que se salta abriendo la consola o llamando a la API
-- de Supabase sin pasar por la web. Esto lo mueve a la base de datos, donde no
-- se puede esquivar.
--
-- Idempotente. No borra datos. Solo AÑADE límites: nada de lo que ya funciona
-- deja de funcionar mientras se esté dentro de las cuotas.
-- ════════════════════════════════════════════════════════════════


-- ── Registro de acciones, para poder contarlas ──────────────────
create table if not exists public.rate_events (
  id         bigserial primary key,
  actor      uuid,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_events_lookup_idx
  on public.rate_events (actor, action, created_at desc);

alter table public.rate_events enable row level security;
-- Sin políticas: solo la escriben los disparadores, que van con security definer.
revoke all on public.rate_events from anon, authenticated;

-- Limpieza: las filas de más de 7 días no sirven para nada.
create or replace function public.cleanup_rate_events()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_events where created_at < now() - interval '7 days';
$$;


-- ── El guardia ──────────────────────────────────────────────────
-- Se engancha como disparador BEFORE INSERT. Recibe tres argumentos:
--   TG_ARGV[0] = nombre de la acción
--   TG_ARGV[1] = máximo permitido
--   TG_ARGV[2] = ventana en minutos
--
-- Los administradores quedan exentos: publican en nombre de la plataforma y no
-- tiene sentido frenarles.
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := auth.uid();
  v_action text := TG_ARGV[0];
  v_max    int  := TG_ARGV[1]::int;
  v_mins   int  := TG_ARGV[2]::int;
  v_count  int;
begin
  -- Sin sesión (service_role, tareas internas) o siendo admin: pasa de largo.
  if v_actor is null or public.is_admin() then
    return new;
  end if;

  select count(*) into v_count
    from public.rate_events
   where actor = v_actor
     and action = v_action
     and created_at > now() - make_interval(mins => v_mins);

  if v_count >= v_max then
    raise exception
      'Has alcanzado el límite de % en % minutos. Inténtalo más tarde.', v_max, v_mins
      using errcode = 'check_violation';
  end if;

  insert into public.rate_events (actor, action) values (v_actor, v_action);
  return new;
end $$;


-- ── Cuotas por tabla ────────────────────────────────────────────
-- Generosas a propósito: frenan al robot, no al usuario entusiasta. Se ajustan
-- cambiando los números y volviendo a ejecutar este bloque.
do $$
declare
  r record;
  -- tabla, acción, máximo, ventana en minutos
  v_reglas text[][] := array[
    ['events',            'crear_evento',      '10',  '60'],
    ['venues',            'crear_local',       '5',   '60'],
    ['rutas',             'crear_plan',        '10',  '60'],
    ['community_posts',   'publicar_comunidad','20',  '60'],
    ['services',          'crear_servicio',    '10',  '60'],
    ['reviews',           'valorar',           '10',  '60'],
    ['messages',          'mensaje',           '60',  '10'],
    ['profile_claims',    'reclamar_perfil',   '3',   '1440'],
    ['partner_inquiries', 'contactar_partner', '5',   '60']
  ];
  i int;
begin
  for i in 1 .. array_length(v_reglas, 1) loop
    if to_regclass('public.' || v_reglas[i][1]) is not null then
      execute format('drop trigger if exists rl_guard on public.%I', v_reglas[i][1]);
      execute format(
        'create trigger rl_guard before insert on public.%I
           for each row execute function public.enforce_rate_limit(%L, %L, %L)',
        v_reglas[i][1], v_reglas[i][2], v_reglas[i][3], v_reglas[i][4]
      );
      raise notice 'límite aplicado a %', v_reglas[i][1];
    else
      raise notice 'tabla % no existe, se omite', v_reglas[i][1];
    end if;
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════
-- BLOQUE OPCIONAL · Exigir correo verificado para publicar
--
-- Léelo antes de ejecutarlo. Bloquea la publicación a quien no haya confirmado
-- su correo. Los que entran con Google ya vienen confirmados; los que se
-- registraron con correo y contraseña y nunca pulsaron el enlace, NO — y
-- dejarían de poder publicar hasta que lo confirmen.
--
-- Comprueba primero a cuánta gente afecta:
--
--   select count(*) from auth.users where email_confirmed_at is null;
--
-- Si el número es alto, avisa antes de activarlo. Para aplicarlo, quita los
-- guiones del bloque de abajo.
-- ════════════════════════════════════════════════════════════════

-- create or replace function public.require_verified_email()
-- returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   if auth.uid() is null or public.is_admin() then return new; end if;
--   if not exists (
--     select 1 from auth.users
--      where id = auth.uid() and email_confirmed_at is not null
--   ) then
--     raise exception 'Confirma tu correo antes de publicar contenido.'
--       using errcode = 'check_violation';
--   end if;
--   return new;
-- end $$;
--
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['events','venues','rutas','community_posts','services'] loop
--     if to_regclass('public.' || t) is not null then
--       execute format('drop trigger if exists verified_guard on public.%I', t);
--       execute format(
--         'create trigger verified_guard before insert on public.%I
--            for each row execute function public.require_verified_email()', t);
--     end if;
--   end loop;
-- end $$;
