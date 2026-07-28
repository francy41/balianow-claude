import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, X, MapPin, ExternalLink } from 'lucide-react';

interface AppRow {
  id: string; user_id: string | null; name: string | null; email: string; phone: string | null;
  role: string; city: string | null; portfolio_url: string | null; message: string | null; status: string; created_at: string;
}
const ROLE_LABEL: Record<string, string> = { artist: '🎺 Artista', dancer: '💃 Bailarín/a', dj: '🎧 DJ/Músico', venue: '🏛️ Local', promoter: '📣 Promotor', musician: '🎵 Músico' };

const CreatorApplicationsAdminSection: React.FC<{ addToast: (t: any) => void }> = ({ addToast }) => {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('creator_applications').select('*').order('created_at', { ascending: false });
    setApps((data as AppRow[]) || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (a: AppRow) => {
    const { error } = await supabase.rpc('approve_creator_application', { p_id: a.id });
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: `${a.name || 'Solicitante'} aprobado ✔️`, type: 'success' }); load();
  };
  const reject = async (a: AppRow) => {
    await supabase.from('creator_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', a.id);
    addToast({ message: 'Solicitud rechazada', type: 'success' }); load();
  };

  const list = filter === 'pending' ? apps.filter(a => a.status === 'pending') : apps;
  const pendingCount = apps.filter(a => a.status === 'pending').length;

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Solicitudes de creadores</h2>
          <p className="text-gray-500 text-sm">Artistas, bailarines, músicos, locales y promotores que piden unirse. Aprueba para verificar su perfil.</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFilter('pending')} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${filter === 'pending' ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Pendientes {pendingCount > 0 && `(${pendingCount})`}</button>
          <button onClick={() => setFilter('all')} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Todas</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="py-16 text-center text-gray-400"><p className="text-sm">No hay solicitudes {filter === 'pending' ? 'pendientes' : ''}.</p></div>
      ) : (
        <div className="space-y-3">
          {list.map(a => (
            <div key={a.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">{a.name || '—'} <span className="text-brand-orange text-xs font-black ml-1">{ROLE_LABEL[a.role] || a.role}</span></p>
                  <p className="text-sm text-gray-500">{a.email}{a.phone && ` · ${a.phone}`}</p>
                  {a.city && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {a.city}</p>}
                  {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 inline-flex items-center gap-1 mt-0.5">ver trabajo <ExternalLink className="w-3 h-3" /></a>}
                  {a.message && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">"{a.message}"</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {a.status === 'pending' ? (
                    <>
                      <button onClick={() => approve(a)} className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500 text-white rounded-lg px-3 py-1.5"><Check className="w-3.5 h-3.5" /> Aprobar</button>
                      <button onClick={() => reject(a)} className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5"><X className="w-3.5 h-3.5" /> Rechazar</button>
                    </>
                  ) : (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{a.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorApplicationsAdminSection;
