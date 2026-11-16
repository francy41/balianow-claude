-- ════════════════════════════════════════════════════════════════
-- BailaNow · Chat entre usuarios, solo con match
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- La tabla `messages` ya existía (sender_id, receiver_id, content, is_read,
-- conversation_id) pero el frontend no la usaba. Esto la pone en servicio y
-- cierra el agujero que tenía.
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- EL AGUJERO QUE SE CIERRA
--
-- La política de inserción era `auth.uid() = sender_id`: cualquier persona
-- registrada podía escribir a cualquier otra. En una aplicación de contacto
-- nocturno eso es una vía directa de acoso, y dejaba el bloqueo sin efecto.
--
-- A partir de aquí solo se puede escribir a quien te ha correspondido: like
-- mutuo, y sin bloqueo en ninguna dirección. Es lo que convierte el match en
-- un consentimiento de las dos partes y no en un permiso unilateral.
--
-- No rompe nada: ninguna pantalla usaba todavía esta tabla.
-- ────────────────────────────────────────────────────────────────

create or replace function public.hay_match(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partner_likes where from_user = a and to_user = b)
     and exists (select 1 from public.partner_likes where from_user = b and to_user = a);
$$;

grant execute on function public.hay_match(uuid, uuid) to authenticated;


-- El identificador de la conversación lo pone el servidor, siempre con los dos
-- participantes ordenados. Si lo pusiera el cliente, dos personas podrían
-- acabar escribiendo en hilos distintos — o falsear el de otra pareja.
create or replace function public.fijar_conversacion()
returns trigger language plpgsql set search_path = public as $$
begin
  new.conversation_id :=
    least(new.sender_id::text, new.receiver_id::text) || '_' ||
    greatest(new.sender_id::text, new.receiver_id::text);
  return new;
end $$;

drop trigger if exists messages_conversacion on public.messages;
create trigger messages_conversacion before insert on public.messages
  for each row execute function public.fijar_conversacion();

create index if not exists messages_conversacion_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_sin_leer_idx
  on public.messages (receiver_id) where is_read is not true;


-- ════════════════════════════════════════════════════════════════
-- PERMISOS
-- ════════════════════════════════════════════════════════════════

alter table public.messages enable row level security;

-- Se lee lo propio: lo que envío y lo que recibo.
-- Las dos políticas antiguas eran idénticas y duplicadas; se unifican.
drop policy if exists "Messages are visible to participants" on public.messages;
drop policy if exists "Users can view own messages" on public.messages;
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Escribir exige match mutuo y ausencia de bloqueo.
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and public.hay_match(sender_id, receiver_id)
    and not public.hay_bloqueo(sender_id, receiver_id)
  );

-- Marcar como leído: solo quien lo recibió, y solo ese campo tiene sentido
-- cambiar. No había ninguna política de update, así que nadie podía hacerlo.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

-- Borrar su propio mensaje.
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete using (auth.uid() = sender_id);


-- ── Mis conversaciones, con el último mensaje y los no leídos ──
-- En una sola consulta: la alternativa desde el cliente es una consulta por
-- conversación más otra por perfil. Va sin security definer, así que el RLS de
-- arriba sigue mandando.
create or replace function public.mis_conversaciones()
returns table (
  otro_id  uuid,
  nombre   text,
  avatar   text,
  ultimo   text,
  cuando   timestamptz,
  sin_leer int
) language sql stable set search_path = public as $$
  with mios as (
    select m.*, case when m.sender_id = auth.uid() then m.receiver_id else m.sender_id end as otro
      from public.messages m
     where m.sender_id = auth.uid() or m.receiver_id = auth.uid()
  ),
  ultimos as (
    select distinct on (otro) otro, content, created_at
      from mios order by otro, created_at desc
  )
  select u.otro,
         p.full_name,
         p.avatar_url,
         u.content,
         u.created_at,
         (select count(*)::int from mios m
           where m.otro = u.otro
             and m.receiver_id = auth.uid()
             and coalesce(m.is_read, false) = false)
    from ultimos u
    join public.profiles p on p.id = u.otro
   order by u.created_at desc
   limit 100;
$$;

grant execute on function public.mis_conversaciones() to authenticated;


-- ── Mis matches, estén o no en el deck de /parejas ──
-- /parejas solo muestra matches de quien tiene partner_profile. Quien hace
-- match desde un local puede no tenerlo, y entonces el match existía pero no
-- se veía en ninguna parte.
create or replace function public.mis_matches()
returns table (
  user_id uuid,
  nombre  text,
  avatar  text,
  ciudad  text
) language sql stable set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.city
    from public.partner_likes mio
    join public.partner_likes suyo
      on suyo.from_user = mio.to_user and suyo.to_user = auth.uid()
    join public.profiles p on p.id = mio.to_user
   where mio.from_user = auth.uid()
     and not public.hay_bloqueo(auth.uid(), mio.to_user)
   limit 200;
$$;

grant execute on function public.mis_matches() to authenticated;
