import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Save, ShoppingBag } from 'lucide-react';

interface Props {
  addToast: (o: { message: string; type: 'success' | 'error' | 'warning' }) => void;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
  category: string | null;
  active: boolean;
  sort: number;
}

const blank = (sort: number): Partial<Service> => ({
  name: '', description: '', price: 0, icon: '🎨', category: 'marketing', active: true, sort,
});

const ServicesAdminSection: React.FC<Props> = ({ addToast }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('platform_services').select('*').order('sort');
    if (error) {
      if (/does not exist|schema cache|42P01/i.test(error.message)) setTableMissing(true);
      else addToast({ message: `Error: ${error.message}`, type: 'error' });
      setServices([]);
    } else {
      setTableMissing(false);
      setServices((data || []) as Service[]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) { addToast({ message: 'El nombre es obligatorio', type: 'error' }); return; }
    setSaving(true);
    const payload: any = {
      name: editing.name.trim(),
      description: editing.description || null,
      price: Number(editing.price) || 0,
      icon: editing.icon || '🎨',
      category: editing.category || 'marketing',
      active: editing.active ?? true,
      sort: editing.sort ?? services.length,
    };
    let error;
    if (editing.id) ({ error } = await supabase.from('platform_services').update(payload).eq('id', editing.id));
    else ({ error } = await supabase.from('platform_services').insert(payload));
    setSaving(false);
    if (error) { addToast({ message: `No se pudo guardar: ${error.message}`, type: 'error' }); return; }
    addToast({ message: '✅ Servicio guardado', type: 'success' });
    setEditing(null);
    load();
  };

  const remove = async (s: Service) => {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return;
    const { error } = await supabase.from('platform_services').delete().eq('id', s.id);
    if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); return; }
    addToast({ message: 'Servicio eliminado', type: 'success' });
    load();
  };

  const toggleActive = async (s: Service) => {
    const { error } = await supabase.from('platform_services').update({ active: !s.active }).eq('id', s.id);
    if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); return; }
    load();
  };

  if (loading) return <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto" /></div>;

  if (tableMissing) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <ShoppingBag className="w-6 h-6 text-brand-orange" /> Servicios
        </h2>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-5 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-bold mb-2">Falta crear la tabla <code className="font-mono">platform_services</code>.</p>
          <p>Ejecuta una vez <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/platform-services.sql</code> en el editor SQL de Supabase y recarga.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-orange" /> Servicios
          </h2>
          <p className="text-gray-500 text-sm mt-1">Catálogo de "Comprar servicios" visible en el Dashboard de todos los dueños de perfil.</p>
        </div>
        <button onClick={() => setEditing(blank(services.length))}
          className="bg-brand-orange text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90">
          <Plus className="w-4 h-4" /> Nuevo servicio
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(s => (
          <div key={s.id} className={`card-white rounded-2xl p-4 border border-gray-100 dark:border-gray-800 ${!s.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 grid place-items-center text-xl">{s.icon}</span>
              <div className="flex gap-1">
                <button onClick={() => toggleActive(s)} title={s.active ? 'Ocultar' : 'Publicar'} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 grid place-items-center text-gray-500">{s.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                <button onClick={() => setEditing(s)} className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 grid place-items-center text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(s)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 grid place-items-center text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="font-black text-gray-900 dark:text-white text-sm">{s.name}</p>
            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{s.description}</p>
            <p className="text-brand-orange font-black mt-2">€{Number(s.price).toFixed(2)}</p>
          </div>
        ))}
      </div>
      {services.length === 0 && <p className="text-gray-400 text-sm">No hay servicios todavía. Crea el primero.</p>}

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl text-gray-900 dark:text-white">{editing.id ? 'Editar servicio' : 'Nuevo servicio'}</h3>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Nombre *</label>
                <input className="inp" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Descripción</label>
                <textarea className="inp" rows={3} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Precio (€)</label>
                  <input type="number" step="1" min="0" className="inp" value={editing.price ?? 0} onChange={e => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Icono (emoji)</label>
                  <input className="inp" value={editing.icon || ''} onChange={e => setEditing({ ...editing, icon: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} className="w-4 h-4 accent-brand-orange" /> Publicado
              </label>
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

export default ServicesAdminSection;
