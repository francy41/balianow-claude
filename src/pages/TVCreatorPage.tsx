import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Tv, Loader2, Eye, EyeOff, ChevronLeft, Film, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

const STYLES = ['salsa', 'bachata', 'merengue', 'kizomba', 'cha-cha-cha', 'reggaeton', 'cumbia', 'otros'];
const LEVELS = ['principiante', 'intermedio', 'avanzado', 'profesional'];
const TYPES = ['clase', 'curso', 'programa', 'masterclass'];
const ACCESS = ['free', 'basico', 'premium'];

interface TitleRow { id: string; title: string; type: string; style: string | null; level: string | null; access: string; status: string; cover_url: string | null; }
interface LessonRow { id: string; position: number; name: string; video_url: string | null; duration_seconds: number; access: string; }

const emptyTitle = { title: '', type: 'clase', style: 'salsa', level: 'principiante', access: 'basico', cover_url: '', description: '' };
const emptyLesson = { name: '', video_url: '', duration_minutes: '', access: 'basico' };

const TVCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyTitle);
  const [showForm, setShowForm] = useState(false);

  const [selected, setSelected] = useState<TitleRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [addingLesson, setAddingLesson] = useState(false);

  const uid = user?.id;

  const loadTitles = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('tv_titles').select('*').eq('creator_id', uid).order('created_at', { ascending: false });
    setTitles((data || []) as TitleRow[]);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    loadTitles();
  }, [isAuthenticated, loadTitles, navigate]);

  const createTitle = async () => {
    if (!uid) return;
    if (!form.title.trim()) { addToast({ message: 'Ponle un título', type: 'error' }); return; }
    setCreating(true);
    const { error } = await supabase.from('tv_titles').insert({
      creator_id: uid, title: form.title.trim(), type: form.type, style: form.style,
      level: form.level, access: form.access, cover_url: form.cover_url.trim() || null,
      description: form.description.trim() || null, status: 'draft',
    });
    setCreating(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Título creado (borrador)', type: 'success' });
    setForm(emptyTitle); setShowForm(false);
    loadTitles();
  };

  const togglePublish = async (t: TitleRow) => {
    const next = t.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('tv_titles').update({ status: next }).eq('id', t.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: next === 'published' ? 'Publicado ✔️' : 'Pasado a borrador', type: 'success' });
    loadTitles();
    if (selected?.id === t.id) setSelected({ ...t, status: next });
  };

  const openLessons = async (t: TitleRow) => {
    setSelected(t);
    const { data } = await supabase.from('tv_lessons').select('*').eq('title_id', t.id).order('position', { ascending: true });
    setLessons((data || []) as LessonRow[]);
  };

  const addLesson = async () => {
    if (!selected) return;
    if (!lessonForm.name.trim()) { addToast({ message: 'Ponle nombre a la clase', type: 'error' }); return; }
    setAddingLesson(true);
    const { error } = await supabase.from('tv_lessons').insert({
      title_id: selected.id, position: lessons.length + 1, name: lessonForm.name.trim(),
      video_url: lessonForm.video_url.trim() || null,
      duration_seconds: Math.round((parseFloat(lessonForm.duration_minutes) || 0) * 60),
      access: lessonForm.access,
    });
    setAddingLesson(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setLessonForm(emptyLesson);
    openLessons(selected);
  };

  const deleteLesson = async (id: string) => {
    await supabase.from('tv_lessons').delete().eq('id', id);
    if (selected) openLessons(selected);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;

  // ── Vista de gestión de clases de un título ──
  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-4"><ChevronLeft className="w-4 h-4" /> Volver</button>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="font-display font-black text-2xl text-gray-900 dark:text-white">{selected.title}</h1>
              <p className="text-sm text-gray-500 capitalize">{selected.type} · {selected.style} · {selected.level}</p>
            </div>
            <button onClick={() => togglePublish(selected)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold ${selected.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-900 text-white'}`}>
              {selected.status === 'published' ? <><Eye className="w-4 h-4" /> Publicado</> : <><EyeOff className="w-4 h-4" /> Publicar</>}
            </button>
          </div>

          {/* Añadir clase */}
          <div className="card-white rounded-2xl p-5 mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Film className="w-4 h-4 text-fuchsia-500" /> Añadir clase</h2>
            <div className="space-y-3">
              <input className="input-field" placeholder="Nombre de la clase" value={lessonForm.name} onChange={e => setLessonForm({ ...lessonForm, name: e.target.value })} />
              <input className="input-field" placeholder="URL o UID de vídeo (Cloudflare Stream / mp4)" value={lessonForm.video_url} onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" type="number" placeholder="Duración (min)" value={lessonForm.duration_minutes} onChange={e => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })} />
                <select className="input-field" value={lessonForm.access} onChange={e => setLessonForm({ ...lessonForm, access: e.target.value })}>
                  {ACCESS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button onClick={addLesson} disabled={addingLesson} className="btn-orange w-full disabled:opacity-50">
                {addingLesson ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Plus className="w-4 h-4 inline mr-1" /> Añadir clase</>}
              </button>
            </div>
          </div>

          {/* Lista de clases */}
          {lessons.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aún no hay clases en este título.</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((l, i) => (
                <div key={l.id} className="card-white rounded-xl p-3 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{l.name}</p>
                    <p className="text-[11px] text-gray-400">{l.access} {l.video_url ? '· vídeo ✔️' : '· sin vídeo'}{l.duration_seconds ? ` · ${Math.round(l.duration_seconds / 60)} min` : ''}</p>
                  </div>
                  <button onClick={() => deleteLesson(l.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista principal: mis títulos ──
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2"><Tv className="w-6 h-6 text-fuchsia-500" /> Estudio de creador</h1>
            <p className="text-sm text-gray-500">Sube clases y crea cursos para BailaNow TV</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="btn-orange"><Plus className="w-4 h-4 inline mr-1" /> Nuevo título</button>
        </div>

        {showForm && (
          <div className="card-white rounded-2xl p-5 mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">Nuevo título</h2>
            <div className="space-y-3">
              <input className="input-field" placeholder="Título (ej: Salsa On2 para principiantes)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea className="input-field" rows={2} placeholder="Descripción" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input className="input-field" placeholder="URL de la portada (imagen)" value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                <select className="input-field" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })}>{STYLES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select className="input-field" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select>
                <select className="input-field" value={form.access} onChange={e => setForm({ ...form, access: e.target.value })}>{ACCESS.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>
              <button onClick={createTitle} disabled={creating} className="btn-orange w-full disabled:opacity-50">{creating ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Crear título'}</button>
            </div>
          </div>
        )}

        {titles.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-900 dark:text-white font-bold">Aún no has creado ningún título</p>
            <p className="text-gray-400 text-sm mt-1">Crea tu primer curso o clase para BailaNow TV.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {titles.map(t => (
              <div key={t.id} className="card-white rounded-2xl p-4 flex items-center gap-4">
                <div className="w-16 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {t.cover_url ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" /> : <span>💃</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{t.title}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{t.type} · {t.style} · {t.access}
                    <span className={`ml-2 font-bold ${t.status === 'published' ? 'text-emerald-600' : 'text-gray-400'}`}>{t.status === 'published' ? '● Publicado' : '○ Borrador'}</span>
                  </p>
                </div>
                <button onClick={() => openLessons(t)} className="btn-outline text-xs">Clases</button>
                <button onClick={() => togglePublish(t)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title={t.status === 'published' ? 'Despublicar' : 'Publicar'}>
                  {t.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TVCreatorPage;
