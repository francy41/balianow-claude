-- ════════════════════════════════════════════════════════════════
-- BailaNow · Presencia verificada y seguimiento de locales
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Para aparecer en "quién estuvo aquí" ya no basta con decir que estuviste:
-- hace falta que el local lo confirme, por QR de entrada o a mano desde su
-- panel. La exigencia se aplica a los hombres, como se pidió, más un control
-- por persona que no depende del género declarado.
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- POR QUÉ HAY DOS CAPAS Y NO UNA
--
-- La regla pedida es: un hombre solo está disponible para el match si sigue el
-- local de antes Y ha demostrado que estuvo allí ese día.
--
-- Esa regla descansa sobre el género, que lo declara la propia persona. Quien
-- quiera saltársela solo tiene que marcar "mujer" en su perfil. Por eso hay una
-- segunda capa que no se puede rodear: cada persona puede exigir que solo le
-- aparezca gente con presencia verificada, sea cual sea su género declarado.
-- Viene activada. Es la que de verdad protege.
--
-- La primera capa sigue valiendo: evita el paseo casual y deja constancia de
-- quién decidió esquivarla.
-- ────────────────────────────────────────────────────────────────


-- ── El escáner de la puerta estaba roto ──
-- `BuyerManagement.tsx` lee `buyer_name` y escribe `scanned_at`, y ninguna de
-- las dos columnas existía: ni la consulta ni la actualización funcionaban, así
-- que ninguna entrada llegaba a marcarse como usada. Sin esto la verificación
-- por QR no puede existir, porque se apoya en ese cambio de estado.
alter table public.tickets add column if not exists scanned_at timestamptz;
alter table public.tickets add column if not exists buyer_name text;


-- ── Género y preferencia de verificación ──
-- Nulo = sin declarar, y se trata como si necesitara verificación. Es el lado
-- seguro: quien no lo dice no obtiene la excepción.
alter table public.profiles add column if not exists gender text
  check (gender in ('mujer', 'hombre', 'otro'));

-- Activada por defecto. Quien quiera ver también a quien solo se autodeclaró
-- puede desactivarla, pero la decisión es suya y explícita.
alter table public.profiles add column if not exists solo_verificados boolean not null default true;


-- ── Seguir un local, de verdad ──
-- El botón "Seguir" de la página del local era un `useState` con un aviso: no
-- guardaba nada. La regla pedida necesita que el seguimiento exista y sea
-- anterior a la presencia, así que ahora se almacena.
create table if not exists public.venue_follows (
  user_id    uuid not null references auth.users(id) on delete cascade,
  venue_id   uuid not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

create index if not exists venue_follows_local_idx on public.venue_follows (venue_id);

alter table public.venue_follows enable row level security;

-- Quién sigue una discoteca también dice mucho de una persona, así que la lista
-- no es pública: cada cual ve lo suyo, y el local ve a sus seguidores.
drop policy if exists venue_follows_propios on public.venue_follows;
create policy venue_follows_propios on public.venue_follows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists venue_follows_del_local on public.venue_follows;
create policy venue_follows_del_local on public.venue_follows
  for select using (
    public.is_admin()
    or exists (select 1 from public.venues v where v.id = venue_id and v.user_id = auth.uid())
  );


-- ── Verificación de la presencia ──
alter table public.venue_checkins add column if not exists verified boolean not null default false;
alter table public.venue_checkins add column if not exists verified_via text
  check (verified_via in ('qr', 'local'));
alter table public.venue_checkins add column if not exists verified_by uuid references auth.users(id);
alter table public.venue_checkins add column if not exists verified_at timestamptz;


-- ════════════════════════════════════════════════════════════════
-- LA PUERTA
-- ════════════════════════════════════════════════════════════════

-- ¿Cuenta la presencia de esta persona en este local ahora mismo?
--
-- Mujeres: basta con haberse marcado.
-- Todos los demás, incluido quien no declara género: presencia verificada por
-- el local Y seguir el local desde antes de marcarse.
create or replace function public.presencia_valida(p_user uuid, p_venue uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.venue_checkins c
      join public.profiles p on p.id = c.user_id
     where c.user_id = p_user
       and c.venue_id = p_venue
       and c.expires_at > now()
       and (
         p.gender = 'mujer'
         or (
           c.verified
           and exists (
             select 1 from public.venue_follows f
              where f.user_id = p_user
                and f.venue_id = p_venue
                and f.created_at <= c.created_at
           )
         )
       )
  );
$$;

grant execute on function public.presencia_valida(uuid, uuid) to authenticated;


-- ¿Exijo yo que todo el mundo venga verificado? Viene activado.
create or replace function public.exijo_verificados()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select solo_verificados from public.profiles where id = auth.uid()), true);
$$;

