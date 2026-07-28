import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Loader2, Heart, Plus, X, Flame, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

interface Reto { id: string; title: string; description: string | null; style: string | null; cover_url: string | null; starts: string | null; ends: string | null; }
interface Entry { id: string; reto_id: string; user_id: string; user_name: string | null; user_avatar: string | null; video_url: string; caption: string | null; votes: number; }

const isYt = (u: string) => /youtube\.com|youtu\.be/i.test(u);
const ytId = (u: string) => { const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : null; };

const VideoView: React.FC<{ url: string }> = ({ url }) => {
  if (isYt(url)) {
    const id = ytId(url);
    return id ? <iframe className="w-full aspect-video rounded-xl" src={`https://www.youtube-nocookie.com/embed/${id}`} title="reto" allowFullScreen style={{ border: 0 }} /> : <a href={url} target="_blank" rel="noreferrer" className="text-pink-500 text-sm">Ver vídeo →</a>;
  }
  return <video src={url} controls className="w-full aspect-video rounded-xl bg-black" />;
};

/* ── Modal participar ── */
const EntryModal: React.FC<{ reto: Reto; onClose: () => void; onDone: () => void }> = ({ reto, onClose, onDone }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!user) return;
    if (!videoUrl.trim()) { addToast({ message: 'Pega el enlace de tu vídeo', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('reto_entries').upsert({
      reto_id: reto.id, user_id: user.id, user_name: user.name, user_avatar: user.avatar,
      video_url: videoUrl.trim(), caption: caption.trim() || null,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: '¡Tu intento está en el reto! 🔥', type: 'success' });
    onDone(); onClose();
  };
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-lg text-gray-900 dark:text-white">Participar en el reto</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">{reto.title}</p>
        <div className="space-y-3">
          <input className="input-field" placeholder="Enlace de tu vídeo (YouTube o mp4)" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
          <textarea className="input-field" rows={2} placeholder="Comentario (opcional)" value={caption} onChange={e => setCaption(e.target.value)} />
          <button onClick={save} disabled={saving} className="w-full bg-brand-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Subir mi intento'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Modal crear reto ── */
const CreateRetoModal: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [ends, setEnds] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!user) return;
    if (!title.trim()) { addToast({ message: 'Ponle título al reto', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('retos').insert({
      creator_id: user.id, title: title.trim(), description: description.trim() || null,
      style: style.trim() || null, ends: ends || null,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: '¡Reto lanzado! 🏆', type: 'success' });
    onDone(); onClose();
  };
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Crear reto</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input className="input-field" placeholder="Título (ej: Reto Bachata Sensual)" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="input-field" rows={2} placeholder="En qué consiste el reto" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="Estilo (ej: Bachata)" value={style} onChange={e => setStyle(e.target.value)} />
            <input className="input-field" type="date" value={ends} onChange={e => setEnds(e.target.value)} />
          </div>
          <button onClick={save} disabled={saving} className="w-full bg-amber-500 text-white font-black rounded-xl py-3 text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Lanzar reto'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RetosPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [retos, setRetos] = useState<Reto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reto | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [participating, setParticipating] = useState(false);
  const [creatingReto, setCreatingReto] = useState(false);

  const loadRetos = useCallback(async () => {
    const safety = setTimeout(() => setLoading(false), 8000);
    const { data } = await supabase.from('retos').select('*').order('created_at', { ascending: false });
    clearTimeout(safety);
    const list = (data || []) as Reto[];
    setRetos(list); setLoading(false);
    setSelected(prev => prev ? (list.find(r => r.id === prev.id) || list[0] || null) : (list[0] || null));
  }, []);

  useEffect(() => { loadRetos().catch(() => setLoading(false)); }, [loadRetos]);

  const loadEntries = useCallback(async (retoId: string) => {
    const { data: es } = await supabase.from('reto_entries').select('*').eq('reto_id', retoId);
    const list = (es || []) as any[];
    // votos por entry
    const ids = list.map(e => e.id);
    let counts: Record<string, number> = {};
    let mine = new Set<string>();
    if (ids.length) {
      const { data: votes } = await supabase.from('reto_votes').select('entry_id, user_id').in('entry_id', ids);
      (votes || []).forEach((v: any) => { counts[v.entry_id] = (counts[v.entry_id] || 0) + 1; if (user && v.user_id === user.id) mine.add(v.entry_id); });
    }
    setMyVotes(mine);
    setEntries(list.map(e => ({ ...e, votes: counts[e.id] || 0 })).sort((a, b) => b.votes - a.votes));
  }, [user]);

  useEffect(() => { if (selected) loadEntries(selected.id); else setEntries([]); }, [selected, loadEntries]);

  const vote = async (entry: Entry) => {
    if (!isAuthenticated || !user) { navigate('/auth'); return; }
    const voted = myVotes.has(entry.id);
    if (voted) {
      await supabase.from('reto_votes').delete().eq('entry_id', entry.id).eq('user_id', user.id);
    } else {
      await supabase.from('reto_votes').insert({ entry_id: entry.id, user_id: user.id });
    }
    if (selected) loadEntries(selected.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-2"><Trophy className="w-7 h-7" /> Retos de baile</h1>
            <p className="text-white/80 text-sm mt-1">Sube tu intento, vota a los mejores y sube en el ranking. 🔥</p>
          </div>
          <button onClick={() => (isAuthenticated ? setCreatingReto(true) : navigate('/auth'))} className="bg-white text-gray-900 font-bold rounded-xl px-4 py-2.5 text-sm hover:bg-gray-100 transition-all flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Crear reto
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="py-24 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-orange-500" /></div>
        ) : retos.length === 0 ? (
          <div className="py-20 text-center">
            <Flame className="w-10 h-10 mx-auto text-orange-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-bold">Aún no hay retos activos</p>
            <p className="text-gray-400 text-sm mt-1">Pronto lanzaremos el primer reto de baile. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <>
            {/* Retos (chips) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
              {retos.map(r => (
                <button key={r.id} onClick={() => setSelected(r)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold ${selected?.id === r.id ? 'bg-brand-orange text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800'}`}>
                  {r.title}
                </button>
              ))}
            </div>

            {selected && (
              <>
                <div className="card-white rounded-2xl p-5 mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display font-black text-xl text-gray-900 dark:text-white">{selected.title}</h2>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        {selected.style && <span className="capitalize">{selected.style}</span>}
                        {selected.ends && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> hasta {selected.ends}</span>}
                        <span>{entries.length} participantes</span>
                      </div>
                    </div>
                    <button onClick={() => (isAuthenticated ? setParticipating(true) : navigate('/auth'))} className="flex-shrink-0 bg-brand-orange text-white font-bold rounded-xl px-4 py-2 text-sm flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Participar
                    </button>
                  </div>
                  {selected.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{selected.description}</p>}
                </div>

                {/* Ranking de intentos */}
                {entries.length === 0 ? (
                  <div className="text-center py-12"><p className="text-gray-400 text-sm">Aún nadie ha participado. ¡Sé el primero! 🔥</p></div>
                ) : (
                  <div className="space-y-4">
                    {entries.map((e, i) => (
                      <div key={e.id} className="card-white rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{i + 1}</span>
                          {e.user_avatar ? <img src={e.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">💃</div>}
                          <p className="flex-1 text-sm font-bold text-gray-900 dark:text-white truncate">{e.user_name || 'Bailarín'}</p>
                          <button onClick={() => vote(e)} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${myVotes.has(e.id) ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                            <Heart className="w-4 h-4" fill={myVotes.has(e.id) ? 'currentColor' : 'none'} /> {e.votes}
                          </button>
                        </div>
                        <div className="px-3 pb-3"><VideoView url={e.video_url} /></div>
                        {e.caption && <p className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-300">{e.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {participating && selected && <EntryModal reto={selected} onClose={() => setParticipating(false)} onDone={() => loadEntries(selected.id)} />}
      {creatingReto && <CreateRetoModal onClose={() => setCreatingReto(false)} onDone={loadRetos} />}
    </div>
  );
};

export default RetosPage;
