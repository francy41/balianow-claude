import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Sub = { table: string; filter?: string; event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' };

/**
 * Suscribe a cambios en tiempo real de una o varias tablas de Supabase y ejecuta
 * `onChange` cuando llega cualquier evento. Úsalo para paneles que deben reflejar
 * ventas/consultas al instante sin recargar.
 *
 *   useRealtime(uid ? `panel-${uid}` : null, [
 *     { table: 'partner_inquiries', filter: `partner_id=eq.${uid}` },
 *   ], () => reload());
 *
 * Pasa `channelName = null` para no suscribirse (p. ej. si aún no hay usuario).
 */
export function useRealtime(channelName: string | null, subs: Sub[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = JSON.stringify(subs);

  useEffect(() => {
    if (!channelName) return;
    let channel = supabase.channel(channelName);
    (JSON.parse(key) as Sub[]).forEach((s) => {
      channel = (channel as ReturnType<typeof supabase.channel>).on(
        'postgres_changes' as never,
        { event: s.event ?? '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) } as never,
        (() => cb.current()) as never,
      );
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelName, key]);
}
