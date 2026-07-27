-- BailaNow · Notificaciones en TIEMPO REAL para dashboards (creadores, vendedores, partners).
-- Ejecutar UNA vez en el SQL Editor de Supabase. 100% idempotente.
--
-- 1) Asegura la tabla notifications + RLS.
-- 2) La activa en Realtime (supabase_realtime) para que lleguen al instante.
-- 3) Triggers que crean notificaciones automáticas en: nuevas consultas (bandeja
--    del partner), nuevas ventas (escrow) y cambios de estado de retiros.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- ── 1) Tabla ──────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'info',        -- sale | consulta | withdrawal | booking | payment | refund | info
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select using (auth.uid() = user_id);
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert with check (public.is_admin() or auth.uid() = user_id);

-- ── 2) Realtime ───────────────────────────────────────────────────
-- Añadir la tabla a la publicación de realtime (ignora si ya está añadida).
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when others then null;
end $$;

-- Helper para insertar notificaciones desde triggers (SECURITY DEFINER = salta RLS).
create or replace function public.push_notification(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
end $$;

-- ── 3a) Consultas nuevas → notifica al partner ────────────────────
create or replace function public.notify_partner_inquiry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.push_notification(
    new.partner_id, 'consulta', 'Nueva consulta',
    coalesce(new.contact_name, 'Alguien') || ': ' || left(coalesce(new.message,''), 80),
    '/partner');
  return new;
end $$;
drop trigger if exists trg_notify_inquiry on public.partner_inquiries;
create trigger trg_notify_inquiry after insert on public.partner_inquiries
  for each row execute function public.notify_partner_inquiry();

-- ── 3b) Retiros del partner: cambio de estado → notifica ──────────
create or replace function public.notify_partner_withdrawal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.push_notification(
      new.partner_id, 'withdrawal', 'Retiro ' ||
      case new.status when 'paid' then 'pagado ✔️' when 'rejected' then 'rechazado' else new.status end,
      'Importe: €' || new.amount, '/partner');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_withdrawal on public.partner_withdrawals;
create trigger trg_notify_withdrawal after update on public.partner_withdrawals
  for each row execute function public.notify_partner_withdrawal();

-- ── 3c) Ventas (escrow) → notifica al vendedor. DEFENSIVO: solo si
--        existe la tabla escrows con columna payee_id. ─────────────
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='escrows' and column_name='payee_id') then
    execute $f$
      create or replace function public.notify_escrow_sale()
      returns trigger language plpgsql security definer set search_path = public as $inner$
      begin
        perform public.push_notification(
          new.payee_id, 'sale', 'Nueva venta 💸',
          'Has recibido un pago de €' || coalesce(new.amount::text,'0') ||
          case when new.concept is not null then ' · ' || new.concept else '' end,
          '/dashboard');
        return new;
      end $inner$;
    $f$;
    execute 'drop trigger if exists trg_notify_sale on public.escrows';
    execute 'create trigger trg_notify_sale after insert on public.escrows for each row execute function public.notify_escrow_sale()';
  end if;
end $$;