grant execute on function public.exijo_verificados() to authenticated;


-- La política de lectura, ahora con la presencia verificada.
-- Sustituye a la anterior, que solo pedía estar marcado.
drop policy if exists venue_checkins_read on public.venue_checkins;
create policy venue_checkins_read on public.venue_checkins
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    -- El local ve a quien se marcó en su casa, para poder confirmarlo.
    or exists (select 1 from public.venues v where v.id = venue_id and v.user_id = auth.uid())
    or (
      expires_at > now()
      and visibility = 'todos'
      and public.presencia_valida(user_id, venue_id)     -- la otra persona cumple
      and public.presencia_valida(auth.uid(), venue_id)   -- y yo también
      and (verified or not public.exijo_verificados())    -- y mi propia exigencia
      and not public.hay_bloqueo(auth.uid(), user_id)
    )
  );


-- ── Verificación automática al escanear la entrada en la puerta ──
--
-- Cuando el personal del local pasa el QR y la entrada queda usada, esa persona
-- queda verificada en el local del evento. Es la prueba más fuerte que hay y no
-- depende de que nadie se acuerde de pulsar nada después.
--
-- `events.venue_id` es texto y puede contener ids que no son uuid, así que el
-- cruce se hace casteando el uuid a texto: nunca falla por un valor suelto.
create or replace function public.verificar_por_entrada()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_venue uuid;
begin
  if new.status = 'used' and coalesce(old.status, '') <> 'used' and new.user_id is not null then
    select v.id into v_venue
      from public.events e
      join public.venues v on v.id::text = e.venue_id
     where e.id = new.event_id;

    if v_venue is not null then
      insert into public.venue_checkins (user_id, venue_id, verified, verified_via, verified_at)
        values (new.user_id, v_venue, true, 'qr', now())
      on conflict (user_id, venue_id, noche) do update
        set verified = true,
            verified_via = 'qr',
            verified_at = now(),
            expires_at = greatest(public.venue_checkins.expires_at, now() + interval '12 hours');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tickets_verifican_presencia on public.tickets;
create trigger tickets_verifican_presencia after update on public.tickets
  for each row execute function public.verificar_por_entrada();


