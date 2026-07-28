-- BailaNow · ARREGLOS DE SEGURIDAD (pre-lanzamiento). Ejecutar en el SQL Editor.
-- 100% idempotente. Cierra: escalada de privilegios, fuga de PII a anónimos y
-- exposición de tokens de invitación.

-- ══════════════════════════════════════════════════════════════════
-- 🔴 #1 · Activar el trigger anti-escalada de roles (existía la función,
--         faltaba el trigger). Impide que un usuario se ponga role='admin'
--         o se cambie verified / wallet_balance a sí mismo.
-- ══════════════════════════════════════════════════════════════════
drop trigger if exists protect_profile_cols on public.profiles;
create trigger protect_profile_cols
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Refuerzo: la política de UPDATE de profiles debe llevar WITH CHECK del propio id.
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════════
-- 🔴 #2 · Cerrar el scraping ANÓNIMO de PII (email, teléfono, wallet…).
--         El rol `anon` (clave que va en el bundle) NO debe poder leer
--         columnas sensibles de profiles. Las páginas públicas usan solo
--         columnas públicas, así que esto no las rompe.
-- ══════════════════════════════════════════════════════════════════
do $$
declare c text;
begin
  foreach c in array array['email','phone','whatsapp','wallet','wallet_balance'] loop
    begin execute format('revoke select (%I) on public.profiles from anon', c);
    exception when others then null; end;
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════════════
-- 🔴 #3 · Quitar la lectura pública de invitaciones de admin (tokens/emails).
--         El acceso debe ser solo vía RPC validate_admin_invitation().
-- ══════════════════════════════════════════════════════════════════
drop policy if exists "public_read_invitation_by_token" on public.admin_invitations;

-- ══════════════════════════════════════════════════════════════════
-- 🟡 #4 · newsletter_subscribers: el UPDATE no debe estar abierto a cualquiera.
-- ══════════════════════════════════════════════════════════════════
do $$
declare p record;
begin
  for p in select policyname from pg_policies where tablename = 'newsletter_subscribers' and cmd = 'UPDATE' loop
    execute format('drop policy if exists %I on public.newsletter_subscribers', p.policyname);
  end loop;
exception when others then null;
end $$;
drop policy if exists newsletter_admin_update on public.newsletter_subscribers;
create policy newsletter_admin_update on public.newsletter_subscribers
  for update using (public.is_admin()) with check (public.is_admin());

-- ══════════════════════════════════════════════════════════════════
-- 🟢 #5 · Resumen de donaciones: solo admin.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.get_donations_summary()
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.is_admin() then return null; end if;
  select json_build_object(
    'total', coalesce(sum(amount), 0),
    'count', count(*),
    'this_month', coalesce(sum(amount) filter (where created_at >= date_trunc('month', now())), 0)
  ) into r from public.donations where status = 'completed';
  return r;
end $$;

-- ⚠️ PENDIENTE de verificar EN PRODUCCIÓN (no deducible desde el repo):
--   • Que la tabla `escrows` tenga RLS activado con políticas owner/service_role.
--   • Que profiles.role NO permita 'admin' auto-asignado por el CHECK (ya cubierto
--     por el trigger de arriba, pero conviene revisar pg_policies real).
