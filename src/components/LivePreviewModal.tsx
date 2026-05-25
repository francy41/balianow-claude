import React, { useEffect, useRef, useState } from 'react';
import { X, Radio, Heart, Lock, Calendar, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';

export interface LiveSessionLite {
  id: string;
  host_id?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  pricing_mode: 'free' | 'paid' | 'reservation' | 'donation';
  price?: number | null;
  currency?: string | null;
  cover_url?: string | null;
  preview_url?: string | null;
  status?: string | null;
  host_name?: string | null;
  host_avatar?: string | null;
  city?: string | null;
  viewers_count?: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSessionLite | null;
}

const LivePreviewModal: React.FC<Props> = ({ isOpen, onClose, session }) => {
  const navigate = useNavigate();
  const addToast = useUIStore(s => s.addToast);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [checking, setChecking] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!isOpen || !session) return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      if (session.pricing_mode === 'free' || session.pricing_mode === 'donation') {
        if (!cancelled) setHasTicket(true);
        return;
      }
      setChecking(true);
      const { data } = await supabase
        .from('live_tickets')
        .select('id, status')
        .eq('session_id', session.id)
        .eq('user_id', uid)
        .eq('status', 'paid')
        .maybeSingle();
      if (!cancelled) {
        setHasTicket(!!data);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  const enterRoom = () => {
    onClose();
    navigate(`/live/session/${session.id}`);
  };

  const purchase = async () => {
    if (!session) return;
    setPurchasing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { addToast({ type: 'error', message: 'Inicia sesión' }); setPurchasing(false); return; }
      // MVP: marcamos como pagado directo (en producción conectar Stripe/PayPal)
      const { error } = await supabase.from('live_tickets').insert({
        session_id:     session.id,
        user_id:        uid,
        amount:         session.price ?? 0,
        currency:       session.currency ?? 'EUR',
        status:         'paid',
        is_reservation: session.pricing_mode === 'reservation',
      });
      if (error) { addToast({ type: 'error', message: error.message }); setPurchasing(false); return; }
      addToast({ type: 'success', message: '¡Listo! Entrando...' });
      setHasTicket(true);
      setPurchasing(false);
      enterRoom();
    } catch (e: any) {
      addToast({ type: 'error', message: e.message || 'Error' });
      setPurchasing(false);
    }
  };

  const badgeFor = () => {
    if (session.pricing_mode === 'free') return { txt: 'GRATIS', cls: 'bg-green-500' };
    if (session.pricing_mode === 'donation') return { txt: 'DONACIÓN', cls: 'bg-purple-500' };
    if (session.pricing_mode === 'reservation') return { txt: `RESERVA · €${session.price}`, cls: 'bg-blue-500' };
    return { txt: `€${session.price}`, cls: 'bg-pink-500' };
  };
  const badge = badgeFor();

  const cta = () => {
    if (session.pricing_mode === 'free') return { label: 'Entrar gratis', action: enterRoom, icon: <Radio className="w-5 h-5" /> };
    if (session.pricing_mode === 'donation') return { label: 'Entrar y apoyar', action: enterRoom, icon: <Heart className="w-5 h-5" /> };
    if (hasTicket) return { label: 'Entrar', action: enterRoom, icon: <Radio className="w-5 h-5" /> };
    if (session.pricing_mode === 'reservation') return { label: `Reservar €${session.price}`, action: purchase, icon: <Calendar className="w-5 h-5" /> };
    return { label: `Comprar €${session.price}`, action: purchase, icon: <Lock className="w-5 h-5" /> };
  };
  const c = cta();

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0f0f1e] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Video preview */}
        <div className="relative bg-black aspect-video">
          {session.preview_url ? (
            <video ref={videoRef} src={session.preview_url} controls autoPlay muted loop
              className="w-full h-full object-cover" />
          ) : session.cover_url ? (
            <img src={session.cover_url} className="w-full h-full object-cover" alt={session.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500"><Radio className="w-12 h-12" /></div>
          )}

          {/* badges overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {session.status === 'live' && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
              </span>
            )}
            {session.preview_url && (
              <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">PREVIEW 60s</span>
            )}
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className={`text-white text-[10px] font-bold px-2 py-1 rounded ${badge.cls}`}>{badge.txt}</span>
            <button onClick={onClose} className="bg-black/60 text-white p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            {session.host_avatar
              ? <img src={session.host_avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
              : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600" />}
            <div className="flex-1">
              <div className="font-bold text-gray-900 dark:text-white">{session.host_name || 'Anfitrión'}</div>
              {session.city && <div className="text-xs text-gray-500">{session.city}</div>}
            </div>
            {typeof session.viewers_count === 'number' && session.viewers_count > 0 && (
              <div className="text-xs text-gray-500">👁 {session.viewers_count}</div>
            )}
          </div>
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">{session.title}</h2>
          {session.description && <p className="text-sm text-gray-600 dark:text-gray-400">{session.description}</p>}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 bg-white dark:bg-[#0f0f1e] border-t border-gray-100 dark:border-gray-800 p-4">
          <button onClick={c.action} disabled={checking || purchasing}
            className="btn-orange w-full flex items-center justify-center gap-2">
            {(checking || purchasing) ? <Loader2 className="w-5 h-5 animate-spin" /> : c.icon}
            {checking ? 'Verificando...' : purchasing ? 'Procesando...' : c.label}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LivePreviewModal;
