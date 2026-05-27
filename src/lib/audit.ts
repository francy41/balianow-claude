/**
 * audit — registra acciones admin/sensibles en tabla audit_logs
 *
 * Uso:
 *   await audit('update', 'profile', userId, { before, after });
 *   await audit('delete', 'event', eventId);
 *
 * No-op si no hay sesión. Falla silenciosamente para no romper UX.
 */
import { supabase } from './supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'login' | 'logout' | 'permission_change' | 'export' | 'import' | 'publish' | 'refund' | 'ban' | 'unban';

export async function audit(
  action: AuditAction,
  entity: string,
  entityId?: string | null,
  payload?: { before?: any; after?: any; metadata?: any }
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Calcular diff básico si tenemos before y after
    let diff: Record<string, { from: any; to: any }> | undefined;
    if (payload?.before && payload?.after) {
      diff = {};
      const keys = new Set([...Object.keys(payload.before), ...Object.keys(payload.after)]);
      keys.forEach(k => {
        if (JSON.stringify(payload.before[k]) !== JSON.stringify(payload.after[k])) {
          diff![k] = { from: payload.before[k], to: payload.after[k] };
        }
      });
    }

    await supabase.from('audit_logs').insert({
      actor_id:    session.user.id,
      actor_email: session.user.email,
      actor_role:  (session.user.user_metadata as any)?.role || 'user',
      action,
      entity,
      entity_id:   entityId,
      before_state: payload?.before || null,
      after_state:  payload?.after || null,
      diff:        diff || null,
      user_agent:  typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata:    payload?.metadata || null,
    });
  } catch (e) {
    // Silencioso — el audit log no debe romper la UX
    console.warn('[audit] failed', e);
  }
}

/** Soft delete genérico: marca deleted_at en vez de DELETE */
export async function softDelete(
  table: 'profiles' | 'artists' | 'venues' | 'events' | 'bookings',
  id: string,
  reason?: string
): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    await audit('delete', table.slice(0, -1), id, { metadata: { reason } });
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

/** Restaura un item soft-deleted */
export async function softRestore(
  table: 'profiles' | 'artists' | 'venues' | 'events' | 'bookings',
  id: string
): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
    if (error) return { error: error.message };
    await audit('restore', table.slice(0, -1), id);
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}
