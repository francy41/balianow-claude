-- ════════════════════════════════════════════════════════════════
-- BailaNow · Precios en el servidor
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- EL PROBLEMA: EL NAVEGADOR DECÍA LO QUE COSTABA CADA COSA
--
-- `create-subscription-checkout` hacía `Number(body.price)` y cobraba eso. Los
-- planes solo existían en el frontend (src/data/dancePlans.ts y mockData.ts),
-- así que el servidor no tenía con qué contrastarlos.
--
-- Consecuencia: cualquiera con las herramientas del navegador abiertas podía
-- enviar `{ planId: 'familiar', price: 0.01 }` y suscribirse al plan de 22 €
-- por un céntimo. Lo mismo en `create-module-checkout`.
--
-- Regla: el precio NUNCA viaja del cliente al cobro. El cliente dice QUÉ
-- quiere comprar; cuánto cuesta lo decide el servidor.
--
-- Los módulos ya tenían catálogo en la base de datos (`module_catalog`), solo
-- que la función no lo miraba. Los planes no lo tenían: esta tabla lo crea.
-- ────────────────────────────────────────────────────────────────

create table if not exists public.plan_prices (
  plan_id    text primary key,
  name       text not null,
  price      numeric(10,2) not null check (price >= 0),
  currency   text not null default 'eur',
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.plan_prices enable row level security;

-- El catálogo es público: los precios se enseñan en la web de todos modos.
drop policy if exists plan_prices_read on public.plan_prices;
create policy plan_prices_read on public.plan_prices
  for select using (true);

-- Cambiarlos, solo el equipo. Las funciones de cobro usan la clave de servicio
-- y se saltan esto, que es justo lo que queremos: leen el precio real.
drop policy if exists plan_prices_admin on public.plan_prices;
create policy plan_prices_admin on public.plan_prices
  for all using (public.is_admin()) with check (public.is_admin());


-- Los precios que la web ya mostraba, sin cambiar ninguno. Si se tocan aquí,
-- hay que tocarlos también en src/data/dancePlans.ts y src/data/mockData.ts,
-- que es lo que ve el usuario — pero el que se cobra es este.
insert into public.plan_prices (plan_id, name, price, currency) values
  ('individual', 'Individual', 10, 'eur'),
  ('pareja',     'Pareja',     16, 'eur'),
  ('familiar',   'Familiar',   22, 'eur'),
  ('basic',      'Básico',      9, 'eur'),
  ('standard',   'Estándar',   20, 'eur'),
  ('pro',        'Pro',        50, 'eur')
on conflict (plan_id) do nothing;
