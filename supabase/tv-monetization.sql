-- BailaNow TV · MONETIZACIÓN estilo YouTube.
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
--
-- Modelo: las cuentas GRATIS ven anuncios (pre-roll Google/patrocinadores) en TV.
-- El reparto de ingresos: la plataforma se queda un % (40 por defecto) y el resto
-- (60) se reparte entre los CREADORES APROBADOS según sus impresiones.
-- Los creadores deben SOLICITAR la monetización y ser aprobados.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ── 1) Solicitudes de monetización de creadores ──────────────────
create table if not exists public.creator_monetization (
  user_id uuid primary key,
  status text not null default 'pending',   -- pending | approved | rejected
  channel_name text,
  payout_method text,                        -- paypal | bank | ...
  payout_details text,
  motivation text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_at timestamptz not null default now()
);
create index if not exists creator_monetization_status_idx on public.creator_monetization (status);

alter table public.creator_monetization enable row level security;
drop policy if exists cm_own on public.creator_monetization;
create policy cm_own on public.creator_monetization for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists cm_insert on public.creator_monetization;
create policy cm_insert on public.creator_monetization for insert with check (auth.uid() = user_id);
drop policy if exists cm_admin on public.creator_monetization;
create policy cm_admin on public.creator_monetization for update using (public.is_admin()) with check (public.is_admin());

-- ── 2) Config del reparto (fila única) ───────────────────────────
create table if not exists public.tv_revenue_config (
  id int primary key default 1,
  platform_percent numeric(5,2) not null default 40,
  creator_percent numeric(5,2) not null default 60,
  updated_at timestamptz not null default now(),
  constraint tv_revenue_config_singleton check (id = 1)
);
insert into public.tv_revenue_config (id) values (1) on conflict (id) do nothing;
alter table public.tv_revenue_config enable row level security;
drop policy if exists trc_read on public.tv_revenue_config;
create policy trc_read on public.tv_revenue_config for select using (true);
drop policy if exists trc_admin on public.tv_revenue_config;
create policy trc_admin on public.tv_revenue_config for all using (public.is_admin()) with check (public.is_admin());

-- ── 3) Impresiones de anuncios en TV (atribuidas al creador) ─────
create table if not exists public.tv_ad_impressions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid,
  title_id uuid,
  ad_id uuid,
  viewer_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists tv_ad_impressions_creator_idx on public.tv_ad_impressions (creator_id);
create index if not exists tv_ad_impressions_created_idx on public.tv_ad_impressions (created_at);

alter table public.tv_ad_impressions enable row level security;
drop policy if exists tai_admin on public.tv_ad_impressions;
create policy tai_admin on public.tv_ad_impressions for select using (public.is_admin() or auth.uid() = creator_id);

-- Registrar una impresión (desde el reproductor, sin dar acceso de escritura).
create or replace function public.record_tv_ad_impression(p_title_id uuid, p_ad_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select creator_id into c from public.tv_titles where id = p_title_id;
  insert into public.tv_ad_impressions (creator_id, title_id, ad_id, viewer_id)
  values (c, p_title_id, p_ad_id, auth.uid());
end $$;
grant execute on function public.record_tv_ad_impression(uuid, uuid) to anon, authenticated;

-- ── 4) ¿Está el creador aprobado para monetizar? ─────────────────
create or replace function public.is_monetized(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.creator_monetization where user_id = p_uid and status = 'approved');
$$;
grant execute on function public.is_monetized(uuid) to anon, authenticated;

-- ── 5) Informe de reparto (solo admin). Reparte por impresiones
--        entre creadores APROBADOS. El pool (ingreso total) lo pone el admin. ──
create or replace function public.tv_monetization_report()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then return null; end if;
  select json_build_object(
    'platform_percent', (select platform_percent from public.tv_revenue_config where id = 1),
    'creator_percent',  (select creator_percent  from public.tv_revenue_config where id = 1),
    'total_impressions', coalesce((
       select count(*) from public.tv_ad_impressions i
       join public.creator_monetization m on m.user_id = i.creator_id and m.status = 'approved'), 0),
    'creators', coalesce((
       select json_agg(row_to_json(x)) from (
         select i.creator_id,
                coalesce(p.full_name, left(i.creator_id::text, 8)) as name,
                count(*) as impressions
         from public.tv_ad_impressions i
         join public.creator_monetization m on m.user_id = i.creator_id and m.status = 'approved'
         left join public.profiles p on p.id = i.creator_id
         group by i.creator_id, p.full_name
         order by count(*) desc
       ) x), '[]'::json)
  ) into result;
  return result;
end $$;
grant execute on function public.tv_monetization_report() to authenticated;
