import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Heart } from 'lucide-react';

interface DonationRow { id: string; amount: number; currency: string; email: string | null; message: string | null; created_at: string; }
interface Summary { total: number; count: number; this_month: number; }

const eur = (n: number) => `€${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DonationsAdminSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ total: 0, count: 0, this_month: 0 });
  const [rows, setRows] = useState<DonationRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sum }, { data: list }] = await Promise.all([
      supabase.rpc('get_donations_summary'),
      supabase.from('donations').select('*').eq('status', 'completed').order('created_at', { ascending: false }).limit(50),
    ]);
    if (sum) setSummary(sum as Summary);
    setRows((list as DonationRow[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Donaciones</h2>
        <p className="text-gray-500 text-sm">Recaudación vía Stripe del botón de donación.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl p-5 bg-brand-orange text-white">
          <div className="flex items-center gap-2 text-white/85 text-xs font-bold uppercase tracking-wide"><Heart className="w-4 h-4" fill="currentColor" /> Total recaudado</div>
          <p className="font-display font-black text-3xl mt-1">{eur(summary.total)}</p>
        </div>
        <div className="rounded-2xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 text-xs font-bold uppercase">Este mes</p>
          <p className="font-display font-black text-3xl mt-1 text-gray-900 dark:text-white">{eur(summary.this_month)}</p>
        </div>
        <div className="rounded-2xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 text-xs font-bold uppercase">Nº donaciones</p>
          <p className="font-display font-black text-3xl mt-1 text-gray-900 dark:text-white">{summary.count}</p>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Últimas donaciones</h3>
      {rows.length === 0 ? (
        <div className="py-14 text-center text-gray-400"><Heart className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Aún no hay donaciones registradas.</p></div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {rows.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/40">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white">{eur(d.amount)} <span className="text-gray-400 font-normal text-sm">· {d.email || 'anónimo'}</span></p>
                {d.message && <p className="text-gray-500 text-xs italic truncate">"{d.message}"</p>}
              </div>
              <span className="text-gray-400 text-xs flex-shrink-0">{new Date(d.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationsAdminSection;
