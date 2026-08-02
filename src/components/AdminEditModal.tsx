import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Upload, Loader2 } from 'lucide-react';
import { useUIStore, useAdminOverridesStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/uploadHelper';
import { resolveCityCoords } from '../lib/geo';
import { Button } from './ui';

export type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select' | 'checkbox' | 'color' | 'tags' | 'date' | 'image';

export interface EditField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  helper?: string;
  cols?: 1 | 2;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  entity: 'artist' | 'event' | 'venue' | 'service' | 'user' | 'category' | 'course' | 'subscription' | 'affiliate' | 'promo';
  item: Record<string, any> & { id?: string };
  fields: EditField[];
  onSaved?: (newItem: Record<string, any>) => void;
}

// ── mapeo entidad → tabla y columna de owner ────────────────────────
const TABLE_MAP: Record<string, string> = {
  venue: 'venues', event: 'events', artist: 'artists',
  user: 'profiles', subscription: 'subscriptions',
  service: 'services', course: 'courses', category: 'categories',
  affiliate: 'affiliates', promo: 'promo_services',
};

// La columna que identifica al "dueño" del registro, usada para RLS
const OWNER_COL: Record<string, string> = {
  venue: 'user_id', event: 'created_by', artist: 'user_id',
  service: 'vendor_id', course: 'owner_id',
};

// ── Mapeo UI → columna real de la BD ─────────────────────────────
// La UI histórica usa camelCase; las tablas usan snake_case. Sin este mapeo
// el guardado "tenía éxito" pero descartaba esos campos en silencio.
const KEY_ALIASES: Record<string, Record<string, string>> = {
  user:  { name: 'full_name', phone: 'whatsapp', website: 'website_url', isVerified: 'verified', avatar: 'avatar_url', coverPhoto: 'cover_photo' },
  artist:{ priceFrom: 'price_from' },
  venue: { image: 'image_url', mapLink: 'map_link', priceLevel: 'price_level' },
  event: { imageUrl: 'image_url', venueName: 'venue_name', priceOriginal: 'price_original' },
};
const toSnake = (k: string) => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
function mapKeysToDb(entity: string, obj: Record<string, any>): Record<string, any> {
  const aliases = KEY_ALIASES[entity] || {};
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) out[aliases[k] ?? toSnake(k)] = obj[k];
  return out;
}

