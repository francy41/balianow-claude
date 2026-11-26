-- ════════════════════════════════════════════════════════════════
-- BailaNow · Invitaciones para reclamar perfil
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- EL PROBLEMA QUE ESTO NO RESUELVE SOLO
--
-- De los 189 perfiles importados (51 artistas + 138 locales), CERO tienen
-- email guardado y los artistas no tenían ni la columna. Un módulo de envío
-- masivo sin datos de contacto es un motor sin gasolina: por eso aquí se
-- añaden los campos y la pantalla permite rellenarlos uno a uno o importarlos.
--
-- ENVIAR UNA SOLA VEZ, Y QUE CONSTE
--
-- `profile_invites` existe para que nadie reciba dos veces el mismo correo.
-- En una campaña a gente que NO se ha registrado, repetir el envío es la
-- diferencia entre una invitación y spam — y la queja de un solo destinatario
-- puede tumbar la reputación del dominio y dejar sin correo a toda la
-- plataforma, incluidos los avisos de pago.
--
-- Por eso la clave única es (tipo, perfil, canal): un intento por perfil y
-- canal, y el estado queda registrado con su fecha.
-- ────────────────────────────────────────────────────────────────

-- Los artistas no tenían dónde guardar el contacto.
alter table public.artists add column if not exists email text;
alter table public.artists add column if not exists instagram_url text;

create table if not exists public.profile_invites (
  id          uuid primary key default gen_random_uuid(),
  -- 'artist' | 'venue'
  target_type text not null check (target_type in ('artist', 'venue')),
  target_id   text not null,
  target_name text,
  canal       text not null check (canal in ('email', 'instagram')),
  destino     text not null,              -- el email o el usuario de Instagram
  estado      text not null default 'pendiente'
              check (estado in ('pendiente', 'enviado', 'fallido', 'reclamado', 'baja')),
  -- Token del enlace "reclamar mi perfil". Sin él no se puede saber qué
  -- invitación trajo a cada persona.
  token       uuid not null default gen_random_uuid(),
  error       text,
  enviado_at  timestamptz,
  abierto_at  timestamptz,
  reclamado_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint profile_invites_una_por_canal unique (target_type, target_id, canal)
);

create index if not exists profile_invites_estado_idx
  on public.profile_invites (estado, created_at desc);
create index if not exists profile_invites_token_idx
  on public.profile_invites (token);

alter table public.profile_invites enable row level security;

-- Solo el equipo. Aquí hay direcciones de correo de terceros que no se han
-- registrado: no es una tabla que pueda leer nadie más.
drop policy if exists profile_invites_admin on public.profile_invites;
create policy profile_invites_admin on public.profile_invites
  for all using (public.is_admin()) with check (public.is_admin());


-- ── Lista de trabajo: perfiles sin dueño, con y sin contacto ──
-- Devuelve TODOS los que no están reclamados, tengan contacto o no, porque la
-- pantalla sirve también para rellenar los que faltan.
create or replace function public.perfiles_por_invitar()
returns table (
  target_type text,
  target_id   text,
  nombre      text,
  ciudad      text,
  avatar      text,
  email       text,
  instagram   text,
  estado      text,
  enviado_at  timestamptz
) language sql stable security definer set search_path = public as $$
  select 'venue', v.id::text, v.name, v.city, v.avatar, v.email, null::text,
         i.estado, i.enviado_at
    from public.venues v
    left join public.profile_invites i
      on i.target_type = 'venue' and i.target_id = v.id::text and i.canal = 'email'
   where v.user_id is null and v.deleted_at is null and public.is_admin()
  union all
  select 'artist', a.id::text, a.name, a.city, a.avatar, a.email, a.instagram_url,
         i.estado, i.enviado_at
    from public.artists a
    left join public.profile_invites i
      on i.target_type = 'artist' and i.target_id = a.id::text and i.canal = 'email'
   where coalesce(a.user_id::text, '') = '' and public.is_admin()
   order by 3
   limit 1000;
$$;

grant execute on function public.perfiles_por_invitar() to authenticated;


-- ── Guardar el contacto de un perfil sin dueño ──
create or replace function public.guardar_contacto_perfil(
  p_tipo text, p_id text, p_email text, p_instagram text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede editar el contacto';
  end if;

  if p_tipo = 'venue' then
    update public.venues set email = nullif(trim(p_email), '') where id::text = p_id;
  elsif p_tipo = 'artist' then
    update public.artists
       set email = nullif(trim(p_email), ''),
           instagram_url = nullif(trim(p_instagram), '')
     where id::text = p_id;
  else
    raise exception 'Tipo de perfil no válido';
  end if;
  return true;
end $$;

grant execute on function public.guardar_contacto_perfil(text, text, text, text) to authenticated;
