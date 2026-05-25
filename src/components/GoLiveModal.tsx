/**
 * GoLiveModal — Crea una nueva sesión en vivo
 *
 * El usuario elige:
 *  - Título + descripción + categoría (show/class/event/jam/workshop)
 *  - Modo de monetización: free / paid / reservation / donation
 *  - Precio (€) si aplica
 *  - Cover image (foto del live)
 *  - Preview clip de 60s (vídeo corto que ven los espectadores antes de entrar)
 *  - Iniciar ahora o programar para más tarde
 *
 * Al guardar inserta en `live_sessions` y navega a /live/session/:id
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Video, Camera, Upload, DollarSign, Calendar, Users, Music, Loader2,
  Radio, Heart, CheckCircle, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo } from '../lib/uploadHelper';
import { useAuthStore, useUIStore } from '../store/appStore';
import { resolveCityCoords } from '../lib/geo';
import { Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill category (cuando se abre desde "Clases" vs "Eventos" vs "Live Now") */
  initialCategory?: 'show' | 'class' | 'event' | 'jam' | 'workshop';
}

type PricingMode = 'free' | 'paid' | 'reservation' | 'donation';

const CATEGORIES: { value: 'show' | 'class' | 'event' | 'jam' | 'workshop'; label: string; emoji: string; description: string }[] = [
  { value: 'show',     label: 'Show / Performance', emoji: '🎤', description: 'Concierto, DJ set, actuación' },
  { value: 'class',    label: 'Clase online',       emoji: '🎓', description: 'Clase con cupo y reserva' },
  { value: 'event',    label: 'Evento en vivo',     emoji: '🎉', description: 'Fiesta, congreso, festival' },
  { value: 'jam',      label: 'Jam / Social',       emoji: '💃', description: 'Encuentro libre con la comunidad' },
  { value: 'workshop', label: 'Workshop',           emoji: '🎯', description: 'Taller intensivo de pago' },
];

const PRICING_MODES: { value: PricingMode; label: string; icon: React.ReactNode; description: string; color: string }[] = [
  { value: 'free',        label: 'Gratis',       icon: <Heart className="w-4 h-4" />,       description: 'Acceso libre para todos',                       color: 'from-green-500 to-emerald-600' },
  { value: 'paid',        label: 'Pago único',   icon: <DollarSign className="w-4 h-4" />,  description: 'Cobro a la entrada (entrada de pago)',           color: 'from-pink-500 to-fuchsia-600' },
  { value: 'reservation', label: 'Con reserva',  icon: <Calendar className="w-4 h-4" />,    description: 'Plazas limitadas — clase / workshop programado', color: 'from-blue-500 to-indigo-600' },
  { value: 'donation',    label: 'Donación',     icon: <Heart className="w-4 h-4" />,       description: 'Entrada libre + propinas voluntarias',           color: 'from-orange-500 to-rose-500' },
];

const STYLES_LIST = ['Bachata', 'Salsa', 'Kizomba', 'Reggaeton', 'Merengue', 'Cumbia', 'Latin Mix', 'Tango', 'Mambo'];

