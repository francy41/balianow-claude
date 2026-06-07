/**
 * DanceChoreoAdmin — CRUD de coreógrafos/avatares con upload de imagen y video
 *
 * Solo admin. Permite:
 *  - Listar los 20 coreógrafos
 *  - Editar: nombre, modo, edad, especialidad, personalidad, emoji, gradient
 *  - Subir IMAGEN real del avatar (avatar_url)
 *  - Subir VIDEO del avatar (video_url) — se muestra en la pista de baile
 *  - Activar/desactivar
 *  - Crear nuevo coreógrafo
 */
import React, { useEffect, useState } from 'react';
import { Loader2, Upload, Plus, Trash2, Image as ImageIcon, Video, Save, X, Star, ListVideo, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo } from '../lib/uploadHelper';
import { useUIStore } from '../store/appStore';

interface Choreo {
  id: string; name: string; mode: string; age_range: string; specialty: string[];
  personality: string; avatar_emoji: string; avatar_url?: string | null; video_url?: string | null;
  gradient: string; rating: number; review_count: number; bio?: string; active: boolean;
}

const GRADIENTS = [
  'from-pink-500 to-fuchsia-600', 'from-cyan-500 to-blue-600', 'from-fuchsia-500 to-purple-600',
  'from-amber-500 to-orange-600', 'from-rose-400 to-pink-600', 'from-red-500 to-orange-500',
  'from-green-400 to-emerald-600', 'from-violet-500 to-indigo-600', 'from-yellow-400 to-red-500',
];

