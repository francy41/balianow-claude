import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings2, X, Loader2, Save, Upload, Plus, Trash2,
  FileText, Image as ImageIcon, Award, Radio, Calendar, GraduationCap, Video,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { uploadImage } from '../lib/uploadHelper';
import { resolveCityCoords } from '../lib/geo';
import { FIELDS_ARTIST, FIELDS_PROFILE_ARTIST } from '../config/editFields';
import { useCommissionPercent } from '../lib/commission';
import type { EditField } from './AdminEditModal';
import WeeklyScheduleEditor from './WeeklyScheduleEditor';

/**
 * Panel de gestión de perfil de artista/bailarín "como si fueras el dueño".
 * Admin entra y administra TODOS los módulos: datos generales, galería,
 * servicios/paquetes, live, disponibilidad y cursos.
 *
 * Los módulos galería/servicios/disponibilidad son columnas jsonb/array de la
 * fila `artists` → se guardan en el mismo UPDATE. Cursos viven en su tabla.
 * Si el artista es un PERFIL de usuario (tabla profiles), solo se edita General.
 */
interface Props {
  id?: string;
  onSaved?: () => void;
  /** user_id del dueño del perfil — permite que el propio instructor lo gestione sin ser admin */
  ownerUserId?: string;
  /** Abre el editor automáticamente al montar (p. ej. desde ?edit=1) */
  autoOpen?: boolean;
}

type Tab = 'general' | 'gallery' | 'packages' | 'classes' | 'live' | 'availability' | 'courses';

interface ClassPkg { id: string; name: string; capacity: number; price: number; currency: string; duration_minutes: number; description: string; includes: string[]; image?: string; }

interface MediaItem { id: string; type: 'photo' | 'video' | 'mix'; url: string; thumbnail: string; title?: string; duration?: string; }
interface Pkg { id: string; tier: 'basic' | 'standard' | 'premium'; name: string; price: number; currency: string; deliveryDays: number; description: string; includes: string[]; revisions: number; }
interface Course { id?: string; title: string; price: number; duration: string; category: string; level: string; image_url: string; }

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

// ── Image input (subida + URL) ──────────────────────────────────────────────
const ImageInput: React.FC<{ label: string; value: string; folder: string; onChange: (v: string) => void; compact?: boolean }> =
({ label, value, folder, onChange, compact }) => {
  const { addToast } = useUIStore();
  const [uploading, setUploading] = useState(false);
  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadImage(file, folder);
    setUploading(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error al subir' }); return; }
    onChange(url);
  };
  return (
    <div className={compact ? '' : 'col-span-2'}>
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>}
      <div className="flex items-start gap-3">
        {value
          ? <img src={value} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
          : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Upload className="w-5 h-5" /></div>}
        <div className="flex-1 space-y-2 min-w-0">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-50 text-brand text-xs font-semibold hover:bg-pink-100">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Subiendo…' : 'Subir'}
            <input type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files?.[0])} />
          </label>
          <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="o pega URL…"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-300" />
        </div>
      </div>
    </div>
  );
};

const SaveBtn: React.FC<{ onClick: () => void; saving: boolean; label: string }> = ({ onClick, saving, label }) => (
  <button onClick={onClick} disabled={saving}
    className="w-full bg-brand-orange text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {label}
  </button>
);

