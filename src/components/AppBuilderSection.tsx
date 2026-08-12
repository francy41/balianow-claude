import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Loader2,
  X, Upload, Save, LayoutGrid,
} from 'lucide-react';

interface Props {
  addToast: (o: { message: string; type: 'success' | 'error' | 'warning' }) => void;
}

interface HomeModule {
  id: string;
  section: string;
  slug: string;
  type: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  icon_bg: string | null;
  gradient: string | null;
  glow: string | null;
  badge: string | null;
  route: string | null;
  image_url: string | null;
  sort: number;
  active: boolean;
  published: boolean;
  visible_desktop: boolean;
  visible_tablet: boolean;
  visible_mobile: boolean;
}

// Temas de color: emparejan gradiente + color de icono + glow.
const THEMES = [
  { label: 'Rosa',     gradient: 'from-rose-500 to-pink-600',      icon_bg: 'bg-pink-500',   glow: 'hover:shadow-rose-500/40' },
  { label: 'Fucsia',   gradient: 'from-fuchsia-500 to-purple-600', icon_bg: 'bg-violet-500', glow: 'hover:shadow-fuchsia-500/40' },
  { label: 'Azul',     gradient: 'from-indigo-600 to-blue-700',    icon_bg: 'bg-blue-500',   glow: 'hover:shadow-blue-500/40' },
  { label: 'Naranja',  gradient: 'from-amber-500 to-orange-600',   icon_bg: 'bg-orange-500', glow: 'hover:shadow-amber-500/40' },
  { label: 'Verde',    gradient: 'from-emerald-500 to-teal-600',   icon_bg: 'bg-teal-500',   glow: 'hover:shadow-emerald-500/40' },
  { label: 'Cyan',     gradient: 'from-cyan-500 to-blue-600',      icon_bg: 'bg-cyan-500',   glow: 'hover:shadow-cyan-500/40' },
  { label: 'Ámbar',    gradient: 'from-amber-400 to-yellow-500',   icon_bg: 'bg-amber-500',  glow: 'hover:shadow-amber-500/40' },
];

const blankModule = (section: string, sort: number): Partial<HomeModule> => ({
  section, slug: '', type: 'card', title: '', subtitle: '', icon: '✨',
  icon_bg: THEMES[0].icon_bg, gradient: THEMES[0].gradient, glow: THEMES[0].glow,
  badge: '', route: '/', image_url: '', sort, active: true, published: true,
  visible_desktop: true, visible_tablet: true, visible_mobile: true,
});

