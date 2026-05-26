/**
 * SocialPage — Gestor de redes sociales multi-marca
 *
 * Soporta N sub-cuentas (Locations) de GoHighLevel. Cada marca = 1 Location ID.
 * El admin gestiona la lista de marcas; los usuarios eligen entre las disponibles.
 *
 * Storage: site_config (key='ghl_locations') → { brands: [{id, name, emoji?, color?}] }
 * Fallback: legacy key='ghl_location_id' (un solo Location ID)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Share2, ExternalLink, Settings, Loader2, AlertCircle, Sparkles, Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';

interface Brand {
  id: string;         // Location ID de GHL
  name: string;       // Nombre comercial de la marca
  emoji?: string;     // Emoji opcional para identificar
}

const SocialPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role ?? '');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Cargar marcas desde site_config
  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['ghl_locations', 'ghl_location_id']);

      const list: Brand[] = [];
      data?.forEach((row: any) => {
        if (row.key === 'ghl_locations' && Array.isArray(row.value?.brands)) {
          row.value.brands.forEach((b: any) => {
            if (b?.id && b?.name) list.push({ id: String(b.id), name: String(b.name), emoji: b.emoji });
          });
        }
        // Fallback legacy: un solo Location ID
        if (row.key === 'ghl_location_id') {
          const legacyId = row.value?.id || row.value;
          if (typeof legacyId === 'string' && legacyId.trim().length > 5 && !list.find(b => b.id === legacyId)) {
            list.push({ id: legacyId.trim(), name: 'Marca principal', emoji: '⭐' });
          }
        }
      });
      setBrands(list);

      // Restaurar última marca activa
      const lastActive = localStorage.getItem('bn-social-active-brand');
      if (lastActive && list.find(b => b.id === lastActive)) {
        setActiveBrandId(lastActive);
      } else if (list.length > 0) {
        setActiveBrandId(list[0].id);
      }
    } catch (e) {
      console.warn('[social] load brands', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const activeBrand = useMemo(() => brands.find(b => b.id === activeBrandId) || null, [brands, activeBrandId]);

  const switchBrand = (id: string) => {
    setActiveBrandId(id);
    setIframeError(false);
    localStorage.setItem('bn-social-active-brand', id);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <Share2 className="w-12 h-12 text-pink-500" />
        <h2 className="font-display font-black text-xl">Inicia sesión para gestionar tus redes</h2>
        <button onClick={() => navigate('/auth')} className="btn-orange">Iniciar sesión</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // ── No hay marcas configuradas → setup ─────────────────────
  if (brands.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-4 py-5">
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Share2 className="w-6 h-6" /> Gestor de Redes Sociales
          </h1>
          <p className="text-white/80 text-sm mt-1">Publica en Facebook, Instagram, TikTok, YouTube y más</p>
        </div>
        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
          <div className="card-white p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-fuchsia-100 dark:from-pink-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-pink-500" />
            </div>
            <h2 className="font-display font-black text-xl mb-2">Conecta tus marcas con GoHighLevel</h2>
            <p className="text-sm text-gray-500 mb-4">
              Puedes añadir todas las sub-cuentas que tengas en GHL — una por marca.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {['📘 Facebook','📷 Instagram','🎵 TikTok','🎥 YouTube','💼 LinkedIn','𝕏 Twitter','📍 GMB'].map(p => (
                <span key={p} className="px-3 py-1 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 text-xs font-bold rounded-full">{p}</span>
              ))}
            </div>
          </div>

          {isAdmin ? (
            <BrandsManager brands={brands} onChange={reload} />
          ) : (
            <div className="card-white p-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold">Función no disponible aún</h3>
                <p className="text-sm text-gray-500 mt-1">El administrador debe configurar al menos una marca de GoHighLevel.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Iframe con dropdown de marcas ──────────────────────────
  const planurl = activeBrand
    ? `https://app.gohighlevel.com/v2/location/${activeBrand.id}/social-planner`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header con selector de marca */}
      <div className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-3 py-2 flex items-center gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <Share2 className="w-5 h-5 flex-shrink-0" />
          <BrandSelector brands={brands} activeId={activeBrandId} onSwitch={switchBrand} />
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdmin(s => !s)}
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10">
            <Settings className="w-3.5 h-3.5" /> Gestionar marcas
          </button>
        )}
        {planurl && (
          <a href={planurl} target="_blank" rel="noopener noreferrer"
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir
          </a>
        )}
      </div>

      {/* Panel admin colapsable */}
      {showAdmin && isAdmin && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
          <BrandsManager brands={brands} onChange={() => { reload(); setShowAdmin(false); }} />
        </div>
      )}

      {/* Iframe */}
      <div className="flex-1 relative">
        {iframeError || !activeBrand ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="card-white p-6 max-w-md text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-bold mb-2">No se pudo cargar la marca</h3>
              <p className="text-sm text-gray-500 mb-4">
                Verifica que el Location ID es correcto o intenta abrir en pestaña nueva.
              </p>
              {planurl && (
                <a href={planurl} target="_blank" rel="noopener noreferrer" className="btn-orange inline-flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Abrir en pestaña nueva
                </a>
              )}
            </div>
          </div>
        ) : (
          <iframe
            key={activeBrand.id}
            src={planurl}
            className="w-full h-full border-0"
            title={`Social Planner — ${activeBrand.name}`}
            onError={() => setIframeError(true)}
            allow="camera; microphone; clipboard-read; clipboard-write"
          />
        )}
      </div>
    </div>
  );
};

