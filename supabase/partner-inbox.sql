-- BailaNow · BANDEJA UNIFICADA del Partner + enlace de ciudad + redes sociales.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
-- Requiere que partner-module.sql ya se haya ejecutado (tabla partners, is_admin()).
--
-- Todo lo que llega por el enlace de ciudad (bailanow.com/Madrid) o por las
-- redes conectadas del partner cae en UNA bandeja: partner_inquiries.
-- El partner responde desde su panel; las respuestas van a partner_inquiry_messages.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ══════════════════════════════════════════════════════════════════
-- 1) BANDEJA · cada fila = una pregunta/lead entrante (de cualquier canal)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  city text,
  channel text not null default 'web',            -- web | instagram | facebook | whatsapp | tiktok
  contact_name text,
  contact_handle text,                            -- @usuario, email o teléfono
  contact_email text,
  subject text,
  message text not null,
  status text not null default 'new',             -- new | answered | closed
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index if not exists partner_inquiries_partner_idx on public.partner_inquiries (partner_id, status);
create index if not exists partner_inquiries_channel_idx on public.partner_inquiries (channel);

-- ══════════════════════════════════════════════════════════════════
-- 2) MENSAJES del hilo (respuestas del partner; entrantes extra vía integración)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.partner_inquiries(id) on delete cascade,
  from_partner boolean not null default true,     -- true = respuesta del partner
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists partner_inquiry_messages_idx on public.partner_inquiry_messages (inquiry_id, created_at);

-- ══════════════════════════════════════════════════════════════════
-- 3) REDES SOCIALES conectadas del partner (los DMs caen en la bandeja)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.partner_social_connections (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  provider text not null,                          -- instagram | facebook | whatsapp | tiktok
  handle text,
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (partner_id, provider)
);
create index if not exists partner_social_partner_idx on public.partner_social_connections (partner_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════
alter table public.partner_inquiries          enable row level security;
alter table public.partner_inquiry_messages   enable row level security;
alter table public.partner_social_connections enable row level security;

-- Bandeja: cualquiera puede CREAR una consulta (formulario público de la ciudad);
-- solo el partner dueño (o admin) la lee, actualiza y borra.
drop policy if exists pi_insert on public.partner_inquiries;
create policy pi_insert on public.partner_inquiries for insert with check (true);
drop policy if exists pi_read on public.partner_inquiries;
create policy pi_read on public.partner_inquiries for select using (auth.uid() = partner_id or public.is_admin());
drop policy if exists pi_update on public.partner_inquiries;
create policy pi_update on public.partner_inquiries for update using (auth.uid() = partner_id or public.is_admin()) with check (auth.uid() = partner_id or public.is_admin());
drop policy if exists pi_delete on public.partner_inquiries;
create policy pi_delete on public.partner_inquiries for delete using (auth.uid() = partner_id or public.is_admin());

-- Mensajes del hilo: los lee el partner/admin del hilo; solo el partner/admin
-- publica respuestas (from_partner). Los entrantes extra los inserta la
-- integración con la clave de servicio (bypassa RLS).
drop policy if exists pim_read on public.partner_inquiry_messages;
create policy pim_read on public.partner_inquiry_messages for select using (
  exists (select 1 from public.partner_inquiries i where i.id = inquiry_id and (i.partner_id = auth.uid() or public.is_admin()))
);
drop policy if exists pim_insert on public.partner_inquiry_messages;
create policy pim_insert on public.partner_inquiry_messages for insert with check (
  from_partner = true and
  exists (select 1 from public.partner_inquiries i where i.id = inquiry_id and (i.partner_id = auth.uid() or public.is_admin()))
);

-- Redes sociales: solo el propio partner (y admin).
drop policy if exists psc_own on public.partner_social_connections;
create policy psc_own on public.partner_social_connections for all
  using (auth.uid() = partner_id or public.is_admin())
  with check (auth.uid() = partner_id or public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 4) RESOLVER PARTNER DE UNA CIUDAD (para la página pública /Ciudad)
--    SECURITY DEFINER: expone SOLO lo mínimo, sin filtrar comisiones ni datos.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.city_partner(p_city text)
returns table (partner_id uuid, display_name text, socials jsonb)
language sql stable security definer set search_path = public as $$
  select
    p.user_id,
    p.display_name,
    coalesce(
      (select jsonb_agg(jsonb_build_object('provider', s.provider, 'handle', s.handle))
       from public.partner_social_connections s
       where s.partner_id = p.user_id and s.connected),
      '[]'::jsonb
    )
  from public.partners p
  where p.status = 'active'
    and exists (select 1 from unnest(p.cities) c where lower(c) = lower(p_city))
  order by p.created_at asc
  limit 1;
$$;
grant execute on function public.city_partner(text) to anon, authenticated;
