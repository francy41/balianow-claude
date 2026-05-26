/**
 * BulkPostComposer — Compone una publicación y la envía a múltiples marcas a la vez
 *
 * Llama a la Edge Function `ghl-bulk-post` (server-side, con token de GHL secreto).
 * Soporta:
 *  - Texto
 *  - Múltiples imágenes/videos (subidos vía uploadHelper)
 *  - Selector múltiple de marcas (sub-cuentas de GHL)
 *  - Filtro por plataformas (FB, IG, TikTok, YT...)
 *  - Programación de fecha
 *  - Resumen por marca: ✅ éxito, ❌ error + razón
 */
import React, { useEffect, useState } from 'react';
import { Send, Image as ImageIcon, Video, X, Loader2, CheckCircle, AlertCircle, Calendar, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/uploadHelper';
import { useUIStore } from '../store/appStore';

interface Brand { id: string; name: string; emoji?: string; }
interface PostResult { brandId: string; success: boolean; postId?: string; accountsUsed?: number; error?: string; }

const PLATFORMS = [
  { v: 'facebook',  label: 'Facebook',  emoji: '📘' },
  { v: 'instagram', label: 'Instagram', emoji: '📷' },
  { v: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { v: 'youtube',   label: 'YouTube',   emoji: '🎥' },
  { v: 'linkedin',  label: 'LinkedIn',  emoji: '💼' },
  { v: 'twitter',   label: 'X/Twitter', emoji: '𝕏' },
  { v: 'google',    label: 'Google MB', emoji: '📍' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BulkPostComposer: React.FC<Props> = ({ isOpen, onClose }) => {
  const addToast = useUIStore(s => s.addToast);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [scheduleAt, setScheduleAt] = useState('');
  const [schedule, setSchedule] = useState(false);

  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<PostResult[] | null>(null);

  // Cargar marcas configuradas
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data } = await supabase.from('site_config').select('value').eq('key', 'ghl_locations').maybeSingle();
      const list = (data?.value?.brands || []) as Brand[];
      setBrands(list);
      // Por defecto: ninguna seleccionada (el user elige explícitamente)
      setSelectedBrands(new Set());
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const f of files) {
      const { url, error } = await uploadFile(f, {
        bucket: 'covers', folder: 'bulk-posts', maxSizeMB: 50,
        allowedTypes: ['image/*', 'video/*'], base64Fallback: false,
      });
      if (error) { addToast({ type: 'error', message: `${f.name}: ${error}` }); continue; }
      if (url) newUrls.push(url);
    }
    setMediaUrls(u => [...u, ...newUrls]);
    setUploading(false);
  };

  const removeMedia = (idx: number) => setMediaUrls(u => u.filter((_, i) => i !== idx));

  const toggleBrand = (id: string) => {
    setSelectedBrands(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllBrands = () => setSelectedBrands(new Set(brands.map(b => b.id)));
  const clearBrands = () => setSelectedBrands(new Set());

  const togglePlatform = (v: string) => {
    setSelectedPlatforms(s => {
      const next = new Set(s);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  };

  const submit = async () => {
    if (!text.trim() && mediaUrls.length === 0) {
      addToast({ type: 'error', message: 'Añade texto o al menos 1 imagen/video' }); return;
    }
    if (selectedBrands.size === 0) {
      addToast({ type: 'error', message: 'Selecciona al menos 1 marca' }); return;
    }
    if (schedule && !scheduleAt) {
      addToast({ type: 'error', message: 'Pon una fecha para programar' }); return;
    }

    setPosting(true);
    setResults(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || anonKey;

      const res = await fetch(`${supabaseUrl}/functions/v1/ghl-bulk-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          text: text.trim(),
          mediaUrls,
          brandIds: Array.from(selectedBrands),
          platforms: selectedPlatforms.size > 0 ? Array.from(selectedPlatforms) : undefined,
          scheduleDate: schedule ? new Date(scheduleAt).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        addToast({ type: 'error', message: json?.error || `Error ${res.status}` });
        if (json?.hint) addToast({ type: 'info', message: json.hint });
        setPosting(false);
        return;
      }

      setResults(json.results as PostResult[]);
      const { success, failed, total } = json.summary;
      addToast({
        type: failed === 0 ? 'success' : 'warning',
        message: `Publicado en ${success}/${total} marcas${failed > 0 ? ` · ${failed} fallaron` : ''}`,
      });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || 'Error al publicar' });
    } finally {
      setPosting(false);
    }
  };

  const reset = () => {
    setText(''); setMediaUrls([]); setResults(null);
    setSelectedBrands(new Set()); setSelectedPlatforms(new Set());
    setSchedule(false); setScheduleAt('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0f0f1e] w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-bold text-lg">Publicar en varias marcas</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {results ? (
          /* ── RESULTADOS ── */
          <div className="p-5 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Resultados</h3>
            {results.map(r => {
              const brand = brands.find(b => b.id === r.brandId);
              return (
                <div key={r.brandId} className={`flex items-start gap-3 p-3 rounded-xl border ${r.success ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'}`}>
                  {r.success
                    ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{brand?.emoji} {brand?.name || r.brandId}</p>
                    {r.success ? (
                      <p className="text-xs text-green-700 dark:text-green-300">
                        ✓ Publicado en {r.accountsUsed} cuenta{r.accountsUsed === 1 ? '' : 's'}
                        {r.postId && <span className="text-gray-500"> · {r.postId.slice(0, 12)}</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-red-700 dark:text-red-300 break-words">{r.error}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <button onClick={reset} className="btn-outline flex-1">Otra publicación</button>
              <button onClick={onClose} className="btn-orange flex-1">Cerrar</button>
            </div>
          </div>
        ) : (
          /* ── FORM ── */
          <div className="p-5 space-y-5">
            {/* Texto */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Texto de la publicación</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
                placeholder="Escribe tu post... usa #hashtags si quieres"
                className="input-field resize-none" />
              <p className="text-[10px] text-gray-400 mt-1">{text.length} caracteres</p>
            </div>

            {/* Media */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Imágenes / Vídeos</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                    {url.match(/\.(mp4|mov|webm)/i)
                      ? <video src={url} className="w-full h-full object-cover" muted />
                      : <img src={url} className="w-full h-full object-cover" alt="" />}
                    <button onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-all">
                  {uploading
                    ? <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                    : <><ImageIcon className="w-5 h-5 text-gray-400" /><span className="text-[10px] text-gray-500 mt-1">Subir</span></>}
                  <input type="file" multiple accept="image/*,video/*" hidden onChange={handleMediaUpload} />
                </label>
              </div>
            </div>

            {/* Marcas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Marcas ({selectedBrands.size}/{brands.length})</label>
                <div className="flex gap-1 text-[10px]">
                  <button onClick={selectAllBrands} className="text-pink-500 font-bold hover:underline">Todas</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={clearBrands} className="text-gray-500 hover:underline">Ninguna</button>
                </div>
              </div>
              {brands.length === 0 ? (
                <p className="text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg">
                  No tienes marcas configuradas. Ve a <a href="/admin/integraciones" className="font-bold underline">/admin/integraciones</a> primero.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {brands.map(b => {
                    const sel = selectedBrands.has(b.id);
                    return (
                      <button key={b.id} onClick={() => toggleBrand(b.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 text-left text-sm transition-all ${sel ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <span className="text-xl">{b.emoji || '🏷️'}</span>
                        <span className="font-bold text-xs truncate flex-1">{b.name}</span>
                        {sel && <CheckCircle className="w-4 h-4 text-pink-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Plataformas */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                Plataformas {selectedPlatforms.size === 0 && <span className="font-normal text-gray-400">· (vacío = todas las conectadas)</span>}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => {
                  const sel = selectedPlatforms.has(p.v);
                  return (
                    <button key={p.v} onClick={() => togglePlatform(p.v)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${sel ? 'border-pink-500 bg-pink-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      <span>{p.emoji}</span>{p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                <div>
                  <div className="font-bold text-sm text-gray-800 dark:text-gray-200">Programar publicación</div>
                  <div className="text-[11px] text-gray-500">Si desactivado, se publica al instante</div>
                </div>
              </div>
              <button onClick={() => setSchedule(s => !s)} className={`w-12 h-7 rounded-full transition ${schedule ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'} relative flex-shrink-0`}>
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${schedule ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {schedule && (
              <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="input-field" />
            )}
          </div>
        )}

        {/* Submit */}
        {!results && (
          <div className="sticky bottom-0 bg-white dark:bg-[#0f0f1e] border-t border-gray-100 dark:border-gray-800 p-4">
            <button onClick={submit} disabled={posting || brands.length === 0}
              className="btn-orange w-full flex items-center justify-center gap-2">
              {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {posting
                ? `Publicando en ${selectedBrands.size} marca${selectedBrands.size === 1 ? '' : 's'}...`
                : `Publicar en ${selectedBrands.size} marca${selectedBrands.size === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkPostComposer;
