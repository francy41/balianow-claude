import React, { useState } from 'react';
import { X, Video, Image as ImageIcon, Loader2, Radio, GraduationCap, Calendar, Music, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo } from '../lib/uploadHelper';
import { useUIStore } from '../store/appStore';
import { resolveCityCoords } from '../lib/geo';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'show' | 'class' | 'event' | 'jam' | 'workshop';
}

type PricingMode = 'free' | 'paid' | 'reservation' | 'donation';

const CATEGORIES: { v: 'show'|'class'|'event'|'jam'|'workshop'; label: string; icon: React.ReactNode }[] = [
  { v: 'show',     label: 'Show',     icon: <Radio className="w-4 h-4" /> },
  { v: 'class',    label: 'Clase',    icon: <GraduationCap className="w-4 h-4" /> },
  { v: 'event',    label: 'Evento',   icon: <Calendar className="w-4 h-4" /> },
  { v: 'jam',      label: 'Jam',      icon: <Music className="w-4 h-4" /> },
  { v: 'workshop', label: 'Workshop', icon: <Sparkles className="w-4 h-4" /> },
];

const PRICING: { v: PricingMode; label: string; emoji: string; hint: string }[] = [
  { v: 'free',        label: 'Gratis',      emoji: '🆓', hint: 'Cualquiera puede entrar' },
  { v: 'paid',        label: 'Pago único',  emoji: '💰', hint: 'Cobras una entrada' },
  { v: 'reservation', label: 'Con reserva', emoji: '📅', hint: 'Aforo limitado + pago' },
  { v: 'donation',    label: 'Donación',    emoji: '💝', hint: 'Voluntario, propinas' },
];

const STYLES_OPTIONS = [
  'Salsa', 'Salsa Cubana', 'Salsa Colombiana (Caleña)',
  'Bachata', 'Bachata Dominicana', 'Bachata Moderna', 'Bachata Sensual', 'Bachata Urbana',
  'Kizomba', 'Mambo', 'Cha-cha-chá', 'Cumbia', 'Reparto Cubano',
  'Reggaetón', 'Zouk', 'Merengue', 'Son', 'Rueda',
];

