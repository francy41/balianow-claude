/**
 * ClassPackageBookingModal — reserva de un paquete de clase compartida.
 * El comprador elige un paquete (Privada/Dúo/Grupo), invita a los demás
 * participantes (búsqueda de usuarios o email) y paga. La plataforma retiene
 * la comisión global (superadmin) y el instructor recibe el resto.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Users, Search, Loader2, Check, Plus, Trash2, Shield, CreditCard, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { useCommissionPercent, splitAmount } from '../lib/commission';
import { getStripe, createStripePaymentIntent } from '../lib/payments';
import StripePayment from './payment/StripePayment';

export interface ClassPkg {
  id: string; name: string; capacity: number; price: number; currency: string;
  duration_minutes: number; description: string; includes: string[];
}
interface Participant { user_id?: string; email?: string; name?: string; }
interface ArtistLite { id: string; name: string; userId?: string; avatar?: string; classPackages?: ClassPkg[]; }

interface Props { artist: ArtistLite; onClose: () => void; }

const ClassPackageBookingModal: React.FC<Props> = ({ artist, onClose }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const commission = useCommissionPercent();

  const packages = artist.classPackages || [];
  const [selected, setSelected] = useState<ClassPkg | null>(packages.length === 1 ? packages[0] : null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [step, setStep] = useState<'pick' | 'pay' | 'done'>('pick');
  const [method, setMethod] = useState<'card' | 'wallet'>('card');
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const stripeReady = !!getStripe();

  // búsqueda de usuarios
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slotsToInvite = selected ? Math.max(0, selected.capacity - 1) : 0;
  const breakdown = selected ? splitAmount(selected.price, commission) : null;

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    // Búsqueda solo por nombre — buscar por email permitiría a cualquier usuario
    // enumerar los emails de otras personas probando fragmentos ("gmail.com"...).
    // Invitar por email conocido sigue disponible aparte, vía addEmail().
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${q}%`)
      .limit(6);
    setSearching(false);
    setResults((data || []).filter(p => p.id !== user?.id));
  }, [user]);

  const onQuery = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 300);
  };

  const addParticipant = (p: Participant) => {
    if (participants.length >= slotsToInvite) { addToast({ type: 'warning', message: 'Cupo de invitados completo' }); return; }
    if (p.user_id && participants.some(x => x.user_id === p.user_id)) return;
    if (p.email && participants.some(x => x.email === p.email)) return;
    setParticipants([...participants, p]);
    setQuery(''); setResults([]);
  };
  const removeParticipant = (i: number) => setParticipants(participants.filter((_, idx) => idx !== i));

  const addEmail = () => {
    const e = query.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { addToast({ type: 'error', message: 'Email no válido' }); return; }
    addParticipant({ email: e, name: e.split('@')[0] });
  };

  const goToPay = () => {
    if (!selected) return;
    if (!isAuthenticated) { addToast({ type: 'error', message: 'Inicia sesión para reservar' }); return; }
    if (!artist.userId) { addToast({ type: 'error', message: 'Este instructor aún no tiene cuenta vinculada para recibir reservas' }); return; }
    if (participants.length < slotsToInvite) {
      addToast({ type: 'warning', message: `Invita a ${slotsToInvite} participante${slotsToInvite > 1 ? 's' : ''} antes de continuar` });
      return;
    }
    setStep('pay');
  };

  // Intenta crear un PaymentIntent real de Stripe al entrar al pago con tarjeta.
  // Si Stripe no está configurado (o falla/timeout), se queda en modo demo.
  useEffect(() => {
    if (step !== 'pay' || method !== 'card' || !stripeReady || clientSecret || !selected) return;
    let cancelled = false;
    setLoadingIntent(true);
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('demo')), 4000));
    Promise.race([
      createStripePaymentIntent({
        amount: selected.price,
        currency: (selected.currency || 'EUR').toLowerCase(),
        items: [{ serviceId: selected.id, sellerId: artist.userId || artist.id, sellerName: artist.name, title: selected.name, price: selected.price, extrasTotal: 0 }],
        userId: user?.id ?? 'guest',
      }),
      timeout,
    ])
      .then((r: any) => { if (!cancelled && r?.clientSecret) setClientSecret(r.clientSecret); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingIntent(false); });
    return () => { cancelled = true; };
  }, [step, method, stripeReady, clientSecret, selected, artist, user]);

  // Crea la reserva confirmada tras un pago exitoso (real o demo).
  const createBooking = async (paymentId: string) => {
    if (!selected) return;
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmitting(false); addToast({ type: 'error', message: 'Sesión expirada, vuelve a entrar' }); return; }

    const jitsiRoom = `bailanow-clase-${artist.id.slice(0, 6)}-${Date.now()}`;
    const { error } = await supabase.from('class_bookings').insert({
      student_id: session.user.id,
      vendor_id: artist.userId,
      status: 'confirmed',
      amount_paid: selected.price,
      currency: selected.currency || 'EUR',
      platform_fee: breakdown?.fee ?? null,
      payment_id: paymentId,
      participants,
      package_id: selected.id,
      package_name: selected.name,
      capacity: selected.capacity,
      jitsi_room: jitsiRoom,
      notes: `Paquete de clase: ${selected.name} (${selected.capacity}p) con ${artist.name}`,
    });
    setSubmitting(false);
    if (error) { addToast({ type: 'error', message: `No se pudo reservar: ${error.message}` }); return; }
    addToast({ type: 'success', message: '✅ Pago completado y clase reservada' });
    setStep('done');
  };

  // Pago demo (cuando Stripe no está configurado) o wallet.
  const payDemo = async () => {
    await new Promise(r => setTimeout(r, 900));
    await createBooking(`${method}-demo-${Date.now()}`);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-brand-orange flex-shrink-0">
          <div>
            <h2 className="text-white font-black text-lg leading-tight">Reservar clase</h2>
            <p className="text-white/80 text-xs">con {artist.name}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 'pay' ? (
            <div className="space-y-5">
              {/* Resumen */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="font-black text-gray-900">{selected?.name}</p>
                <p className="text-xs text-gray-500">{selected?.capacity === 1 ? 'Privada' : selected?.capacity === 2 ? 'Dúo' : `Grupo (${selected?.capacity})`} · {selected?.duration_minutes}min · con {artist.name}</p>
                {participants.length > 0 && <p className="text-xs text-gray-400 mt-1">Invitados: {participants.map(p => p.name || p.email).join(', ')}</p>}
              </div>
              {/* Método */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Método de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {([['card', '💳', 'Tarjeta'], ['wallet', '👛', 'Wallet']] as const).map(([id, emoji, label]) => (
                    <button key={id} onClick={() => setMethod(id)}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${method === id ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}>
                      <span className="text-2xl">{emoji}</span><span className="text-xs font-bold text-gray-800">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {breakdown && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Total a pagar</span><span className="font-black text-gray-900">€{breakdown.total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Comisión plataforma ({commission}%)</span><span className="text-gray-500">€{breakdown.fee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">El instructor recibe</span><span className="text-green-600 font-semibold">€{breakdown.net.toFixed(2)}</span></div>
                </div>
              )}
              {/* Pago */}
              {method === 'card' ? (
                loadingIntent ? (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"><Loader2 className="w-5 h-5 animate-spin text-pink-500" /><span className="text-sm text-gray-500">Conectando con Stripe…</span></div>
                ) : clientSecret && stripeReady ? (
                  <StripePayment
                    clientSecret={clientSecret}
                    total={selected?.price ?? 0}
                    onSuccess={(pi) => createBooking(`stripe-${pi}`)}
                    onError={(msg) => addToast({ type: 'error', message: msg })}
                  />
                ) : (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700">🧪 Pago en modo demo — no se cobra dinero real. Añade <code>VITE_STRIPE_PUBLISHABLE_KEY</code> para activar el cobro real.</div>
                    <button onClick={payDemo} disabled={submitting} className="w-full bg-brand-orange text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />} Pagar €{(selected?.price ?? 0).toFixed(2)}
                    </button>
                  </>
                )
              ) : (
                <button onClick={payDemo} disabled={submitting} className="w-full bg-brand-orange text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />} Pagar €{(selected?.price ?? 0).toFixed(2)} con Wallet
                </button>
              )}
            </div>
          ) : step === 'done' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><Check className="w-8 h-8 text-green-600" /></div>
              <h3 className="font-black text-xl text-gray-900 mb-1">¡Reserva creada!</h3>
              <p className="text-sm text-gray-500 mb-4">Se notificará al instructor y a los participantes invitados. La sala en directo se generó automáticamente.</p>
              <button onClick={onClose} className="bg-brand-orange text-white font-black px-6 py-3 rounded-2xl mx-auto flex items-center gap-2"><Video className="w-4 h-4" /> Entendido</button>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Este instructor todavía no ofrece paquetes de clase.</div>
          ) : (
            <>
              {/* Paquetes */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Elige tu paquete</p>
                <div className="space-y-2">
                  {packages.map(p => {
                    const on = selected?.id === p.id;
                    return (
                      <button key={p.id} onClick={() => { setSelected(p); setParticipants([]); }}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${on ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" /> {p.capacity === 1 ? 'Privada' : p.capacity === 2 ? 'Dúo' : `Grupo (${p.capacity})`} · {p.duration_minutes}min</p>
                            {p.description && <p className="text-xs text-gray-400 mt-1">{p.description}</p>}
                          </div>
                          <span className="font-black text-pink-600 text-xl">€{p.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Invitar participantes */}
              {selected && slotsToInvite > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                    Invita a {slotsToInvite} participante{slotsToInvite > 1 ? 's' : ''} ({participants.length}/{slotsToInvite})
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={query} onChange={e => onQuery(e.target.value)} placeholder="Busca por nombre o escribe un email…"
                      className="w-full pl-9 pr-20 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    {searching
                      ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      : query.includes('@') && <button onClick={addEmail} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded-lg flex items-center gap-1"><Plus className="w-3 h-3" /> Email</button>}
                  </div>
                  {results.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                      {results.map(r => (
                        <button key={r.id} onClick={() => addParticipant({ user_id: r.id, name: r.full_name || 'Usuario' })}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-pink-50 text-left">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{(r.full_name || '?')[0]}</div>}
                          </div>
                          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{r.full_name || 'Usuario'}</span>
                          <Plus className="w-4 h-4 text-pink-500" />
                        </button>
                      ))}
                    </div>
                  )}
                  {participants.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {participants.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="flex-1 text-sm text-gray-700 truncate">{p.name || p.email}</span>
                          <button onClick={() => removeParticipant(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Desglose */}
              {breakdown && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Precio del paquete</span><span className="font-bold text-gray-900">€{breakdown.total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Comisión plataforma ({commission}%)</span><span className="text-gray-500">€{breakdown.fee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">El instructor recibe</span><span className="text-green-600 font-semibold">€{breakdown.net.toFixed(2)}</span></div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(step === 'pick' || step === 'pay') && packages.length > 0 && (
          <div className="border-t border-gray-100 p-4 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
              <p className="font-black text-2xl text-gray-900">€{(selected?.price ?? 0).toFixed(2)}</p>
            </div>
            {step === 'pick' ? (
              <button onClick={goToPay} disabled={!selected}
                className="bg-brand-orange text-white font-black px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 disabled:opacity-40">
                Continuar al pago <CreditCard className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => { setStep('pick'); setClientSecret(''); }} className="text-sm font-bold text-gray-600 border border-gray-200 px-5 py-3 rounded-2xl hover:bg-gray-50">
                ← Atrás
              </button>
            )}
          </div>
        )}
        {(step === 'pick' || step === 'pay') && (
          <div className="px-4 pb-3 flex items-center justify-center gap-2 text-[10px] text-gray-400 bg-gray-50">
            <Shield className="w-3 h-3" /> Pago protegido · comunicación por chat interno
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassPackageBookingModal;
