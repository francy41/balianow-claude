import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, X, DollarSign, Shield, BarChart3, Save } from 'lucide-react';

type Tab = 'solicitudes' | 'config' | 'reparto';
interface AppRow { user_id: string; status: string; channel_name: string | null; payout_method: string | null; payout_details: string | null; motivation: string | null; applied_at: string; }
interface Config { platform_percent: number; creator_percent: number; }
interface Report { platform_percent: number; creator_percent: number; total_impressions: number; creators: { creator_id: string; name: string; impressions: number }[]; }

const eur = (n: number) => `€${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TvMonetizationAdminSection: React.FC<{ addToast: (t: any) => void }> = ({ addToast }) => {
  const [tab, setTab] = useState<Tab>('solicitudes');
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [config, setConfig] = useState<Config>({ platform_percent: 40, creator_percent: 60 });
  const [report, setReport] = useState<Report | null>(null);
  const [pool, setPool] = useState('');
  const [plat, setPlat] = useState('40');
  const [crea, setCrea] = useState('60');

  const load = useCallback(async () => {
    setLoading(true);
    const [a, c, r] = await Promise.all([
      supabase.from('creator_monetization').select('*').order('applied_at', { ascending: false }),
      supabase.from('tv_revenue_config').select('*').eq('id', 1).maybeSingle(),
      supabase.rpc('tv_monetization_report'),
    ]);
    setApps((a.data as AppRow[]) || []);
    if (c.data) { setConfig(c.data as Config); setPlat(String((c.data as Config).platform_percent)); setCrea(String((c.data as Config).creator_percent)); }
    setReport((r.data as Report) || null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (a: AppRow, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('creator_monetization').update({ status, reviewed_at: new Date().toISOString() }).eq('user_id', a.user_id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: status === 'approved' ? 'Creador aprobado para monetizar ✔️' : 'Solicitud rechazada', type: 'success' }); load();
  };

  const saveConfig = async () => {
    const p = parseFloat(plat) || 0, cr = parseFloat(crea) || 0;
    const { error } = await supabase.from('tv_revenue_config').update({ platform_percent: p, creator_percent: cr, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Reparto guardado', type: 'success' }); load();
  };

  const pending = apps.filter(a => a.status === 'pending');
  const creatorPool = (parseFloat(pool) || 0) * (report?.creator_percent ?? config.creator_percent) / 100;
  const platformCut = (parseFloat(pool) || 0) * (report?.platform_percent ?? config.platform_percent) / 100;

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  const TABS: [Tab, string][] = [['solicitudes', `Solicitudes${pending.length ? ` (${pending.length})` : ''}`], ['config', 'Reparto %'], ['reparto', 'Informe de pagos']];

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Monetización de BailaNow TV</h2>
        <p className="text-gray-500 text-sm">Modelo YouTube: la plataforma se queda un {config.platform_percent}% y el {config.creator_percent}% se reparte entre los creadores aprobados.</p>
      </div>

      <div className="flex gap-1.5 mb-5">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-xl ${tab === id ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
            {id === 'solicitudes' ? <DollarSign className="w-4 h-4" /> : id === 'config' ? <Shield className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />} {label}
          </button>
        ))}
      </div>

      {tab === 'solicitudes' && (
        apps.length === 0 ? <p className="text-gray-400 text-sm py-10 text-center">Aún no hay solicitudes de monetización.</p> : (
          <div className="space-y-3">
            {apps.map(a => (
              <div key={a.user_id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{a.channel_name || a.user_id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">{a.payout_method} · {a.payout_details || '—'}</p>
                  {a.motivation && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{a.motivation}"</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {a.status === 'pending' ? (
                    <>
                      <button onClick={() => review(a, 'approved')} className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500 text-white rounded-lg px-3 py-1.5"><Check className="w-3.5 h-3.5" /> Aprobar</button>
                      <button onClick={() => review(a, 'rejected')} className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5"><X className="w-3.5 h-3.5" /> Rechazar</button>
                    </>
                  ) : <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{a.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'config' && (
        <div className="max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800/50">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Define cómo se reparten los ingresos por anuncios de TV. Deben sumar 100%.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-gray-500">Plataforma %</label><input value={plat} onChange={e => setPlat(e.target.value)} type="number" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" /></div>
            <div><label className="text-xs font-bold text-gray-500">Creadores %</label><input value={crea} onChange={e => setCrea(e.target.value)} type="number" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" /></div>
          </div>
          {(parseFloat(plat) || 0) + (parseFloat(crea) || 0) !== 100 && <p className="text-amber-600 text-xs mt-2">⚠️ Ahora suman {(parseFloat(plat) || 0) + (parseFloat(crea) || 0)}%, deberían sumar 100%.</p>}
          <button onClick={saveConfig} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold bg-brand-orange text-white rounded-lg px-4 py-2"><Save className="w-4 h-4" /> Guardar reparto</button>
        </div>
      )}

      {tab === 'reparto' && (
        <div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 mb-4">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Ingresos totales por anuncios del periodo (€)</label>
            <input value={pool} onChange={e => setPool(e.target.value)} type="number" placeholder="Ej. 1000" className="w-full mt-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
            {parseFloat(pool) > 0 && (
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-500">Plataforma: <b className="text-gray-900 dark:text-white">{eur(platformCut)}</b></span>
                <span className="text-gray-500">A repartir a creadores: <b className="text-emerald-600">{eur(creatorPool)}</b></span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">Reparto por impresiones ({report?.total_impressions || 0} impresiones de creadores aprobados):</p>
          {!report || report.creators.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no hay impresiones de creadores aprobados.</p>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              {report.creators.map(c => {
                const share = report.total_impressions ? (c.impressions / report.total_impressions) : 0;
                return (
                  <div key={c.creator_id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/40">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{c.name}</p>
                      <p className="text-gray-400 text-xs">{c.impressions} impresiones · {(share * 100).toFixed(1)}%</p>
                    </div>
                    <span className="font-black text-emerald-600">{eur(creatorPool * share)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TvMonetizationAdminSection;
