-- BailaNow · Caché de traducciones de contenido (vídeos, cursos, eventos).
-- La usa la Edge Function `translate` (service_role). Ejecutar una vez.
create table if not exists public.translations (
  source_text text not null,
  target_lang text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  primary key (source_text, target_lang)
);
alter table public.translations enable row level security;
-- Solo la Edge Function (service_role) accede; sin políticas de cliente.