const slugify = (s: string) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const AppBuilderSection: React.FC<Props> = ({ addToast }) => {
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [editing, setEditing] = useState<Partial<HomeModule> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('home_modules')
      .select('*')
      .order('section', { ascending: true })
      .order('sort', { ascending: true });
    if (error) {
      // 42P01 = tabla inexistente
      if (/does not exist|schema cache|42P01/i.test(error.message)) setTableMissing(true);
      else addToast({ message: `Error cargando módulos: ${error.message}`, type: 'error' });
      setModules([]);
    } else {
      setTableMissing(false);
      setModules((data || []) as HomeModule[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sections = Array.from(new Set(modules.map(m => m.section)));

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { addToast({ message: 'El título es obligatorio', type: 'error' }); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload: any = {
      section: editing.section || 'mas-para-ti',
      slug: editing.slug?.trim() || slugify(editing.title),
      type: editing.type || 'card',
      title: editing.title.trim(),
      subtitle: editing.subtitle || null,
      icon: editing.icon || '✨',
      icon_bg: editing.icon_bg,
      gradient: editing.gradient,
      glow: editing.glow,
      badge: editing.badge?.trim() || null,
      route: editing.route || '/',
      image_url: editing.image_url || null,
      sort: editing.sort ?? modules.length,
      active: editing.active ?? true,
      published: editing.published ?? true,
      visible_desktop: editing.visible_desktop ?? true,
      visible_tablet: editing.visible_tablet ?? true,
      visible_mobile: editing.visible_mobile ?? true,
      updated_by: session?.user?.id ?? null,
    };
    if (editing.published) payload.published_at = new Date().toISOString();

    let error;
    if (editing.id) {
      ({ error } = await supabase.from('home_modules').update(payload).eq('id', editing.id));
    } else {
      payload.created_by = session?.user?.id ?? null;
      ({ error } = await supabase.from('home_modules').insert(payload));
    }
    setSaving(false);
    if (error) { addToast({ message: `No se pudo guardar: ${error.message}`, type: 'error' }); return; }
    addToast({ message: '✅ Módulo guardado', type: 'success' });
    setEditing(null);
    load();
  };

  const remove = async (m: HomeModule) => {
    if (!confirm(`¿Eliminar el módulo "${m.title}"?`)) return;
    const { error } = await supabase.from('home_modules').delete().eq('id', m.id);
    if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); return; }
    addToast({ message: 'Módulo eliminado', type: 'success' });
    load();
  };

  const togglePublished = async (m: HomeModule) => {
    const { error } = await supabase.from('home_modules')
      .update({ published: !m.published, published_at: !m.published ? new Date().toISOString() : null })
      .eq('id', m.id);
    if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); return; }
    load();
  };

  // Reordenar: intercambia el sort con el vecino de la misma sección.
  const move = async (m: HomeModule, dir: -1 | 1) => {
    const siblings = modules.filter(x => x.section === m.section).sort((a, b) => a.sort - b.sort);
    const idx = siblings.findIndex(x => x.id === m.id);
    const target = siblings[idx + dir];
    if (!target) return;
    await Promise.all([
      supabase.from('home_modules').update({ sort: target.sort }).eq('id', m.id),
      supabase.from('home_modules').update({ sort: m.sort }).eq('id', target.id),
    ]);
    load();
  };

  const uploadImage = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `modules/${editing.slug || slugify(editing.title || 'mod')}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      setEditing(e => e ? { ...e, image_url: data.publicUrl } : e);
      addToast({ message: '✅ Imagen subida', type: 'success' });
    } catch (err: any) {
      addToast({ message: `No se pudo subir la imagen: ${err.message || err}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto" /></div>;
  }

  if (tableMissing) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <LayoutGrid className="w-6 h-6 text-brand-orange" /> App Builder
        </h2>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-5 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-bold mb-2">Falta crear la tabla <code className="font-mono">home_modules</code>.</p>
          <p>Ejecuta una vez el archivo <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/home-modules.sql</code> en el editor SQL de Supabase y recarga esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-brand-orange" /> App Builder
          </h2>
          <p className="text-gray-500 text-sm mt-1">Crea y ordena los módulos del Home. Los cambios publicados aparecen automáticamente.</p>
        </div>
        <button onClick={() => setEditing(blankModule('mas-para-ti', modules.length))}
          className="bg-brand-orange text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90">
          <Plus className="w-4 h-4" /> Nuevo módulo
        </button>
      </div>

      {sections.map(section => (
        <div key={section}>
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{section}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.filter(m => m.section === section).map(m => (
              <div key={m.id} className={`relative rounded-2xl overflow-hidden h-36 shadow-sm border border-gray-100 dark:border-gray-800 ${!m.published ? 'opacity-60' : ''}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient || 'from-pink-500 to-rose-600'}`} />
                {m.image_url && <img src={m.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className={`absolute top-2 left-2 w-8 h-8 rounded-full ${m.icon_bg || 'bg-pink-500'} grid place-items-center text-white text-base ring-2 ring-white/30`}>{m.icon}</span>
                {!m.published && <span className="absolute top-2 right-2 bg-gray-900/80 text-white text-[9px] font-black px-2 py-0.5 rounded-full">BORRADOR</span>}
                <div className="absolute bottom-2 left-3 right-3">
                  <p className="text-white font-black text-sm leading-tight">{m.title}</p>
                  <p className="text-white/70 text-[10px] truncate">{m.route}</p>
                </div>
                <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-black/50 transition-opacity flex items-center justify-center gap-1.5">
                  <button onClick={() => move(m, -1)} title="Subir" className="w-8 h-8 rounded-lg bg-white/90 text-gray-800 grid place-items-center hover:bg-white"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(m, 1)} title="Bajar" className="w-8 h-8 rounded-lg bg-white/90 text-gray-800 grid place-items-center hover:bg-white"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => togglePublished(m)} title={m.published ? 'Despublicar' : 'Publicar'} className="w-8 h-8 rounded-lg bg-white/90 text-gray-800 grid place-items-center hover:bg-white">{m.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button onClick={() => setEditing(m)} title="Editar" className="w-8 h-8 rounded-lg bg-white/90 text-gray-800 grid place-items-center hover:bg-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(m)} title="Eliminar" className="w-8 h-8 rounded-lg bg-red-500 text-white grid place-items-center hover:bg-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {modules.length === 0 && (
        <p className="text-gray-400 text-sm">No hay módulos todavía. Crea el primero con “Nuevo módulo”.</p>
      )}

      {/* ── Editor modal ── */}
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl text-gray-900 dark:text-white">{editing.id ? 'Editar módulo' : 'Nuevo módulo'}</h3>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>

            {/* Preview */}
            <div className={`relative rounded-2xl overflow-hidden h-32 mb-4 shadow`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${editing.gradient}`} />
              {editing.image_url && <img src={editing.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className={`absolute top-3 left-3 w-10 h-10 rounded-full ${editing.icon_bg} grid place-items-center text-white text-lg ring-2 ring-white/30`}>{editing.icon}</span>
              {editing.badge ? <span className="absolute top-3 right-3 bg-white text-pink-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">{editing.badge}</span> : null}
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-black">{editing.title || 'Título'}</p>
                <p className="text-white/80 text-xs">{editing.subtitle || 'Subtítulo'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Row label="Título *"><input className="inp" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Row>
              <Row label="Subtítulo"><input className="inp" value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} /></Row>
              <div className="grid grid-cols-2 gap-3">
                <Row label="Icono (emoji)"><input className="inp" value={editing.icon || ''} onChange={e => setEditing({ ...editing, icon: e.target.value })} /></Row>
                <Row label="Badge"><input className="inp" placeholder="Nuevo" value={editing.badge || ''} onChange={e => setEditing({ ...editing, badge: e.target.value })} /></Row>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Row label="Ruta"><input className="inp" value={editing.route || ''} onChange={e => setEditing({ ...editing, route: e.target.value })} placeholder="/danceflow" /></Row>
                <Row label="Sección"><input className="inp" value={editing.section || ''} onChange={e => setEditing({ ...editing, section: e.target.value })} /></Row>
              </div>

              <Row label="Color">
                <div className="flex flex-wrap gap-2">
                  {THEMES.map(t => (
                    <button key={t.label} type="button" onClick={() => setEditing({ ...editing, gradient: t.gradient, icon_bg: t.icon_bg, glow: t.glow })}
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} ring-2 ${editing.gradient === t.gradient ? 'ring-gray-900 dark:ring-white' : 'ring-transparent'}`} title={t.label} />
                  ))}
                </div>
              </Row>

              <Row label="Imagen (opcional)">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-gray-100 dark:bg-gray-800 text-sm font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Subir
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                  {editing.image_url && <button onClick={() => setEditing({ ...editing, image_url: '' })} className="text-xs text-red-500 font-bold">Quitar</button>}
                </div>
              </Row>

              <div className="flex flex-wrap gap-4 pt-1">
                <Check label="Publicado" checked={!!editing.published} onChange={v => setEditing({ ...editing, published: v })} />
                <Check label="Activo" checked={!!editing.active} onChange={v => setEditing({ ...editing, active: v })} />
                <Check label="Móvil" checked={!!editing.visible_mobile} onChange={v => setEditing({ ...editing, visible_mobile: v })} />
                <Check label="Desktop" checked={!!editing.visible_desktop} onChange={v => setEditing({ ...editing, visible_desktop: v })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditing(null)} className="text-sm font-bold text-gray-600 dark:text-gray-300 px-4 py-2">Cancelar</button>
              <button onClick={save} disabled={saving} className="bg-brand-orange text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.inp{width:100%;border:1px solid rgb(229 231 235);border-radius:.6rem;padding:.5rem .7rem;font-size:.875rem;background:transparent}.dark .inp{border-color:rgb(55 65 81)}`}</style>
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{label}</label>
    {children}
  </div>
);

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-brand-orange" />
    {label}
  </label>
);

export default AppBuilderSection;
