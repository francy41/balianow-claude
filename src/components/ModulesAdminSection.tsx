import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Save, Plus, Trash2, Tag } from 'lucide-react';

interface CatalogRow { module_id: string; name: string; emoji: string | null; price: number; active: boolean; is_full: boolean; sort: number; }
interface Override { id: string; module_id: string; scope_type: string; scope_value: string; price: number | null; active: boolean | null; }

const ROLES = ['user', 'artist', 'dj', 'dancer', 'venue', 'instructor', 'business', 'promoter'];

const ModulesAdminSection: React.FC<{ addToast: (t: any) => void }> = ({ addToast }) => {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ov, setOv] = useState({ module_id: 'reservas', scope_type: 'role', scope_value: 'venue', price: '', active: 'true' });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, o] = await Promise.all([
        supabase.from('module_catalog').select('*').order('sort', { ascending: true }),
        supabase.from('module_overrides').select('*').order('created_at', { ascending: false }),
      ]);
      if (c.error) throw c.error;
      setCatalog((c.data as CatalogRow[]) || []);
      setOverrides((o.data as Override[]) || []);
    } catch (e: any) {
      setLoadError(e?.message || 'No se pudieron cargar los módulos.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveRow = async (m: CatalogRow, patch: Partial<CatalogRow>) => {
    const { error } = await supabase.from('module_catalog').update(patch).eq('module_id', m.module_id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Módulo actualizado', type: 'success' }); load();
  };

  const addOverride = async () => {
    const { error } = await supabase.from('module_overrides').upsert({
      module_id: ov.module_id, scope_type: ov.scope_type, scope_value: ov.scope_value.trim(),
      price: ov.price === '' ? null : Number(ov.price), active: ov.active === '' ? null : ov.active === 'true',
    }, { onConflict: 'module_id,scope_type,scope_value' });
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Excepción guardada', type: 'success' }); load();
  };
  const delOverride = async (id: string) => { await supabase.from('module_overrides').delete().eq('id', id); load(); };

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Módulos de creador</h2>
        <p className="text-gray-500 text-sm">Precios y disponibilidad de los módulos. Cambios globales (a todos) o excepciones por perfil.</p>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 mb-6 text-sm flex items-center justify-between gap-3">
          <span className="text-red-700 dark:text-red-300">No se pudieron cargar los módulos: {loadError}</span>
          <button onClick={load} className="shrink-0 text-xs font-bold bg-red-600 text-white rounded-lg px-3 py-1.5">Reintentar</button>
        </div>
      )}

      {/* Catálogo global */}
      <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5"><Tag className="w-4 h-4" /> Catálogo global (a todos)</h3>
      {catalog.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 mb-8 text-sm">
          <p className="font-bold text-amber-800 dark:text-amber-300">Aún no hay módulos en el catálogo</p>
          <p className="text-amber-700 dark:text-amber-400 mt-1">
            Los módulos se guardan en la base de datos para que puedas editar precios y disponibilidad.
            Para cargarlos, ejecuta <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/module-catalog.sql</code> en
            Supabase → SQL Editor. Aparecerán aquí Reservas, Contratación, Pagos, Cursos, Transmisiones, Perfil PRO y el Pack Full.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {catalog.map(m => <CatalogRowEditor key={m.module_id} m={m} onSave={saveRow} />)}
        </div>
      )}

      {/* Excepciones por perfil */}
      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Excepciones por perfil (rol o usuario)</h3>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 mb-4">
        <div className="grid sm:grid-cols-5 gap-2 items-end">
          <div><label className="text-[11px] font-bold text-gray-500">Módulo</label>
            <select value={ov.module_id} onChange={e => setOv(s => ({ ...s, module_id: e.target.value }))} disabled={catalog.length === 0} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-2 text-sm disabled:opacity-50">
              {catalog.length === 0
                ? <option value="">— Sin módulos (ejecuta el SQL) —</option>
                : catalog.map(m => <option key={m.module_id} value={m.module_id}>{m.name}</option>)}
            </select></div>
          <div><label className="text-[11px] font-bold text-gray-500">Ámbito</label>
            <select value={ov.scope_type} onChange={e => setOv(s => ({ ...s, scope_type: e.target.value }))} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-2 text-sm">
              <option value="role">Por rol</option><option value="user">Por usuario</option>
            </select></div>
          <div><label className="text-[11px] font-bold text-gray-500">{ov.scope_type === 'role' ? 'Rol' : 'ID usuario'}</label>
            {ov.scope_type === 'role'
              ? <select value={ov.scope_value} onChange={e => setOv(s => ({ ...s, scope_value: e.target.value }))} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-2 text-sm">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
              : <input value={ov.scope_value} onChange={e => setOv(s => ({ ...s, scope_value: e.target.value }))} placeholder="uuid" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-2 text-sm" />}
          </div>
          <div><label className="text-[11px] font-bold text-gray-500">Precio (€, vacío = catálogo)</label>
            <input value={ov.price} onChange={e => setOv(s => ({ ...s, price: e.target.value }))} type="number" placeholder="—" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-2 text-sm" /></div>
          <div><label className="text-[11px] font-bold text-gray-500">Estado</label>
            <select value={ov.active} onChange={e => setOv(s => ({ ...s, active: e.target.value }))} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-2 text-sm">
              <option value="true">Activo</option><option value="false">Oculto</option><option value="">Según catálogo</option>
            </select></div>
        </div>
        <button onClick={addOverride} disabled={catalog.length === 0} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold bg-brand-orange text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /> Añadir excepción</button>
      </div>
      {overrides.length > 0 && (
        <div className="space-y-2">
          {overrides.map(o => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800/40 text-sm">
              <span className="text-gray-700 dark:text-gray-200"><b>{o.module_id}</b> · {o.scope_type === 'role' ? `rol ${o.scope_value}` : `usuario ${o.scope_value.slice(0, 8)}…`} · {o.price != null ? `${o.price}€` : 'precio catálogo'} · {o.active == null ? 'estado catálogo' : o.active ? 'activo' : 'oculto'}</span>
              <button onClick={() => delOverride(o.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CatalogRowEditor: React.FC<{ m: CatalogRow; onSave: (m: CatalogRow, patch: Partial<CatalogRow>) => void }> = ({ m, onSave }) => {
  const [price, setPrice] = useState(String(m.price));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800/40">
      <span className="text-xl">{m.emoji}</span>
      <span className="flex-1 font-bold text-gray-900 dark:text-white text-sm">{m.name}{m.is_full && <span className="text-[10px] text-fuchsia-500 ml-1">PACK</span>}</span>
      <div className="flex items-center gap-1"><input value={price} onChange={e => setPrice(e.target.value)} type="number" className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-1.5 text-sm text-right" /><span className="text-gray-400 text-sm">€</span></div>
      <button onClick={() => onSave(m, { active: !m.active })} className={`text-xs font-bold rounded-lg px-2.5 py-1.5 ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{m.active ? 'Activo' : 'Oculto'}</button>
      <button onClick={() => onSave(m, { price: parseFloat(price) || 0 })} className="inline-flex items-center gap-1 text-xs font-bold bg-brand-orange text-white rounded-lg px-3 py-1.5"><Save className="w-3.5 h-3.5" /> Guardar</button>
    </div>
  );
};

export default ModulesAdminSection;
