-- BailaNow · Segunda tanda de arreglos de seguridad (auditoría de código).
-- 100% idempotente. Ejecutar completo en el SQL Editor de Supabase.
--
-- Cierra:
--   🔴 CRÍTICO — la tabla `escrows` (dinero en depósito) no tenía RLS: cualquier
--      usuario autenticado podía leer las transacciones de TODOS los usuarios y
--      llamar directamente a supabase.from('escrows').update({status:'released'})
--      para liberarse fondos a sí mismo, sin pasar por el panel de admin.
--   🔴 ALTO — cualquier usuario logueado (no solo admins) podía leer el email,
--      teléfono, WhatsApp y saldo de CUALQUIER otro usuario con
--      supabase.from('profiles').select('*') — el revoke de esas columnas
--      (security-fixes.sql) solo se aplicó al rol `anon`, nunca a `authenticated`.
--   🟠 ALTO — `profile_claims` (reclamaciones de perfiles) no tenía RLS
--      confirmado: cualquier usuario podía potencialmente leer/aprobar/rechazar
--      reclamaciones de otras personas directamente vía el cliente.

-- ══════════════════════════════════════════════════════════════════
-- 🔴 #1 · RLS en `escrows` — cada usuario solo ve sus propias transacciones
--         (como pagador o cobrador); solo el admin puede cambiar su estado
--         (liberar/reembolsar). Los inserts los hace el backend con
--         service_role (bypassa RLS), así que no hace falta política de INSERT
--         para usuarios normales.
-- ══════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.escrows') is not null then
    execute 'alter table public.escrows enable row level security';

    execute 'drop policy if exists escrows_read_own on public.escrows';
    execute $p$
      create policy escrows_read_own on public.escrows
        for select using (auth.uid() = payer_id or auth.uid() = payee_id or public.is_admin())
    $p$;

    execute 'drop policy if exists escrows_admin_update on public.escrows';
    execute $p$
      create policy escrows_admin_update on public.escrows
        for update using (public.is_admin()) with check (public.is_admin())
    $p$;

    execute 'drop policy if exists escrows_admin_delete on public.escrows';
    execute $p$
      create policy escrows_admin_delete on public.escrows
        for delete using (public.is_admin())
    $p$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════
-- 🟠 #2 · RLS en `profile_claims` — cada usuario ve solo sus propias
--         reclamaciones enviadas; cualquiera (incluso sin sesión) puede crear
--         una (así funciona hoy: se puede reclamar un perfil sin haber iniciado
--         sesión); solo el admin puede aprobar/rechazar/pedir información.
-- ══════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.profile_claims') is not null then
    execute 'alter table public.profile_claims enable row level security';

    execute 'drop policy if exists profile_claims_read on public.profile_claims';
    execute $p$
      create policy profile_claims_read on public.profile_claims
        for select using (auth.uid() = claimant_id or public.is_admin())
    $p$;

    execute 'drop policy if exists profile_claims_insert on public.profile_claims';
    execute $p$
      create policy profile_claims_insert on public.profile_claims
        for insert with check (claimant_id is null or claimant_id = auth.uid())
    $p$;

    execute 'drop policy if exists profile_claims_admin_update on public.profile_claims';
    execute $p$
      create policy profile_claims_admin_update on public.profile_claims
        for update using (public.is_admin()) with check (public.is_admin())
    $p$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════
-- 🔴 #3 · Cerrar la fuga de PII de `profiles` a CUALQUIER usuario logueado
--         (antes solo se había cerrado para `anon`). Las columnas sensibles
--         (email, teléfono, whatsapp, wallet) quedan bloqueadas por columna
--         para el rol `authenticated` en la tabla base.
--
--         Para que el propio dueño siga viendo/editando su perfil completo, y
--         el admin siga gestionando usuarios, se crean dos vistas que ejecutan
--         con permisos elevados (comportamiento estándar de las vistas de
--         Postgres) pero filtran filas según quién pregunta:
--           • profiles_self  → únicamente tu propia fila completa.
--           • profiles_admin → todas las filas completas, solo si eres admin.
--         El frontend usa estas vistas en vez de la tabla en los sitios donde
--         antes leía columnas sensibles (edición de tu perfil, gestión de
--         usuarios en el panel admin). El resto de la app sigue leyendo
--         `profiles` directamente sin cambios — nunca tocó esas columnas.
-- ══════════════════════════════════════════════════════════════════
do $$
declare c text;
begin
  foreach c in array array['email','phone','whatsapp','wallet','wallet_balance'] loop
    begin execute format('revoke select (%I) on public.profiles from authenticated', c);
    exception when others then null; end;
  end loop;
end $$;

create or replace view public.profiles_self as
  select * from public.profiles where id = auth.uid();
grant select on public.profiles_self to authenticated;

create or replace view public.profiles_admin as
  select * from public.profiles where public.is_admin();
grant select on public.profiles_admin to authenticated;
