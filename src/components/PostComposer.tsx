import React, { useEffect, useRef, useState } from 'react';
import { X, ImagePlus, Loader2, MapPin, Store, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { uploadFile } from '../lib/uploadHelper';
import { publicar, type MediaItem } from '../lib/feed';

// ── Crear publicación ───────────────────────────────────────────────────────
// Las fotos se suben SEGÚN SE ELIGEN, no al pulsar "Publicar". Así la espera
// ocurre mientras la persona escribe el texto, y al publicar es instantáneo.

const MAX_FOTOS = 10;
const MAX_MB_FOTO = 10;
const MAX_MB_VIDEO = 100;

type EnCurso = { id: string; preview: string; subiendo: boolean; media?: MediaItem; error?: boolean };

type MiLocal = { id: string; name: string };

const PostComposer: React.FC<{ onClose: () => void; onPublicado: () => void }> = ({ onClose, onPublicado }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [items, setItems] = useState<EnCurso[]>([]);
  const [texto, setTexto] = useState('');
  const [lugar, setLugar] = useState('');
  const [misLocales, setMisLocales] = useState<MiLocal[]>([]);
  const [localId, setLocalId] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Si gestionas locales, puedes publicar en su nombre. Si no, ni se enseña.
  useEffect(() => {
    if (!user) return;
    supabase.from('venues').select('id, name').eq('user_id', user.id).is('deleted_at', null)
      .then(({ data }) => setMisLocales((data as MiLocal[]) ?? []), () => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Las vistas previas son URLs de objeto: hay que soltarlas o se queda
  // memoria retenida cada vez que se abre el compositor.
  useEffect(() => () => { items.forEach(i => URL.revokeObjectURL(i.preview)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = async (files: FileList | null) => {
    if (!files || !user) return;
    const hueco = MAX_FOTOS - items.length;
    if (hueco <= 0) { addToast({ message: `Máximo ${MAX_FOTOS} archivos`, type: 'warning' }); return; }

    const lote = Array.from(files).slice(0, hueco);
    const nuevos: EnCurso[] = lote.map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      preview: URL.createObjectURL(f),
      subiendo: true,
    }));
    setItems(prev => [...prev, ...nuevos]);

    await Promise.all(lote.map(async (file, i) => {
      const esVideo = file.type.startsWith('video/');
      const r = await uploadFile(file, {
        bucket: 'media',
        folder: `posts/${user.id}`,
        maxSizeMB: esVideo ? MAX_MB_VIDEO : MAX_MB_FOTO,
        allowedTypes: ['image/*', 'video/*'],
        // Una publicación con la foto incrustada en base64 pesaría megas en
        // cada carga del feed. Mejor fallar y decirlo.
        base64Fallback: false,
      });
      setItems(prev => prev.map(x => x.id !== nuevos[i].id ? x : (
        r.url
          ? { ...x, subiendo: false, media: { url: r.url, kind: esVideo ? 'video' : 'image' } }
          : { ...x, subiendo: false, error: true }
      )));
      if (!r.url) addToast({ message: r.error || `No se pudo subir ${file.name}`, type: 'error' });
    }));
  };

  const quitar = (id: string) => {
    setItems(prev => {
      const x = prev.find(i => i.id === id);
      if (x) URL.revokeObjectURL(x.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const subiendo = items.some(i => i.subiendo);
  const listos = items.filter(i => i.media).map(i => i.media!) as MediaItem[];
  const puedePublicar = !enviando && !subiendo && (listos.length > 0 || texto.trim().length > 0);

  const enviar = async () => {
    if (!user || !puedePublicar) return;
    setEnviando(true);
    try {
      await publicar({
        miId: user.id,
        media: listos,
        texto,
        lugar,
        localId: localId || null,
      });
      addToast({ message: '¡Publicado!', type: 'success' });
      onPublicado();
    } catch (e) {
      addToast({
        message: (e as any)?.code === '42501'
          ? 'No tienes permiso para publicar. ¿Tu cuenta está suspendida?'
          : 'No se pudo publicar. Inténtalo de nuevo.',
        type: 'error',
      });
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}>
      <div className="card-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-elevated border-b border-hairline/10 px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="text-sm font-bold text-ink-tertiary">Cancelar</button>
          <h3 className="font-display font-black text-base text-ink-primary">Nueva publicación</h3>
          <button onClick={enviar} disabled={!puedePublicar}
            className="text-sm font-black text-brand-orange disabled:opacity-40">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar'}
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Fotos y vídeos */}
          <div className="grid grid-cols-3 gap-2">
            {items.map(i => (
              <div key={i.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface-elevated-2">
                <img src={i.preview} alt="" className="w-full h-full object-cover" />
                {i.subiendo && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
                {i.error && (
                  <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black text-center px-1">No se pudo subir</span>
                  </div>
                )}
                <button onClick={() => quitar(i.id)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {items.length < MAX_FOTOS && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-hairline/40 flex flex-col items-center justify-center gap-1 text-ink-tertiary hover:border-brand-orange hover:text-brand-orange transition-colors">
                <ImagePlus className="w-6 h-6" />
                <span className="text-[10px] font-bold">Añadir</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
            onChange={e => { elegir(e.target.files); e.target.value = ''; }} />
          <p className="text-[11px] text-ink-tertiary">
            Hasta {MAX_FOTOS} archivos · fotos {MAX_MB_FOTO} MB · vídeos {MAX_MB_VIDEO} MB
          </p>

          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4} maxLength={2200}
            placeholder="Cuenta algo… ¿qué se bailó anoche?"
            className="input-field resize-none" />

          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input value={lugar} onChange={e => setLugar(e.target.value)} maxLength={80}
              placeholder="Lugar (ej: Madrid)" className="input-field pl-9" />
          </div>

          {misLocales.length > 0 && (
            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <Store className="w-3.5 h-3.5" /> Publicar como
              </label>
              <select value={localId} onChange={e => setLocalId(e.target.value)} className="input-field">
                <option value="">Yo mismo/a</option>
                {misLocales.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
