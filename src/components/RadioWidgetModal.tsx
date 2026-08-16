import React, { useEffect, useRef, useState } from 'react';
import { X, Radio as RadioIcon, Play, Pause, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Station {
  id: string;
  name: string;
  genre: string;
  img: string;
  streamUrl: string;
}

function mapStation(s: any): Station {
  return {
    id: s.id,
    name: s.name || 'Emisora',
    genre: s.genre || '',
    img: s.img_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Radio')}&background=EC4899&color=fff&size=120&bold=true`,
    streamUrl: s.stream_url || '',
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const RadioWidgetModal: React.FC<Props> = ({ open, onClose }) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabase.from('radio_stations').select('id,name,genre,stream_url,img_url,status').eq('status', 'active').order('sort_order')
      .then(({ data }) => {
        if (cancelled) return;
        setStations((data || []).map(mapStation));
        setLoading(false);
      }, () => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const playing = stations.find(s => s.id === playingId) || null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing?.streamUrl) {
      if (a.src !== playing.streamUrl) a.src = playing.streamUrl;
      setStatus('loading');
      a.play().then(() => setStatus('idle')).catch(() => setStatus('error'));
    } else {
      a.pause();
    }
  }, [playing]);

  // Al cerrar el modal, detiene la reproducción.
  useEffect(() => { if (!open) setPlayingId(null); }, [open]);

  if (!open) return null;

  const toggle = (s: Station) => {
    if (!s.streamUrl) { setStatus('error'); return; }
    setPlayingId(prev => prev === s.id ? null : s.id);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <RadioIcon className="w-5 h-5 text-brand-orange" /> Radio Online
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400"><Loader2 className="w-7 h-7 mx-auto mb-2 animate-spin" /><p className="text-sm">Cargando emisoras…</p></div>
        ) : stations.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <RadioIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aún no hay emisoras publicadas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stations.map(s => {
              const isPlaying = playingId === s.id;
              return (
                <button key={s.id} onClick={() => toggle(s)}
                  className={`group text-left rounded-2xl overflow-hidden border transition-all ${
                    isPlaying ? 'border-brand-orange shadow-lg shadow-pink-500/10' : 'border-gray-100 dark:border-gray-800 hover:border-pink-300'
                  }`}>
                  <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <span className="w-9 h-9 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg">
                        {isPlaying && status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </span>
                    </div>
                    {isPlaying && (
                      <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> Live
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-black text-gray-900 dark:text-white text-xs truncate">{s.name}</p>
                    <p className="text-gray-400 text-[10px] truncate">{s.genre}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <audio ref={audioRef} className="hidden" preload="none" />

        {playing && (
          <div className="mt-4 bg-gray-900 rounded-2xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
              <img src={playing.img} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xs truncate">{playing.name}</p>
              <p className="text-white/50 text-[10px] flex items-center gap-1">
                {status === 'loading' ? 'conectando…' : status === 'error' ? <span className="text-red-400">emisora no disponible</span> : <><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> En directo</>}
              </p>
            </div>
            <button onClick={() => setPlayingId(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center flex-shrink-0">
              <Pause className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RadioWidgetModal;
