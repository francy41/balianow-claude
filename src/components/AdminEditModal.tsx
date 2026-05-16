import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useUIStore, useAdminOverridesStore } from '../store/appStore';
import { Button } from './ui';

export type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select' | 'checkbox' | 'color' | 'tags' | 'date';

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

  useEffect(() => {
    if (open) setForm({ ...item });
  }, [open, item]);

  if (!open) return null;

  const setVal = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const save = () => {
    for (const f of fields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) {
        addToast({ message: `Falta el campo "${f.label}"`, type: 'error' }); return;
      }
    }
    // Solo guardamos los campos cambiados respecto al original
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (form[f.key] !== item[f.key]) patch[f.key] = form[f.key];
    }
    if (Object.keys(patch).length === 0) {
      addToast({ message: 'Sin cambios que guardar', type: 'info' });
      onClose(); return;
    }
    setPatch(entity, item.id, patch);
    addToast({ message: `"${form.name || form.title || item.id}" actualizado`, type: 'success' });
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
        <div className="bg-gradient-to-r from-brand-orange to-orange-500 text-white p-5 flex items-center justify-between flex-shrink-0">
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
                    <input type="color" value={form[f.key] || '#F97316'} onChange={e => setVal(f.key, e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer" />
                    <input value={form[f.key] || ''} onChange={e => setVal(f.key, e.target.value)} placeholder="#F97316" className="input-field font-mono flex-1" />
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
          <button onClick={resetOverrides} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Revertir al original
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-bold px-4 py-2">Cancelar</button>
            <Button variant="orange" icon={<Save className="w-4 h-4" />} onClick={save}>Guardar cambios</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditModal;
