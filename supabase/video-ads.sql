-- BailaNow · ANUNCIOS EN VÍDEO (pre-roll estilo RTVE).
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
--
-- Anuncios de vídeo que saltan al entrar en una categoría. Gestión total desde
-- el superadmin. Preparado para Google (VAST/IMA) vía provider='vast' + vast_tag_url.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

create table if not exists public.video_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  advertiser text,
  provider text not null default 'video',    -- video (propio) | vast (Google/red, futuro)
  video_url text,                             -- MP4/HLS propio
  poster_url text,
  vast_tag_url text,                          -- etiqueta VAST/IMA (para provider='vast')
  click_url text,                             -- adónde lleva al hacer clic
  skip_after int not null default 5,          -- segundos hasta poder saltar (0 = no saltable)
  targets text[] not null default '{all}',    -- categorías: all | eventos | artistas | venues | tv | clases | marketplace | comunidad | live
  weight int not null default 1,              -- prioridad (más peso = más frecuencia)
  starts date,
  ends date,
  active boolean not null default true,
  impressions int not null default 0,
  completions int not null default 0,
  clicks int not null default 0,
  skips int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists video_ads_active_idx on public.video_ads (active);

alter table public.video_ads enable row level security;
-- Lectura pública de los anuncios activos (para servirlos); escritura solo admin.
drop policy if exists va_read on public.video_ads;
create policy va_read on public.video_ads for select using (active or public.is_admin());
drop policy if exists va_admin on public.video_ads;
create policy va_admin on public.video_ads for all using (public.is_admin()) with check (public.is_admin());

-- Registrar métricas sin dar acceso de escritura a la tabla (anon incluido).
create or replace function public.track_video_ad(p_id uuid, p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.video_ads set
    impressions = impressions + (case when p_event = 'impression' then 1 else 0 end),
    completions = completions + (case when p_event = 'complete' then 1 else 0 end),
    clicks      = clicks      + (case when p_event = 'click' then 1 else 0 end),
    skips       = skips       + (case when p_event = 'skip' then 1 else 0 end)
  where id = p_id;
end $$;
grant execute on function public.track_video_ad(uuid, text) to anon, authenticated;

-- Anuncio DEMO (inactivo). Actívalo desde el panel para probar el pre-roll.
insert into public.video_ads (id, title, advertiser, video_url, poster_url, click_url, skip_after, targets, active)
values (
  'ad000000-0000-4000-a000-000000000001',
  'Demo · Patrocinador BailaNow', 'BailaNow',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  null, 'https://bailanow.com/promocionate', 5, '{all}', false)
on conflict (id) do nothing;
