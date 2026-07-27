-- BailaNow · Conector GHL (GoHighLevel) para la bandeja del partner.
-- Ejecutar UNA vez (después de partner-inbox.sql). 100% idempotente.
--
-- GHL ya trae inbox unificado (IG/FB/WhatsApp/SMS/Email). Solo necesitamos saber
-- qué "location" de GHL corresponde a cada partner para enrutar los mensajes.
-- El token de la API de GHL se guarda en partner_social_tokens (provider='ghl').

alter table public.partners add column if not exists ghl_location_id text;
create index if not exists partners_ghl_location_idx on public.partners (ghl_location_id);
