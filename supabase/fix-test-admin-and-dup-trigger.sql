-- ════════════════════════════════════════════════════════════════
-- BailaNow · Dos arreglos puntuales
--
--  1) Quitar el rol de administrador a la cuenta de pruebas test@test.com.
--     Los UPDATE normales no funcionan porque `profiles` tiene dos
--     disparadores BEFORE UPDATE —`protect_profile_cols` y
--     `trg_protect_profile_columns`— que descartan los cambios en columnas
--     protegidas. Es una defensa correcta: impide que alguien se ascienda a sí
--     mismo. Aquí se desactivan lo justo, se hace el cambio y se vuelven a
--     activar SIEMPRE, incluso si algo falla por el camino.
--
--  2) Borrar `profiles_sync_role`, un disparador que añadí en
--     unify-roles-and-security.sql sin saber que ya existía `trg_sync_primary_role`
--     haciendo exactamente lo mismo. Duplicado innecesario.
--
-- Aplicar en el SQL Editor. Idempotente.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Fuera el disparador duplicado ────────────────────────────
drop trigger if exists profiles_sync_role on public.profiles;
-- La función se queda: no molesta y `trg_sync_primary_role` puede usar otra.

-- ── 2. Bajar la cuenta de pruebas a usuario normal ──────────────
do $$
declare
  v_id uuid := 'a454a8f1-075b-4149-a84d-7abc8d36e005';
  v_protectores text[] := array['protect_profile_cols', 'trg_protect_profile_columns'];
  t text;
  v_filas int;
begin
  -- Desactivar solo los protectores que existan de verdad
  foreach t in array v_protectores loop
    if exists (select 1 from pg_trigger
                where tgrelid = 'public.profiles'::regclass
                  and tgname = t and not tgisinternal) then
      execute format('alter table public.profiles disable trigger %I', t);
    end if;
  end loop;

  begin
    update public.profiles set role = 'user' where id = v_id;
    get diagnostics v_filas = row_count;
    raise notice 'profiles actualizadas: %', v_filas;
  exception when others then
    -- Reactivar antes de propagar el error: nunca dejar la tabla desprotegida
    foreach t in array v_protectores loop
      if exists (select 1 from pg_trigger
                  where tgrelid = 'public.profiles'::regclass
                    and tgname = t and not tgisinternal) then
        execute format('alter table public.profiles enable trigger %I', t);
      end if;
    end loop;
    raise;
  end;

  -- Reactivar los protectores
  foreach t in array v_protectores loop
    if exists (select 1 from pg_trigger
                where tgrelid = 'public.profiles'::regclass
                  and tgname = t and not tgisinternal) then
      execute format('alter table public.profiles enable trigger %I', t);
    end if;
  end loop;

  -- Y quitarle también el rol en la otra fuente: desde la unificación,
  -- has_role() mira las dos, así que dejar esta fila lo mantendría como admin.
  delete from public.user_roles
   where user_id = v_id and role::text in ('admin','superadmin');
  get diagnostics v_filas = row_count;
  raise notice 'filas de user_roles borradas: %', v_filas;
end $$;

-- ── 3. Comprobación: deben quedar solo los administradores de verdad ──
select p.email, p.role as rol_principal,
       (select string_agg(ur.role::text, ', ')
          from public.user_roles ur where ur.user_id = p.id) as roles_asignados
from public.profiles p
where p.role::text in ('admin','superadmin')
   or exists (select 1 from public.user_roles ur
               where ur.user_id = p.id and ur.role::text in ('admin','superadmin'))
order by p.email;
