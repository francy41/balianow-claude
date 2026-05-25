/**
 * LivePreviewModal — muestra el preview de 60s de un live antes de entrar
 *
 * Flujos según pricing_mode del live:
 *   free        → "Entrar al live" directo
 *   paid        → "Comprar entrada €X" → tras pago → entrar
 *   reservation → "Reservar plaza €X" → tras pago → entrar
 *   donation    → "Entrar gratis" + opción de donar dentro
 *
 * El usuario ve el clip de 60s aunque no haya pagado.
 * Se usa desde NearMePage, LiveNowPage, ClassesPage, EventsPage.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Play, Radio, Users, MapPin, Heart, DollarSign, Calendar,
  CheckCircle, Lock, Eye, Sparkles, Loader2, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { getYouTubeId } from '../store/appStore';

export interface LiveSessionLite {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  category: string;
  pricing_mode: 'free' | 'paid' | 'reservation' | 'donation';
  price?: number;
  currency?: string;
  cover_url?: string;
  preview_url?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at?: string;
  viewers_count?: number;
  styles?: string[];
  city?: string;
  host_name?: string;
  host_avatar?: string;
  host_role?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  session: LiveSessionLite | null;
}

const MODE_BADGE: Record<string, { label: string; emoji: string; color: string }> = {
  free:        { label: 'GRATIS',       emoji: '🆓', color: 'from-green-500 to-emerald-600' },
  paid:        { label: 'PAGO',         emoji: '💰', color: 'from-pink-500 to-fuchsia-600' },
  reservation: { label: 'RESERVA',      emoji: '📅', color: 'from-blue-500 to-indigo-600' },
  donation:    { label: 'DONACIÓN',     emoji: '💝', color: 'from-orange-500 to-rose-500' },
};

const LivePreviewModal: React.FC<Props> = ({ open, onClose, session }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [hasTicket, setHasTicket] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open || !session || !user) { setHasTicket(false); return; }
    if (session.pricing_mode === 'free' || session.pricing_mode === 'donation') {
      setHasTicket(true);
      return;
    }
    if (session.host_id === user.id) { setHasTicket(true); return; }

    setLoadingTicket(true);
    (async () => {
      try {
        const { data } = await supabase.from('live_tickets')
          .select('id')
          .eq('session_id', session.id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        setHasTicket(!!data);
      } catch {}
      finally { setLoadingTicket(false); }
    })();
  }, [open, session, user]);

  if (!open || !session) return null;

  const badge = MODE_BADGE[session.pricing_mode] || MODE_BADGE.free;
  const isLive = session.status === 'live';
  const isHost = user?.id === session.host_id;

  const youtubeId = session.preview_url ? getYouTubeId(session.preview_url) : null;

  const handleEnter = async () => {
    if (!isAuthenticated && session.pricing_mode !== 'free') {
      addToast({ message: 'Inicia sesión para entrar', type: 'warning' });
      navigate(`/auth?next=/live/session/${session.id}`);
      return;
    }

    // Free / donation / host / con ticket → entrar directo
    if (hasTicket || isHost || session.pricing_mode === 'free' || session.pricing_mode === 'donation') {
      onClose();
      navigate(`/live/session/${session.id}`);
      return;
    }

    // Paid / reservation → cobrar
    setProcessing(true);
    try {
      // Para esta versión simulamos el pago con un toast + insert directo.
      // En producción aquí se invocaría Stripe Checkout / PayPal.
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        addToast({ message: 'Sesión expirada', type: 'error' });
        setProcessing(false);
        return;
      }
      const { error } = await supabase.from('live_tickets').insert({
        session_id:  session.id,
        user_id:     authSession.user.id,
        amount_paid: session.price || 0,
        currency:    session.currency || 'EUR',
        payment_id:  `demo_${Date.now()}`,
        status:      'active',
      });
      if (error) throw error;
      addToast({ message: `✅ Acceso confirmado · €${session.price}`, type: 'success' });
      setProcessing(false);
      onClose();
      navigate(`/live/session/${session.id}`);
    } catch (e: any) {
      console.error('[LivePreview] ticket error:', e);
      addToast({ message: `Error: ${e.message || 'no se pudo procesar'}`, type: 'error' });
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-gray-950 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-hidden flex flex-col">

        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full">
          <X className="w-4 h-4" />
        </button>

        {/* Preview video */}
        <div className="relative aspect-video bg-black flex-shrink-0">
          {youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full"
              title="Preview"
            />
          ) : session.preview_url ? (
            <video
              src={session.preview_url}
              controls
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : session.cover_url ? (
            <img src={session.cover_url} alt="" className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-600 via-red-600 to-orange-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

          {/* Live indicator */}
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest">EN VIVO</span>
            </div>
          )}
          {!isLive && session.scheduled_at && (
            <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
              📅 Programado
            </div>
          )}

          {/* Pricing badge */}
          <div className={`absolute top-3 ${isLive || session.scheduled_at ? 'left-28' : 'left-3'} bg-gradient-to-r ${badge.color} text-white text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1`}>
            <span>{badge.emoji}</span> {badge.label}{(session.pricing_mode === 'paid' || session.pricing_mode === 'reservation') && session.price ? ` · €${session.price}` : ''}
          </div>

          {/* Viewers */}
          {isLive && (
            <div className="absolute top-3 right-12 bg-black/70 px-2 py-1 rounded-md flex items-center gap-1">
              <Eye className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-bold">{(session.viewers_count || 0).toLocaleString()}</span>
            </div>
          )}

          {/* Preview label */}
          <div className="absolute bottom-3 left-3 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
            ⏱ PREVIEW 60s
          </div>
        </div>

        {/* Info body */}
        <div className="p-5 overflow-y-auto flex-1 text-white">
          {/* Host */}
          <div className="flex items-center gap-3 mb-3">
            {session.host_avatar
              ? <img src={session.host_avatar} alt={session.host_name || ''} className="w-12 h-12 rounded-full ring-2 ring-pink-500 object-cover" />
              : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center font-black">{(session.host_name || '?')[0]}</div>}
            <div className="flex-1 min-w-0">
              <p className="font-black text-white truncate">{session.host_name || 'Creador'}</p>
              <p className="text-[11px] text-gray-400 capitalize">{session.host_role || 'artista'}</p>
            </div>
            {session.host_id && (
              <button onClick={() => { onClose(); navigate(`/p/${session.host_id}`); }}
                className="text-xs text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1">
                Perfil <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <h2 className="font-display font-black text-xl text-white mb-1 leading-tight">{session.title}</h2>
          {session.description && (
            <p className="text-sm text-gray-300 mb-3">{session.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-gray-400">
            {session.city && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.city}</span>
            )}
            {(session.styles || []).slice(0, 3).map(s => (
              <span key={s} className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{s}</span>
            ))}
            {session.scheduled_at && !isLive && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(session.scheduled_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          {/* Acceso info */}
          {!hasTicket && !isHost && session.pricing_mode === 'paid' && (
            <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 mb-4 flex items-start gap-2 text-xs text-pink-200">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acceso de pago — €{session.price}</p>
                <p className="text-pink-200/80">Compra tu entrada para entrar al stream completo.</p>
              </div>
            </div>
          )}
          {!hasTicket && !isHost && session.pricing_mode === 'reservation' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 flex items-start gap-2 text-xs text-blue-200">
              <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Plazas limitadas — €{session.price}</p>
                <p className="text-blue-200/80">Reserva tu plaza para garantizar el acceso a la clase.</p>
              </div>
            </div>
          )}
          {session.pricing_mode === 'donation' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4 flex items-start gap-2 text-xs text-orange-200">
              <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Entrada libre + propinas</p>
                <p className="text-orange-200/80">Apoya al creador con la cantidad que quieras durante el live.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-white/10 p-4 bg-black/50 flex-shrink-0">
          <button
            onClick={handleEnter}
            disabled={processing || loadingTicket || (session.status === 'ended')}
            className="w-full bg-gradient-to-r from-red-500 via-pink-500 to-fuchsia-600 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          >
            {processing
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando…</>
              : session.status === 'ended'
                ? <>📦 Live finalizado</>
                : isHost
                  ? <><Radio className="w-5 h-5" /> Entrar a tu sala</>
                  : hasTicket
                    ? <><CheckCircle className="w-5 h-5" /> Tienes acceso · Entrar</>
                    : session.pricing_mode === 'free'
                      ? <><Play className="w-5 h-5 fill-white" /> Entrar gratis</>
                      : session.pricing_mode === 'donation'
                        ? <><Heart className="w-5 h-5" /> Entrar y apoyar</>
                        : session.pricing_mode === 'reservation'
                          ? <><Calendar className="w-5 h-5" /> Reservar plaza · €{session.price}</>
                          : <><DollarSign className="w-5 h-5" /> Comprar entrada · €{session.price}</>}
          </button>
          {!isAuthenticated && session.pricing_mode !== 'free' && (
            <p className="text-[10px] text-gray-400 text-center mt-2">Necesitas una cuenta para comprar entradas.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivePreviewModal;