const DanceChoreoAdmin: React.FC = () => {
  const addToast = useUIStore(s => s.addToast);
  const [items, setItems] = useState<Choreo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Choreo | null>(null);
  const [lessonsFor, setLessonsFor] = useState<Choreo | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('dance_choreographers').select('*').order('display_order');
    setItems((data as Choreo[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const blank = (): Choreo => ({
    id: '', name: '', mode: 'solo', age_range: '25', specialty: [],
    personality: '', avatar_emoji: '💃', gradient: GRADIENTS[0],
    rating: 4.8, review_count: 0, active: true,
  });

  const handleDelete = async (c: Choreo) => {
    if (!confirm(`¿Eliminar a ${c.name}?`)) return;
    const { error } = await supabase.from('dance_choreographers').delete().eq('id', c.id);
    if (error) addToast({ type: 'error', message: error.message });
    else { addToast({ type: 'success', message: `${c.name} eliminado` }); load(); }
  };

  const toggleActive = async (c: Choreo) => {
    await supabase.from('dance_choreographers').update({ active: !c.active }).eq('id', c.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl flex items-center gap-2">🤖 Avatares de Baile (IA)</h2>
          <p className="text-sm text-gray-500 mt-1">{loading ? 'Cargando…' : `${items.length} coreógrafos`} · imágenes y videos reales</p>
        </div>
        <button onClick={() => setEditing(blank())} className="btn-orange flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo avatar
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin text-pink-500 mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(c => (
            <div key={c.id} className={`card-white rounded-2xl overflow-hidden border ${c.active ? 'border-gray-100' : 'border-red-200 opacity-60'}`}>
              <div className={`relative h-28 bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                {c.video_url ? <video src={c.video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  : c.avatar_url ? <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                  : <span className="text-5xl">{c.avatar_emoji}</span>}
                <span className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${c.mode === 'pareja' ? 'bg-purple-500' : 'bg-pink-500'} text-white`}>{c.mode}</span>
                {(c.avatar_url || c.video_url) && <span className="absolute top-2 left-2 text-[8px] bg-green-500 text-white px-1 rounded font-bold">REAL</span>}
              </div>
              <div className="p-3">
                <p className="font-black text-sm truncate">{c.name}</p>
                <p className="text-[10px] text-gray-400">{c.age_range} · ⭐{c.rating}</p>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => setEditing(c)} className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Editar</button>
                  <button onClick={() => toggleActive(c)} className={`text-xs px-2 py-1 rounded-lg ${c.active ? 'text-green-600' : 'text-gray-400'}`}>{c.active ? '✓' : '○'}</button>
                  <button onClick={() => handleDelete(c)} className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => setLessonsFor(c)} className="w-full mt-1 text-xs py-1.5 rounded-lg bg-purple-50 text-purple-600 font-bold hover:bg-purple-100 flex items-center justify-center gap-1">
                  <ListVideo className="w-3.5 h-3.5" /> Pasos / Lecciones
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ChoreoEditModal choreo={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}

      {lessonsFor && (
        <LessonsModal choreo={lessonsFor} onClose={() => setLessonsFor(null)} />
      )}
    </div>
  );
};

// ── Modal de edición ───────────────────────────────────────────
const ChoreoEditModal: React.FC<{ choreo: Choreo; onClose: () => void; onSaved: () => void }> = ({ choreo, onClose, onSaved }) => {
  const addToast = useUIStore(s => s.addToast);
  const [form, setForm] = useState<Choreo>({ ...choreo });
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVid, setUploadingVid] = useState(false);

  const set = (k: keyof Choreo, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImg(true);
    const { url, error } = await uploadImage(file, 'dance-avatars');
    setUploadingImg(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error subiendo imagen' }); return; }
    set('avatar_url', url);
  };

  const handleVid = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) { addToast({ type: 'error', message: 'Vídeo máx 50MB' }); return; }
    setUploadingVid(true);
    const { url, error } = await uploadVideo(file, 'dance-videos');
    setUploadingVid(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error subiendo vídeo' }); return; }
    set('video_url', url);
  };

  const save = async () => {
    if (!form.name.trim()) { addToast({ type: 'error', message: 'Pon un nombre' }); return; }
    setSaving(true);
    const payload: any = {
      name: form.name, mode: form.mode, age_range: form.age_range,
      specialty: typeof form.specialty === 'string' ? (form.specialty as any).split(',').map((s: string) => s.trim()).filter(Boolean) : form.specialty,
      personality: form.personality, avatar_emoji: form.avatar_emoji,
      avatar_url: form.avatar_url || null, video_url: form.video_url || null,
      gradient: form.gradient, rating: form.rating, bio: form.bio || null, active: form.active,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('dance_choreographers').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('dance_choreographers').insert(payload));
    }
    setSaving(false);
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    addToast({ type: 'success', message: '✅ Guardado' });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className={`bg-gradient-to-r ${form.gradient} text-white p-4 flex items-center justify-between`}>
          <h3 className="font-black text-lg">{form.id ? 'Editar' : 'Nuevo'} avatar</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Preview imagen + video upload */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">📷 Imagen real</label>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-1">
                {form.avatar_url ? <img src={form.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">{form.avatar_emoji}</div>}
              </div>
              <label className="cursor-pointer block text-center text-xs bg-pink-50 text-pink-600 font-bold py-1.5 rounded-lg hover:bg-pink-100">
                {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Upload className="w-3 h-3 inline mr-1" />Subir</>}
                <input type="file" accept="image/*" hidden onChange={handleImg} />
              </label>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">🎬 Vídeo (pista)</label>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-1">
                {form.video_url ? <video src={form.video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  : <div className="w-full h-full flex items-center justify-center text-gray-400"><Video className="w-8 h-8" /></div>}
              </div>
              <label className="cursor-pointer block text-center text-xs bg-purple-50 text-purple-600 font-bold py-1.5 rounded-lg hover:bg-purple-100">
                {uploadingVid ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Upload className="w-3 h-3 inline mr-1" />Subir</>}
                <input type="file" accept="video/*" hidden onChange={handleVid} />
              </label>
            </div>
          </div>

          {/* URL de video de clase (YouTube o mp4) */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">🔗 O pega URL del video de clase (YouTube o .mp4)</label>
            <input
              value={form.video_url || ''} onChange={e => set('video_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... o https://.../baile.mp4"
              className="input-field text-xs font-mono" />
            <p className="text-[9px] text-gray-400 mt-1">El profe bailando que el usuario sigue en la clase. YouTube se embebe automático.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input value={form.avatar_emoji} onChange={e => set('avatar_emoji', e.target.value)} maxLength={2} placeholder="💃" className="input-field text-center text-xl col-span-1" />
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre" className="input-field col-span-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select value={form.mode} onChange={e => set('mode', e.target.value)} className="input-field">
              <option value="solo">Solo</option>
              <option value="pareja">Pareja</option>
            </select>
            <input value={form.age_range} onChange={e => set('age_range', e.target.value)} placeholder="Edad (28 o 25/28)" className="input-field" />
          </div>

          <input
            value={Array.isArray(form.specialty) ? form.specialty.join(', ') : form.specialty}
            onChange={e => set('specialty', e.target.value)}
            placeholder="Especialidades (Salsa, Bachata, Kizomba)"
            className="input-field" />

          <textarea value={form.personality} onChange={e => set('personality', e.target.value)} rows={2}
            placeholder="Personalidad (energética, motivadora...)" className="input-field resize-none" />

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {GRADIENTS.map(g => (
                <button key={g} onClick={() => set('gradient', g)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} ${form.gradient === g ? 'ring-2 ring-offset-2 ring-pink-500' : ''}`} />
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} className="btn-orange w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal de Pasos / Lecciones (videos reales en secuencia) ─────
interface Lesson {
  id: string; choreographer_id: string; genre: string; sub_style?: string | null;
  level: string; step_number: number; step_name: string; description?: string | null;
  count_cue?: string | null; video_url: string; active: boolean;
}

const LEVELS = ['principiante', 'intermedio', 'avanzado'];

const LessonsModal: React.FC<{ choreo: Choreo; onClose: () => void }> = ({ choreo, onClose }) => {
  const addToast = useUIStore(s => s.addToast);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const blankLesson = (): Lesson => ({
    id: '', choreographer_id: choreo.id,
    genre: (Array.isArray(choreo.specialty) ? choreo.specialty[0] : '') || 'Bachata',
    sub_style: '', level: 'principiante',
    step_number: lessons.length + 1, step_name: '', description: '', count_cue: '',
    video_url: '', active: true,
  });
  const [form, setForm] = useState<Lesson>(blankLesson());
  const set = (k: keyof Lesson, v: any) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('dance_lessons').select('*')
      .eq('choreographer_id', choreo.id)
      .order('level').order('step_number');
    setLessons((data as Lesson[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [choreo.id]);

  const handleVid = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) { addToast({ type: 'error', message: 'Vídeo máx 50MB' }); return; }
    setUploading(true);
    const { url, error } = await uploadVideo(file, 'dance-videos');
    setUploading(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error subiendo vídeo' }); return; }
    set('video_url', url);
  };

  const save = async () => {
    if (!form.step_name.trim()) { addToast({ type: 'error', message: 'Pon nombre al paso' }); return; }
    if (!form.video_url.trim()) { addToast({ type: 'error', message: 'Falta el video del paso' }); return; }
    setSaving(true);
    const payload: any = {
      choreographer_id: choreo.id, genre: form.genre, sub_style: form.sub_style || null,
      level: form.level, step_number: Number(form.step_number) || 1, step_name: form.step_name,
      description: form.description || null, count_cue: form.count_cue || null,
      video_url: form.video_url, active: form.active,
    };
    let error;
    if (form.id) ({ error } = await supabase.from('dance_lessons').update(payload).eq('id', form.id));
    else ({ error } = await supabase.from('dance_lessons').insert(payload));
    setSaving(false);
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    addToast({ type: 'success', message: '✅ Paso guardado' });
    setForm(blankLesson());
    load();
  };

  const del = async (l: Lesson) => {
    if (!confirm(`¿Eliminar el paso "${l.step_name}"?`)) return;
    const { error } = await supabase.from('dance_lessons').delete().eq('id', l.id);
    if (error) addToast({ type: 'error', message: error.message });
    else { addToast({ type: 'success', message: 'Paso eliminado' }); load(); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className={`bg-gradient-to-r ${choreo.gradient} text-white p-4 flex items-center justify-between sticky top-0 z-10`}>
          <h3 className="font-black text-lg flex items-center gap-2"><ListVideo className="w-5 h-5" /> Pasos de {choreo.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Lista de pasos existentes */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{loading ? 'Cargando…' : `${lessons.length} pasos`}</p>
            {loading ? (
              <div className="py-6 text-center"><Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto" /></div>
            ) : lessons.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aún no hay pasos. Añade el primero abajo 👇</p>
            ) : (
              <div className="space-y-2">
                {lessons.map(l => (
                  <div key={l.id} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                      {/youtube|youtu\.be/.test(l.video_url)
                        ? <div className="w-full h-full flex items-center justify-center text-white text-[9px]">YT</div>
                        : <video src={l.video_url} className="w-full h-full object-cover" muted />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{l.step_number}. {l.step_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{l.genre}{l.sub_style ? ` · ${l.sub_style}` : ''} · {l.level}{l.count_cue ? ` · ${l.count_cue}` : ''}</p>
                    </div>
                    <button onClick={() => setForm(l)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Editar</button>
                    <button onClick={() => del(l)} className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario añadir/editar paso */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
            <p className="text-xs font-bold text-pink-600 uppercase">{form.id ? '✏️ Editar paso' : '➕ Nuevo paso'}</p>

            <div className="grid grid-cols-4 gap-2">
              <input type="number" value={form.step_number} onChange={e => set('step_number', e.target.value)} placeholder="#" className="input-field col-span-1" />
              <input value={form.step_name} onChange={e => set('step_name', e.target.value)} placeholder="Nombre del paso (Paso básico)" className="input-field col-span-3" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input value={form.genre} onChange={e => set('genre', e.target.value)} placeholder="Género" className="input-field" />
              <input value={form.sub_style || ''} onChange={e => set('sub_style', e.target.value)} placeholder="Subestilo" className="input-field" />
              <select value={form.level} onChange={e => set('level', e.target.value)} className="input-field capitalize">
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <input value={form.count_cue || ''} onChange={e => set('count_cue', e.target.value)} placeholder="Conteo (ej: 1,2,3 - pausa - 5,6,7 - pausa)" className="input-field text-sm" />
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} placeholder="Lo que el profe dice en este paso (corto)" className="input-field resize-none text-sm" />

            {/* Video del paso */}
            <div className="grid grid-cols-2 gap-2 items-start">
              <div>
                <label className="cursor-pointer block text-center text-xs bg-purple-50 text-purple-600 font-bold py-2 rounded-lg hover:bg-purple-100">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Upload className="w-3 h-3 inline mr-1" />Subir video del paso</>}
                  <input type="file" accept="video/*" hidden onChange={handleVid} />
                </label>
              </div>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                {form.video_url
                  ? (/youtube|youtu\.be/.test(form.video_url)
                      ? <div className="w-full h-full flex items-center justify-center text-white text-xs">YouTube ✓</div>
                      : <video src={form.video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />)
                  : <div className="w-full h-full flex items-center justify-center text-gray-500"><Video className="w-6 h-6" /></div>}
              </div>
            </div>
            <input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="O pega URL (YouTube o .mp4)" className="input-field text-xs font-mono" />

            <div className="flex gap-2">
              {form.id && <button onClick={() => setForm(blankLesson())} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold">Cancelar edición</button>}
              <button onClick={save} disabled={saving} className="btn-orange flex-1 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {form.id ? 'Actualizar paso' : 'Añadir paso'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DanceChoreoAdmin;
