-- BailaNow · Sistema de reservas para locales (discotecas / venues).
-- Cubre: horarios por día, productos (botellas, etc.), reservas normal y
-- "reservado" (mesa) con producto+precio+descripción, pago, código de
-- confirmación, política de reembolso y términos. Ejecutar una vez. Idempotente.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;

-- Dueño del venue: auth.uid() coincide con owner_id/user_id del venue.
create or replace function public.owns_venue(p_venue uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.venues v
    where v.id = p_venue and (v.owner_id = auth.uid() or v.user_id = auth.uid())
  );
$$;

-- 1) Config de reservas en el propio venue -----------------------------------
alter table public.venues add column if not exists reservations_enabled boolean not null default true;
alter table public.venues add column if not exists reservation_terms text;
alter table public.venues add column if not exists refund_percent int not null default 50;  -- % que se reembolsa si no asiste

-- 2) Horarios por día de la semana -------------------------------------------
create table if not exists public.venue_hours (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),  -- 0=Domingo .. 6=Sábado
  is_open boolean not null default true,
  open_time  time,
  close_time time,
  unique (venue_id, day_of_week)
);
create index if not exists venue_hours_venue_idx on public.venue_hours(venue_id);

-- 3) Productos del local (para las reservas) ---------------------------------
create table if not exists public.venue_products (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists venue_products_venue_idx on public.venue_products(venue_id, active, sort);

-- 4) Reservas ----------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  customer_id uuid,                       -- null si reserva sin cuenta
  kind text not null default 'normal',    -- 'normal' | 'reservado' (mesa)
  reservation_date date not null,
  reservation_time time,
  party_size int not null default 1,
  table_number text,                      -- número(s) de mesa asignados
  guest_description text,                  -- descripción de las personas que entran
  product_id uuid references public.venue_products(id) on delete set null,
  product_qty int not null default 0,
  unit_price numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending',        -- pending|confirmed|cancelled|no_show|refunded
  payment_status text not null default 'unpaid', -- unpaid|paid|refunded
  refund_percent int,                            -- copia de la política al reservar
  confirmation_code text unique,
  contact_email text,
  contact_whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reservations_venue_idx on public.reservations(venue_id, reservation_date);
create index if not exists reservations_customer_idx on public.reservations(customer_id);

create or replace function public.touch_reservations()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_touch_reservations on public.reservations;
create trigger trg_touch_reservations before update on public.reservations
  for each row execute function public.touch_reservations();

-- 5) RLS ---------------------------------------------------------------------
alter table public.venue_hours    enable row level security;
alter table public.venue_products enable row level security;
alter table public.reservations   enable row level security;

-- Horarios y productos: lectura pública; escritura dueño del venue o admin.
drop policy if exists vh_read on public.venue_hours;
create policy vh_read on public.venue_hours for select using (true);
drop policy if exists vh_write on public.venue_hours;
create policy vh_write on public.venue_hours for all
  using (public.owns_venue(venue_id) or public.is_admin())
  with check (public.owns_venue(venue_id) or public.is_admin());

drop policy if exists vp_read on public.venue_products;
create policy vp_read on public.venue_products for select using (true);
drop policy if exists vp_write on public.venue_products;
create policy vp_write on public.venue_products for all
  using (public.owns_venue(venue_id) or public.is_admin())
  with check (public.owns_venue(venue_id) or public.is_admin());

grant select on public.venue_hours, public.venue_products to anon, authenticated;

-- Reservas: crea cualquiera (cliente); ve el cliente (suyas), el dueño del
-- venue y el admin; actualiza el dueño (confirmar, no_show, mesa) y el admin.
drop policy if exists res_insert on public.reservations;
create policy res_insert on public.reservations for insert
  with check (status = 'pending');
drop policy if exists res_select on public.reservations;
create policy res_select on public.reservations for select
  using (customer_id = auth.uid() or public.owns_venue(venue_id) or public.is_admin());
drop policy if exists res_update on public.reservations;
create policy res_update on public.reservations for update
  using (public.owns_venue(venue_id) or public.is_admin())
  with check (public.owns_venue(venue_id) or public.is_admin());

grant insert, select on public.reservations to anon, authenticated;
grant update on public.reservations to authenticated;
