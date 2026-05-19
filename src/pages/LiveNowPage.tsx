import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, Heart, MessageCircle, Share2, Bell, Eye, Send,
  Play, Calendar, MapPin, Sparkles, TrendingUp, Video
} from 'lucide-react';
import { LIVE_STREAMS, SCHEDULED_STREAMS, ARTISTS } from '../data/mockData';
import type { LiveStream } from '../data/mockData';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar } from '../components/ui';

type CategoryFilter = 'all' | 'dj' | 'dancer' | 'instructor' | 'band';

const CATEGORIES: { id: CategoryFilter; label: string; icon: string }[] = [
  { id: 'all',        label: 'Todos',       icon: '⚡' },
  { id: 'dj',         label: 'DJs',         icon: '🎧' },
  { id: 'dancer',     label: 'Bailarines',  icon: '💃' },
  { id: 'instructor', label: 'Clases',      icon: '🎓' },
  { id: 'band',       label: 'Bandas',      icon: '🎺' },
];

const DEMO_CHAT_MESSAGES = [
  { id: 1, user: 'María_BCN',    avatar: 'https://ui-avatars.com/api/?name=Maria&background=EC4899&color=fff&size=80',  text: '¡Fueguito 🔥🔥 amo este tema!' },
  { id: 2, user: 'CarlosMad',    avatar: 'https://ui-avatars.com/api/?name=Carlos&background=7C3AED&color=fff&size=80', text: '¿Vas a tocar Aventura después?' },
  { id: 3, user: 'BachataLover', avatar: 'https://ui-avatars.com/api/?name=Bachata&background=EC4899&color=fff&size=80', text: 'Saludos desde Cali 🇨🇴' },
  { id: 4, user: 'SalsaQueen',   avatar: 'https://ui-avatars.com/api/?name=Salsa&background=10B981&color=fff&size=80',  text: 'GENIO. Lo mejor del año' },
  { id: 5, user: 'DJsupport',    avatar: 'https://ui-avatars.com/api/?name=DJ&background=EF4444&color=fff&size=80',     text: '🎵🎵🎵 imparable' },
  { id: 6, user: 'Sergio_VLC',   avatar: 'https://ui-avatars.com/api/?name=Sergio&background=06B6D4&color=fff&size=80', text: '¿Cuándo en Valencia?' },
  { id: 7, user: 'Lola_S',       avatar: 'https://ui-avatars.com/api/?name=Lola&background=8B5CF6&color=fff&size=80',   text: '💃💃💃' },
];

const LiveNowPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [activeStream, setActiveStream] = useState<LiveStream>(LIVE_STREAMS[0]);
  const [chatInput, setChatInput] = useState('');
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [viewers, setViewers] = useState(activeStream.viewers);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => Math.max(0, v + Math.floor(Math.random() * 11) - 5));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeStream.id]);

  useEffect(() => { setViewers(activeStream.viewers); }, [activeStream.id, activeStream.viewers]);

  const filtered = useMemo(() =>
    filter === 'all' ? LIVE_STREAMS : LIVE_STREAMS.filter(s => s.category === filter),
  [filter]);

  const canGoLive = isAuthenticated && user && ['dj', 'artist', 'dancer'].includes(user.role);

  const handleGoLive = () => {
    if (!isAuthenticated) {
      addToast({ message: 'Inicia sesión para emitir en directo', type: 'warning' });
      navigate('/auth');
      return;
    }
    if (!canGoLive) {
      addToast({ message: 'Necesitas perfil de artista/DJ/bailarín para emitir', type: 'warning' });
      return;
    }
    addToast({ message: '🎥 Preparando tu stream...', type: 'info' });
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    if (!isAuthenticated) { addToast({ message: 'Inicia sesión para chatear', type: 'warning' }); return; }
    addToast({ message: 'Mensaje enviado al stream', type: 'success' });
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER ── */}
      <section className="bg-gradient-to-r from-red-600 via-pink-600 to-pink-500 px-4 py-5 sm:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <span className="text-white/90 text-xs font-bold uppercase tracking-widest">EN VIVO AHORA</span>
            </div>
            <h1 className="font-display font-black text-white text-2xl sm:text-3xl">Live Now</h1>
            <p className="text-white/80 text-sm mt-0.5">
              {LIVE_STREAMS.length} performers en directo · {LIVE_STREAMS.reduce((s, x) => s + x.viewers, 0).toLocaleString()} espectadores
            </p>
          </div>
          <button onClick={handleGoLive}
            className="bg-white text-red-600 font-bold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform shadow-lg flex items-center gap-2">
            <Video className="w-4 h-4" /> Emitir en directo
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── FEATURED PLAYER + CHAT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Player */}
          <div className="lg:col-span-2 card-white rounded-2xl overflow-hidden">
            <div className="relative aspect-video bg-black">
              <img src={activeStream.thumbnail} alt={activeStream.title}
                className="w-full h-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-[10px] font-black uppercase tracking-widest">LIVE</span>
              </div>
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-bold">{viewers.toLocaleString()}</span>
              </div>
              <button className="absolute inset-0 flex items-center justify-center group">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                  <Play className="w-7 h-7 fill-brand-orange text-brand-orange ml-1" />
                </div>
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-end gap-3">
                  <Avatar src={activeStream.artistAvatar} name={activeStream.artistName} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm sm:text-base truncate">{activeStream.artistName}</p>
                    <p className="text-white/70 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {activeStream.city} · {activeStream.genre}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h2 className="font-display font-bold text-gray-900 text-lg leading-tight mb-1">{activeStream.title}</h2>
              {activeStream.description && (
                <p className="text-gray-500 text-sm mb-3">{activeStream.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {activeStream.tags.map(t => (
                  <span key={t} className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-1 rounded">{t}</span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => setLiked(l => !l)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${liked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} /> {liked ? 'Te gusta' : 'Like'}
                </button>
                <button onClick={() => {
                  setFollowing(f => !f);
                  addToast({ message: following ? 'Has dejado de seguir' : '¡Ahora sigues a ' + activeStream.artistName + '!', type: 'success' });
                }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${following ? 'bg-gray-900 text-white' : 'bg-brand-orange text-white hover:bg-pink-600'}`}>
                  <Bell className="w-4 h-4" /> {following ? 'Siguiendo' : 'Seguir'}
                </button>
                <button onClick={() => navigate(`/artistas/${activeStream.artistId}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
                  <Sparkles className="w-4 h-4" /> Ver perfil
                </button>
                <button onClick={() => addToast({ message: 'Enlace copiado', type: 'success' })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all">
                  <Share2 className="w-4 h-4" /> Compartir
                </button>
                <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                  {(activeStream.reactions || []).map(r => (
                    <button key={r.type} className="bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-lg text-xs transition-all">
                      <span>{r.type}</span>
                      <span className="ml-1 text-gray-500 font-semibold">{r.count.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Chat */}
          <div className="card-white rounded-2xl flex flex-col h-[500px] lg:h-auto lg:max-h-[680px]">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-brand-orange" />
                <h3 className="font-bold text-gray-900 text-sm">Chat en vivo</h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{viewers.toLocaleString()} viendo</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
              {DEMO_CHAT_MESSAGES.map(msg => (
                <div key={msg.id} className="flex items-start gap-2">
                  <Avatar src={msg.avatar} name={msg.user} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-brand-orange uppercase tracking-wide">{msg.user}</p>
                    <p className="text-xs text-gray-700 break-words">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={isAuthenticated ? 'Di algo en el directo...' : 'Inicia sesión para chatear'}
                disabled={!isAuthenticated}
                className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange disabled:opacity-60" />
              <button onClick={handleSendMessage}
                className="w-9 h-9 rounded-lg bg-brand-orange text-white flex items-center justify-center hover:bg-pink-600 transition-colors disabled:opacity-50"
                disabled={!chatInput.trim()}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── CATEGORY FILTER ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-orange" /> Trending Ahora
          </h2>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1 ${filter === c.id ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TRENDING GRID ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-10">
          {filtered.map((stream, idx) => (
            <button key={stream.id} onClick={() => setActiveStream(stream)}
              className="card-white rounded-2xl overflow-hidden text-left group hover:shadow-lg transition-all">
              <div className="relative aspect-video overflow-hidden">
                <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-[9px] font-black uppercase">LIVE</span>
                </div>
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded flex items-center gap-1">
                  <Eye className="w-3 h-3 text-white" />
                  <span className="text-white text-[10px] font-bold">{stream.viewers.toLocaleString()}</span>
                </div>
                {idx < 3 && (
                  <div className="absolute bottom-2 left-2 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    #{idx + 1} TRENDING
                  </div>
                )}
              </div>
              <div className="p-3 flex items-start gap-2">
                <Avatar src={stream.artistAvatar} name={stream.artistName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{stream.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{stream.artistName}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-pink-50 text-brand-orange px-1.5 py-0.5 rounded">{stream.genre}</span>
                    <span className="text-[10px] text-gray-400">📍 {stream.city}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200">
              <Radio className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">Sin streams activos en esta categoría</p>
              <p className="text-gray-400 text-sm mt-1">Vuelve más tarde o revisa los streams programados.</p>
            </div>
          )}
        </div>

        {/* ── SCHEDULED ── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-orange" /> Próximos Streams
            </h2>
            <p className="text-gray-400 text-sm">Activa el recordatorio para no perdértelos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SCHEDULED_STREAMS.slice(0, 8).map(s => {
              const artist = ARTISTS.find(a => a.id === s.artistId);
              return (
                <div key={s.id} className="card-white rounded-2xl overflow-hidden flex flex-col">
                  <div className="relative aspect-video">
                    <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold text-gray-900">
                      {new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · {s.time}
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{s.title}</p>
                    <p className="text-gray-400 text-xs mb-2">{artist?.name}</p>
                    <button onClick={() => addToast({ message: '🔔 Recordatorio activado', type: 'success' })}
                      className="mt-auto flex items-center justify-center gap-1.5 bg-pink-50 text-brand-orange font-bold text-xs py-2 rounded-lg hover:bg-pink-100 transition-colors">
                      <Bell className="w-3.5 h-3.5" /> Recordar ({s.reminders})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── GO LIVE CTA ── */}
        {canGoLive && (
          <div className="bg-gradient-to-r from-red-600 via-pink-600 to-brand-orange rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">⚡ Para creadores</p>
                <h3 className="font-display font-black text-2xl sm:text-3xl mb-2">¿Listo para emitir en directo?</h3>
                <p className="text-white/90 text-sm max-w-md">
                  Conecta con tu audiencia, recibe ofertas en vivo y monetiza tu talento. 15% comisión, sin tarifas ocultas.
                </p>
              </div>
              <button onClick={handleGoLive}
                className="bg-white text-red-600 font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-xl flex items-center gap-2 whitespace-nowrap">
                <Video className="w-5 h-5" /> Emitir Ahora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveNowPage;
