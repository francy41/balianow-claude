import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings2, X, Loader2, Save, Upload, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { uploadImage } from '../lib/uploadHelper';
import { resolveCityCoords } from '../lib/geo';
import { DETAIL_EDIT, PROFILE_ARTIST_EDIT } from '../config/editFields';
import type { EditField } from './AdminEditModal';
import WeeklyScheduleEditor from './WeeklyScheduleEditor';

/**
 * Panel de edición admin unificado y config-driven para páginas de detalle.
 * Mismo estilo drawer que EventAdminPanel, pero genérico: artista, local, servicio.
 * Reutiliza las definiciones de campos de config/editFields.ts (DETAIL_EDIT).
 */
interface Props {
  kind: 'artist' | 'venue' | 'service';
  id?: string;
  onSaved?: () => void;
  ownerUserId?: string;
}

const LABEL: Record<Props['kind'], string> = {
  artist: 'perfil',
  venue: 'local',
  service: 'servicio',
};

// ── Image field (subida + URL) ──────────────────────────────────────────────
const ImageInput: React.FC<{
  label: string;
  value: string;
  folder: string;
  onChange: (v: string) => void;
}> = ({ label, value, folder, onChange }) => {
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
    <div className="col-span-2">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        {value
          ? <img src={value} alt={label} className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
          : <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Upload className="w-5 h-5" /></div>}
        <div className="flex-1 space-y-2">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-600 text-sm font-semibold hover:bg-purple-100">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Subiendo…' : 'Subir imagen'}
            <input type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files?.[0])} />
          </label>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="o pega una URL https://…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>
    </div>
  );
};