const AdminEditModal: React.FC<Props> = ({ open, onClose, title, entity, item, fields, onSaved }) => {
  const { addToast } = useUIStore();
  const { setPatch, removePatch } = useAdminOverridesStore();
  const [form, setForm] = useState<Record<string, any>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isCreate = !item?.id || item.id === 'new' || String(item.id).startsWith('temp-');

  useEffect(() => { if (open) setForm({ ...item }); }, [open, item]);

  if (!open) return null;

  const setVal = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleImageField = async (key: string, file: File | undefined) => {
    if (!file) return;
    setUploadingKey(key);
    const { url, error } = await uploadImage(file, `${entity}-${key}`);
    setUploadingKey(null);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error al subir imagen' }); return; }
    setVal(key, url);
  };

  const save = async () => {
    for (const f of fields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) {
        addToast({ message: `Falta el campo "${f.label}"`, type: 'error' }); return;
      }
    }

    setSaving(true);
    const table = TABLE_MAP[entity];

    // ── CREATE ────────────────────────────────────────────────
    if (isCreate) {
      if (!table) { addToast({ message: 'No se puede crear este tipo de elemento', type: 'error' }); setSaving(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { addToast({ message: 'Inicia sesión para crear', type: 'error' }); setSaving(false); return; }

      const raw: Record<string, any> = {};
      for (const f of fields) {
        if (form[f.key] !== undefined && form[f.key] !== '') raw[f.key] = form[f.key];
      }
      // Traducir claves de UI a columnas reales de la BD
      const payload = mapKeysToDb(entity, raw);
      // Auto-owner
      const ownerCol = OWNER_COL[entity];
      if (ownerCol && !payload[ownerCol]) payload[ownerCol] = session.user.id;
      if (entity === 'user' && !payload.id) payload.id = session.user.id;
      // Auto-geo desde ciudad
      if (payload.city && (payload.lat == null || payload.lng == null)) {
        const c = resolveCityCoords(payload.city);
        if (c) { payload.lat = c.lat; payload.lng = c.lng; }
      }

      // Retry sobre columnas inexistentes — avisando de lo que se descartó
      let lastErr: any = null;
      let inserted: any = null;
      const dropped: string[] = [];
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data, error } = await supabase.from(table).insert(payload).select().single();
        if (!error) { inserted = data; break; }
        lastErr = error;
        const m = /column "?([a-z_]+)"? of relation .* does not exist/i.exec(error.message || '');
        if (m && payload[m[1]] !== undefined) { dropped.push(m[1]); delete payload[m[1]]; continue; }
        break;
      }
      setSaving(false);
      if (!inserted) {
        addToast({ message: `No se pudo crear: ${lastErr?.message || 'error'}`, type: 'error' });
        return;
      }
      if (dropped.length) {
        addToast({ message: `⚠ Creado, pero estos campos no existen en la BD y no se guardaron: ${dropped.join(', ')}`, type: 'warning' });
      }
      addToast({ message: `✅ Creado "${inserted.name || inserted.title || inserted.id}"`, type: 'success' });
      onSaved?.(inserted);
      onClose();
      return;
    }

    // ── UPDATE ────────────────────────────────────────────────
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (form[f.key] !== item[f.key]) patch[f.key] = form[f.key];
    }
    if (Object.keys(patch).length === 0) {
      addToast({ message: 'Sin cambios que guardar', type: 'info' });
      setSaving(false); onClose(); return;
    }
    setPatch(entity, item.id!, patch);

    if (table) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          addToast({ message: '⚠ Guardado solo local (inicia sesión para sincronizar)', type: 'warning' });
        } else {
          let lastErr: any = null;
          // Traducir claves de UI a columnas reales de la BD
          const p = mapKeysToDb(entity, patch);
          const dropped: string[] = [];
          let savedRows: any[] | null = null;
          for (let attempt = 0; attempt < 10; attempt++) {
            if (Object.keys(p).length === 0) { lastErr = { message: 'ningún campo válido para guardar' }; break; }
            const { data, error } = await supabase.from(table).update(p).eq('id', item.id).select('id');
            if (!error) { lastErr = null; savedRows = data; break; }
            lastErr = error;
            const m = /column "?([a-z_]+)"? of relation .* does not exist/i.exec(error.message || '');
            if (m && p[m[1]] !== undefined) { dropped.push(m[1]); delete p[m[1]]; continue; }
            break;
          }
          if (lastErr) {
            addToast({ message: `⚠ Guardado solo local, BD falló: ${lastErr.message}`, type: 'warning' });
          } else if (!savedRows || savedRows.length === 0) {
            // RLS bloqueó el update (0 filas) — el clásico "dice que guarda pero no guarda"
            addToast({ message: '⚠ La BD no aplicó el cambio (sin permisos sobre este registro o id inexistente)', type: 'warning' });
          } else if (dropped.length) {
            addToast({ message: `✅ Guardado, salvo campos inexistentes en BD: ${dropped.join(', ')}`, type: 'warning' });
          } else {
            addToast({ message: `✅ Guardado en la BD`, type: 'success' });
          }
        }
      } catch (err: any) {
        addToast({ message: `⚠ Local guardado, BD falló: ${err.message}`, type: 'warning' });
      }
    } else {
      addToast({ message: `✅ Actualizado`, type: 'success' });
    }
    setSaving(false);
    onSaved?.({ ...item, ...patch });
    onClose();
  };

  const resetOverrides = () => {
    if (item.id) removePatch(entity, item.id);
    addToast({ message: 'Cambios revertidos al original', type: 'info' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-brand-orange text-white p-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{isCreate ? 'Creando' : 'Editando'} · {entity}</p>
            <h2 className="font-display font-black text-xl leading-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.cols === 2 || f.type === 'textarea' || f.type === 'image' ? 'col-span-2' : 'col-span-2 md:col-span-1'}>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.type === 'image' ? (
                  <div className="flex items-start gap-3">
                    {form[f.key]
                      ? <img src={form[f.key]} alt={f.label} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                      : <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400"><Upload className="w-5 h-5" /></div>}
                    <div className="flex-1 space-y-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-50 text-pink-600 text-sm font-semibold hover:bg-pink-100">
                        {uploadingKey === f.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadingKey === f.key ? 'Subiendo...' : 'Subir imagen'}
                        <input type="file" accept="image/*" hidden onChange={e => handleImageField(f.key, e.target.files?.[0])} />
                      </label>
                      <input type="url" value={form[f.key] || ''} onChange={e => setVal(f.key, e.target.value)}
                        placeholder="o pega URL https://..." className="input-field text-xs" />
                    </div>
                  </div>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={e => setVal(f.key, e.target.value)}
                    rows={3}
                    placeholder={f.placeholder}
                    className="input-field"
                  />
                ) : f.type === 'select' ? (
                  <select value={form[f.key] || ''} onChange={e => setVal(f.key, e.target.value)} className="input-field">
                    <option value="">— selecciona —</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer h-10">
                    <input type="checkbox" checked={!!form[f.key]} onChange={e => setVal(f.key, e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                    <span className="text-sm text-gray-700">{f.placeholder || 'Activo'}</span>
                  </label>
                ) : f.type === 'color' ? (
                  <div className="flex items-center gap-2">
                    <input type="color" value={form[f.key] || '#EC4899'} onChange={e => setVal(f.key, e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer" />
                    <input value={form[f.key] || ''} onChange={e => setVal(f.key, e.target.value)} placeholder="#EC4899" className="input-field font-mono flex-1" />
                  </div>
                ) : f.type === 'tags' ? (
                  <input
                    value={Array.isArray(form[f.key]) ? form[f.key].join(', ') : (form[f.key] || '')}
                    onChange={e => setVal(f.key, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder={f.placeholder || 'tag1, tag2, tag3'}
                    className="input-field"
                  />
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
                    value={form[f.key] ?? ''}
                    onChange={e => setVal(f.key, f.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)}
                    placeholder={f.placeholder}
                    className="input-field"
                  />
                )}
                {f.helper && <p className="text-[10px] text-gray-400 mt-1">{f.helper}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 flex justify-between items-center bg-gray-50 flex-shrink-0">
          {!isCreate && (
            <button onClick={resetOverrides} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Revertir al original
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} disabled={saving} className="text-sm text-gray-600 hover:text-gray-900 font-bold px-4 py-2">Cancelar</button>
            <Button variant="orange" icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} onClick={save}>
              {saving ? (isCreate ? 'Creando...' : 'Guardando...') : (isCreate ? 'Crear' : 'Guardar cambios')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditModal;
