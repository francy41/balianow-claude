import React, { useEffect, useRef, useState } from 'react';
import { Radio as RadioIcon, Play, Pause, Loader2, Music2, Globe2, Heart, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fixText } from '../lib/text';
import { useNowPlaying } from '../lib/radioNowPlaying';

interface Station {
  id: string;
  name: string;
  genre: string;
  bitrate: string;
  img: string;
  streamUrl: string;
}

function mapStation(s: any): Station {
  return {
    id: s.id,
    name: fixText(s.name || 'Emisora'),
    genre: fixText(s.genre || ''),
    bitrate: s.bitrate || '',
    img: s.img_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Radio')}&background=EC4899&color=fff&size=120&bold=true`,
    streamUrl: s.stream_url || '',
  };
}

// Ecualizador de fondo: puro decorado, marca que hay señal.
const EqualizerBackdrop: React.FC = () => (
  <span aria-hidden className="pointer-events-none absolute left-0 bottom-0 w-full lg:w-1/2 h-24 flex items-end gap-[3px] opacity-[0.14] px-2">
    {Array.from({ length: 48 }).map((_, i) => (
      <span key={i}
        className="radio-bar flex-1 rounded-t-sm bg-gradient-to-t from-brand to-brand-secondary"
        style={{
          height: `${28 + ((i * 37) % 62)}%`,
          animationDelay: `${((i * 13) % 11) / 10}s`,
          animationDuration: `${1 + ((i * 7) % 9) / 10}s`,
        }} />
    ))}
  </span>
);

interface Host {
  id: string;
  name: string;
  tagline: string;
  avatar: string;
  schedule: string;
  isLive: boolean;
}

// Locutores dados de alta en Admin → Radio Online → Locutores. Si la tabla
// todavía no existe o no hay nadie, la sección no se pinta: aquí no se inventan
// presentadores.
function useRadioHosts(): Host[] {
  const [hosts, setHosts] = useState<Host[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase.from('radio_hosts').select('id,name,tagline,avatar_url,schedule,is_live,sort_order')
      .eq('active', true).order('is_live', { ascending: false }).order('sort_order')
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setHosts((data || []).map((h: any) => ({
          id: h.id,
          name: fixText(h.name || ''),
          tagline: fixText(h.tagline || ''),
          avatar: h.avatar_url || '',
          schedule: fixText(h.schedule || ''),
          isLive: h.is_live === true,
        })));
      }, () => {});
    return () => { cancelled = true; };
  }, []);
  return hosts;
}

const VENTAJAS = [
  { icon: Music2, title: 'Música sin parar', sub: '24 horas en directo' },
  { icon: Globe2, title: 'Los mejores éxitos', sub: 'Latinos y más' },
  { icon: Heart, title: 'Hecha por bailarines', sub: 'Para bailarines' },
  { icon: RadioIcon, title: 'En todas partes', sub: 'Web, app y dispositivos' },
];

const RadioPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('radio_stations').select('id,name,genre,bitrate,stream_url,img_url,status').eq('status', 'active').order('sort_order')
      .then(({ data }) => {
        if (cancelled) return;
        setStations((data || []).map(mapStation));
        setLoading(false);
      }, () => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const playing = stations.find(s => s.id === playingId) || null;
  const main = stations[0] || null;
  const hosts = useRadioHosts();

  // "Ahora suena" del servidor de la emisora que se esté escuchando; si no hay
  // ninguna sonando, el de la principal. Devuelve null si el servidor no habla.
  const nowPlaying = useNowPlaying(playing?.streamUrl || main?.streamUrl);

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

  const mainPlaying = !!main && playingId === main.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── PANEL PRINCIPAL ── */}
        <div className="relative overflow-hidden rounded-3xl bg-[#12010C] text-white shadow-2xl shadow-brand/20 ring-1 ring-brand/40">
          {/* El foco cae rápido desde la esquina: deja el rosa vivo alrededor del
              icono y oscurece la zona del titular, que es donde va el texto. */}
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(95%_88%_at_-6%_-12%,#FF3D9A_0%,#C40E6B_16%,#7A0A4C_36%,#2A0521_66%,#12010C_100%)]" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
          <EqualizerBackdrop />

          <div className="relative p-5 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-8">

              {/* Identidad + play */}
              <div className="flex items-start gap-5 lg:w-[52%]">
                {/* Icono de marca, con halo de neón */}
                <span aria-hidden className="relative hidden sm:grid place-items-center w-24 h-24 rounded-3xl flex-shrink-0
                  bg-gradient-to-br from-[#FF3D9A] to-[#C40E6B] shadow-[0_0_40px_-6px_#FF3D9A] ring-1 ring-white/30">
                  <RadioIcon className="w-11 h-11 text-white" strokeWidth={2.2} />
                </span>

                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 bg-brand text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white tv-halo" /> En vivo
                  </span>
                  <h1 className="font-display font-black text-4xl sm:text-5xl mt-3 leading-[0.95]">
                    BailaNow<br /><span className="text-brand">Radio</span>
                  </h1>
                  <p className="text-white/85 mt-3 text-base font-semibold">Música latina en directo 24/7</p>
                  {main?.genre && <p className="text-white/60 mt-0.5 text-sm">{main.genre}{main.bitrate ? ` · ${main.bitrate}` : ''}</p>}

                  {main && (
                    <button onClick={() => toggle(main)}
                      className="mt-6 inline-flex items-center gap-3 rounded-full bg-white pl-2 pr-6 py-2 font-black text-brand text-base
                        shadow-lg shadow-black/30 transition-transform hover:scale-[1.03] active:scale-95">
                      <span className="grid place-items-center w-9 h-9 rounded-full bg-brand text-white">
                        {mainPlaying && status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" />
                          : mainPlaying ? <Pause className="w-4 h-4" fill="currentColor" />
                          : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                      </span>
                      {mainPlaying ? 'Pausar' : 'Escuchar ahora'}
                    </button>
                  )}
                  {status === 'error' && (
                    <p className="text-red-300 text-xs mt-2">La emisora no responde ahora mismo. Inténtalo en un momento.</p>
                  )}
                </div>
              </div>

              {/* Ahora suena + oyentes. Solo si el servidor de la emisora lo informa. */}
              <div className="lg:flex-1 lg:self-center">
                {nowPlaying ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-5 lg:gap-4 lg:rounded-2xl lg:bg-black/35 lg:ring-1 lg:ring-white/10 lg:p-5">
                    <div>
                      <p className="text-brand text-[11px] font-black uppercase tracking-widest mb-2">Ahora suena</p>
                      <div className="flex items-center gap-3">
                        <span className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 grid place-items-center">
                          {nowPlaying.art
                            ? <img src={nowPlaying.art} alt="" className="w-full h-full object-cover"
                                onError={ev => { ev.currentTarget.style.display = 'none'; }} />
                            : <Music2 className="w-6 h-6 text-white/40" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-black text-[15px] leading-tight truncate">{nowPlaying.title}</span>
                          {nowPlaying.artist && <span className="block text-white/60 text-[13px] leading-tight truncate">{nowPlaying.artist}</span>}
                        </span>
                      </div>
                    </div>

                    {nowPlaying.listeners !== null && (
                      <div>
                        <p className="text-brand text-[11px] font-black uppercase tracking-widest mb-2">Oyentes ahora</p>
                        <div className="flex items-center gap-3">
                          <span className="w-12 h-12 rounded-xl bg-white/10 grid place-items-center flex-shrink-0">
                            <Users className="w-5 h-5 text-white/80" />
                          </span>
                          <span>
                            <span className="block font-display font-black text-2xl leading-none">
                              {nowPlaying.listeners.toLocaleString('es-ES')}
                            </span>
                            <span className="block text-white/60 text-[12px]">
                              {nowPlaying.listeners === 1 ? 'oyente conectado' : 'oyentes conectados'}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Locutores. Solo si hay alguien dado de alta en el panel. */}
            {hosts.length > 0 && (
              <div className="relative mt-8">
                <p className="text-brand text-[11px] font-black uppercase tracking-widest mb-3">
                  {hosts.some(h => h.isLive) ? 'Locutores en vivo' : 'Nuestros locutores'}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                  {hosts.map(h => (
                    <div key={h.id}
                      className="snap-start flex-shrink-0 w-[150px] sm:w-[168px] rounded-2xl overflow-hidden bg-black/40 ring-1 ring-white/10">
                      <span className="relative block aspect-[3/4] bg-white/5">
                        {h.avatar
                          ? <img src={h.avatar} alt={h.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover"
                              onError={ev => { ev.currentTarget.style.display = 'none'; }} />
                          : <span className="absolute inset-0 grid place-items-center font-display font-black text-3xl text-white/25">
                              {(h.name || '?').charAt(0)}
                            </span>}
                        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                      </span>
                      <div className="p-3 -mt-10 relative">
                        <p className="font-black text-[14px] leading-tight truncate">{h.name}</p>
                        {h.tagline && <p className="text-white/60 text-[12px] leading-tight truncate">{h.tagline}</p>}
                        {h.isLive
                          ? <span className="inline-flex items-center gap-1 mt-2 bg-brand text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded">
                              <span className="w-1 h-1 rounded-full bg-white tv-halo" /> En vivo
                            </span>
                          : h.schedule
                            ? <span className="inline-block mt-2 text-white/50 text-[10px]">{h.schedule}</span>
                            : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tira de ventajas */}
            <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-black/55 backdrop-blur-sm ring-1 ring-white/10 p-4">
              {VENTAJAS.map(v => (
                <div key={v.title} className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-brand/20 grid place-items-center flex-shrink-0">
                    <v.icon className="w-5 h-5 text-brand" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-[13px] leading-tight">{v.title}</span>
                    <span className="block text-white/55 text-[11px] leading-tight">{v.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── OTRAS EMISORAS ── solo cuando hay más de una que elegir */}
        {loading ? (
          <div className="py-16 text-center text-gray-400"><Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" /><p>Cargando emisoras…</p></div>
        ) : stations.length === 0 ? (
          <div className="card-white p-10 mt-6 text-center text-gray-400 rounded-2xl">
            <RadioIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Aún no hay emisoras publicadas</p>
            <p className="text-sm">Muy pronto habrá radio en vivo aquí.</p>
          </div>
        ) : stations.length > 1 ? (
          <section className="mt-8">
            <h2 className="font-display font-black text-xl text-gray-900 dark:text-white mb-3">Todas las emisoras</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {stations.map(s => {
                const isPlaying = playingId === s.id;
                return (
                  <button key={s.id} onClick={() => toggle(s)}
                    className={`group text-left bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border transition-all ${
                      isPlaying ? 'border-brand shadow-lg shadow-brand/10' : 'border-gray-100 dark:border-gray-800 hover:border-pink-300'
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
          </section>
        ) : null}
      </div>

      <audio ref={audioRef} className="hidden" preload="none" />

      {playing && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-brand/20 px-4 py-2 flex items-center gap-3 backdrop-blur-xl shadow-2xl">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
            <img src={nowPlaying?.art || playing.img} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xs truncate">
              {nowPlaying ? `${nowPlaying.title}${nowPlaying.artist ? ` — ${nowPlaying.artist}` : ''}` : playing.name}
            </p>
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