const GoLiveModal: React.FC<Props> = ({ isOpen, onClose, defaultCategory = 'show' }) => {
  const navigate = useNavigate();
  const addToast = useUIStore(s => s.addToast);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'show'|'class'|'event'|'jam'|'workshop'>(defaultCategory);
  const [pricingMode, setPricingMode] = useState<PricingMode>('free');
  const [price, setPrice] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [startNow, setStartNow] = useState(true);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setTitle(''); setDescription(''); setPricingMode('free'); setPrice('');
    setCoverUrl(''); setPreviewUrl(''); setStyles([]); setCity('');
    setScheduleAt(''); setStartNow(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingCover(true);
    const { url, error } = await uploadImage(f, 'live-covers');
    setUploadingCover(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error al subir portada' }); return; }
    setCoverUrl(url);
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) { addToast({ type: 'error', message: 'El clip de preview debe ser ≤50MB' }); return; }
    setUploadingPreview(true);
    const { url, error } = await uploadVideo(f, 'live-previews');
    setUploadingPreview(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error al subir clip' }); return; }
    setPreviewUrl(url);
  };

  const toggleStyle = (s: string) => {
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { addToast({ type: 'error', message: 'Pon un título' }); return; }
    if ((pricingMode === 'paid' || pricingMode === 'reservation') && (!price || parseFloat(price) <= 0)) {
      addToast({ type: 'error', message: 'Pon un precio válido' }); return;
    }

    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId) { addToast({ type: 'error', message: 'Debes iniciar sesión' }); setSubmitting(false); return; }

      const coords = resolveCityCoords(city);
      const room = `bn-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();

      const payload: Record<string, any> = {
        host_id:      userId,
        title:        title.trim(),
        description:  description.trim() || null,
        category,
        pricing_mode: pricingMode,
        price:        (pricingMode === 'paid' || pricingMode === 'reservation') ? parseFloat(price) : 0,
        currency:     'EUR',
        cover_url:    coverUrl || null,
        preview_url:  previewUrl || null,
        jitsi_room:   room,
        status:       startNow ? 'live' : 'scheduled',
        scheduled_at: startNow ? null : (scheduleAt || null),
        started_at:   startNow ? now : null,
        styles,
        city:         city || null,
        lat:          coords?.lat ?? null,
        lng:          coords?.lng ?? null,
      };

      // Insert con retry: si falla por columna inexistente la quitamos
      let lastErr: any = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data, error } = await supabase.from('live_sessions').insert(payload).select().single();
        if (!error) {
          addToast({ type: 'success', message: startNow ? '¡Estás en vivo!' : 'Live programado' });
          reset(); onClose();
          if (startNow) navigate(`/live/session/${data.id}`);
          setSubmitting(false);
          return;
        }
        lastErr = error;
        const m = /column "?([a-z_]+)"? of relation .* does not exist/i.exec(error.message || '');
        if (m && payload[m[1]] !== undefined) {
          delete payload[m[1]];
          continue;
        }
        break;
      }
      addToast({ type: 'error', message: `No se pudo crear el live: ${lastErr?.message || 'Error'}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0f0f1e] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-brand-orange text-white px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 animate-pulse" />
            <h2 className="font-bold text-lg">Iniciar Live</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Tipo</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.v} onClick={() => setCategory(c.v)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition ${category === c.v ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {c.icon}<span className="text-[11px] font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Modo de cobro</label>
            <div className="grid grid-cols-2 gap-2">
              {PRICING.map(p => (
                <button key={p.v} onClick={() => setPricingMode(p.v)}
                  className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition ${pricingMode === p.v ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
                  <span className="text-xl">{p.emoji}</span>
                  <div>
                    <div className="font-bold text-sm text-gray-800 dark:text-gray-100">{p.label}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{p.hint}</div>
                  </div>
                </button>
              ))}
            </div>
            {(pricingMode === 'paid' || pricingMode === 'reservation') && (
              <div className="mt-2">
                <input type="number" min="1" step="0.5" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="Precio en €" className="input-field" />
              </div>
            )}
          </div>

          {/* Título + descripción */}
          <div className="space-y-3">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Título del live" className="input-field" />
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descripción (opcional)" rows={3} className="input-field resize-none" />
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="Ciudad (ej. Madrid)" className="input-field" />
          </div>

          {/* Cover */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Portada</label>
            <div className="flex items-center gap-3">
              {coverUrl
                ? <img src={coverUrl} className="w-20 h-20 rounded-xl object-cover" alt="cover" />
                : <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400" /></div>}
              <label className="cursor-pointer btn-outline text-sm">
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subir imagen'}
                <input type="file" accept="image/*" hidden onChange={handleCoverUpload} />
              </label>
            </div>
          </div>

          {/* Preview 60s */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Preview de 60s (vídeo, opcional)</label>
            <div className="flex items-center gap-3">
              {previewUrl
                ? <video src={previewUrl} className="w-32 h-20 rounded-xl object-cover bg-black" muted />
                : <div className="w-32 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Video className="w-6 h-6 text-gray-400" /></div>}
              <label className="cursor-pointer btn-outline text-sm">
                {uploadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subir clip'}
                <input type="file" accept="video/*" hidden onChange={handlePreviewUpload} />
              </label>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Los usuarios verán este clip antes de entrar.</p>
          </div>

          {/* Estilos */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Estilos</label>
            <div className="flex flex-wrap gap-2">
              {STYLES_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleStyle(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${styles.includes(s) ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>{s}</button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div>
              <div className="font-bold text-sm text-gray-800 dark:text-gray-200">Iniciar ahora</div>
              <div className="text-[11px] text-gray-500">Si lo desactivas, programa una hora</div>
            </div>
            <button onClick={() => setStartNow(s => !s)} className={`w-12 h-7 rounded-full transition ${startNow ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'} relative`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${startNow ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {!startNow && (
            <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="input-field" />
          )}
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-white dark:bg-[#0f0f1e] border-t border-gray-100 dark:border-gray-800 p-4">
          <button onClick={handleSubmit} disabled={submitting} className="btn-orange w-full flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
            {submitting ? 'Creando...' : (startNow ? 'EMPEZAR LIVE' : 'PROGRAMAR LIVE')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoLiveModal;
