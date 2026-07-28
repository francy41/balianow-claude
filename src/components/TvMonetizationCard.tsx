import React, { useCallback, useEffect, useState } from 'react';
import { DollarSign, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Row { status: string; channel_name: string | null; }

// Tarjeta de monetización para el creador de BailaNow TV (modelo YouTube 60/40).
const TvMonetizationCard: React.FC<{ uid: string; addToast: (t: any) => void }> = ({ uid, addToast }) => {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ channel_name: '', payout_method: 'paypal', payout_details: '', motivation: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('creator_monetization').select('status,channel_name').eq('user_id', uid).maybeSingle();
    setRow((data as Row) || null); setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const apply = async () => {
    if (!form.channel_name.trim()) { addToast({ message: 'Ponle nombre a tu canal', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('creator_monetization').insert({
      user_id: uid, status: 'pending', channel_name: form.channel_name.trim(),
      payout_method: form.payout_method, payout_details: form.payout_details.trim() || null, motivation: form.motivation.trim() || null,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Solicitud de monetización enviada', type: 'success' }); setOpen(false); load();
  };

  if (loading) return null;

  const st = row?.status;
  const badge = st === 'approved'
    ? { icon: <CheckCircle2 className="w-4 h-4" />, txt: 'Monetización activa', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40' }
    : st === 'pending'
    ? { icon: <Clock className="w-4 h-4" />, txt: 'Solicitud en revisión', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/40' }
    : st === 'rejected'
    ? { icon: <XCircle className="w-4 h-4" />, txt: 'Solicitud no aprobada', cls: 'bg-red-500/15 text-red-300 ring-red-500/40' }
    : null;

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 mb-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-fuchsia-600 flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div>
          <div>
            <p className="font-bold text-white text-sm">Monetización · gana con tus vídeos</p>
            <p className="text-white/50 text-xs">Modelo 60/40: tú recibes el 60% de los ingresos por anuncios de tus vídeos.</p>
          </div>
        </div>
        {badge
          ? <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ring-1 ${badge.cls}`}>{badge.icon} {badge.txt}</span>
          : <button onClick={() => setOpen(o => !o)} className="text-xs font-bold bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white rounded-lg px-3.5 py-2">Solicitar monetización</button>}
      </div>

      {open && !badge && (
        <div className="mt-4 space-y-2.5">
          <input value={form.channel_name} onChange={e => setForm(f => ({ ...f, channel_name: e.target.value }))} placeholder="Nombre de tu canal *" className="w-full rounded-lg bg-black/30 ring-1 ring-white/15 px-3 py-2 text-sm text-white outline-none focus:ring-fuchsia-500" />
          <div className="grid sm:grid-cols-2 gap-2.5">
            <select value={form.payout_method} onChange={e => setForm(f => ({ ...f, payout_method: e.target.value }))} className="rounded-lg bg-black/30 ring-1 ring-white/15 px-3 py-2 text-sm text-white outline-none">
              <option value="paypal" className="bg-gray-900">PayPal</option>
              <option value="bank" className="bg-gray-900">Transferencia</option>
            </select>
            <input value={form.payout_details} onChange={e => setForm(f => ({ ...f, payout_details: e.target.value }))} placeholder="Email PayPal / IBAN" className="rounded-lg bg-black/30 ring-1 ring-white/15 px-3 py-2 text-sm text-white outline-none focus:ring-fuchsia-500" />
          </div>
          <textarea value={form.motivation} onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))} rows={2} placeholder="Cuéntanos sobre tu contenido (opcional)" className="w-full rounded-lg bg-black/30 ring-1 ring-white/15 px-3 py-2 text-sm text-white outline-none focus:ring-fuchsia-500 resize-none" />
          <button onClick={apply} disabled={saving} className="w-full bg-white text-gray-900 font-bold rounded-lg py-2.5 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Enviar solicitud</button>
        </div>
      )}
    </div>
  );
};

export default TvMonetizationCard;
