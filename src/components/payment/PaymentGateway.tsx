/**
 * PaymentGateway — Checkout modal premium
 * Stripe · PayPal · Wallet BailaNow
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, CreditCard, Wallet, ShieldCheck, ChevronDown, ChevronUp,
  CheckCircle, Lock, Sparkles, ArrowRight,
} from 'lucide-react';
import { useAuthStore, useUIStore, useCartStore, useOrdersStore } from '../../store/appStore';
import { calcSellerBreakdown, fmtEur, createStripePaymentIntent } from '../../lib/payments';
import type { SellerPayout, PaymentItem } from '../../lib/payments';
import StripePayment from './StripePayment';
import PayPalPayment from './PayPalPayment';

type PayMethod = 'card' | 'paypal' | 'wallet';

/* ════════════════════════════
   SUCCESS SCREEN
   ════════════════════════════ */
const SuccessScreen: React.FC<{
  breakdown: SellerPayout[];
  total: number;
  provider: string;
  onClose: () => void;
}> = ({ breakdown, total, provider, onClose }) => (
  <div className="p-6 text-center">
    {/* Animated checkmark */}
    <div className="relative mx-auto w-24 h-24 mb-5">
      <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
      <div className="relative w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
    </div>

    <h2 className="font-black text-2xl text-gray-900 mb-1">¡Pago completado!</h2>
    <p className="text-gray-400 text-sm mb-1">
      Procesado con <span className="font-semibold text-gray-600 capitalize">{provider}</span>
    </p>
    <p className="font-black text-3xl text-transparent bg-clip-text bg-brand-orange mb-6">
      {fmtEur(total)}
    </p>

    {/* Payout breakdown */}
    <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-left">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-pink-400" /> Distribución automática a vendedores
      </p>
      <div className="space-y-2">
        {breakdown.map(s => (
          <div key={s.sellerId} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
            <img
              src={s.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.sellerName)}&background=EC4899&color=fff`}
              alt={s.sellerName} className="w-9 h-9 rounded-full flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{s.sellerName}</p>
              <p className="text-[10px] text-gray-400">
                {fmtEur(s.gross)} − {fmtEur(s.commission)} comisión
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-green-600">{fmtEur(s.net)}</p>
              <p className="text-[9px] text-gray-400">recibido ✓</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-pink-400" /> Comisión BailaNow (15%)
        </span>
        <span className="text-sm font-black text-pink-500">
          {fmtEur(breakdown.reduce((s, b) => s + b.commission, 0))}
        </span>
      </div>
    </div>

    <button onClick={onClose}
      className="w-full bg-brand-orange text-white font-black rounded-2xl py-4 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2">
      Ver mis pedidos <ArrowRight className="w-4 h-4" />
    </button>
    <p className="text-[10px] text-gray-400 mt-3">Recibirás un email de confirmación en breve</p>
  </div>
);

/* ════════════════════════════
   MAIN GATEWAY
   ════════════════════════════ */
const PaymentGateway: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const cart = useCartStore();
  const ordersStore = useOrdersStore();
  const navigate = useNavigate();

  // Handler: cierra modal y navega al dashboard
  const handleGoToDashboard = () => {
    onClose();
    navigate('/dashboard?tab=orders');
  };

  const [method, setMethod] = useState<PayMethod>('card');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [completedProvider, setCompletedProvider] = useState('');
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedBreakdown, setCompletedBreakdown] = useState<SellerPayout[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);

  const items = cart.items;
  const subtotal = cart.getSubtotal();
  const commission = cart.getCommission();

  const paymentItems: PaymentItem[] = items.map(i => ({
    serviceId: i.serviceId,
    sellerId: i.sellerId,
    sellerName: i.sellerName,
    title: i.title,
    price: i.price,
    extrasTotal: i.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0),
  }));

  const breakdown = calcSellerBreakdown(paymentItems).map(b => ({
    ...b,
    sellerAvatar: items.find(i => i.sellerId === b.sellerId)?.sellerAvatar ?? '',
  }));

  // Crear stripe intent cuando se elige tarjeta — con timeout 4s para no colgar
  useEffect(() => {
    if (!open || method !== 'card' || clientSecret || subtotal <= 0) return;
    setLoadingIntent(true);
    setIntentError('');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Modo demo (sin Stripe configurado)')), 4000)
    );
    Promise.race([
      createStripePaymentIntent({ amount: subtotal, items: paymentItems, userId: user?.id ?? 'guest' }),
      timeoutPromise,
    ])
      .then((r: any) => setClientSecret(r.clientSecret))
      .catch(e => setIntentError(e.message || 'Stripe en modo demo'))
      .finally(() => setLoadingIntent(false));
  }, [open, method]);

  useEffect(() => {
    if (!open) {
      setCompleted(false);
      setCompletedProvider('');
      setCompletedTotal(0);
      setCompletedBreakdown([]);
      setClientSecret('');
      setIntentError('');
    }
  }, [open]);

  const handleSuccess = (provider: string) => {
    setCompletedTotal(subtotal);
    setCompletedBreakdown(breakdown);
    setCompleted(true);
    setCompletedProvider(provider);
    // Guardar la orden en el store de pedidos
    ordersStore.addOrder({
      paymentProvider: provider,
      total: subtotal,
      items: items.map(i => ({
        serviceId: i.serviceId,
        title: i.title,
        sellerName: i.sellerName,
        sellerAvatar: i.sellerAvatar,
        price: i.price + i.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0),
      })),
      sellerBreakdown: breakdown,
    });
    cart.clearCart();
    addToast({ message: '¡Pago completado! Los vendedores han sido notificados.', type: 'success' });
  };

  const handleWalletPay = () => {
    setWalletLoading(true);
    setTimeout(() => { setWalletLoading(false); handleSuccess('Wallet BailaNow'); }, 1800);
  };

  if (!open) return null;

  const walletBalance = user?.wallet ?? 0;
  const hasEnoughWallet = walletBalance >= subtotal;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {completed ? (
          <SuccessScreen breakdown={completedBreakdown} total={completedTotal} provider={completedProvider} onClose={handleGoToDashboard} />
        ) : (
          <>
            {/* ── HEADER ── */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <h2 className="font-black text-xl text-gray-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-pink-500" /> Checkout seguro
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {items.length} servicio{items.length > 1 ? 's' : ''} · BailaNow Promociónate
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* ── ORDER SUMMARY ── */}
              <div className="bg-gradient-to-br from-pink-50 via-fuchsia-50 to-rose-50 rounded-2xl p-4 border border-pink-100/60">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{items.length} servicio{items.length > 1 ? 's' : ''} de promoción</p>
                    <p className="font-black text-3xl text-gray-900 mt-0.5">{fmtEur(subtotal)}</p>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2 text-right shadow-sm border border-pink-100">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold">Comisión BailaNow</p>
                    <p className="text-sm font-black text-pink-500">{fmtEur(commission)}</p>
                    <p className="text-[9px] text-gray-400">15% incluida</p>
                  </div>
                </div>

                {/* Items mini-list */}
                <div className="space-y-1.5 mb-3">
                  {items.map(item => {
                    const ext = item.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0);
                    return (
                      <div key={item.id} className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2">
                        <img src={item.sellerAvatar} alt={item.sellerName} className="w-6 h-6 rounded-full flex-shrink-0" />
                        <span className="text-xs text-gray-700 flex-1 truncate">{item.title}</span>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{fmtEur(item.price + ext)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Breakdown toggle */}
                <button onClick={() => setShowBreakdown(v => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-fuchsia-600 font-bold hover:text-fuchsia-700 transition-colors">
                  {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showBreakdown ? 'Ocultar' : 'Ver'} distribución a vendedores
                </button>

                {showBreakdown && (
                  <div className="mt-3 space-y-2 animate-[fadeIn_0.2s_ease]">
                    {breakdown.map(s => (
                      <div key={s.sellerId} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-gray-100">
                        <img src={s.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.sellerName)}&background=EC4899&color=fff`}
                          alt={s.sellerName} className="w-8 h-8 rounded-full" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{s.sellerName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-gray-400">{fmtEur(s.gross)}</span>
                            <span className="text-[9px] text-red-400">− {fmtEur(s.commission)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-green-600">{fmtEur(s.net)}</p>
                          <p className="text-[9px] text-gray-400">recibe</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── PAYMENT METHOD SELECTOR ── */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Método de pago
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'card' as PayMethod,
                      emoji: '💳',
                      label: 'Tarjeta',
                      sub: 'Stripe · Visa · MC',
                      gradient: 'bg-blue-500',
                    },
                    {
                      id: 'paypal' as PayMethod,
                      emoji: '🅿️',
                      label: 'PayPal',
                      sub: 'Cuenta PayPal',
                      gradient: 'bg-yellow-400',
                    },
                    {
                      id: 'wallet' as PayMethod,
                      emoji: '👛',
                      label: 'Wallet',
                      sub: fmtEur(walletBalance),
                      gradient: 'bg-pink-500',
                    },
                  ].map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all ${
                        method === pm.id
                          ? 'border-transparent shadow-lg scale-[1.03]'
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:scale-[1.01]'
                      }`}
                      style={method === pm.id ? { background: 'white', borderColor: 'transparent', boxShadow: '0 0 0 2px #EC4899' } : {}}
                    >
                      {method === pm.id && (
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${pm.gradient} opacity-5`} />
                      )}
                      <span className="text-2xl relative z-10">{pm.emoji}</span>
                      <p className="text-xs font-black text-gray-900 relative z-10">{pm.label}</p>
                      <p className="text-[9px] text-gray-400 relative z-10">{pm.sub}</p>
                      {method === pm.id && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── PAYMENT FORMS ── */}
              <div className="min-h-[140px]">
                {/* STRIPE — modo demo siempre disponible */}
                {method === 'card' && (
                  <div className="space-y-3">
                    {loadingIntent && (
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <p className="text-xs text-gray-500 flex-1">Verificando pasarela…</p>
                        <button onClick={() => { setIntentError('Demo'); setLoadingIntent(false); }}
                          className="text-[10px] text-pink-600 font-bold underline">
                          Saltar
                        </button>
                      </div>
                    )}
                    {/* Botón de simulación SIEMPRE visible para pruebas */}
                    {!loadingIntent && !clientSecret && (
                      <>
                        <div className="bg-amber-500 border border-amber-200 rounded-2xl p-3 mb-2">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-lg">🧪</span>
                            <div>
                              <p className="text-xs font-bold text-amber-800">Modo de pruebas activo</p>
                              <p className="text-[11px] text-amber-700">Pago simulado — no se cobra dinero real. Stripe se conectará automáticamente cuando esté configurado.</p>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleSuccess('Stripe Demo')}
                          className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-600 to-rose-600 text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 shadow-2xl shadow-pink-500/30 active:scale-95 transition-all">
                          <CreditCard className="w-5 h-5" />
                          <span>Pagar {fmtEur(subtotal)} ahora</span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full ml-1">DEMO</span>
                        </button>
                      </>
                    )}
                    {clientSecret && !loadingIntent && (
                      <StripePayment
                        clientSecret={clientSecret}
                        total={subtotal}
                        onSuccess={() => handleSuccess('Stripe')}
                        onError={msg => addToast({ message: msg, type: 'error' })}
                      />
                    )}
                  </div>
                )}

                {/* PAYPAL */}
                {method === 'paypal' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-center gap-3">
                      <span className="text-2xl">🅿️</span>
                      <div>
                        <p className="text-xs font-bold text-blue-800">Pago seguro con PayPal</p>
                        <p className="text-[11px] text-blue-600">Protección al comprador incluida · Devolucion garantizada</p>
                      </div>
                    </div>
                    <PayPalPayment
                      items={paymentItems}
                      total={subtotal}
                      userId={user?.id ?? 'guest'}
                      sellerBreakdown={breakdown}
                      onSuccess={() => handleSuccess('PayPal')}
                      onError={msg => addToast({ message: msg, type: 'error' })}
                    />
                  </div>
                )}

                {/* WALLET */}
                {method === 'wallet' && (
                  <div className="space-y-3">
                    {/* Balance card */}
                    <div className="bg-brand-orange rounded-2xl p-4 text-white relative overflow-hidden">
                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                      <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="w-4 h-4 opacity-80" />
                          <p className="text-xs font-bold opacity-80">Wallet BailaNow</p>
                        </div>
                        <p className="font-black text-3xl">{fmtEur(walletBalance)}</p>
                        <p className="text-xs opacity-70 mt-0.5">Saldo disponible</p>
                      </div>
                    </div>

                    {/* Balance check */}
                    {hasEnoughWallet ? (
                      <div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-green-800">Saldo suficiente</p>
                            <p className="text-[11px] text-green-600">
                              Quedarán {fmtEur(walletBalance - subtotal)} tras el pago
                            </p>
                          </div>
                        </div>
                        <button onClick={handleWalletPay} disabled={walletLoading}
                          className="w-full bg-brand-orange text-white font-black rounded-2xl py-4 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-60">
                          {walletLoading
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
                            : <><Wallet className="w-4 h-4" /> Pagar {fmtEur(subtotal)} con Wallet</>
                          }
                        </button>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                        <p className="text-sm font-bold text-amber-800 mb-1">Saldo insuficiente</p>
                        <p className="text-xs text-amber-600 mb-3">
                          Te faltan <span className="font-black">{fmtEur(subtotal - walletBalance)}</span> para completar el pago
                        </p>
                        <button onClick={() => setMethod('card')}
                          className="text-xs font-bold text-pink-500 border border-pink-200 px-4 py-2 rounded-xl hover:bg-pink-50 transition-all">
                          Pagar con tarjeta →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── SECURITY BADGES ── */}
              <div className="flex items-center justify-center gap-5 pt-1 pb-1">
                {[
                  { icon: <ShieldCheck className="w-3 h-3 text-green-500" />, label: 'SSL 256-bit' },
                  { icon: <Lock className="w-3 h-3 text-blue-500" />, label: 'Escrow seguro' },
                  { icon: <ShieldCheck className="w-3 h-3 text-pink-500" />, label: 'GDPR' },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-1 text-[10px] text-gray-400">
                    {b.icon} {b.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentGateway;
