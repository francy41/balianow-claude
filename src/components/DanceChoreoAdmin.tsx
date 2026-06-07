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
import { Loader2, Upload, Plus, Trash2, Image as ImageIcon, Video, Save, X, Star } from 'lucide-react';
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
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ChoreoEditModal choreo={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
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

export default DanceChoreoAdmin;
