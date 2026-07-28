import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, Send, X, Lock, CheckCircle, ShieldCheck, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore, useAuthStore, usePerformerStore } from '../store/appStore';
import StripePayment from '../components/payment/StripePayment';
import { getStripe, createStripePaymentIntent } from '../lib/payments';

interface LiveSession {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  pricing_mode: 'free' | 'paid' | 'reservation' | 'donation';
  price: number | null;
  jitsi_room: string;
  status: string;
  cover_url: string | null;
  host_name?: string | null;
  host_avatar?: string | null;
  total_donations?: number | null;
}

interface Donation {
  id: string;
  donor_name: string | null;
  amount: number;
  message: string | null;
  created_at: string;
}

declare global { interface Window { JitsiMeetExternalAPI?: any } }

const DONATION_PRESETS = [2, 5, 10, 20];

const LiveSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore(s => s.addToast);
  const { user, isAuthenticated } = useAuthStore();
  const recordTransaction = usePerformerStore(s => s.recordTransaction);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const stripeReady = !!getStripe();
  const [showPay, setShowPay] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [showDonate, setShowDonate] = useState(false);
  const [donAmount, setDonAmount] = useState<number>(5);
  const [donMessage, setDonMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load session
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('live_sessions_enriched')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        // fallback a tabla raw
        const { data: raw } = await supabase.from('live_sessions').select('*').eq('id', id).maybeSingle();
        setSession(raw as any);
      } else {
        setSession(data as any);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // PPV: comprobar si el usuario ya tiene acceso comprado (persiste tras recargar)
  useEffect(() => {
    if (!session) return;
    const paid = session.pricing_mode === 'paid' && (session.price ?? 0) > 0;
    if (!paid) return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('live_access')
        .select('id').eq('session_id', session.id).eq('user_id', uid).maybeSingle();
      if (!cancelled && data) setUnlocked(true);
    })().catch(() => { /* tabla puede no existir aún */ });
    return () => { cancelled = true; };
  }, [session]);

  // PPV: crear PaymentIntent real de Stripe al abrir el pago (fallback a demo si no está configurado o timeout)
  useEffect(() => {
    if (!showPay || !stripeReady || clientSecret || !session) return;
    let cancelled = false;
    setLoadingIntent(true);
    const price = session.price ?? 0;
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('demo')), 4000));
    Promise.race([
      createStripePaymentIntent({
        amount: price,
        currency: 'eur',
        items: [{ serviceId: session.id, sellerId: session.host_id, sellerName: session.host_name || 'Anfitrión', title: session.title, price, extrasTotal: 0 }],
        userId: user?.id ?? 'guest',
      }),
      timeout,
    ])
      .then((r: any) => { if (!cancelled && r?.clientSecret) setClientSecret(r.clientSecret); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingIntent(false); });
    return () => { cancelled = true; };
  }, [showPay, stripeReady, clientSecret, session, user]);

  // Load + subscribe donations
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('live_donations')
        .select('id, donor_name, amount, message, created_at')
        .eq('session_id', id).order('created_at', { ascending: false }).limit(50);
      setDonations((data as any) || []);
    })();
    const channel = supabase
      .channel(`live-donations-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_donations', filter: `session_id=eq.${id}` },
        (payload) => setDonations(prev => [payload.new as any, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Load Jitsi script + mount
  useEffect(() => {
    if (!session?.jitsi_room || !containerRef.current) return;
    // PPV gate: no montar el stream si es de pago y no se ha desbloqueado
    const isPaid = session.pricing_mode === 'paid' && (session.price ?? 0) > 0;
    if (isPaid && !unlocked) return;

    const mount = () => {
      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: session.jitsi_room,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: false },
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ['microphone','camera','chat','tileview','hangup'] },
      });
      apiRef.current.addEventListener('readyToClose', () => navigate('/live'));
    };

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      const s = document.createElement('script');
      s.src = 'https://meet.jit.si/external_api.js';
      s.async = true;
      s.onload = mount;
      document.body.appendChild(s);
    }

    return () => {
      try { apiRef.current?.dispose(); } catch { /* noop */ }
      apiRef.current = null;
    };
  }, [session?.jitsi_room, navigate, unlocked]);

  const sendDonation = async () => {
    if (!session || donAmount <= 0) return;
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      const { error } = await supabase.from('live_donations').insert({
        session_id: session.id,
        user_id:    uid,
        donor_name: sess.session?.user?.user_metadata?.name || 'Anónimo',
        amount:     donAmount,
        currency:   'EUR',
        message:    donMessage || null,
      });
      if (error) { addToast({ type: 'error', message: error.message }); setSending(false); return; }
      addToast({ type: 'success', message: '¡Gracias por tu donación!' });
      setShowDonate(false);
      setDonMessage('');
    } finally {
      setSending(false);
    }
  };

  // Abre el paso de pago (o redirige a login)
  const startUnlock = () => {
    if (!isAuthenticated || !user) {
      addToast({ type: 'error', message: 'Inicia sesión para comprar el acceso' });
      navigate('/auth');
      return;
    }
    setShowPay(true);
  };

  // Tras el pago (real de Stripe o demo): registra escrow, persiste el acceso y desbloquea
  const finalizeAccess = async (paymentId: string) => {
    if (!session || !user) return;
    const price = session.price ?? 0;
    recordTransaction({
      performerId: session.host_id,
      performerName: session.host_name || 'Anfitrión',
      clientId: user.id,
      clientName: user.name,
      concept: `Acceso PPV · ${session.title} (${paymentId})`,
      gross: price,
      status: 'pending',
      source: 'course',
    });
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        await supabase.from('live_access').insert({
          session_id: session.id, user_id: uid, amount: price, currency: 'EUR',
        });
      }
    } catch { /* fallback si la tabla no existe */ }
    setUnlocked(true);
    setShowPay(false);
    addToast({ type: 'success', message: `Acceso desbloqueado · €${price.toFixed(2)}` });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
  );
  if (!session) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Live no encontrado</p>
      <button onClick={() => navigate('/live')} className="btn-orange">Volver</button>
    </div>
  );

  const isPaid = session.pricing_mode === 'paid' && (session.price ?? 0) > 0;
  const canWatch = !isPaid || unlocked;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/live')} className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{session.title}</div>
          <div className="text-xs text-gray-400 truncate">{session.host_name}</div>
        </div>
        <button onClick={() => setShowDonate(true)} className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Heart className="w-4 h-4" /> Apoyar
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-0">
        {/* Jitsi / PPV paywall */}
        <div className="aspect-video lg:aspect-auto lg:h-[calc(100vh-60px)] bg-black relative">
          {canWatch ? (
            <div ref={containerRef} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="max-w-sm w-full text-center">
                {session.cover_url && (
                  <img src={session.cover_url} alt={session.title} className="w-full h-40 object-cover rounded-2xl mb-5 opacity-80" />
                )}
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-orange flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-pink-400 mb-1">Evento de pago · PPV</p>
                <h2 className="font-black text-2xl mb-2">{session.title}</h2>
                <p className="text-gray-400 text-sm mb-5">Desbloquea el acceso para ver este directo en exclusiva.</p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-left space-y-2">
                  {['Acceso completo al directo en HD', 'Chat y apoyos en vivo', 'Acceso desde cualquier dispositivo'].map(b => (
                    <div key={b} className="flex items-center gap-2 text-sm text-gray-200">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {b}
                    </div>
                  ))}
                </div>

                {!showPay ? (
                  <>
                    <button
                      onClick={startUnlock}
                      className="w-full bg-brand-orange hover:opacity-90 text-white font-black rounded-xl py-4 text-base flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25"
                    >
                      <Lock className="w-4 h-4" /> Desbloquear acceso · €{(session.price ?? 0).toFixed(2)}
                    </button>
                    <p className="text-[11px] text-gray-500 mt-3 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Pago seguro · comisión de plataforma incluida
                    </p>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl p-4 text-gray-900 text-left">
                    {loadingIntent ? (
                      <div className="flex items-center gap-3 py-2"><Loader2 className="w-5 h-5 animate-spin text-pink-500" /><span className="text-sm text-gray-500">Conectando con Stripe…</span></div>
                    ) : clientSecret && stripeReady ? (
                      <StripePayment
                        clientSecret={clientSecret}
                        total={session.price ?? 0}
                        onSuccess={(pi) => finalizeAccess(`stripe-${pi}`)}
                        onError={(msg) => addToast({ type: 'error', message: msg })}
                      />
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700 mb-3">🧪 Pago en modo demo — no se cobra dinero real. Configura <code>VITE_STRIPE_PUBLISHABLE_KEY</code> para activar el cobro.</div>
                        <button
                          onClick={() => finalizeAccess('demo')}
                          className="w-full bg-brand-orange text-white font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" /> Pagar €{(session.price ?? 0).toFixed(2)}
                        </button>
                      </>
                    )}
                    <button onClick={() => setShowPay(false)} className="w-full text-center text-[11px] text-gray-400 mt-2 hover:text-gray-600">Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Donations feed */}
        <aside className="bg-[#0f0f1e] border-l border-gray-800 max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="sticky top-0 bg-[#0f0f1e] border-b border-gray-800 px-4 py-3">
            <div className="font-bold text-sm">💝 Apoyos en vivo</div>
            {typeof session.total_donations === 'number' && session.total_donations > 0 && (
              <div className="text-xs text-pink-400 mt-1">Total: €{session.total_donations.toFixed(2)}</div>
            )}
          </div>
          {donations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">Sé el primero en apoyar</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {donations.map(d => (
                <li key={d.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{d.donor_name || 'Anónimo'}</span>
                    <span className="text-pink-400 font-bold text-sm">€{d.amount.toFixed(2)}</span>
                  </div>
                  {d.message && <div className="text-xs text-gray-400 mt-1">{d.message}</div>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Donate modal */}
      {showDonate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4" onClick={() => setShowDonate(false)}>
          <div className="bg-white dark:bg-[#0f0f1e] text-gray-900 dark:text-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Heart className="text-pink-500" /> Apoyar este live</h3>
              <button onClick={() => setShowDonate(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DONATION_PRESETS.map(v => (
                <button key={v} onClick={() => setDonAmount(v)}
                  className={`py-3 rounded-xl font-bold border-2 ${donAmount === v ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-600' : 'border-gray-200 dark:border-gray-700'}`}>
                  €{v}
                </button>
              ))}
            </div>
            <input type="number" min="1" value={donAmount} onChange={e => setDonAmount(Number(e.target.value))} className="input-field" placeholder="Cantidad personalizada" />
            <input type="text" value={donMessage} onChange={e => setDonMessage(e.target.value)} placeholder="Mensaje (opcional)" className="input-field" />
            <button onClick={sendDonation} disabled={sending || donAmount <= 0} className="btn-orange w-full flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? 'Enviando...' : `Enviar €${donAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSessionPage;
