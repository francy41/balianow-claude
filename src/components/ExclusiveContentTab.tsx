import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, CheckCircle, Loader2, Sparkles, CreditCard } from 'lucide-react';
import type { Artist } from '../data/mockData';
import { useAuthStore, useUIStore, usePerformerStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import StripePayment from './payment/StripePayment';
import { getStripe, createStripePaymentIntent } from '../lib/payments';

const FAN_PRICE = 4.99;

const BENEFITS = [
  'Contenido exclusivo solo para fans',
  'Vídeos entre bastidores y ensayos',
  'Coreografías y tips cada semana',
  'Insignia 👑 de fan en tu perfil',
  'Prioridad en respuestas y sorteos',
];

const ExclusiveContentTab: React.FC<{ artist: Artist }> = ({ artist }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const recordTransaction = usePerformerStore(s => s.recordTransaction);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const stripeReady = !!getStripe();
  const [showPay, setShowPay] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);

  // ¿Ya es fan? (persiste tras recargar; fallback si la tabla no existe aún)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { if (!cancelled) setChecking(false); return; }
      const { data } = await supabase.from('content_access')
        .select('id').eq('creator_id', artist.id).eq('user_id', uid).maybeSingle();
      if (!cancelled) { if (data) setUnlocked(true); setChecking(false); }
    })().catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [artist.id]);

  // Crear PaymentIntent real de Stripe al abrir el pago (fallback demo si no configurado/timeout)
  useEffect(() => {
    if (!showPay || !stripeReady || clientSecret) return;
    let cancelled = false;
    setLoadingIntent(true);
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('demo')), 4000));
    Promise.race([
      createStripePaymentIntent({
        amount: FAN_PRICE,
        currency: 'eur',
        items: [{ serviceId: `fan-${artist.id}`, sellerId: artist.id, sellerName: artist.name, title: `Fan · ${artist.name}`, price: FAN_PRICE, extrasTotal: 0 }],
        userId: user?.id ?? 'guest',
      }),
      timeout,
    ])
      .then((r: any) => { if (!cancelled && r?.clientSecret) setClientSecret(r.clientSecret); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingIntent(false); });
    return () => { cancelled = true; };
  }, [showPay, stripeReady, clientSecret, artist, user]);

  const startJoin = () => {
    if (!isAuthenticated || !user) {
      addToast({ type: 'error', message: 'Inicia sesión para hacerte fan' });
      navigate('/auth');
      return;
    }
    setShowPay(true);
  };

  // Tras el pago (real de Stripe o demo): registra escrow, persiste el acceso y desbloquea
  const finalizeJoin = async (paymentId: string) => {
    if (!user) return;
    recordTransaction({
      performerId: artist.id,
      performerName: artist.name,
      clientId: user.id,
      clientName: user.name,
      concept: `Fan · ${artist.name} (${paymentId})`,
      gross: FAN_PRICE,
      status: 'pending',
      source: 'course',
    });
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        await supabase.from('content_access').insert({
          creator_id: artist.id, user_id: uid, amount: FAN_PRICE, currency: 'EUR',
        });
      }
    } catch { /* fallback si la tabla no existe */ }
    setUnlocked(true);
    setShowPay(false);
    addToast({ type: 'success', message: `¡Ya eres fan de ${artist.name}! 👑` });
  };

  if (checking) {
    return <div className="py-16 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-brand-orange" /></div>;
  }

  // ── Ya es fan ──────────────────────────────────────────────────────────
  if (unlocked) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-lg leading-tight">Ya eres fan de {artist.name}</p>
            <p className="text-white/80 text-sm">Tienes acceso a todo su contenido exclusivo.</p>
          </div>
        </div>

        <div className="card-white rounded-2xl p-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-brand-orange mb-2" />
          <p className="font-bold text-gray-900">Aún no hay publicaciones exclusivas</p>
          <p className="text-gray-400 text-sm mt-1">
            Te avisaremos en cuanto {artist.name} publique contenido para fans.
          </p>
        </div>
      </div>
    );
  }

  // ── Muro de pago (paywall) ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto">
      <div className="card-white rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Contenido exclusivo</p>
          <h3 className="font-display font-black text-2xl mt-1">Hazte fan de {artist.name}</h3>
          <div className="mt-3 flex items-end justify-center gap-1">
            <span className="font-black text-4xl">€{FAN_PRICE.toFixed(2)}</span>
            <span className="text-white/80 mb-1 text-sm">· pago único</span>
          </div>
        </div>

        <div className="p-6">
          <ul className="space-y-2.5 mb-5">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {!showPay ? (
            <>
              <button
                onClick={startJoin}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-orange-500/25"
              >
                <Crown className="w-4 h-4" /> Hazte fan · €{FAN_PRICE.toFixed(2)}
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-3">
                Pago seguro · acceso permanente al contenido exclusivo
              </p>
            </>
          ) : (
            <div>
              {loadingIntent ? (
                <div className="flex items-center gap-3 py-2"><Loader2 className="w-5 h-5 animate-spin text-brand-orange" /><span className="text-sm text-gray-500">Conectando con Stripe…</span></div>
              ) : clientSecret && stripeReady ? (
                <StripePayment
                  clientSecret={clientSecret}
                  total={FAN_PRICE}
                  onSuccess={(pi) => finalizeJoin(`stripe-${pi}`)}
                  onError={(msg) => addToast({ type: 'error', message: msg })}
                />
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700 mb-3">🧪 Pago en modo demo — no se cobra dinero real. Configura <code>VITE_STRIPE_PUBLISHABLE_KEY</code> para activar el cobro.</div>
                  <button
                    onClick={() => finalizeJoin('demo')}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Pagar €{FAN_PRICE.toFixed(2)}
                  </button>
                </>
              )}
              <button onClick={() => setShowPay(false)} className="w-full text-center text-[11px] text-gray-400 mt-2 hover:text-gray-600">Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExclusiveContentTab;
