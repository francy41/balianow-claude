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
import { Share2, ExternalLink, Settings, Loader2, AlertCircle, Sparkles, Plus, Trash2, ChevronDown, Check, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import BulkPostComposer from '../components/BulkPostComposer';

interface Brand {
  id: string;             // ID interno (UUID o location ID por compatibilidad)
  name: string;           // Nombre comercial de la marca
  emoji?: string;
  locationId: string;     // Location ID de GHL (de qué sub-cuenta toma las cuentas)
  accountIds?: string[];  // Cuentas sociales específicas. Si vacío -> todas las de la location.
}

interface GhlAccount {
  id: string;
  platform: string;
  name: string;
  avatar?: string;
  connected?: boolean;
}

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: '📘', instagram: '📷', tiktok: '🎵', youtube: '🎥',
  linkedin: '💼', twitter: '𝕏', google: '📍', gmb: '📍',
};

// Función auxiliar para llamar a la Edge Function
async function callGhlFn(payload: any) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-bulk-post`;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  const auth = session?.access_token || anon;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': anon, 'Authorization': `Bearer ${auth}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
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
  const [showBulk, setShowBulk] = useState(false);

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
            if (!b?.id || !b?.name) return;
            list.push({
              id: String(b.id),
              name: String(b.name),
              emoji: b.emoji,
              // Compat: si solo tenía id (que antes era locationId), usar el id como locationId
              locationId: String(b.locationId || b.id),
              accountIds: Array.isArray(b.accountIds) ? b.accountIds : undefined,
            });
          });
        }
        // Fallback legacy: un solo Location ID
        if (row.key === 'ghl_location_id') {
          const legacyId = row.value?.id || row.value;
          if (typeof legacyId === 'string' && legacyId.trim().length > 5 && !list.find(b => b.locationId === legacyId)) {
            list.push({ id: legacyId.trim(), name: 'Marca principal', emoji: '⭐', locationId: legacyId.trim() });
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
        {brands.length > 0 && (
          <button onClick={() => setShowBulk(true)}
            className="bg-white text-pink-600 hover:bg-white/90 text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg shadow">
            <Send className="w-3.5 h-3.5" /> Publicar en varias
          </button>
        )}
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

      <BulkPostComposer isOpen={showBulk} onClose={() => setShowBulk(false)} />
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

// ── Gestor de marcas multi-cuenta (solo admin) ─────────────────
const BrandsManager: React.FC<{ brands: Brand[]; onChange: () => void }> = ({ brands: initial, onChange }) => {
  const [list, setList] = useState<Brand[]>(initial);
  const [saving, setSaving] = useState(false);

  // Locations distintas (para selector)
  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    list.forEach(b => set.add(b.locationId));
    return Array.from(set);
  }, [list]);

  // Estado de cuentas cargadas por location
  const [accountsByLoc, setAccountsByLoc] = useState<Record<string, GhlAccount[]>>({});
  const [loadingAccounts, setLoadingAccounts] = useState<Record<string, boolean>>({});

  // Borrador para añadir una marca nueva
  const [draft, setDraft] = useState<{ emoji: string; name: string; locationId: string; accountIds: Set<string> }>({
    emoji: '🏷️', name: '', locationId: distinctLocations[0] || '', accountIds: new Set(),
  });
  // Otra location nueva (para añadir desde 0)
  const [newLocationId, setNewLocationId] = useState('');

  const loadAccounts = async (locId: string) => {
    if (!locId || accountsByLoc[locId] || loadingAccounts[locId]) return;
    setLoadingAccounts(s => ({ ...s, [locId]: true }));
    const { ok, json } = await callGhlFn({ action: 'list-accounts', locationId: locId });
    setLoadingAccounts(s => ({ ...s, [locId]: false }));
    if (!ok) {
      alert(`Error al cargar cuentas: ${json?.error || 'desconocido'}`);
      return;
    }
    setAccountsByLoc(s => ({ ...s, [locId]: json.accounts || [] }));
  };

  // Carga cuentas automáticamente para la location seleccionada en el draft
  useEffect(() => {
    if (draft.locationId) loadAccounts(draft.locationId);
  }, [draft.locationId]);

  const persist = async (newList: Brand[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('site_config').upsert(
        { key: 'ghl_locations', value: { brands: newList }, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      setList(newList);
      onChange();
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addLocation = () => {
    const id = newLocationId.trim();
    if (id.length < 5) { alert('Location ID inválido'); return; }
    setDraft(d => ({ ...d, locationId: id }));
    setNewLocationId('');
    loadAccounts(id);
  };

  const addBrand = () => {
    if (!draft.name.trim()) { alert('Pon un nombre'); return; }
    if (!draft.locationId) { alert('Selecciona una location'); return; }
    const id = `brand-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const newBrand: Brand = {
      id,
      name: draft.name.trim(),
      emoji: draft.emoji || '🏷️',
      locationId: draft.locationId,
      accountIds: draft.accountIds.size > 0 ? Array.from(draft.accountIds) : undefined,
    };
    persist([...list, newBrand]);
    setDraft(d => ({ ...d, name: '', accountIds: new Set() }));
  };

  const removeBrand = (id: string) => {
    if (!confirm('¿Eliminar esta marca virtual?')) return;
    persist(list.filter(b => b.id !== id));
  };

  const toggleAccount = (acctId: string) => {
    setDraft(d => {
      const next = new Set(d.accountIds);
      if (next.has(acctId)) next.delete(acctId); else next.add(acctId);
      return { ...d, accountIds: next };
    });
  };

  const allAccountsForDraft = accountsByLoc[draft.locationId] || [];
  const isLoadingDraft = loadingAccounts[draft.locationId];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-pink-500" /> Marcas virtuales ({list.length})
        </h3>
        <p className="text-xs text-gray-500">
          Cada marca = un grupo de cuentas sociales conectadas en GHL. Puedes tener 20+ marcas en 1 Location.
        </p>
      </div>

      {/* Lista de marcas existentes */}
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map(b => {
            const accts = (accountsByLoc[b.locationId] || []).filter(a => !b.accountIds || b.accountIds.includes(a.id));
            return (
              <div key={b.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{b.emoji || '🏷️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{b.name}</p>
                    <p className="text-[10px] text-gray-400">
                      Location <span className="font-mono">{b.locationId.slice(0, 12)}…</span>
                      {b.accountIds ? ` · ${b.accountIds.length} cuenta(s)` : ' · TODAS las cuentas'}
                    </p>
                    {accts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {accts.slice(0, 6).map(a => (
                          <span key={a.id} className="text-[10px] bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded">
                            {PLATFORM_EMOJI[a.platform] || '🔗'} {a.name}
                          </span>
                        ))}
                        {accts.length > 6 && <span className="text-[10px] text-gray-400">+{accts.length - 6}</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeBrand(b.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form: añadir marca */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3 bg-pink-50/30 dark:bg-pink-900/5 -mx-4 px-4 pb-4 rounded-b-xl">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">➕ Añadir nueva marca virtual</p>

        {/* Step 1: Location */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">1. GHL Location</label>
          {distinctLocations.length > 0 ? (
            <div className="flex gap-2">
              <select value={draft.locationId} onChange={e => setDraft(d => ({ ...d, locationId: e.target.value, accountIds: new Set() }))}
                className="input-field flex-1 text-xs font-mono">
                <option value="">— elige una location —</option>
                {distinctLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          ) : null}
          <div className="flex gap-2 mt-2">
            <input value={newLocationId} onChange={e => setNewLocationId(e.target.value)}
              placeholder="O pega un Location ID nuevo" className="input-field flex-1 text-xs font-mono" />
            <button onClick={addLocation} className="btn-outline text-xs px-3">+ Añadir</button>
          </div>
        </div>

        {/* Step 2: Nombre + emoji */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">2. Identidad de la marca</label>
          <div className="grid grid-cols-6 gap-2">
            <input value={draft.emoji} onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))}
              maxLength={2} placeholder="🏷️" className="input-field col-span-1 text-center text-xl" />
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Ej: BailaNow Madrid" className="input-field col-span-5" />
          </div>
        </div>

        {/* Step 3: Cuentas */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
            3. Cuentas sociales (deja vacío para usar TODAS)
          </label>
          {isLoadingDraft ? (
            <div className="text-center py-3 text-gray-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Cargando cuentas de GHL...
            </div>
          ) : allAccountsForDraft.length === 0 ? (
            <div className="text-center py-3 text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/10 rounded">
              {draft.locationId
                ? 'Esta Location no tiene cuentas sociales conectadas. Conéctalas en GHL → Social Planner primero.'
                : 'Selecciona una Location arriba para ver las cuentas disponibles.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
              {allAccountsForDraft.map(a => {
                const sel = draft.accountIds.has(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                    className={`flex items-center gap-2 p-2 rounded border text-left text-xs transition-all ${sel ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <span className="text-lg">{PLATFORM_EMOJI[a.platform] || '🔗'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{a.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{a.platform}</p>
                    </div>
                    {sel && <Check className="w-4 h-4 text-pink-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          {draft.accountIds.size > 0 && (
            <p className="text-[10px] text-pink-500 font-bold mt-1">{draft.accountIds.size} cuenta(s) seleccionada(s)</p>
          )}
        </div>

        <button onClick={addBrand} disabled={saving || !draft.name || !draft.locationId}
          className="btn-orange w-full flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Crear marca virtual'}
        </button>
      </div>
    </div>
  );
};

export default SocialPage;
