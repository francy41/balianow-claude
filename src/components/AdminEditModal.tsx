import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Camera, Loader2 } from 'lucide-react';
import { useUIStore, useAdminOverridesStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { uploadImage as uploadImageHelper } from '../lib/uploadHelper';
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
  cols?: 1 | 2;            // ancho relativo en el grid (default 1)
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  entity: 'artist' | 'event' | 'venue' | 'service' | 'user' | 'category' | 'course' | 'subscription';
  item: Record<string, any> & { id: string };
  fields: EditField[];
  onSaved?: (newItem: Record<string, any>) => void;
}

const AdminEditModal: React.FC<Props> = ({ open, onClose, title, entity, item, fields, onSaved }) => {
  const { addToast } = useUIStore();
  const { setPatch, removePatch } = useAdminOverridesStore();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageField, setActiveImageField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...item });
      setSaving(false);
      setUploadingField(null);
    }
  }, [open, item]);

  if (!open) return null;

  const setVal = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  // Detect "new" mode by id sentinel from the caller (`art-new-...`, `new-...`)
  const isNew = typeof item.id === 'string' && /^(art-new-|new-|venue-new-|event-new-|user-new-|service-new-|course-new-)/.test(item.id);

  // Mapeo entidad → tabla Supabase
  const TABLE_MAP: Record<string, string> = {
    venue: 'venues', event: 'events', artist: 'artists',
    user: 'profiles', profile: 'profiles', subscription: 'site_config',
    service: 'services', course: 'courses',
  };

  // Upload a file for an image-type field
  const handleImagePick = async (field: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ message: 'Solo imágenes', type: 'error' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast({ message: 'Imagen demasiado grande (max 10MB)', type: 'error' });
      return;
    }
    setUploadingField(field);
    try {
      const folder = `${entity}/${item.id}`;
      const { url } = await uploadImageHelper(file, folder);
      if (url) {
        setVal(field, url);
        addToast({ message: '✅ Imagen subida', type: 'success' });
      } else {
        addToast({ message: 'Error subiendo imagen', type: 'error' });
      }
    } catch (e: any) {
      addToast({ message: `Error: ${e.message || 'desconocido'}`, type: 'error' });
    } finally {
      setUploadingField(null);
    }
  };

  const save = async () => {
    for (const f of fields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) {
        addToast({ message: `Falta el campo "${f.label}"`, type: 'error' }); return;
      }
    }

    // INSERT path — for new items, send all defined fields (not just changed)
    if (isNew) {
      const table = TABLE_MAP[entity];
      if (!table) {
        addToast({ message: `Entidad "${entity}" no soporta creación`, type: 'error' });
        return;
      }
      const payload: Record<string, any> = {};
      for (const f of fields) {
        const v = form[f.key];
        if (v !== undefined && v !== '' && v !== null) payload[f.key] = v;
      }
      setSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          addToast({ message: 'Inicia sesión para crear en la BD', type: 'error' });
          setSaving(false);
          return;
        }

        // Auto-fill ownership columns required por RLS según entidad
        const ownerCols: Record<string, string[]> = {
          artist:       ['user_id'],
          venue:        ['user_id'],
          event:        ['created_by', 'user_id'],
          service:      ['seller_id', 'artist_id'],
          course:       ['performer_id', 'vendor_id'],
          // user/profile usa el propio id de auth
        };
        (ownerCols[entity] || []).forEach(col => {
          if (payload[col] === undefined) payload[col] = session.user.id;
        });
        if (entity === 'user' && !payload.id) payload.id = session.user.id;

        // Stripping de campos id sentinel temporales (art-new-XXX)
        if (typeof payload.id === 'string' && /^(art-new-|new-|venue-new-|event-new-|user-new-|service-new-|course-new-)/.test(payload.id)) {
          delete payload.id;
        }

        let { data, error } = await supabase.from(table).insert(payload).select().single();

        // Retry sin columnas que no existen (degradación elegante)
        if (error && /column .* does not exist/i.test(error.message)) {
          const colMatch = error.message.match(/column "?(\w+)"? .* does not exist/i);
          if (colMatch?.[1]) {
            const stripped = { ...payload };
            delete stripped[colMatch[1]];
            console.warn(`[AdminEdit] columna "${colMatch[1]}" no existe en ${table}, reintentando sin ella`);
            const retry = await supabase.from(table).insert(stripped).select().single();
            data = retry.data;
            error = retry.error;
          }
        }

        if (error) {
          console.error('[AdminEdit] insert error:', error);
          addToast({ message: `Error al crear: ${error.message}`, type: 'error' });
          setSaving(false);
          return;
        }
        addToast({ message: `✅ Creado: "${data?.name || data?.title || data?.id}"`, type: 'success' });
        onSaved?.(data || { ...item, ...payload });
        setSaving(false);
        onClose();
      } catch (err: any) {
        console.error('[AdminEdit] insert catch:', err);
        addToast({ message: `Error: ${err.message || 'desconocido'}`, type: 'error' });
        setSaving(false);
      }
      return;
    }

    // UPDATE path — only changed fields
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (form[f.key] !== item[f.key]) patch[f.key] = form[f.key];
    }
    if (Object.keys(patch).length === 0) {
      addToast({ message: 'Sin cambios que guardar', type: 'info' });
      onClose(); return;
    }

    // 1) Override local INMEDIATO para feedback rápido
    setPatch(entity, item.id, patch);

    // 2) Persistir en Supabase (real, cross-device)
    const table = TABLE_MAP[entity];
    if (table) {
      setSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          addToast({ message: '⚠ Guardado solo local (inicia sesión para sincronizar)', type: 'warning' });
        } else {
          let current = { ...patch };
          let error: any = null;
          // Retry hasta 3 veces eliminando columnas inexistentes
          for (let attempt = 0; attempt < 3; attempt++) {
            const res = await supabase.from(table).update(current).eq('id', item.id);
            error = res.error;
            if (!error) break;
            const m = error.message.match(/column "?(\w+)"? .* does not exist/i);
            if (m?.[1] && current[m[1]] !== undefined) {
              console.warn(`[AdminEdit] columna "${m[1]}" no existe en ${table}, omitiendo`);
              delete current[m[1]];
              if (Object.keys(current).length === 0) break;
            } else {
              break;
            }
          }
          if (error) {
            console.error('[AdminEdit] supabase error:', error);
            addToast({ message: `⚠ Local guardado, BD falló: ${error.message}`, type: 'warning' });
          } else {
            addToast({ message: `✅ "${form.name || form.title || item.id}" guardado en la BD`, type: 'success' });
          }
        }
      } catch (err: any) {
        console.error('[AdminEdit] catch error:', err);
        addToast({ message: `⚠ Local guardado, BD falló: ${err.message}`, type: 'warning' });
      } finally {
        setSaving(false);
      }
    } else {
      addToast({ message: `✅ "${form.name || form.title || item.id}" actualizado`, type: 'success' });
    }

    onSaved?.({ ...item, ...patch });
    onClose();
  };

  const resetOverrides = () => {
    removePatch(entity, item.id);
    addToast({ message: 'Cambios revertidos al original', type: 'info' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-brand-orange to-pink-500 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Editando · {entity}</p>
            <h2 className="font-display font-black text-xl leading-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.cols === 2 || f.type === 'textarea' ? 'col-span-2' : 'col-span-2 md:col-span-1'}>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.type === 'textarea' ? (
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
                ) : f.type === 'image' ? (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {uploadingField === f.key ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-brand-orange" />
                        </div>
                      ) : form[f.key] ? (
                        <img src={form[f.key]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveImageField(f.key);
                          // trigger after state flush
                          setTimeout(() => fileInputRef.current?.click(), 0);
                        }}
                        disabled={uploadingField === f.key}
                        className="bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
                      >
                        {uploadingField === f.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        {uploadingField === f.key ? 'Subiendo...' : (form[f.key] ? 'Cambiar imagen' : 'Subir imagen')}
                      </button>
                      <input
                        type="url"
                        value={form[f.key] || ''}
                        onChange={e => setVal(f.key, e.target.value)}
                        placeholder="o pega URL https://..."
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
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
          {!isNew ? (
            <button onClick={resetOverrides} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Revertir al original
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-bold px-4 py-2">Cancelar</button>
            <Button
              variant="orange"
              icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={save}
              loading={saving}
            >
              {saving ? (isNew ? 'Creando...' : 'Guardando...') : (isNew ? 'Crear' : 'Guardar cambios')}
            </Button>
          </div>
        </div>

        {/* Hidden input shared by all image-type fields */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (activeImageField) handleImagePick(activeImageField, file);
            // reset for re-pick of same file
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
};

export default AdminEditModal;