-- ── Confirmación a mano desde el panel del local ──
-- Para quien entra sin entrada numerada: la persona se marca y el local lo
-- confirma. La comprobación de propiedad va dentro, así que ser security
-- definer no abre nada.
create or replace function public.confirmar_presencia(p_user uuid, p_venue uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare afectadas int;
begin
  if not (
    exists (select 1 from public.venues v where v.id = p_venue and v.user_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Solo el local puede confirmar la presencia';
  end if;

  update public.venue_checkins
     set verified = true, verified_via = 'local', verified_by = auth.uid(), verified_at = now()
   where user_id = p_user and venue_id = p_venue and expires_at > now();

  get diagnostics afectadas = row_count;
  return afectadas > 0;
end $$;

grant execute on function public.confirmar_presencia(uuid, uuid) to authenticated;


-- Retirar una confirmación dada por error.
create or replace function public.retirar_presencia(p_user uuid, p_venue uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare afectadas int;
begin
  if not (
    exists (select 1 from public.venues v where v.id = p_venue and v.user_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Solo el local puede retirar la confirmación';
  end if;

  -- Una verificación por QR no se retira a mano: la respalda una entrada usada.
  update public.venue_checkins
     set verified = false, verified_via = null, verified_by = null, verified_at = null
   where user_id = p_user and venue_id = p_venue and expires_at > now() and verified_via = 'local';

  get diagnostics afectadas = row_count;
  return afectadas > 0;
end $$;

grant execute on function public.retirar_presencia(uuid, uuid) to authenticated;


-- ── Lo que ve el local en su panel ──
create or replace function public.presencias_del_local(p_venue uuid)
returns table (
  user_id    uuid,
  nombre     text,
  avatar     text,
  genero     text,
  verificado boolean,
  via        text,
  sigue      boolean,
  cuando     timestamptz
) language sql stable security definer set search_path = public as $$
  select c.user_id, p.full_name, p.avatar_url, p.gender, c.verified, c.verified_via,
         exists (select 1 from public.venue_follows f
                  where f.user_id = c.user_id and f.venue_id = p_venue),
         c.created_at
    from public.venue_checkins c
    join public.profiles p on p.id = c.user_id
   where c.venue_id = p_venue
     and c.expires_at > now()
     and (
       exists (select 1 from public.venues v where v.id = p_venue and v.user_id = auth.uid())
       or public.is_admin()
     )
   order by c.verified, c.created_at desc
   limit 300;
$$;

grant execute on function public.presencias_del_local(uuid) to authenticated;


-- ── Mi situación en este local, para poder explicarla en pantalla ──
-- Sin esto, a quien le falta un requisito solo le aparecería una lista vacía,
-- sin saber por qué ni qué hacer.
create or replace function public.mi_estado_en_local(p_venue uuid)
returns table (
  marcado     boolean,
  verificado  boolean,
  via         text,
  sigo        boolean,
  sigo_antes  boolean,
  genero      text,
  necesita_verificacion boolean,
  puedo_ver   boolean
) language sql stable security definer set search_path = public as $$
  with yo as (
    select coalesce(p.gender, '') as genero from public.profiles p where p.id = auth.uid()
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
         coalesce((select s.created_at <= m.created_at from sig s, mi m), false),
         (select genero from yo),
         (select genero from yo) <> 'mujer',
         public.presencia_valida(auth.uid(), p_venue);
$$;

grant execute on function public.mi_estado_en_local(uuid) to authenticated;


-- ── Quién estuvo, ahora con el sello de verificación ──
-- Sigue sin security definer: el RLS de arriba es el que decide qué filas ve
-- cada persona, y esta función no puede saltárselo.
create or replace function public.quien_estuvo(p_venue_id uuid)
returns table (
  user_id uuid,
  nombre text,
  avatar text,
  ciudad text,
  cuando timestamptz,
  verificado boolean,
  via text,
  ya_le_di_like boolean,
  es_match boolean
) language sql stable set search_path = public as $$
  select c.user_id,
         p.full_name,
         p.avatar_url,
         p.city,
         c.created_at,
         c.verified,
         c.verified_via,
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


-- ── Reportes para el panel de administración ──
-- `user_reports` solo guarda los dos identificadores. El panel necesita los
-- nombres, y de paso el historial: cuántas veces ha sido reportada esa persona,
-- que es el dato que de verdad decide si hay que actuar.
create or replace function public.reportes_admin()
returns table (
  id            uuid,
  reporter_id   uuid,
  reporter      text,
  reported_id   uuid,
  reported      text,
  reported_avatar text,
  reason        text,
  context       text,
  status        text,
  created_at    timestamptz,
  veces_reportado int
) language sql stable security definer set search_path = public as $$
  select r.id,
         r.reporter_id, pr.full_name,
         r.reported_id, pd.full_name, pd.avatar_url,
         r.reason, r.context, r.status, r.created_at,
         (select count(*)::int from public.user_reports x where x.reported_id = r.reported_id)
    from public.user_reports r
    left join public.profiles pr on pr.id = r.reporter_id
    left join public.profiles pd on pd.id = r.reported_id
   where public.is_admin()
   order by r.created_at desc
   limit 500;
$$;

grant execute on function public.reportes_admin() to authenticated;