const GoLiveModal: React.FC<Props> = ({ open, onClose, initialCategory = 'show' }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [pricingMode, setPricingMode] = useState<PricingMode>('free');
  const [price, setPrice] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [styles, setStyles] = useState<string[]>([]);
  const [city, setCity] = useState(user?.city || '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  const coverRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleCoverPick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { addToast({ message: 'Imagen >10MB', type: 'error' }); return; }
    setUploadingCover(true);
    const { url } = await uploadImage(file, `live-covers/${user?.id || 'anon'}`);
    setUploadingCover(false);
    if (url) { setCoverUrl(url); addToast({ message: '✅ Portada subida', type: 'success' }); }
    else addToast({ message: 'Error subiendo portada', type: 'error' });
  };

  const handlePreviewPick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { addToast({ message: 'Vídeo >50MB. Comprime o usa una URL.', type: 'error' }); return; }
    setUploadingPreview(true);
    const { url } = await uploadVideo(file, `live-previews/${user?.id || 'anon'}`);
    setUploadingPreview(false);
    if (url) { setPreviewUrl(url); addToast({ message: '✅ Preview subido (60s aprox)', type: 'success' }); }
    else addToast({ message: 'Error subiendo preview', type: 'error' });
  };

  const toggleStyle = (s: string) => setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleGoLive = async () => {
    if (!user) { addToast({ message: 'Debes iniciar sesión', type: 'error' }); return; }
    if (!title.trim()) { addToast({ message: 'Falta el título', type: 'error' }); return; }
    if (pricingMode === 'paid' && (!price || parseFloat(price) <= 0)) {
      addToast({ message: 'Especifica un precio mayor que 0', type: 'error' });
      return;
    }
    if (!startNow && !scheduledAt) {
      addToast({ message: 'Indica fecha y hora o "Empezar ahora"', type: 'error' });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addToast({ message: 'Sesión expirada', type: 'error' });
        setCreating(false);
        return;
      }

      const jitsiRoom = `BailaNow-${crypto.randomUUID().slice(0, 12)}`;
      const coords = resolveCityCoords(city);
      const payload: any = {
        host_id:      session.user.id,
        title:        title.trim(),
        description:  description.trim(),
        category,
        pricing_mode: pricingMode,
        price:        pricingMode === 'paid' || pricingMode === 'reservation' ? parseFloat(price) || 0 : 0,
        currency:     'EUR',
        cover_url:    coverUrl,
        preview_url:  previewUrl,
        jitsi_room:   jitsiRoom,
        status:       startNow ? 'live' : 'scheduled',
        scheduled_at: startNow ? new Date().toISOString() : new Date(scheduledAt).toISOString(),
        started_at:   startNow ? new Date().toISOString() : null,
        styles,
        city:         city.trim(),
        ...(coords ? { lat: coords[0], lng: coords[1] } : {}),
      };

      const { data, error } = await supabase
        .from('live_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      addToast({
        message: startNow ? '🔴 ¡Estás en vivo!' : '✅ Live programado correctamente',
        type: 'success',
      });

      onClose();
      if (data?.id) navigate(`/live/session/${data.id}`);
    } catch (e: any) {
      console.error('[GoLive] insert error:', e);
      addToast({ message: `Error: ${e.message || 'no se pudo crear'}`, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-fuchsia-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/80">Emitir en directo</p>
              <h2 className="font-display font-black text-lg leading-tight">Crear sesión live</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1 space-y-5">

          {/* Categoría */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Tipo de sesión</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={`text-center p-3 rounded-xl border-2 transition-all ${
                    category === c.value
                      ? 'border-brand-orange bg-pink-50 dark:bg-pink-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-orange/50'
                  }`}>
                  <div className="text-xl mb-1">{c.emoji}</div>
                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight">{c.label}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{CATEGORIES.find(c => c.value === category)?.description}</p>
          </section>

          {/* Título + descripción */}
          <section className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Título *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
                placeholder="Ej. Clase de Bachata Sensual nivel 2"
                className="input-field" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={300}
                placeholder="¿Qué va a pasar en tu live? ¿Qué van a aprender / disfrutar?"
                className="input-field" />
            </div>
          </section>

          {/* Modo de monetización */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">¿Cómo cobras?</p>
            <div className="grid grid-cols-2 gap-2">
              {PRICING_MODES.map(m => (
                <button key={m.value} type="button" onClick={() => setPricingMode(m.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    pricingMode === m.value
                      ? 'border-brand-orange bg-pink-50 dark:bg-pink-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-orange/50'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} text-white flex items-center justify-center flex-shrink-0`}>
                      {m.icon}
                    </div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">{m.label}</p>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight">{m.description}</p>
                </button>
              ))}
            </div>

            {(pricingMode === 'paid' || pricingMode === 'reservation') && (
              <div className="mt-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <input
                  type="number" step="0.5" min="0"
                  value={price} onChange={e => setPrice(e.target.value)}
                  placeholder={pricingMode === 'paid' ? 'Entrada (€)' : 'Plaza (€)'}
                  className="input-field flex-1"
                />
                <span className="text-xs text-gray-400 font-bold">EUR</span>
              </div>
            )}

            {pricingMode === 'donation' && (
              <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 dark:text-orange-300">
                💝 Los espectadores entrarán gratis y podrán enviar propinas durante el live. Recibirás el 90% (10% comisión plataforma).
              </div>
            )}
          </section>

          {/* Cover + Preview */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Portada (imagen)</p>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2">
                {uploadingCover ? (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>
                ) : coverUrl ? (
                  <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera className="w-8 h-8" /></div>
                )}
              </div>
              <button onClick={() => coverRef.current?.click()} disabled={uploadingCover}
                className="bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 w-full justify-center">
                {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploadingCover ? 'Subiendo…' : (coverUrl ? 'Cambiar portada' : 'Subir portada')}
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleCoverPick(e.target.files?.[0])} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                Preview 60s <span className="text-[9px] font-normal text-gray-400">(vídeo corto)</span>
              </p>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2 relative">
                {uploadingPreview ? (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>
                ) : previewUrl ? (
                  <>
                    <video src={previewUrl} controls muted className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">PREVIEW</div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <Video className="w-8 h-8 mb-1" />
                    <p className="text-[9px] text-gray-400">Sin preview</p>
                  </div>
                )}
              </div>
              <button onClick={() => previewRef.current?.click()} disabled={uploadingPreview}
                className="bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 w-full justify-center">
                {uploadingPreview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                {uploadingPreview ? 'Subiendo…' : (previewUrl ? 'Cambiar preview' : 'Subir clip 60s')}
              </button>
              <input ref={previewRef} type="file" accept="video/*" className="hidden" onChange={e => handlePreviewPick(e.target.files?.[0])} />
              <p className="text-[9px] text-gray-400 mt-1">Recomendado: mp4 / webm, máx 50MB, 60 segundos. Los espectadores verán este avance antes de entrar.</p>
            </div>
          </section>

          {/* Estilos + ciudad */}
          <section className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Estilos</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLES_LIST.map(s => {
                  const active = styles.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleStyle(s)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                        active ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                      {active && '✓ '}{s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1 block">Ciudad (para "Cerca de mí")</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="Madrid"
                className="input-field" />
            </div>
          </section>

          {/* Programación */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">¿Cuándo?</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setStartNow(true)}
                className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  startNow ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 font-black' : 'border-gray-200 text-gray-500'
                }`}>
                <Radio className="w-4 h-4" /> Empezar AHORA
              </button>
              <button onClick={() => setStartNow(false)}
                className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  !startNow ? 'border-brand-orange bg-pink-50 text-brand-orange font-black' : 'border-gray-200 text-gray-500'
                }`}>
                <Clock className="w-4 h-4" /> Programar
              </button>
            </div>
            {!startNow && (
              <input type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="input-field" />
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-2 flex-shrink-0">
          <p className="text-[10px] text-gray-500 hidden sm:block">
            {pricingMode === 'free' ? '🆓 Acceso libre' :
             pricingMode === 'paid' ? `💰 Entrada €${price || '0'}` :
             pricingMode === 'reservation' ? `📅 Reserva €${price || '0'}` :
             '💝 Donaciones'}
          </p>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-bold px-4 py-2">Cancelar</button>
            <Button
              variant="orange"
              icon={creating ? <Loader2 className="w-4 h-4 animate-spin" /> : (startNow ? <Radio className="w-4 h-4" /> : <Calendar className="w-4 h-4" />)}
              onClick={handleGoLive}
              loading={creating}
            >
              {creating ? 'Creando…' : (startNow ? 'EMITIR YA' : 'Programar')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoLiveModal;
