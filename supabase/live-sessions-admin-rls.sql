-- Permite a admin/superadmin moderar live_sessions (finalizar/eliminar) desde
-- el panel SuperAdmin. Las políticas originales de live-sessions-schema.sql
-- solo permitían UPDATE/DELETE al propio host — el panel de moderación
-- necesita que public.is_admin() también pueda hacerlo. Aplicar en el SQL
-- Editor de Supabase: https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new

drop policy if exists "live_sessions_update" on public.live_sessions;
create policy "live_sessions_update" on public.live_sessions
  for update using (auth.uid() = host_id or public.is_admin());

drop policy if exists "live_sessions_delete" on public.live_sessions;
create policy "live_sessions_delete" on public.live_sessions
  for delete using (auth.uid() = host_id or public.is_admin());
