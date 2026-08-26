-- ════════════════════════════════════════════════════════════════
-- BailaNow · Corrección de los hallazgos críticos C2, C3 y C4 de AUDITORIA.md
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Es idempotente: se puede ejecutar más de una vez sin efectos secundarios.
-- No borra datos ni cambia el rol de nadie.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- C3 · La lista de roles admitidos estaba incompleta y contradictoria.
--
-- `schema.sql` decía que `profiles.role` era TEXT con CHECK sin 'superadmin';
-- `fix-partner-role.sql` decía que era un enum `user_role`. El frontend usa
-- además promoter, business, instructor, moderator y assistant, que no estaban
-- en ninguna de las dos listas: asignarlos fallaba.
--
-- Este bloque detecta cuál de las dos formas tiene la base de datos de verdad
-- y añade lo que falte en cada caso.
-- ────────────────────────────────────────────────────────────────
do $$
declare
  v_type text;
  v_role text;
  v_roles text[] := array[
    'user','artist','dj','dancer','singer','band','instructor','venue',
    'business','promoter','organizer','partner','animador','vendor',
    'moderator','support','assistant','admin','superadmin'
  ];
begin
  select case when t.typtype = 'e' then 'enum' else 'text' end
    into v_type
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'role'
    and not a.attisdropped;

  if v_type = 'enum' then
    -- Enum: los valores se añaden de uno en uno y fuera de transacción.
    -- ADD VALUE IF NOT EXISTS es seguro repetido.
    foreach v_role in array v_roles loop
      execute format('alter type public.user_role add value if not exists %L', v_role);
    end loop;
    raise notice 'profiles.role es un enum: valores sincronizados.';
  else
    -- TEXT con CHECK: se rehace la restricción con la lista completa.
    alter table public.profiles drop constraint if exists profiles_role_check;
    execute format(
      'alter table public.profiles add constraint profiles_role_check check (role = any (%L::text[]))',
      v_roles
    );
    raise notice 'profiles.role es TEXT: CHECK actualizado.';
  end if;
end $$;


-- ────────────────────────────────────────────────────────────────
-- C2 · Autorización unificada.
--
-- El frontend leía todos los roles de la cuenta desde `user_roles`, pero la
-- autorización del servidor solo miraba `profiles.role`. Resultado: alguien con
-- 'admin' en user_roles entraba en /admin y allí cada escritura fallaba en
-- silencio porque RLS la rechazaba.
--
-- `has_role()` consulta LAS DOS fuentes. `is_admin()` pasa a apoyarse en ella,
-- así que las 100+ políticas que ya la usan quedan corregidas sin tocarlas.
-- Su gemela en el cliente es src/lib/permissions.ts.
-- ────────────────────────────────────────────────────────────────

-- La tabla puede no existir todavía en algún entorno; se crea si falta para
-- que has_role() nunca reviente.
create table if not exists public.user_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

-- Cada cual ve sus propios roles; los administradores ven y gestionan todos.
drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- ¿Tiene el usuario actual este rol, en la columna principal o en user_roles?
create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role::text = p_role
  ) or exists (
    select 1 from public.user_roles
     where user_id = auth.uid() and role = p_role
  );
$$;

-- Administrador o superadministrador, mirando ambas fuentes.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('superadmin');
$$;

grant execute on function public.has_role(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Mantiene user_roles sincronizada con el rol principal, para que nadie pierda
-- acceso al cambiar profiles.role y las dos fuentes no se separen.
create or replace function public.sync_primary_role_to_user_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, new.role::text)
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists profiles_sync_role on public.profiles;
create trigger profiles_sync_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_primary_role_to_user_roles();

-- Vuelca los roles principales que ya existen, para partir sincronizados.
insert into public.user_roles (user_id, role)
select id, role::text from public.profiles where role is not null
on conflict (user_id, role) do nothing;


-- ────────────────────────────────────────────────────────────────
-- C4 · `idempotency_keys` estaba sin RLS y sin políticas.
--
-- Guarda actor_id, endpoint y el `response` completo de operaciones de pago.
-- Al vivir en el esquema public, PostgREST la exponía a cualquiera con la clave
-- anónima, que es pública por diseño. Se cierra por completo: es una tabla
-- interna, solo la tocan las funciones con service_role.
-- ────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.idempotency_keys') is not null then
    execute 'alter table public.idempotency_keys enable row level security';
    execute 'revoke all on public.idempotency_keys from anon, authenticated';
    -- Sin políticas: con RLS activo y sin policy, nadie que use la clave
    -- anónima o de usuario puede leer ni escribir. service_role la salta.
    raise notice 'idempotency_keys cerrada.';
  end if;
end $$;
