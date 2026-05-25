/**
 * LiveNowPage — listado de lives en curso + programados
 *
 * Carga desde Supabase `live_sessions_enriched`:
 *   - status='live' → grid principal "EN VIVO AHORA"
 *   - status='scheduled' AND scheduled_at >= now → "Próximos streams"
 *   - status='ended' → archivo (no se muestra)
 *
 * Click en card → LivePreviewModal con clip de 60s + CTA según pricing_mode
 * Botón "Emitir" → GoLiveModal (crear nueva sesión live)
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, Bell, Eye, Calendar, Sparkles, TrendingUp, Video, MapPin,
  Heart, DollarSign, Lock, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import SearchTriggerBar from '../components/SearchTriggerBar';
import GoLiveModal from '../components/GoLiveModal';
import LivePreviewModal, { type LiveSessionLite } from '../components/LivePreviewModal';

type CategoryFilter = 'all' | 'show' | 'class' | 'event' | 'jam' | 'workshop';

const CATEGORIES: { id: CategoryFilter; label: string; icon: string }[] = [
  { id: 'all',      label: 'Todos',      icon: '⚡' },
  { id: 'show',     label: 'Shows',      icon: '🎤' },
  { id: 'class',    label: 'Clases',     icon: '🎓' },
  { id: 'event',    label: 'Eventos',    icon: '🎉' },
  { id: 'jam',      label: 'Socials',    icon: '💃' },
  { id: 'workshop', label: 'Workshops',  icon: '🎯' },
];

const MODE_BADGE = {
  free:        { label: 'GRATIS',   color: 'bg-green-500',  emoji: '🆓' },
  paid:        { label: 'PAGO',     color: 'bg-pink-500',   emoji: '💰' },
  reservation: { label: 'RESERVA',  color: 'bg-blue-500',   emoji: '📅' },
  donation:    { label: 'DONACIÓN', color: 'bg-orange-500', emoji: '💝' },
} as const;

const LiveNowPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [sessions, setSessions] = useState<LiveSessionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoLive, setShowGoLive] = useState(false);
  const [previewSession, setPreviewSession] = useState<LiveSessionLite | null>(null);

  // Carga sesiones desde Supabase
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions_enriched')
        .select('*')
        .in('status', ['live', 'scheduled'])
        .order('status', { ascending: true })  // live primero, luego scheduled
        .order('started_at', { ascending: false });
      if (error) throw error;
      setSessions((data || []) as LiveSessionLite[]);
    } catch (e: any) {
      console.warn('[LiveNow] load:', e.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  // Realtime: cuando alguien empieza un live, actualiza la lista
  useEffect(() => {
    const channel = supabase
      .channel('live-sessions-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => loadSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const liveNow = useMemo(() => sessions.filter(s => s.status === 'live'), [sessions]);
  const scheduled = useMemo(() => sessions.filter(s => s.status === 'scheduled'), [sessions]);

  const filterByCat = (s: LiveSessionLite) => filter === 'all' || s.category === filter;
  const filteredLive = liveNow.filter(filterByCat);
  const filteredScheduled = scheduled.filter(filterByCat);

  const canGoLive = isAuthenticated && user && ['dj', 'artist', 'dancer', 'instructor', 'venue', 'business', 'promoter', 'admin', 'superadmin'].includes(user.role);

  const handleGoLive = () => {
    if (!isAuthenticated) {
      addToast({ message: 'Inicia sesión para emitir en directo', type: 'warning' });
      navigate('/auth');
      return;
    }
    if (!canGoLive) {
      addToast({ message: 'Necesitas perfil de artista / DJ / bailarín / instructor para emitir', type: 'warning' });
      return;
    }
    setShowGoLive(true);
  };

  const totalViewers = liveNow.reduce((s, x) => s + (x.viewers_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
              {loading ? 'Cargando…' : `${liveNow.length} en directo · ${totalViewers.toLocaleString()} espectadores`}
            </p>
          </div>
          <button onClick={handleGoLive}
            className="bg-white text-red-600 font-bold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform shadow-lg flex items-center gap-2">
            <Video className="w-4 h-4" /> Emitir en directo
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <SearchTriggerBar placeholder="🔍 Buscar streams, artistas, eventos en BailaNow…" className="mb-4" />

        {/* ── CATEGORY FILTER ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display font-black text-lg text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-orange" /> Trending Ahora
          </h2>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1 ${
                  filter === c.id ? 'bg-white dark:bg-gray-900 text-brand-orange shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}>
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── LIVE NOW GRID ── */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto" />
            <p className="text-gray-400 text-sm mt-3">Cargando lives…</p>
          </div>
        ) : filteredLive.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 mb-8">
            <Radio className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-bold">Nadie está en vivo ahora mismo</p>
            <p className="text-gray-400 text-sm mt-1">¿Te animas a estrenar tu propio live?</p>
            {canGoLive && (
              <button onClick={() => setShowGoLive(true)}
                className="mt-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
                <Video className="w-4 h-4" /> Ser el primero
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-10">
            {filteredLive.map((stream, idx) => (
              <LiveCard key={stream.id} stream={stream} index={idx}
                onClick={() => setPreviewSession(stream)} />
            ))}
          </div>
        )}

        {/* ── SCHEDULED ── */}
        {filteredScheduled.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-display font-black text-lg text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-orange" /> Próximos Streams
              </h2>
              <p className="text-gray-400 text-sm">Activa el recordatorio para no perdértelos.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredScheduled.map(s => (
                <ScheduledCard key={s.id} stream={s}
                  onClick={() => setPreviewSession(s)}
                  onRemind={() => addToast({ message: '🔔 Recordatorio activado', type: 'success' })}
                />
              ))}
            </div>
          </div>
        )}

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
                  Gratis, de pago, con reserva o por donaciones. Tú eliges. Subes un preview de 60s para enganchar a tu audiencia.
                </p>
              </div>
              <button onClick={() => setShowGoLive(true)}
                className="bg-white text-red-600 font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-xl flex items-center gap-2 whitespace-nowrap">
                <Video className="w-5 h-5" /> Emitir Ahora
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Go Live Modal */}
      <GoLiveModal open={showGoLive} onClose={() => { setShowGoLive(false); loadSessions(); }} />

      {/* Live preview */}
      <LivePreviewModal open={!!previewSession} onClose={() => setPreviewSession(null)} session={previewSession} />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const LiveCard: React.FC<{ stream: LiveSessionLite; index: number; onClick: () => void }> = ({ stream, index, onClick }) => {
  const badge = MODE_BADGE[stream.pricing_mode];
  return (
    <button onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden text-left group hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-pink-500 to-fuchsia-700">
        {stream.cover_url
          ? <img src={stream.cover_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <div className="w-full h-full flex items-center justify-center text-white/70 text-4xl">🎬</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-white text-[9px] font-black uppercase">LIVE</span>
        </div>

        <div className={`absolute top-2 right-2 ${badge.color} text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1`}>
          <span>{badge.emoji}</span>
          {badge.label}{(stream.pricing_mode === 'paid' || stream.pricing_mode === 'reservation') && stream.price ? ` €${stream.price}` : ''}
        </div>

        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded flex items-center gap-1">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-white text-[10px] font-bold">{(stream.viewers_count || 0).toLocaleString()}</span>
        </div>

        {stream.preview_url && (
          <div className="absolute bottom-2 right-2 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
            ⏱ PREVIEW
          </div>
        )}

        {index < 3 && (
          <div className="absolute top-9 left-2 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
            #{index + 1} TRENDING
          </div>
        )}
      </div>
      <div className="p-3 flex items-start gap-2">
        {stream.host_avatar
          ? <img src={stream.host_avatar} alt={stream.host_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-500" />
          : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white font-black text-sm">{(stream.host_name || '?')[0]}</div>}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">{stream.title}</p>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{stream.host_name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {(stream.styles || []).slice(0, 1).map(g => (
              <span key={g} className="text-[10px] font-bold uppercase tracking-wide bg-pink-50 dark:bg-pink-900/30 text-brand-orange px-1.5 py-0.5 rounded">{g}</span>
            ))}
            {stream.city && <span className="text-[10px] text-gray-400">📍 {stream.city}</span>}
          </div>
        </div>
      </div>
    </button>
  );
};

const ScheduledCard: React.FC<{ stream: LiveSessionLite; onClick: () => void; onRemind: () => void }> = ({ stream, onClick, onRemind }) => {
  const badge = MODE_BADGE[stream.pricing_mode];
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
      <button onClick={onClick} className="relative aspect-video text-left">
        {stream.cover_url
          ? <img src={stream.cover_url} alt={stream.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-fuchsia-600 flex items-center justify-center text-white/70 text-3xl">🎬</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {stream.scheduled_at && (
          <div className="absolute bottom-2 left-2 bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold text-gray-900">
            {new Date(stream.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · {new Date(stream.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <div className={`absolute top-2 right-2 ${badge.color} text-white text-[9px] font-black px-1.5 py-0.5 rounded`}>
          {badge.emoji} {badge.label}
        </div>
      </button>
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">{stream.title}</p>
        <p className="text-gray-400 text-xs mb-2">{stream.host_name}</p>
        <button onClick={onRemind}
          className="mt-auto flex items-center justify-center gap-1.5 bg-pink-50 dark:bg-pink-900/30 text-brand-orange font-bold text-xs py-2 rounded-lg hover:bg-pink-100 transition-colors">
          <Bell className="w-3.5 h-3.5" /> Recordar
        </button>
      </div>
    </div>
  );
};

export default LiveNowPage;
