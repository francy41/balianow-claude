import React, { useEffect, useState, useCallback } from 'react';
import { Tv, Loader2, Eye, EyeOff, Star, Trash2, Calculator, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';

interface AdminTitle {
  id: string; title: string; creator_id: string | null; style: string | null;
  access: string; status: string; featured: boolean; cover_url: string | null;
}
interface Share { creator: string; count: number; pct: number; amount: number; }

const TVAdminPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [tab, setTab] = useState<'contenido' | 'regalias'>('contenido');
  const [titles, setTitles] = useState<AdminTitle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('tv_titles').select('*').order('created_at', { ascending: false });
    setTitles((data || []) as AdminTitle[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, updates: Partial<AdminTitle>, msg: string) => {
    const { error } = await supabase.from('tv_titles').update(updates).eq('id', id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: msg, type: 'success' });
    load();
  };
  const del = async (id: string) => {
    const { error } = await supabase.from('tv_titles').delete().eq('id', id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Título eliminado', type: 'success' });
    load();
  };

  // ── Regalías ──
  const [revenue, setRevenue] = useState('100000');
  const [shares, setShares] = useState<Share[] | null>(null);
  const [computing, setComputing] = useState(false);

  const rev = parseFloat(revenue) || 0;
  const platform = Math.round(rev * 0.30);
  const pool = Math.round(rev * 0.70);

  const computeShares = async () => {
    setComputing(true);
    try {
      const { data: prog } = await supabase.from('tv_progress')
        .select('lesson:tv_lessons(title:tv_titles(creator_id))').eq('completed', true).limit(5000);
      const counts: Record<string, number> = {};
      (prog || []).forEach((p: any) => {
        const cid = p.lesson?.title?.creator_id;
        if (cid) counts[cid] = (counts[cid] || 0) + 1;
      });
      const ids = Object.keys(counts);
      const total = ids.reduce((a, id) => a + counts[id], 0);
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        (profs || []).forEach((p: any) => { names[p.id] = p.full_name || p.id.slice(0, 8); });
      }
      const rows: Share[] = ids.map(id => {
        const pct = total ? counts[id] / total : 0;
        return { creator: names[id] || id.slice(0, 8), count: counts[id], pct, amount: pool * pct };
      }).sort((a, b) => b.amount - a.amount);
      setShares(rows);
    } catch { addToast({ message: 'No se pudo calcular', type: 'error' }); }
    setComputing(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Tv className="w-6 h-6 text-fuchsia-500" /> Superadmin · BailaNow TV
        </h1>
        <p className="text-sm text-gray-500 mb-6">Modera el catálogo y calcula el reparto de regalías.</p>

        <div className="flex gap-2 mb-6">
          {(['contenido', 'regalias'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800'}`}>
              {t === 'contenido' ? 'Contenido' : 'Regalías'}
            </button>
          ))}
        </div>

        {tab === 'contenido' ? (
          titles.length === 0 ? (
            <div className="text-center py-16"><Film className="w-10 h-10 mx-auto text-gray-300 mb-2" /><p className="text-gray-500">Aún no hay títulos en BailaNow TV.</p></div>
          ) : (
            <div className="space-y-3">
              {titles.map(t => (
                <div key={t.id} className="card-white rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-16 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {t.cover_url ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" /> : <span>💃</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{t.title}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{t.style} · {t.access}
                      <span className={`ml-2 font-bold ${t.status === 'published' ? 'text-emerald-600' : 'text-gray-400'}`}>{t.status === 'published' ? '● Publicado' : '○ Borrador'}</span>
                      {t.featured && <span className="ml-2 text-amber-500 font-bold">★ Destacado</span>}
                    </p>
                  </div>
                  <button onClick={() => patch(t.id, { featured: !t.featured }, t.featured ? 'Quitado de destacados' : 'Destacado ★')} title="Destacar" className={t.featured ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}>
                    <Star className="w-4 h-4" fill={t.featured ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={() => patch(t.id, { status: t.status === 'published' ? 'draft' : 'published' }, t.status === 'published' ? 'Despublicado' : 'Publicado ✔️')} title="Publicar" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    {t.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => del(t.id)} title="Eliminar" className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-5">
            {/* Ingresos + reparto */}
            <div className="card-white rounded-2xl p-5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ingresos mensuales de suscripción (€)</label>
              <input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="input-field mt-1" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#2b3a67,#1c2547)' }}>
                  <p className="text-3xl font-black">€{platform.toLocaleString('es-ES')}</p>
                  <p className="text-xs opacity-80 font-bold uppercase mt-1">30% Plataforma</p>
                </div>
                <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#134e35,#0f6b45)' }}>
                  <p className="text-3xl font-black">€{pool.toLocaleString('es-ES')}</p>
                  <p className="text-xs opacity-80 font-bold uppercase mt-1">70% Fondo creadores</p>
                </div>
              </div>
              <button onClick={computeShares} disabled={computing} className="btn-orange w-full mt-4 disabled:opacity-50">
                {computing ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Calculator className="w-4 h-4 inline mr-1" /> Calcular reparto por creador</>}
              </button>
            </div>

            {/* Reparto */}
            {shares === null ? null : shares.length === 0 ? (
              <div className="card-white rounded-2xl p-8 text-center">
                <p className="text-gray-500 text-sm">Aún no hay consumo (clases completadas) para repartir. En cuanto los usuarios vean clases, aquí saldrá el reparto real.</p>
              </div>
            ) : (
              <div className="card-white rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800"><p className="text-xs font-black uppercase tracking-wide text-gray-400">Reparto estimado por rendimiento</p></div>
                {shares.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="w-6 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.creator}</p>
                      <p className="text-[11px] text-gray-400">{s.count} clases completadas · {(s.pct * 100).toFixed(1)}% del consumo</p>
                    </div>
                    <span className="font-black text-emerald-600">€{s.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-gray-400 leading-relaxed">
              ⚠️ Cálculo <b>estimado</b> basado en clases completadas (proxy de consumo). El motor real de Fase 2 usará <b>minutos validados</b> (anti-fraude) y pagará vía Stripe Connect. Ver <code>docs/bailanow-tv/ARCHITECTURE.md</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TVAdminPage;
