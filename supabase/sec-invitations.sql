-- Trigger anti-escalada: permitir cambios SOLO via funcion controlada
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  caller_role text := coalesce(auth.role(), '');
  bypass boolean := coalesce(current_setting('app.allow_role_change', true), '') = 'on';
  is_priv boolean := caller_role = 'service_role' or public.is_admin() or bypass;
begin
  if not is_priv then
    if new.role is distinct from old.role then new.role := old.role; end if;
    if new.verified is distinct from old.verified then new.verified := old.verified; end if;
    if new.wallet_balance is distinct from old.wallet_balance then new.wallet_balance := old.wallet_balance; end if;
  end if;
  return new;
end; $fn$;

-- Validar invitacion por token (sin exponer la tabla ni permitir enumerar)
create or replace function public.validate_admin_invitation(p_token text)
returns table(email text, role text, expires_at timestamptz, state text)
language plpgsql security definer set search_path = public as $fn$
declare inv record;
begin
  select * into inv from public.admin_invitations where token::text = p_token;
  if inv.id is null then return query select null::text, null::text, null::timestamptz, 'invalid'; return; end if;
  if inv.used_at is not null then return query select inv.email, inv.role::text, inv.expires_at, 'used'; return; end if;
  if inv.expires_at < now() then return query select inv.email, inv.role::text, inv.expires_at, 'expired'; return; end if;
  return query select inv.email, inv.role::text, inv.expires_at, 'valid';
end; $fn$;

-- Aceptar invitacion: valida email del solicitante y asigna rol de forma controlada
create or replace function public.accept_admin_invitation(p_token text)
returns text language plpgsql security definer set search_path = public as $fn$
declare inv record; uid uuid := auth.uid(); uemail text := auth.email();
begin
  if uid is null then return 'not_authenticated'; end if;
  select * into inv from public.admin_invitations where token::text = p_token;
  if inv.id is null then return 'invalid'; end if;
  if inv.used_at is not null then return 'used'; end if;
  if inv.expires_at < now() then return 'expired'; end if;
  if lower(inv.email) <> lower(coalesce(uemail,'')) then return 'email_mismatch'; end if;

  perform set_config('app.allow_role_change', 'on', true);
  update public.profiles set role = inv.role::user_role, verified = true where id = uid;
  perform set_config('app.allow_role_change', 'off', true);

  update public.admin_invitations set used_at = now() where id = inv.id;
  return 'success';
end; $fn$;

revoke all on function public.accept_admin_invitation(text) from public;
grant execute on function public.accept_admin_invitation(text) to authenticated;
grant execute on function public.validate_admin_invitation(text) to anon, authenticated;

drop policy if exists "public_read_invitation_by_token" on public.admin_invitations;

drop policy if exists "Contracts are visible to parties" on public.contracts;
create policy "Contracts are visible to parties" on public.contracts
  for select using (auth.uid() = client_id or auth.uid() = artist_id or public.is_admin());

drop policy if exists "Proposals are visible to bidder and owner" on public.proposals;
create policy "Proposals are visible to bidder and owner" on public.proposals
  for select using (
    auth.uid() = bidder_id or public.is_admin()
    or exists (select 1 from public.services s where s.id = proposals.service_id and (s.owner_id = auth.uid() or s.artist_id = auth.uid()::text))
  );

drop policy if exists "Public Read Purchases" on public.purchases;
drop policy if exists "Users read own purchases" on public.purchases;
create policy "Users read own purchases" on public.purchases
  for select using (auth.uid() = user_id or public.is_admin());

select 'ok' as r;
