import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, Play, BarChart3 } from 'lucide-react';

interface AdRow {
  id: string; title: string; advertiser: string | null; video_url: string | null; poster_url: string | null;
  click_url: string | null; skip_after: number; targets: string[]; weight: number; active: boolean;
  impressions: number; completions: number; clicks: number; skips: number;
}
const CATS = ['all', 'eventos', 'artistas', 'bailarinas', 'venues', 'tv', 'clases', 'marketplace', 'comunidad', 'live'];
const empty = { title: '', advertiser: '', video_url: '', poster_url: '', click_url: '', skip_after: '5', weight: '1', targets: ['all'] as string[] };

const VideoAdsAdminSection: React.FC<{ addToast: (t: any) => void }> = ({ addToast }) => {
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('video_ads').select('*').order('created_at', { ascending: false });
    setAds((data as AdRow[]) || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleTarget = (c: string) => setF(s => ({ ...s, targets: s.targets.includes(c) ? s.targets.filter(x => x !== c) : [...s.targets, c] }));

  const create = async () => {
    if (!f.title.trim() || !f.video_url.trim()) { addToast({ message: 'Título y URL del vídeo son obligatorios', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('video_ads').insert({
      title: f.title.trim(), advertiser: f.advertiser.trim() || null, provider: 'video',
      video_url: f.video_url.trim(), poster_url: f.poster_url.trim() || null, click_url: f.click_url.trim() || null,
      skip_after: parseInt(f.skip_after) || 0, weight: parseInt(f.weight) || 1,
      targets: f.targets.length ? f.targets : ['all'], active: true,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setF({ ...empty }); setShow(false); addToast({ message: 'Anuncio creado', type: 'success' }); load();
  };
  const toggle = async (a: AdRow) => { await supabase.from('video_ads').update({ active: !a.active }).eq('id', a.id); load(); };
  const del = async (a: AdRow) => { await supabase.from('video_ads').delete().eq('id', a.id); load(); };
  const ctr = (a: AdRow) => a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) + '%' : '—';

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Publicidad en vídeo</h2>
          <p className="text-gray-500 text-sm">Pre-roll estilo RTVE: salta al entrar en una categoría. Los usuarios Premium no lo ven.</p>
        </div>
        <button onClick={() => setShow(s => !s)} className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-orange text-white rounded-xl px-4 py-2"><Plus className="w-4 h-4" /> Nuevo anuncio</button>
      </div>

      {show && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 mb-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2.5">
            <input value={f.title} onChange={e => setF(s => ({ ...s, title: e.target.value }))} placeholder="Título del anuncio *" className="rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
            <input value={f.advertiser} onChange={e => setF(s => ({ ...s, advertiser: e.target.value }))} placeholder="Anunciante" className="rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
          </div>
          <input value={f.video_url} onChange={e => setF(s => ({ ...s, video_url: e.target.value }))} placeholder="URL del vídeo (MP4/HLS) *" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
          <div className="grid sm:grid-cols-2 gap-2.5">
            <input value={f.poster_url} onChange={e => setF(s => ({ ...s, poster_url: e.target.value }))} placeholder="URL imagen de portada (opcional)" className="rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
            <input value={f.click_url} onChange={e => setF(s => ({ ...s, click_url: e.target.value }))} placeholder="URL de destino al hacer clic" className="rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <label className="text-xs text-gray-500 flex items-center gap-2">Saltar tras (s) <input type="number" value={f.skip_after} onChange={e => setF(s => ({ ...s, skip_after: e.target.value }))} className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-1.5 text-sm" /></label>
            <label className="text-xs text-gray-500 flex items-center gap-2">Prioridad (peso) <input type="number" value={f.weight} onChange={e => setF(s => ({ ...s, weight: e.target.value }))} className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-1.5 text-sm" /></label>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Categorías donde aparece</p>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map(c => (
                <button key={c} onClick={() => toggleTarget(c)} className={`text-xs font-bold px-2.5 py-1 rounded-full border ${f.targets.includes(c) ? 'bg-brand-orange text-white border-brand-orange' : 'border-gray-200 dark:border-gray-600 text-gray-500'}`}>{c === 'all' ? 'Todas' : c}</button>
              ))}
            </div>
          </div>
          <button onClick={create} disabled={saving} className="w-full bg-brand-orange text-white font-bold rounded-lg py-2.5 disabled:opacity-60">{saving ? 'Guardando…' : 'Publicar anuncio'}</button>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="py-16 text-center text-gray-400"><Play className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Aún no hay anuncios. Crea el primero para monetizar tus categorías.</p></div>
      ) : (
        <div className="space-y-2.5">
          {ads.map(a => (
            <div key={a.id} className={`rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 ${!a.active && 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">{a.title} {a.advertiser && <span className="text-gray-400 font-normal text-sm">· {a.advertiser}</span>}</p>
                  <div className="flex flex-wrap gap-1 mt-1">{(a.targets || []).map(t => <span key={t} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 rounded px-1.5 py-0.5">{t}</span>)}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggle(a)} className={`text-xs font-bold rounded-lg px-2.5 py-1.5 ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{a.active ? 'Activo' : 'Pausado'}</button>
                  <button onClick={() => del(a)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {a.impressions} impresiones</span>
                <span>{a.completions} completadas</span>
                <span>{a.clicks} clics</span>
                <span className="font-bold text-gray-700 dark:text-gray-200">CTR {ctr(a)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoAdsAdminSection;