const EntityAdminPanel: React.FC<Props> = ({ kind, id, onSaved, ownerUserId }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [original, setOriginal] = useState<Record<string, any>>({});
  const [form, setForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'schedule'>('general');
  const hasSchedule = kind === 'venue' || kind === 'service';

  const isAdmin = !!user && ['admin', 'superadmin'].includes(String(user.role));
  const isOwner = !!user && !!ownerUserId && user.id === ownerUserId;
  const canManage = isAdmin || isOwner;
  const cfg = DETAIL_EDIT[kind];

  // Tabla/campos resueltos en runtime. Para artistas que son perfiles de
  // usuario (no están en `artists`), se cae a `profiles` con su propio set.
  const [resolved, setResolved] = useState<{ table: string; fields: EditField[] }>(
    { table: cfg.table, fields: cfg.fields }
  );

  const load = useCallback(async () => {
    if (!cfg || !id) return;
    setLoading(true);

    // 1) Intentar la tabla principal de la categoría
    const primary = await supabase.from(cfg.table).select('*').eq('id', id).maybeSingle();
    if (primary.data) {
      setResolved({ table: cfg.table, fields: cfg.fields });
      setOriginal(primary.data);
      setForm({ ...primary.data });
      setLoading(false);
      return true;
    }

    // 2) Artista sin ficha en `artists` → editar su PERFIL (tabla profiles)
    if (kind === 'artist') {
      const prof = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (prof.data) {
        const pf = isAdmin ? PROFILE_ARTIST_EDIT.fields : PROFILE_ARTIST_EDIT.fields.filter(f => !['role', 'verified'].includes(f.key));
        setResolved({ table: PROFILE_ARTIST_EDIT.table, fields: pf });
        setOriginal(prof.data);
        setForm({ ...prof.data });
        setLoading(false);
        return true;
      }
    }

    setLoading(false);
    if (primary.error) { addToast({ type: 'error', message: `No se pudo cargar: ${primary.error.message}` }); return false; }
    addToast({ type: 'warning', message: 'Este registro no se encontró en una tabla editable.' });
    return false;
  }, [cfg, id, kind, addToast, isAdmin]);

  const openPanel = async () => {
    const ok = await load();
    if (ok !== false) setOpen(true);
  };

  // Auto-abrir con ?edit=1 (deep-link desde el panel admin)
  useEffect(() => {
    if (canManage && id && cfg && searchParams.get('edit') === '1') {
      openPanel();
      const sp = new URLSearchParams(searchParams);
      sp.delete('edit');
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setVal = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!cfg || !id) return;
    // Validación de requeridos
    for (const f of resolved.fields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === '' || form[f.key] === null)) {
        addToast({ type: 'error', message: `Falta el campo "${f.label}"` });
        return;
      }
    }

    // Patch solo de campos cambiados
    const patch: Record<string, any> = {};
    for (const f of resolved.fields) {
      const a = form[f.key];
      const b = original[f.key];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        patch[f.key] = a === '' ? null : a;
      }
    }
    if (Object.keys(patch).length === 0) {
      addToast({ type: 'info', message: 'Sin cambios que guardar' });
      return;
    }

    // Auto-geo si cambió la ciudad y no hay coords
    if (patch.city && (form.lat == null || form.lng == null)) {
      const c = resolveCityCoords(patch.city);
      if (c) { patch.lat = c.lat; patch.lng = c.lng; }
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      addToast({ type: 'error', message: 'Inicia sesión como admin para guardar' });
      return;
    }

    // Retry descartando columnas inexistentes
    const p = { ...patch };
    const dropped: string[] = [];
    let lastErr: any = null;
    let savedRows: any[] | null = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      if (Object.keys(p).length === 0) { lastErr = { message: 'ningún campo válido' }; break; }
      const { data, error } = await supabase.from(resolved.table).update(p).eq('id', id).select('id');
      if (!error) { lastErr = null; savedRows = data; break; }
      lastErr = error;
      const m = /column "?([a-z_]+)"? of relation .* does not exist/i.exec(error.message || '');
      if (m && p[m[1]] !== undefined) { dropped.push(m[1]); delete p[m[1]]; continue; }
      break;
    }
    setSaving(false);

    if (lastErr) {
      addToast({ type: 'error', message: `Error al guardar: ${lastErr.message}` });
      return;
    }
    if (!savedRows || savedRows.length === 0) {
      addToast({ type: 'warning', message: 'La BD no aplicó el cambio (sin permisos sobre este registro o id inexistente)' });
      return;
    }
    if (dropped.length) {
      addToast({ type: 'warning', message: `Guardado, salvo campos inexistentes en BD: ${dropped.join(', ')}` });
    } else {
      addToast({ type: 'success', message: '¡Guardado correctamente!' });
    }
    setOriginal({ ...original, ...patch });
    if (onSaved) onSaved();
    else setTimeout(() => window.location.reload(), 500);
  };

  const saveSchedule = async () => {
    if (!id) return;
    setSavingSchedule(true);
    const { error } = await supabase
      .from(resolved.table)
      .update({ availability: form.availability ?? [] })
      .eq('id', id);
    setSavingSchedule(false);
    if (error) {
      addToast({ type: 'error', message: `Error al guardar horario: ${error.message}` });
    } else {
      addToast({ type: 'success', message: '¡Horario guardado!' });
      setOriginal(prev => ({ ...prev, availability: form.availability }));
    }
  };

  if (!canManage || !id || !cfg) return null;

  const renderField = (f: EditField) => {
    const v = form[f.key];
    const wide = f.cols === 2 || f.type === 'textarea';

    if (f.type === 'image') {
      return <ImageInput key={f.key} label={f.label} value={v || ''} folder={`${kind}s`} onChange={val => setVal(f.key, val)} />;
    }

    return (
      <div key={f.key} className={wide ? 'col-span-2' : ''}>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {f.type === 'textarea' ? (
          <textarea
            value={v || ''}
            onChange={e => setVal(f.key, e.target.value)}
            rows={4}
            placeholder={f.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-y"
          />
        ) : f.type === 'select' ? (
          <select
            value={v || ''}
            onChange={e => setVal(f.key, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          >
            <option value="">— selecciona —</option>
            {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : f.type === 'checkbox' ? (
          <button
            type="button"
            onClick={() => setVal(f.key, !v)}
            className={`relative w-12 h-6 rounded-full transition-colors mt-1 ${v ? 'bg-purple-600' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${v ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        ) : f.type === 'tags' ? (
          <input
            value={Array.isArray(v) ? v.join(', ') : (v || '')}
            onChange={e => setVal(f.key, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder={f.placeholder || 'separados por comas'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        ) : (
          <input
            type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text'}
            value={v ?? ''}
            onChange={e => setVal(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
            placeholder={f.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        )}
        {f.helper && <p className="text-[10px] text-gray-400 mt-1">{f.helper}</p>}
      </div>
    );
  };

  const label = LABEL[kind];

  return (
    <>
      <button
        onClick={openPanel}
        disabled={loading}
        title={`Editar ${label} (admin)`}
        className="fixed z-[70] bottom-24 left-4 sm:bottom-8 sm:left-8 flex items-center gap-2 bg-brand-orange text-white font-black text-sm px-5 py-3.5 rounded-2xl shadow-2xl shadow-fuchsia-500/40 hover:scale-105 transition-all ring-2 ring-white/40"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
        Editar {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-brand-orange flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-lg capitalize">Editar {label}</h2>
                <p className="text-white/70 text-xs">{isOwner ? 'Gestionado por ti (dueño)' : 'Panel de edición · solo administradores'}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs — solo para venue y service */}
            {hasSchedule && (
              <div className="flex border-b border-gray-100 px-5 gap-1 flex-shrink-0 bg-white">
                {([
                  { id: 'general', label: 'Datos generales', icon: <Save className="w-3.5 h-3.5" /> },
                  { id: 'schedule', label: 'Horario', icon: <Calendar className="w-3.5 h-3.5" /> },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${activeTab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resolved.fields.map(renderField)}
                </div>
              )}
              {activeTab === 'schedule' && (
                <WeeklyScheduleEditor
                  value={form.availability || []}
                  onChange={v => setForm(prev => ({ ...prev, availability: v }))}
                  onSave={saveSchedule}
                  saving={savingSchedule}
                  label={kind === 'venue' ? '🕐 Horario de apertura semanal' : '📅 Disponibilidad semanal'}
                  description={kind === 'venue'
                    ? 'Define los días y horas en que el local está abierto al público'
                    : 'Indica los días y horas en que ofreces este servicio'
                  }
                />
              )}
            </div>

            {/* Footer — solo en tab general */}
            {activeTab === 'general' && (
              <div className="border-t border-gray-100 p-4 flex gap-2 flex-shrink-0 bg-gray-50">
                <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 bg-brand-orange text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar cambios
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EntityAdminPanel;