// ── Dropdown selector de marcas ─────────────────────────────────
const BrandSelector: React.FC<{
  brands: Brand[]; activeId: string | null; onSwitch: (id: string) => void;
}> = ({ brands, activeId, onSwitch }) => {
  const [open, setOpen] = useState(false);
  const active = brands.find(b => b.id === activeId);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm font-bold transition-all">
        <span>{active?.emoji || '🏷️'}</span>
        <span className="truncate max-w-[150px] sm:max-w-[250px]">{active?.name || 'Selecciona marca'}</span>
        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{brands.length}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[260px] max-h-[60vh] overflow-y-auto z-50">
            {brands.map(b => (
              <button key={b.id} onClick={() => { onSwitch(b.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors ${b.id === activeId ? 'bg-pink-50 dark:bg-pink-900/20 font-bold' : ''}`}>
                <span className="text-lg">{b.emoji || '🏷️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{b.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{b.id}</p>
                </div>
                {b.id === activeId && <Check className="w-4 h-4 text-pink-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Gestor de marcas (solo admin) ──────────────────────────────
const BrandsManager: React.FC<{ brands: Brand[]; onChange: () => void }> = ({ brands: initial, onChange }) => {
  const [list, setList] = useState<Brand[]>(initial);
  const [draft, setDraft] = useState<Brand>({ id: '', name: '', emoji: '🏷️' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const persist = async (newList: Brand[]) => {
    setSaving(true); setError('');
    try {
      const { error: upErr } = await supabase
        .from('site_config')
        .upsert(
          { key: 'ghl_locations', value: { brands: newList }, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (upErr) throw upErr;
      setList(newList);
      onChange();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addBrand = () => {
    const id = draft.id.trim(), name = draft.name.trim();
    if (id.length < 5 || name.length < 2) { setError('Location ID y nombre requeridos'); return; }
    if (list.find(b => b.id === id)) { setError('Esa marca ya existe'); return; }
    persist([...list, { id, name, emoji: draft.emoji || '🏷️' }]);
    setDraft({ id: '', name: '', emoji: '🏷️' });
  };

  const removeBrand = (id: string) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    persist(list.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-pink-500" /> Marcas conectadas ({list.length})
        </h3>
        <p className="text-xs text-gray-500">
          Cada marca = 1 sub-cuenta de GHL. Crea las sub-cuentas en tu Agency Dashboard, copia su Location ID (Settings → Company) y pégalo aquí.
        </p>
      </div>

      {/* Lista de marcas */}
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map(b => (
            <div key={b.id} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-2xl">{b.emoji || '🏷️'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.name}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{b.id}</p>
              </div>
              <button onClick={() => removeBrand(b.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form añadir */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Añadir nueva marca</p>
        <div className="grid grid-cols-6 gap-2">
          <input value={draft.emoji || ''} onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))}
            maxLength={2} placeholder="🏷️" className="input-field col-span-1 text-center text-xl" />
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Nombre de la marca" className="input-field col-span-5" />
        </div>
        <input value={draft.id} onChange={e => setDraft(d => ({ ...d, id: e.target.value }))}
          placeholder="Location ID de GHL (Settings → Company)" className="input-field font-mono text-sm" />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={addBrand} disabled={saving} className="btn-orange w-full flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Añadir marca'}
        </button>
      </div>
    </div>
  );
};

export default SocialPage;
