-- BailaNow · Enrutado de redes sociales para la bandeja del partner.
-- Ejecutar UNA vez (después de partner-inbox.sql). 100% idempotente.
--
-- Añade cómo identificar a qué partner pertenece un mensaje entrante de Meta
-- (Instagram/Facebook/WhatsApp) y dónde guardar los tokens de forma SEGURA
-- (tabla sin acceso desde el cliente: solo las Edge Functions con service_role).

-- 1) Identificador de la cuenta en cada red (page_id / ig_id / phone_number_id).
--    El webhook entrante trae este id; así sabemos de qué partner es el mensaje.
alter table public.partner_social_connections add column if not exists account_id text;
create index if not exists partner_social_account_idx on public.partner_social_connections (account_id);

-- 2) Tokens de acceso (SECRETOS) — tabla aislada, nunca expuesta al navegador.
--    Con RLS activado y solo política de admin, el cliente anónimo/usuario NO puede
--    leerla; las Edge Functions usan service_role y saltan RLS.
create table if not exists public.partner_social_tokens (
  partner_id uuid not null,
  provider text not null,                          -- instagram | facebook | whatsapp
  access_token text,                               -- token de página / WhatsApp
  account_id text,                                 -- page_id / ig_id
  phone_number_id text,                            -- solo WhatsApp
  updated_at timestamptz not null default now(),
  primary key (partner_id, provider)
);

alter table public.partner_social_tokens enable row level security;
-- Solo admin/superadmin puede gestionar tokens desde el panel o el SQL editor.
-- (service_role de las Edge Functions ignora RLS.)
drop policy if exists pst_admin on public.partner_social_tokens;
create policy pst_admin on public.partner_social_tokens for all
  using (public.is_admin()) with check (public.is_admin());