const ArtistAdminPanel: React.FC<Props> = ({ id, onSaved, ownerUserId, autoOpen }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const isAdmin = !!user && ['admin', 'superadmin'].includes(String(user.role));
  const isOwner = !!user && !!ownerUserId && user.id === ownerUserId;
  const canManage = isAdmin || isOwner;

  const [open, setOpen] = useState(false);
  useEffect(() => { if (autoOpen && canManage) setOpen(true); }, [autoOpen, canManage]);
  const [tab, setTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [table, setTable] = useState<'artists' | 'profiles'>('artists');
  const [fields, setFields] = useState<EditField[]>(FIELDS_ARTIST);
  const [original, setOriginal] = useState<Record<string, any>>({});
  const [form, setForm] = useState<Record<string, any>>({});
  const [courses, setCourses] = useState<Course[]>([]);

  const isArtistsTable = table === 'artists';

  const load = useCallback(async () => {
    if (!id) return false;
    setLoading(true);
    const art = await supabase.from('artists').select('*').eq('id', id).maybeSingle();
    if (art.data) {
      // Dueño no-admin: no puede auto-verificarse
      const af = isAdmin ? FIELDS_ARTIST : FIELDS_ARTIST.filter(f => f.key !== 'is_verified');
      setTable('artists'); setFields(af);
      setOriginal(art.data); setForm({ ...art.data });
      setLoading(false);
      return true;
    }
    // Vista según quién pregunta: el propio dueño solo puede ver su fila
    // (profiles_self); el admin puede ver cualquiera (profiles_admin) — ambas
    // incluyen columnas sensibles (email/whatsapp) que la tabla base ya no
    // expone a `authenticated` en general.
    const prof = await supabase.from(isAdmin ? 'profiles_admin' : 'profiles_self').select('*').eq('id', id).maybeSingle();
    if (prof.data) {
      // Dueño no-admin: ocultar campos protegidos por el trigger anti-escalada (role/verified)
      const pf = isAdmin ? FIELDS_PROFILE_ARTIST : FIELDS_PROFILE_ARTIST.filter(f => !['role', 'verified'].includes(f.key));
      setTable('profiles'); setFields(pf);
      setOriginal(prof.data); setForm({ ...prof.data });
      setLoading(false);
      return true;
    }
    setLoading(false);
    addToast({ type: 'warning', message: 'No se encontró el perfil en una tabla editable.' });
    return false;
  }, [id, addToast, isAdmin]);

  const loadCourses = useCallback(async () => {
    const ownerId = original.user_id || original.id;
    if (!ownerId) return;
    const { data } = await supabase.from('courses').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
    setCourses((data || []).map((c: any) => ({
      id: c.id, title: c.title || '', price: Number(c.price) || 0, duration: c.duration || '',
      category: c.category || '', level: c.level || '', image_url: c.image_url || '',
    })));
  }, [original]);

  useEffect(() => { if (tab === 'courses' && open) loadCourses(); }, [tab, open, loadCourses]);

  const openPanel = async () => { const ok = await load(); if (ok) setOpen(true); };
  const setVal = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  // ── Guardar la fila (general + módulos jsonb del mismo registro) ──
  const saveRow = async (extraKeys: string[] = []) => {
    if (!id) return;
    for (const f of fields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) {
        addToast({ type: 'error', message: `Falta el campo "${f.label}"` }); return;
      }
    }
    const keys = [...fields.map(f => f.key), ...extraKeys];
    const patch: Record<string, any> = {};
    for (const k of keys) {
      if (JSON.stringify(form[k]) !== JSON.stringify(original[k])) patch[k] = form[k] === '' ? null : form[k];
    }
    if (Object.keys(patch).length === 0) { addToast({ type: 'info', message: 'Sin cambios que guardar' }); return; }
    if (patch.city && (form.lat == null || form.lng == null)) {
      const c = resolveCityCoords(patch.city); if (c) { patch.lat = c.lat; patch.lng = c.lng; }
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); addToast({ type: 'error', message: 'Inicia sesión como admin para guardar' }); return; }

    const p = { ...patch };
    const dropped: string[] = [];
    let lastErr: any = null; let savedRows: any[] | null = null;
    for (let i = 0; i < 14; i++) {
      if (Object.keys(p).length === 0) { lastErr = { message: 'ningún campo válido' }; break; }
      const { data, error } = await supabase.from(table).update(p).eq('id', id).select('id');
      if (!error) { lastErr = null; savedRows = data; break; }
      lastErr = error;
      const m = /column "?([a-z_]+)"? of relation .* does not exist/i.exec(error.message || '')
        || /Could not find the '([a-z_]+)' column/i.exec(error.message || '');
      if (m && p[m[1]] !== undefined) { dropped.push(m[1]); delete p[m[1]]; continue; }
      break;
    }
    setSaving(false);
    if (lastErr) { addToast({ type: 'error', message: `Error al guardar: ${lastErr.message}` }); return; }
    if (!savedRows || savedRows.length === 0) { addToast({ type: 'warning', message: 'La BD no aplicó el cambio (sin permisos o id inexistente)' }); return; }
    addToast({ type: 'success', message: dropped.length ? `Guardado (omitido: ${dropped.join(', ')})` : '¡Guardado!' });
    setOriginal({ ...original, ...patch });
    if (onSaved) onSaved();
  };

  if (!canManage || !id) return null;

  const tabs: { id: Tab; icon: React.ReactNode; label: string; artistsOnly?: boolean }[] = ([
    { id: 'general',      icon: <FileText className="w-4 h-4" />,      label: 'General' },
    { id: 'gallery',      icon: <ImageIcon className="w-4 h-4" />,     label: 'Galería',    artistsOnly: true },
    { id: 'packages',     icon: <Award className="w-4 h-4" />,         label: 'Servicios',  artistsOnly: true },
    { id: 'classes',      icon: <Video className="w-4 h-4" />,         label: 'Clases',     artistsOnly: true },
    { id: 'live',         icon: <Radio className="w-4 h-4" />,         label: 'Live',       artistsOnly: true },
    { id: 'availability', icon: <Calendar className="w-4 h-4" />,      label: 'Agenda',     artistsOnly: true },
    { id: 'courses',      icon: <GraduationCap className="w-4 h-4" />, label: 'Cursos' },
  ] as { id: Tab; icon: React.ReactNode; label: string; artistsOnly?: boolean }[]).filter(t => !t.artistsOnly || isArtistsTable);

  return (
    <>
      <button onClick={openPanel} disabled={loading} title="Gestionar perfil (admin)"
        className="fixed z-[70] bottom-24 left-4 sm:bottom-8 sm:left-8 flex items-center gap-2 bg-brand-orange text-white font-black text-sm px-5 py-3.5 rounded-2xl shadow-2xl shadow-brand-secondary/40 hover:scale-105 transition-all ring-2 ring-white/40">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />} Gestionar perfil
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-brand-orange flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-lg">Gestionar perfil</h2>
                <p className="text-white/70 text-xs">{original.name || original.full_name || 'Perfil'} · modo administrador</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white p-1"><X className="w-6 h-6" /></button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-gray-100 flex-shrink-0">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-brand text-pink-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'general' && <GeneralTab fields={fields} form={form} setVal={setVal} table={table} onSave={() => saveRow(['social'])} saving={saving} />}
              {tab === 'gallery' && <GalleryEditor items={form.gallery || []} onChange={v => setVal('gallery', v)} onSave={() => saveRow(['gallery'])} saving={saving} />}
              {tab === 'packages' && <PackagesEditor items={form.packages || []} onChange={v => setVal('packages', v)} onSave={() => saveRow(['packages'])} saving={saving} />}
              {tab === 'classes' && <ClassPackagesEditor items={form.class_packages || []} onChange={v => setVal('class_packages', v)} onSave={() => saveRow(['class_packages'])} saving={saving} />}
              {tab === 'live' && <LiveEditor form={form} setVal={setVal} onSave={() => saveRow(['is_live','stream_url','featured_video','featured_video_title','social'])} saving={saving} />}
              {tab === 'availability' && <AvailabilityEditor days={form.availability || []} onChange={v => setVal('availability', v)} onSave={() => saveRow(['availability'])} saving={saving} />}
              {tab === 'courses' && <CoursesEditor courses={courses} ownerId={original.user_id || original.id} instructor={original.name || original.full_name || ''} onReload={loadCourses} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── General Tab (config-driven) ────────────────────────────────────────────
const GeneralTab: React.FC<{ fields: EditField[]; form: any; setVal: (k: string, v: any) => void; table: string; onSave: () => void; saving: boolean }> =
({ fields, form, setVal, table, onSave, saving }) => (
  <div className="p-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(f => {
        const v = form[f.key];
        const wide = f.cols === 2 || f.type === 'textarea';
        if (f.type === 'image') return <ImageInput key={f.key} label={f.label} value={v || ''} folder={table} onChange={val => setVal(f.key, val)} />;
        return (
          <div key={f.key} className={wide ? 'col-span-2' : ''}>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
            {f.type === 'textarea' ? (
              <textarea value={v || ''} onChange={e => setVal(f.key, e.target.value)} rows={4} placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-y" />
            ) : f.type === 'select' ? (
              <select value={v || ''} onChange={e => setVal(f.key, e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
                <option value="">— selecciona —</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'checkbox' ? (
              <button type="button" onClick={() => setVal(f.key, !v)} className={`relative w-12 h-6 rounded-full transition-colors mt-1 ${v ? 'bg-brand' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${v ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            ) : f.type === 'tags' ? (
              <input value={Array.isArray(v) ? v.join(', ') : (v || '')} onChange={e => setVal(f.key, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder={f.placeholder || 'separados por comas'} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            ) : (
              <input type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text'} value={v ?? ''}
                onChange={e => setVal(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                placeholder={f.placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            )}
            {f.helper && <p className="text-[10px] text-gray-400 mt-1">{f.helper}</p>}
          </div>
        );
      })}
    </div>
    {/* Redes sociales — tabla artists usa un objeto JSONB `social` (usuario, no URL completa) */}
    {table === 'artists' && <SocialLinksEditor social={form.social || {}} onChange={s => setVal('social', s)} />}
    <div className="mt-5"><SaveBtn onClick={onSave} saving={saving} label="Guardar datos generales" /></div>
  </div>
);

// ─── Social links editor (objeto JSONB `social` de la tabla artists) ─────────
const SOCIAL_FIELDS = [
  { key: 'instagram', icon: '🌸', label: 'Instagram', ph: 'usuario (sin @)' },
  { key: 'tiktok',    icon: '⬛', label: 'TikTok',    ph: 'usuario (sin @)' },
  { key: 'youtube',   icon: '🔴', label: 'YouTube',   ph: 'canal o @usuario' },
  { key: 'facebook',  icon: '🔵', label: 'Facebook',  ph: 'nombre de página' },
  { key: 'spotify',   icon: '🟢', label: 'Spotify',   ph: 'usuario / id' },
  { key: 'soundcloud',icon: '🟠', label: 'SoundCloud',ph: 'usuario' },
] as const;

const SocialLinksEditor: React.FC<{ social: Record<string, string>; onChange: (s: Record<string, string>) => void }> =
({ social, onChange }) => (
  <div className="mt-6 border-t border-gray-100 pt-4">
    <p className="text-sm font-bold text-gray-800 mb-1">🌐 Redes sociales</p>
    <p className="text-[11px] text-gray-400 mb-3">Escribe solo el <b>usuario</b> (no la URL completa). Ej: <code>djmamboking</code></p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SOCIAL_FIELDS.map(({ key, icon, label, ph }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-lg w-6 text-center flex-shrink-0">{icon}</span>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">{label}</label>
            <input value={social[key] || ''} onChange={e => onChange({ ...social, [key]: e.target.value.trim() })}
              placeholder={ph} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Gallery Editor ─────────────────────────────────────────────────────────
const GalleryEditor: React.FC<{ items: MediaItem[]; onChange: (v: MediaItem[]) => void; onSave: () => void; saving: boolean }> =
({ items, onChange, onSave, saving }) => {
  const [draft, setDraft] = useState<Partial<MediaItem>>({ type: 'photo' });
  const add = () => {
    if (!draft.url?.trim()) return;
    const item: MediaItem = { id: uid(), type: (draft.type as any) || 'photo', url: draft.url, thumbnail: draft.thumbnail || draft.url, title: draft.title || '' };
    onChange([...items, item]); setDraft({ type: 'photo' });
  };
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  return (
    <div className="p-5 space-y-5">
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-gray-800 text-sm">Añadir foto o vídeo</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as any }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300">
            <option value="photo">Foto</option><option value="video">Vídeo</option><option value="mix">Mix / set</option>
          </select>
          <input value={draft.title || ''} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Título"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        </div>
        <ImageInput label="" value={draft.url || ''} folder="artist-gallery" onChange={v => setDraft(d => ({ ...d, url: v, thumbnail: d.thumbnail || v }))} compact />
        <button onClick={add} disabled={!draft.url?.trim()} className="w-full bg-brand text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Añadir a la galería
        </button>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 mb-3">Galería ({items.length})</h3>
        {items.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl text-gray-400 text-sm">Sin contenido todavía</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {items.map(m => (
              <div key={m.id} className="relative group rounded-xl overflow-hidden border border-gray-100">
                <img src={m.thumbnail || m.url} alt={m.title} className="w-full aspect-square object-cover" />
                {m.type !== 'photo' && <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{m.type}</span>}
                <button onClick={() => remove(m.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                {m.title && <p className="text-[10px] p-1 truncate bg-white">{m.title}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <SaveBtn onClick={onSave} saving={saving} label="Guardar galería" />
    </div>
  );
};

// ─── Packages / Services Editor ─────────────────────────────────────────────
const PackagesEditor: React.FC<{ items: Pkg[]; onChange: (v: Pkg[]) => void; onSave: () => void; saving: boolean }> =
({ items, onChange, onSave, saving }) => {
  const [d, setD] = useState<Partial<Pkg>>({ tier: 'basic', currency: 'EUR', deliveryDays: 1, revisions: 1, includes: [] });
  const add = () => {
    if (!d.name?.trim()) return;
    const pkg: Pkg = {
      id: uid(), tier: (d.tier as any) || 'basic', name: d.name, price: Number(d.price) || 0, currency: d.currency || 'EUR',
      deliveryDays: Number(d.deliveryDays) || 1, description: d.description || '', includes: d.includes || [], revisions: Number(d.revisions) || 1,
    };
    onChange([...items, pkg]); setD({ tier: 'basic', currency: 'EUR', deliveryDays: 1, revisions: 1, includes: [] });
  };
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const tierLabel = (t: string) => t === 'basic' ? 'Básico' : t === 'standard' ? 'Estándar' : 'Premium';
  return (
    <div className="p-5 space-y-5">
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-gray-800 text-sm">Nuevo paquete de servicio</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={d.tier} onChange={e => setD(s => ({ ...s, tier: e.target.value as any }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300">
            <option value="basic">Básico</option><option value="standard">Estándar</option><option value="premium">Premium</option>
          </select>
          <input value={d.name || ''} onChange={e => setD(s => ({ ...s, name: e.target.value }))} placeholder="Nombre del paquete" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <input type="number" value={d.price ?? ''} onChange={e => setD(s => ({ ...s, price: Number(e.target.value) }))} placeholder="Precio €" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <input type="number" value={d.deliveryDays ?? ''} onChange={e => setD(s => ({ ...s, deliveryDays: Number(e.target.value) }))} placeholder="Días de entrega" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        </div>
        <textarea value={d.description || ''} onChange={e => setD(s => ({ ...s, description: e.target.value }))} rows={2} placeholder="Descripción" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        <input value={(d.includes || []).join(', ')} onChange={e => setD(s => ({ ...s, includes: e.target.value.split(',').map(x => x.trim()).filter(Boolean) }))} placeholder="Incluye (separado por comas)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        <button onClick={add} disabled={!d.name?.trim()} className="w-full bg-brand text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 disabled:opacity-40 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Añadir paquete</button>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 mb-3">Servicios ({items.length})</h3>
        {items.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl text-gray-400 text-sm">Sin servicios todavía</div>
        ) : (
          <div className="space-y-2">
            {items.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 group">
                <span className="text-[10px] font-black uppercase bg-pink-100 text-pink-700 px-2 py-1 rounded">{tierLabel(p.tier)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">€{p.price} · {p.deliveryDays}d · {p.includes.length} incluidos</p>
                </div>
                <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <SaveBtn onClick={onSave} saving={saving} label="Guardar servicios" />
    </div>
  );
};

// ─── Live Editor ────────────────────────────────────────────────────────────
// Claves del objeto JSONB `social` (mismas que usa el perfil público para construir el enlace).
const STREAM_PLATFORMS = [
  { key: 'youtube',   icon: '🔴', label: 'YouTube',    placeholder: 'canal o @usuario' },
  { key: 'facebook',  icon: '🔵', label: 'Facebook',   placeholder: 'nombre de página' },
  { key: 'instagram', icon: '🌸', label: 'Instagram',  placeholder: 'usuario (sin @)' },
  { key: 'tiktok',    icon: '⬛', label: 'TikTok',     placeholder: 'usuario (sin @)' },
  { key: 'soundcloud',icon: '🟠', label: 'SoundCloud', placeholder: 'usuario' },
  { key: 'spotify',   icon: '🟢', label: 'Spotify',    placeholder: 'usuario / id' },
] as const;

const LiveEditor: React.FC<{ form: any; setVal: (k: string, v: any) => void; onSave: () => void; saving: boolean }> =
({ form, setVal, onSave, saving }) => (
  <div className="p-5 space-y-5">
    {/* Toggle EN VIVO */}
    <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
      <div>
        <p className="font-bold text-gray-900">🔴 En directo ahora</p>
        <p className="text-xs text-gray-400">Muestra el badge "EN VIVO" en su perfil y en los listados</p>
      </div>
      <button onClick={() => setVal('is_live', !form.is_live)}
        className={`relative w-12 h-6 rounded-full transition-colors ${form.is_live ? 'bg-red-500' : 'bg-gray-200'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_live ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>

    {/* Stream URL directo (radio / Icecast / Shoutcast) */}
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
        <Radio className="w-4 h-4 text-red-500" /> URL de stream de radio (Shoutcast / Icecast / MP3)
      </label>
      <input type="url" value={form.stream_url || ''} onChange={e => setVal('stream_url', e.target.value)}
        placeholder="https://stream.ejemplo.com:8000/radio"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
      <p className="text-[11px] text-gray-400 mt-1">Para radios con emisión directa. Se reproduce en el player de la plataforma.</p>
    </div>

    {/* Redes sociales (objeto JSONB `social`; usuario, no URL completa) */}
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">🔗 Perfiles en redes / plataformas</p>
      <p className="text-[11px] text-gray-400 mb-3">Escribe solo el <b>usuario</b> (no la URL). Ej: <code>djmamboking</code></p>
      <div className="space-y-2">
        {STREAM_PLATFORMS.map(({ key, icon, label, placeholder }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-lg w-6 text-center flex-shrink-0">{icon}</span>
            <div className="flex-1">
              <input type="text" value={form.social?.[key] || ''} onChange={e => setVal('social', { ...(form.social || {}), [key]: e.target.value.trim() })}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <span className="text-xs text-gray-400 w-20 text-right">{label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Vídeo destacado */}
    <div className="border-t border-gray-100 pt-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
        <Video className="w-4 h-4 text-red-500" /> Vídeo destacado (URL)
      </label>
      <input type="url" value={form.featured_video || ''} onChange={e => setVal('featured_video', e.target.value)}
        placeholder="https://www.youtube.com/watch?v=…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 mb-2" />
      <input type="text" value={form.featured_video_title || ''} onChange={e => setVal('featured_video_title', e.target.value)}
        placeholder="Título del vídeo…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
    </div>

    <SaveBtn onClick={onSave} saving={saving} label="Guardar configuración Live" />
  </div>
);

// ─── Availability Editor — usa WeeklyScheduleEditor compartido ──────────────
const AvailabilityEditor: React.FC<{ days: any[]; onChange: (v: any[]) => void; onSave: () => void; saving: boolean }> =
({ days, onChange, onSave, saving }) => (
  <div className="p-5">
    <WeeklyScheduleEditor
      value={days}
      onChange={onChange}
      onSave={onSave}
      saving={saving}
      description="Activa los días y elige el rango horario en que el artista está disponible para reservas"
    />
  </div>
);

// ─── Class Packages Editor (paquetes de clase compartida) ───────────────────
const CAP_PRESETS = [
  { cap: 1, label: 'Privada (1 persona)' },
  { cap: 2, label: 'Dúo (2 personas)' },
  { cap: 0, label: 'Grupo (elige cupo)' },
];
const ClassPackagesEditor: React.FC<{ items: ClassPkg[]; onChange: (v: ClassPkg[]) => void; onSave: () => void; saving: boolean }> =
({ items, onChange, onSave, saving }) => {
  const commission = useCommissionPercent();
  const [preset, setPreset] = useState(1);
  const [d, setD] = useState<Partial<ClassPkg>>({ capacity: 1, currency: 'EUR', duration_minutes: 60, includes: [] });
  const capValue = preset === 0 ? (Number(d.capacity) || 4) : preset;
  const add = () => {
    if (!d.name?.trim()) return;
    const pkg: ClassPkg = {
      id: uid(), name: d.name, capacity: Math.max(1, capValue), price: Number(d.price) || 0,
      currency: d.currency || 'EUR', duration_minutes: Number(d.duration_minutes) || 60,
      description: d.description || '', includes: d.includes || [], image: d.image || '',
    };
    onChange([...items, pkg]); setD({ capacity: 1, currency: 'EUR', duration_minutes: 60, includes: [] }); setPreset(1);
  };
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const capLabel = (cap: number) => cap === 1 ? 'Privada' : cap === 2 ? 'Dúo' : `Grupo ${cap}`;

  return (
    <div className="p-5 space-y-5">
      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3 text-xs text-pink-700">
        💡 Defines tú el precio. La plataforma retiene <b>{commission}%</b> y tú recibes el <b>{100 - commission}%</b> de cada reserva. El comprador podrá invitar a los demás participantes al reservar.
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-gray-800 text-sm">Nuevo paquete de clase</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={preset} onChange={e => { const v = Number(e.target.value); setPreset(v); setD(s => ({ ...s, capacity: v === 0 ? 4 : v })); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300">
            {CAP_PRESETS.map(p => <option key={p.cap} value={p.cap}>{p.label}</option>)}
          </select>
          {preset === 0 ? (
            <input type="number" min={3} value={d.capacity ?? ''} onChange={e => setD(s => ({ ...s, capacity: Number(e.target.value) }))} placeholder="Cupo máximo" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          ) : (
            <input value={d.name || ''} onChange={e => setD(s => ({ ...s, name: e.target.value }))} placeholder="Nombre del paquete" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          )}
          {preset === 0 && (
            <input value={d.name || ''} onChange={e => setD(s => ({ ...s, name: e.target.value }))} placeholder="Nombre del paquete" className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          )}
          <input type="number" value={d.price ?? ''} onChange={e => setD(s => ({ ...s, price: Number(e.target.value) }))} placeholder="Precio total €" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <input type="number" value={d.duration_minutes ?? ''} onChange={e => setD(s => ({ ...s, duration_minutes: Number(e.target.value) }))} placeholder="Duración (min)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        </div>
        <textarea value={d.description || ''} onChange={e => setD(s => ({ ...s, description: e.target.value }))} rows={2} placeholder="Qué incluye la clase…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        <ImageInput label="Imagen de la clase" value={d.image || ''} folder="class-images" onChange={v => setD(s => ({ ...s, image: v }))} />
        {Number(d.price) > 0 && (
          <p className="text-xs text-gray-500">Por €{Number(d.price).toFixed(0)}: tú recibes <b className="text-green-600">€{(Number(d.price) * (100 - commission) / 100).toFixed(2)}</b>, plataforma €{(Number(d.price) * commission / 100).toFixed(2)} · cupo {capValue} persona{capValue > 1 ? 's' : ''}</p>
        )}
        <button onClick={add} disabled={!d.name?.trim()} className="w-full bg-brand text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 disabled:opacity-40 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Añadir paquete de clase</button>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 mb-3">Paquetes de clase ({items.length})</h3>
        {items.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl text-gray-400 text-sm">Sin paquetes de clase todavía</div>
        ) : (
          <div className="space-y-2">
            {items.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 group">
                {p.image
                  ? <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  : <span className="text-[10px] font-black uppercase bg-pink-100 text-pink-700 px-2 py-1 rounded flex-shrink-0">{capLabel(p.capacity)}</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">€{p.price} · {p.duration_minutes}min · hasta {p.capacity} persona{p.capacity > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <SaveBtn onClick={onSave} saving={saving} label="Guardar paquetes de clase" />
    </div>
  );
};

// ─── Courses Editor (tabla courses) ─────────────────────────────────────────
const CoursesEditor: React.FC<{ courses: Course[]; ownerId?: string; instructor: string; onReload: () => void }> =
({ courses, ownerId, instructor, onReload }) => {
  const { addToast } = useUIStore();
  const [d, setD] = useState<Course>({ title: '', price: 0, duration: '', category: '', level: '', image_url: '' });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!d.title.trim()) { addToast({ type: 'error', message: 'El curso necesita un título' }); return; }
    if (!ownerId) { addToast({ type: 'error', message: 'Este perfil no tiene un user_id válido para asignar cursos' }); return; }
    setBusy(true);
    const { error } = await supabase.from('courses').insert({
      title: d.title, price: d.price || 0, duration: d.duration || null, category: d.category || null,
      level: d.level || null, image_url: d.image_url || null, instructor: instructor || null,
      owner_id: ownerId, admin_status: 'approved',
    });
    setBusy(false);
    if (error) { addToast({ type: 'error', message: `No se pudo crear el curso: ${error.message}` }); return; }
    addToast({ type: 'success', message: '¡Curso creado!' });
    setD({ title: '', price: 0, duration: '', category: '', level: '', image_url: '' });
    onReload();
  };

  const del = async (id?: string) => {
    if (!id) return;
    setBusy(true);
    const { error } = await supabase.from('courses').delete().eq('id', id);
    setBusy(false);
    if (error) { addToast({ type: 'error', message: `No se pudo eliminar: ${error.message}` }); return; }
    addToast({ type: 'success', message: 'Curso eliminado' });
    onReload();
  };

  return (
    <div className="p-5 space-y-5">
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-gray-800 text-sm">Nuevo curso</h4>
        <input value={d.title} onChange={e => setD(s => ({ ...s, title: e.target.value }))} placeholder="Título del curso" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="number" value={d.price || ''} onChange={e => setD(s => ({ ...s, price: Number(e.target.value) }))} placeholder="Precio €" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <input value={d.duration} onChange={e => setD(s => ({ ...s, duration: e.target.value }))} placeholder="Duración (ej. 4 semanas)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <input value={d.category} onChange={e => setD(s => ({ ...s, category: e.target.value }))} placeholder="Categoría (Bachata…)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          <select value={d.level} onChange={e => setD(s => ({ ...s, level: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300">
            <option value="">Nivel…</option><option value="Principiante">Principiante</option><option value="Intermedio">Intermedio</option><option value="Avanzado">Avanzado</option>
          </select>
        </div>
        <ImageInput label="Imagen del curso" value={d.image_url} folder="courses" onChange={v => setD(s => ({ ...s, image_url: v }))} compact />
        <button onClick={add} disabled={busy || !d.title.trim()} className="w-full bg-brand text-white font-bold py-2 rounded-lg text-sm hover:bg-pink-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear curso
        </button>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 mb-3">Cursos ({courses.length})</h3>
        {courses.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl text-gray-400 text-sm">Sin cursos todavía</div>
        ) : (
          <div className="space-y-2">
            {courses.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 group">
                {c.image_url
                  ? <img src={c.image_url} alt={c.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0"><GraduationCap className="w-5 h-5 text-brand" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{c.title}</p>
                  <p className="text-xs text-gray-400">€{c.price}{c.level ? ` · ${c.level}` : ''}{c.category ? ` · ${c.category}` : ''}</p>
                </div>
                <button onClick={() => del(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistAdminPanel;
