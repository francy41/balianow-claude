/**
 * LiveSessionPage — sala de transmisión de un live_session
 * URL: /live/session/:sessionId
 *
 * - Carga la sesión desde Supabase
 * - Verifica acceso (host, free, donation, ticket activo)
 * - Si no tiene acceso → muestra LivePreviewModal embebido
 * - Si tiene acceso → muestra Jitsi Meet (sala generada al crear)
 * - Sidebar con donaciones rápidas (modo donation)
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Radio, Eye, Heart, Send, MessageCircle, ExternalLink,
  Loader2, AlertCircle, X, Sparkles, DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import LivePreviewModal, { type LiveSessionLite } from '../components/LivePreviewModal';

const LiveSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [session, setSession] = useState<LiveSessionLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [donationMsg, setDonationMsg] = useState('');
  const [donating, setDonating] = useState(false);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);

  // Load session + verify access
  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions_enriched')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();
        if (error || !data) {
          setLoading(false);
          return;
        }
        setSession(data as LiveSessionLite);

        // Determinar acceso
        if (user?.id === data.host_id) { setHasAccess(true); setLoading(false); return; }
        if (data.pricing_mode === 'free' || data.pricing_mode === 'donation') {
          setHasAccess(true);
          setLoading(false);
          return;
        }
        if (!user) {
          setHasAccess(false);
          setShowPreview(true);
          setLoading(false);
          return;
        }
        // Comprobar ticket
        const { data: ticket } = await supabase.from('live_tickets')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (ticket) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          setShowPreview(true);
        }
      } catch (e) {
        console.error('[LiveSession] load:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, user]);

  // Load recent donations (live)
  useEffect(() => {
    if (!session || session.pricing_mode !== 'donation') return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('live_donations')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!cancelled) setRecentDonations(data || []);
    };
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [session]);

  const isHost = !!user && !!session && user.id === session.host_id;

  const handleDonate = async () => {
    if (!isAuthenticated || !user) {
      addToast({ message: 'Inicia sesión para donar', type: 'warning' });
      navigate('/auth');
      return;
    }
    if (!session) return;
    if (!donationAmount || donationAmount <= 0) {
      addToast({ message: 'Indica un importe mayor que 0', type: 'error' });
      return;
    }
    setDonating(true);
    try {
      const { error } = await supabase.from('live_donations').insert({
        session_id: session.id,
        user_id:    user.id,
        user_name:  user.name,
        amount:     donationAmount,
        currency:   'EUR',
        message:    donationMsg.trim() || null,
        payment_id: `demo_${Date.now()}`,
      });
      if (error) throw error;
      addToast({ message: `💝 ¡Gracias por tu propina de €${donationAmount}!`, type: 'success' });
      setDonationMsg('');
      setDonationOpen(false);
    } catch (e: any) {
      addToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto mb-3" />
          <p className="text-white">Cargando sala…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="font-black text-white text-xl mb-1">Sesión no encontrada</h2>
          <p className="text-gray-400 text-sm mb-5">Este live no existe o se canceló.</p>
          <button onClick={() => navigate('/live')}
            className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-5 py-2.5 rounded-xl">
            Ver lives activos
          </button>
        </div>
      </div>
    );
  }

  // Preview overlay (sin acceso aún)
  if (!hasAccess) {
    return (
      <LivePreviewModal
        open={true}
        onClose={() => navigate('/live')}
        session={session}
      />
    );
  }

  // Build Jitsi URL
  const jitsiUrl = session.id && (session as any).jitsi_room
    ? `https://meet.jit.si/${(session as any).jitsi_room}#userInfo.displayName="${encodeURIComponent(user?.name || 'Espectador')}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=${!isHost}&config.startWithVideoMuted=${!isHost}&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false`
    : '';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-pink-500/20 px-3 py-2 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate">{session.title}</h1>
          <p className="text-gray-400 text-[10px] flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-red-500 animate-pulse" /> {isHost ? '🎤 Tu sala' : '👤 Espectador'}
            </span>
            {session.viewers_count !== undefined && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {session.viewers_count.toLocaleString()}</span>
              </>
            )}
          </p>
        </div>
        {session.pricing_mode === 'donation' && !isHost && (
          <button onClick={() => setDonationOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 hover:scale-105 transition-transform shadow-lg">
            <Heart className="w-3.5 h-3.5" /> Donar
          </button>
        )}
        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">EN VIVO</span>
      </header>

      {/* Body — Jitsi + donations sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 bg-black relative" style={{ minHeight: '60vh' }}>
          {jitsiUrl ? (
            <iframe
              src={jitsiUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
              title="BailaNow Live"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Preparando sala…
            </div>
          )}
          {(session as any).jitsi_room && (
            <a
              href={`https://meet.jit.si/${(session as any).jitsi_room}`}
              target="_blank" rel="noopener noreferrer"
              className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-black/80"
            >
              <ExternalLink className="w-3 h-3" /> Abrir aparte
            </a>
          )}
        </div>

        {/* Donation feed (solo si modo donación) */}
        {session.pricing_mode === 'donation' && (
          <aside className="lg:w-72 bg-gray-900 border-l border-white/10 flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" /> Propinas en vivo
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {recentDonations.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-8">Sé el primero en apoyar 💖</p>
              ) : recentDonations.map(d => (
                <div key={d.id} className="bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-black text-pink-400">{d.user_name || 'Anónimo'}</p>
                    <p className="text-xs font-black text-white">€{d.amount}</p>
                  </div>
                  {d.message && <p className="text-[11px] text-gray-300 italic">"{d.message}"</p>}
                </div>
              ))}
            </div>
            {!isHost && (
              <div className="p-3 border-t border-white/10">
                <button onClick={() => setDonationOpen(true)}
                  className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-transform">
                  <Heart className="w-4 h-4" /> Enviar propina
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Donation modal */}
      {donationOpen && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4" onClick={() => setDonationOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-5 border border-pink-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-display font-black text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" /> Apoya a {session.host_name}
              </h3>
              <button onClick={() => setDonationOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {[2, 5, 10, 20].map(v => (
                <button key={v} onClick={() => setDonationAmount(v)}
                  className={`py-2 rounded-xl font-black text-sm transition-all ${
                    donationAmount === v ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}>
                  €{v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3 bg-white/5 rounded-xl px-3 py-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <input type="number" min="0.5" step="0.5"
                value={donationAmount}
                onChange={e => setDonationAmount(parseFloat(e.target.value) || 0)}
                className="bg-transparent flex-1 text-white text-sm focus:outline-none" />
              <span className="text-xs text-gray-400 font-bold">EUR</span>
            </div>

            <textarea value={donationMsg} onChange={e => setDonationMsg(e.target.value)}
              rows={2} maxLength={120}
              placeholder="Mensaje (opcional)..."
              className="w-full bg-white/5 text-white text-sm rounded-xl px-3 py-2 mb-3 focus:outline-none focus:bg-white/10" />

            <button onClick={handleDonate} disabled={donating}
              className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60">
              {donating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                : <><Heart className="w-4 h-4" /> Enviar €{donationAmount}</>}
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-2">10% de comisión plataforma · 90% al creador</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSessionPage;
