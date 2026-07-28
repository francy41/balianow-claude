import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Ticket, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Ev { id: string; title: string; date: string | null; cover: string | null; }
interface Tk { event_id: string; price: number; status: string; }

const eur = (n: number) => `€${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const SOLD = new Set(['valid', 'used']);

// Ventas de entradas del venue/organizador: por evento + total recaudado.
const TicketSalesTab: React.FC<{ performerId: string }> = ({ performerId }) => {
  const [events, setEvents] = useState<Ev[]>([]);
  const [tickets, setTickets] = useState<Tk[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ev } = await supabase.from('events').select('id,title,date,cover').eq('created_by', performerId);
    const list = (ev as Ev[]) || [];
    setEvents(list);
    const ids = list.map(e => e.id);
    if (ids.length) {
      const { data: tk } = await supabase.from('tickets').select('event_id,price,status').in('event_id', ids);
      setTickets((tk as Tk[]) || []);
    } else setTickets([]);
    setLoading(false);
  }, [performerId]);
  useEffect(() => { load(); }, [load]);

  const byEvent = useMemo(() => {
    const map: Record<string, { sold: number; revenue: number }> = {};
    tickets.forEach(t => {
      if (!SOLD.has(t.status)) return;
      map[t.event_id] = map[t.event_id] || { sold: 0, revenue: 0 };
      map[t.event_id].sold += 1;
      map[t.event_id].revenue += Number(t.price || 0);
    });
    return map;
  }, [tickets]);

  const totalSold = Object.values(byEvent).reduce((s, e) => s + e.sold, 0);
  const totalRevenue = Object.values(byEvent).reduce((s, e) => s + e.revenue, 0);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <p className="text-white/85 text-xs font-bold uppercase flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Recaudado</p>
          <p className="font-display font-black text-2xl mt-1">{eur(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 text-xs font-bold uppercase flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> Entradas</p>
          <p className="font-display font-black text-2xl mt-1 text-gray-900 dark:text-white">{totalSold}</p>
        </div>
        <div className="rounded-2xl p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 text-xs font-bold uppercase flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Eventos</p>
          <p className="font-display font-black text-2xl mt-1 text-gray-900 dark:text-white">{events.length}</p>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Ventas por evento</h3>
      {events.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Aún no tienes eventos. Crea uno para empezar a vender entradas.</p>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {events.map(e => {
            const s = byEvent[e.id] || { sold: 0, revenue: 0 };
            return (
              <div key={e.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/40 gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{e.title}</p>
                  {e.date && <p className="text-gray-400 text-xs">{new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-emerald-600">{eur(s.revenue)}</p>
                  <p className="text-gray-400 text-xs">{s.sold} {s.sold === 1 ? 'entrada' : 'entradas'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-gray-400 text-xs mt-4">💡 Tus ingresos por entradas se acumulan en tus ganancias. Retíralos desde la pestaña <b>Cobrar</b>.</p>
    </div>
  );
};

export default TicketSalesTab;
