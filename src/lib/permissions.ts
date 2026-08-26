/**
 * Permisos — fuente única de verdad en el cliente.
 *
 * Antes cada pantalla decidía por su cuenta si alguien era administrador, y
 * casi todas miraban solo `user.role`, ignorando `user.roles` (la tabla
 * `user_roles`). `ProtectedRoute` sí miraba las dos, así que alguien con
 * `admin` en `user_roles` pero no en `profiles.role` entraba en /admin y allí
 * todo fallaba en silencio: la interfaz le trataba como usuario normal y RLS
 * rechazaba cada escritura.
 *
 * Estas funciones unifican el criterio. Su equivalente en el servidor es
 * `public.has_role()` de `supabase/unify-roles.sql`, que consulta las mismas
 * dos fuentes: quien pase aquí, pasa allí.
 *
 * IMPORTANTE: esto es conveniencia de interfaz, no seguridad. La autorización
 * real es RLS. Nunca sustituyas una política por una comprobación de estas.
 */
import type { User, UserRole } from '../store/appStore';

type MaybeUser = Pick<User, 'role' | 'roles'> | null | undefined;

/** Todos los roles de la cuenta, sin duplicados: el activo más los asignados. */
export function allRoles(user: MaybeUser): UserRole[] {
  if (!user) return [];
  const set = new Set<UserRole>();
  if (user.role) set.add(user.role);
  for (const r of user.roles || []) if (r) set.add(r);
  return Array.from(set);
}

/** ¿Tiene este rol, sea el activo o uno más de la cuenta? */
export function hasRole(user: MaybeUser, role: UserRole): boolean {
  return allRoles(user).includes(role);
}

/** ¿Alguno de estos roles? */
export function hasAnyRole(user: MaybeUser, roles: UserRole[]): boolean {
  const mine = allRoles(user);
  return roles.some(r => mine.includes(r));
}

/** Superadministrador: acceso a todo. */
export function isSuperAdmin(user: MaybeUser): boolean {
  return hasRole(user, 'superadmin');
}

/** Administrador o superadministrador. Equivale a `public.is_admin()` en la BD. */
export function isAdmin(user: MaybeUser): boolean {
  return hasAnyRole(user, ['admin', 'superadmin']);
}

/**
 * ¿Puede entrar en una zona que exige `required`?
 * El superadministrador entra siempre; el resto necesita el rol concreto.
 */
export function canAccess(user: MaybeUser, required?: UserRole): boolean {
  if (!user) return false;
  if (!required) return true;
  return isSuperAdmin(user) || hasRole(user, required);
}
