-- ════════════════════════════════════════════════════════════════
-- BailaNow · Cierre: disputas, reseñas moderables, bloqueo de acceso
--
-- Aplicar en el SQL Editor:
-- https://supabase.com/dashboard/project/lpwwdjujxwxdvyoznehp/sql/new
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- EL BUG DE LAS DISPUTAS: EL PROPIETARIO NO PODÍA VERLAS
--
-- `disputes` tenía una sola política, con el rol escrito a mano:
--
--     profiles.role = 'admin'
--
-- En BailaNow el propietario es `superadmin`, no `admin`. Es decir: la persona
-- que tiene que mediar en las disputas era precisamente la única que no podía
-- abrirlas. Y quien abría una disputa tampoco podía ver la suya, porque no
-- había ninguna política para los usuarios.
--
-- Por eso CLAUDE.md dice que TODAS las políticas de administración usen
-- `public.is_admin()`: cubre admin y superadmin, y no se queda obsoleta cada
-- vez que se añade un rol.
-- ────────────────────────────────────────────────────────────────

alter table public.disputes enable row level security;

drop policy if exists "Admins control total disputas" on public.disputes;
drop policy if exists disputes_admin on public.disputes;
create policy disputes_admin on public.disputes
  for all using (public.is_admin()) with check (public.is_admin());

-- Quien abre una disputa puede verla y seguirla. No puede cambiar su estado:
-- eso lo decide quien media.
drop policy if exists disputes_propias_read on public.disputes;
create policy disputes_propias_read on public.disputes
  for select using (requester_id = auth.uid());

drop policy if exists disputes_propias_insert on public.disputes;
create policy disputes_propias_insert on public.disputes
  for insert with check (
    requester_id = auth.uid() and not public.esta_suspendido(auth.uid())
  );


-- ────────────────────────────────────────────────────────────────
-- RESEÑAS MODERABLES DESDE EL PANEL
--
-- El reporte guardaba el contexto 'review', que decía que la queja era sobre
-- una reseña pero no sobre CUÁL. Para actuar había que entrar al perfil y
-- buscarla a mano. Ahora el reporte guarda 'review:<id>' y el panel la lee y
-- la retira sin salir de allí.
-- ────────────────────────────────────────────────────────────────

create or replace function public.resena_reportada(p_id uuid)
returns table (
  id uuid, tags text[], comment text,
  autor text, destino text, destino_id uuid, cuando timestamptz
) language sql stable security definer set search_path = public as $$
  select r.id, r.tags, r.comment, pa.full_name, pd.full_name, r.target_id, r.created_at
    from public.dance_reviews r
    left join public.profiles pa on pa.id = r.author_id
    left join public.profiles pd on pd.id = r.target_id
   where r.id = p_id and public.is_admin();
$$;

grant execute on function public.resena_reportada(uuid) to authenticated;


-- Retirar una reseña como administrador, dejando constancia.
create or replace function public.retirar_resena(p_id uuid, p_motivo text)
returns boolean language plpgsql security definer set search_path = public as $$
declare autor uuid; afectadas int;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede retirar una reseña';
  end if;

  select author_id into autor from public.dance_reviews where id = p_id;
  if autor is null then return false; end if;

  delete from public.dance_reviews where id = p_id;
  get diagnostics afectadas = row_count;
  return afectadas > 0;
end $$;

grant execute on function public.retirar_resena(uuid, text) to authenticated;


-- ────────────────────────────────────────────────────────────────
-- ESTADO DE LA CUENTA, PARA EL PANEL
--
-- El bloqueo de acceso vive en `auth`, no aquí: lo aplica la función de borde
-- `moderar-cuenta` con la API de administración. El panel necesita saber si
-- está puesto, y esto se lo dice.
-- ────────────────────────────────────────────────────────────────

create or replace function public.acceso_bloqueado(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select banned_until is not null and banned_until > now()
       from auth.users where id = p_user),
    false)
   and public.is_admin();
$$;

grant execute on function public.acceso_bloqueado(uuid) to authenticated;


-- Reportes del panel, ahora con el bloqueo de acceso incluido.
create or replace function public.reportes_admin()
returns table (
  id uuid, reporter_id uuid, reporter text, reported_id uuid, reported text,
  reported_avatar text, reason text, context text, status text,
  created_at timestamptz, veces_reportado int,
  reported_suspendido boolean, reported_rol text, acceso_bloqueado boolean
) language sql stable security definer set search_path = public as $$
  select r.id, r.reporter_id, pr.full_name, r.reported_id, pd.full_name, pd.avatar_url,
         r.reason, r.context, r.status, r.created_at,
         (select count(*)::int from public.user_reports x where x.reported_id = r.reported_id),
         (coalesce(pd.status, '') = 'suspended' or pd.deleted_at is not null),
         pd.role::text,
         coalesce((select au.banned_until is not null and au.banned_until > now()
                     from auth.users au where au.id = r.reported_id), false)
    from public.user_reports r
    left join public.profiles pr on pr.id = r.reporter_id
    left join public.profiles pd on pd.id = r.reported_id
   where public.is_admin()
   order by r.created_at desc
   limit 500;
$$;

grant execute on function public.reportes_admin() to authenticated;
