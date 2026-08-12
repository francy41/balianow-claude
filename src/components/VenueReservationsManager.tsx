import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, Copy, Save, Clock, ShoppingBag, FileText } from 'lucide-react';

interface Props {
  userId: string;
  addToast: (o: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Hour { day_of_week: number; is_open: boolean; open_time: string; close_time: string; }
interface Product { id?: string; name: string; price: number; description?: string; active: boolean; }

const blankHours = (): Hour[] =>
  DAYS.map((_, d) => ({ day_of_week: d, is_open: d >= 4 || d === 0, open_time: '23:00', close_time: '06:00' }));

const VenueReservationsManager: React.FC<Props> = ({ userId, addToast }) => {
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [venue, setVenue] = useState<any>(null);
  const [hours, setHours] = useState<Hour[]>(blankHours());
  const [products, setProducts] = useState<Product[]>([]);
  const [terms, setTerms] = useState('');
  const [refund, setRefund] = useState(50);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    // El local del usuario (dueño)
    const { data: v } = await supabase.from('venues').select('*')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`).is('deleted_at', null).limit(1).maybeSingle();
    if (!v) { setVenue(null); setLoading(false); return; }
    setVenue(v);
    setTerms(v.reservation_terms || '');
    setRefund(v.refund_percent ?? 50);
    setEnabled(v.reservations_enabled ?? true);

    const { data: h, error: hErr } = await supabase.from('venue_hours').select('*').eq('venue_id', v.id);
    if (hErr && /does not exist|schema cache|42P01/i.test(hErr.message)) { setTableMissing(true); setLoading(false); return; }
    if (h && h.length) {
      const map = new Map(h.map((r: any) => [r.day_of_week, r]));
      setHours(DAYS.map((_, d) => {
        const r: any = map.get(d);
        return r
          ? { day_of_week: d, is_open: r.is_open, open_time: (r.open_time || '23:00').slice(0, 5), close_time: (r.close_time || '06:00').slice(0, 5) }
          : { day_of_week: d, is_open: false, open_time: '23:00', close_time: '06:00' };
      }));
    }
    const { data: p } = await supabase.from('venue_products').select('*').eq('venue_id', v.id).order('sort');
    if (p) setProducts(p.map((r: any) => ({ id: r.id, name: r.name, price: Number(r.price), description: r.description || '', active: r.active })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const setHour = (d: number, patch: Partial<Hour>) =>
    setHours(hs => hs.map(h => h.day_of_week === d ? { ...h, ...patch } : h));

  const duplicateToAll = (d: number) => {
    const src = hours.find(h => h.day_of_week === d)!;
    setHours(hs => hs.map(h => ({ ...h, is_open: src.is_open, open_time: src.open_time, close_time: src.close_time })));
    addToast({ message: `Horario de ${DAYS[d]} copiado a todos los días`, type: 'info' });
  };

  const saveHours = async () => {
    if (!venue) return;
    setSaving(true);
    const rows = hours.map(h => ({
      venue_id: venue.id, day_of_week: h.day_of_week, is_open: h.is_open,
      open_time: h.is_open ? h.open_time : null, close_time: h.is_open ? h.close_time : null,
    }));
    const { error } = await supabase.from('venue_hours').upsert(rows, { onConflict: 'venue_id,day_of_week' });
    setSaving(false);
    addToast({ message: error ? `Error: ${error.message}` : '✅ Horarios guardados', type: error ? 'error' : 'success' });
  };

  const addProduct = () => setProducts(ps => [...ps, { name: '', price: 0, active: true }]);
  const setProduct = (i: number, patch: Partial<Product>) => setProducts(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const removeProduct = async (i: number) => {
    const p = products[i];
    if (p.id) await supabase.from('venue_products').delete().eq('id', p.id);
    setProducts(ps => ps.filter((_, idx) => idx !== i));
  };
  const saveProducts = async () => {
    if (!venue) return;
    setSaving(true);
    let err = '';
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.name.trim()) continue;
      const row: any = { venue_id: venue.id, name: p.name.trim(), price: Number(p.price) || 0, description: p.description || null, active: p.active, sort: i };
      if (p.id) { const { error } = await supabase.from('venue_products').update(row).eq('id', p.id); if (error) err = error.message; }
      else { const { error } = await supabase.from('venue_products').insert(row); if (error) err = error.message; }
    }
    setSaving(false);
    if (err) { addToast({ message: `Error: ${err}`, type: 'error' }); return; }
    addToast({ message: '✅ Productos guardados', type: 'success' });
    load();
  };

  const saveConfig = async () => {
    if (!venue) return;
    setSaving(true);
    const { error } = await supabase.from('venues')
      .update({ reservation_terms: terms || null, refund_percent: refund, reservations_enabled: enabled })
      .eq('id', venue.id);
    setSaving(false);
    addToast({ message: error ? `Error: ${error.message}` : '✅ Configuración guardada', type: error ? 'error' : 'success' });
  };

  if (loading) return <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto" /></div>;

  if (tableMissing) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-5 text-sm text-amber-800 dark:text-amber-200">
        <p className="font-bold mb-2">Falta crear las tablas de reservas.</p>
        <p>Ejecuta una vez <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/venue-reservations.sql</code> en el editor SQL de Supabase y recarga.</p>
      </div>
    );
  }

  if (!venue) {
    return <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 text-sm text-gray-500">No encontramos un local asociado a tu cuenta. Crea tu local primero (o pide al superadmin que lo vincule) para gestionar reservas.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Horarios */}
      <section className="card-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-brand-orange" /> Horarios por día</h3>
          <button onClick={saveHours} disabled={saving} className="btn-orange text-sm px-4 py-2">{saving ? '…' : 'Guardar horarios'}</button>
        </div>
        <div className="space-y-2">
          {hours.map(h => (
            <div key={h.day_of_week} className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 w-32 flex-shrink-0">
                <input type="checkbox" checked={h.is_open} onChange={e => setHour(h.day_of_week, { is_open: e.target.checked })} className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{DAYS[h.day_of_week]}</span>
              </label>
              {h.is_open ? (
                <>
                  <input type="time" value={h.open_time} onChange={e => setHour(h.day_of_week, { open_time: e.target.value })} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-sm bg-transparent" />
                  <span className="text-gray-400">–</span>
                  <input type="time" value={h.close_time} onChange={e => setHour(h.day_of_week, { close_time: e.target.value })} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-sm bg-transparent" />
                </>
              ) : <span className="text-sm text-gray-400">Cerrado</span>}
              <button onClick={() => duplicateToAll(h.day_of_week)} title="Duplicar a todos los días" className="ml-auto text-xs text-pink-600 font-bold flex items-center gap-1 hover:underline"><Copy className="w-3.5 h-3.5" /> Duplicar</button>
            </div>
          ))}
        </div>
      </section>

      {/* Productos */}
      <section className="card-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-brand-orange" /> Productos para reservas</h3>
          <div className="flex gap-2">
            <button onClick={addProduct} className="text-sm font-bold text-pink-600 flex items-center gap-1"><Plus className="w-4 h-4" /> Añadir</button>
            <button onClick={saveProducts} disabled={saving} className="btn-orange text-sm px-4 py-2">{saving ? '…' : 'Guardar'}</button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">Ej. "Botella de ron" — se podrán añadir a las reservas con su precio.</p>
        <div className="space-y-2">
          {products.map((p, i) => (
            <div key={p.id || i} className="flex items-center gap-2">
              <input value={p.name} onChange={e => setProduct(i, { name: e.target.value })} placeholder="Nombre del producto" className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent" />
              <div className="flex items-center gap-1"><span className="text-gray-400">€</span>
                <input type="number" step="0.5" min="0" value={p.price} onChange={e => setProduct(i, { price: parseFloat(e.target.value) || 0 })} className="w-20 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent" />
              </div>
              <button onClick={() => removeProduct(i)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 grid place-items-center"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-gray-400">Sin productos. Añade el primero.</p>}
        </div>
      </section>

      {/* Términos y reembolso */}
      <section className="card-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-brand-orange" /> Términos y reembolso</h3>
          <button onClick={saveConfig} disabled={saving} className="btn-orange text-sm px-4 py-2">{saving ? '…' : 'Guardar'}</button>
        </div>
        <label className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-4 h-4 accent-brand-orange" /> Aceptar reservas online
        </label>
        <div className="mb-3">
          <label className="text-xs font-bold text-gray-500 uppercase">% que se reembolsa si el cliente no asiste</label>
          <div className="flex items-center gap-1 mt-1">
            <input type="number" min="0" max="100" value={refund} onChange={e => setRefund(parseInt(e.target.value) || 0)} className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-lg font-black text-brand-orange bg-transparent" />
            <span className="text-lg font-black text-brand-orange">%</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Términos y condiciones de la reserva</label>
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} placeholder="Ej. Reserva sujeta a disponibilidad. Cancelación con 24h. Reembolso del 50% por no asistencia…" className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent" />
        </div>
      </section>
    </div>
  );
};

export default VenueReservationsManager;
