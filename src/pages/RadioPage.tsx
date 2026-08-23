import React, { useEffect, useRef, useState } from 'react';
import { Radio as RadioIcon, Play, Pause, Loader2 } from 'lucide-react';
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

const RadioPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('radio_stations').select('id,name,genre,stream_url,img_url,status').eq('status', 'active').order('sort_order')
      .then(({ data }) => {
        if (cancelled) return;
        setStations((data || []).map(mapStation));
        setLoading(false);
      }, () => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

  const toggle = (s: Station) => {
    if (!s.streamUrl) { setStatus('error'); return; }
    setPlayingId(prev => prev === s.id ? null : s.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-fuchsia-950 to-black p-6 sm:p-8 text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-pink-300">
              <RadioIcon className="w-3.5 h-3.5" /> Radio Online
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl mt-1.5 leading-tight">La radio latina, 24/7</h1>
            <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-xl">Bachata, salsa, reggaetón y más — elige una emisora y dale play</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400"><Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" /><p>Cargando emisoras…</p></div>
        ) : stations.length === 0 ? (
          <div className="card-white p-10 text-center text-gray-400 rounded-2xl">
            <RadioIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Aún no hay emisoras publicadas</p>
            <p className="text-sm">Muy pronto habrá radio en vivo aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {stations.map(s => {
              const isPlaying = playingId === s.id;
              return (
                <button key={s.id} onClick={() => toggle(s)}
                  className={`group text-left bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border transition-all ${
                    isPlaying ? 'border-brand-orange shadow-lg shadow-pink-500/10' : 'border-gray-100 dark:border-gray-800 hover:border-pink-300'
                  }`}>
                  <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <span className="w-11 h-11 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg">
                        {isPlaying && status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </span>
                    </div>
                    {isPlaying && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-black text-gray-900 dark:text-white text-sm truncate">{s.name}</p>
                    <p className="text-gray-400 text-xs truncate">{s.genre}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <audio ref={audioRef} className="hidden" preload="none" />

      {playing && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-pink-500/20 px-4 py-2 flex items-center gap-3 backdrop-blur-xl shadow-2xl">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
            <img src={playing.img} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xs truncate">{playing.name}</p>
            <p className="text-white/50 text-[10px] flex items-center gap-1">
              {status === 'loading' ? 'conectando…' : status === 'error' ? <span className="text-red-400">emisora no disponible</span> : <><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> En directo</>}
            </p>
          </div>
          <button onClick={() => setPlayingId(null)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center flex-shrink-0">
            <Pause className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RadioPage;
