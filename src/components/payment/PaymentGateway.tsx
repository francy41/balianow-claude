/**
 * PaymentGateway — Modal de pago unificado Stripe + PayPal
 * Sustituye al CheckoutModal mock. Soporta:
 *  - Tarjeta (Stripe Elements)
 *  - PayPal (PayPal Buttons)
 *  - Wallet BailaNow (saldo interno)
 * Muestra distribución de pagos a vendedores con comisión 15%.
 */
import React, { useState, useEffect } from 'react';
import { X, CreditCard, Wallet, ShieldCheck, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useAuthStore, useUIStore, useCartStore } from '../../store/appStore';
import {
  createStripePaymentIntent,
  calcSellerBreakdown,
  fmtEur,
  PLATFORM_FEE,
} from '../../lib/payments';
import type { SellerPayout, PaymentItem } from '../../lib/payments';
import StripePayment from './StripePayment';
import PayPalPayment from './PayPalPayment';

type PayMethod = 'card' | 'paypal' | 'wallet';

/* ── Success Screen ── */
const SuccessScreen: React.FC<{
  breakdown: SellerPayout[];
  total: number;
  provider: string;
  onClose: () => void;
}> = ({ breakdown, total, provider, onClose }) => (
  <div className="p-8 text-center">
    <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center animate-[bounceIn_0.5s_ease]">
      <CheckCircle className="w-10 h-10 text-green-500" />
    </div>
    <h2 className="font-black text-2xl text-gray-900 mb-1">¡Pago completado!</h2>
    <p className="text-gray-500 text-sm mb-1">Procesado con <span className="font-semibold capitalize">{provider}</span></p>
    <p className="text-pink-500 font-black text-2xl mb-6">{fmtEur(total)}</p>

    <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-3">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distribución automática</p>
      {breakdown.map(s => (
        <div key={s.sellerId} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <img src={s.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.sellerName)}&background=EC4899&color=fff`}
            alt={s.sellerName} className="w-9 h-9 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{s.sellerName}</p>
            <p className="text-[10px] text-gray-400">
              Bruto {fmtEur(s.gross)} − comisión {fmtEur(s.commission)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-green-600">{fmtEur(s.net)}</p>
            <p className="text-[9px] text-gray-400">recibe</p>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <span className="text-xs text-gray-500">Comisión BailaNow (15%)</span>
        <span className="text-sm font-black text-pink-500">
          {fmtEur(breakdown.reduce((s, b) => s + b.commission, 0))}
        </span>
      </div>
    </div>

    <button onClick={onClose} className="btn-orange w-full">Ver mis pedidos</button>
    <p className="text-[10px] text-gray-400 mt-3">Recibirás un email de confirmación con los detalles</p>
  </div>
);

/* ── Main Gateway ── */
const PaymentGateway: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const cart = useCartStore();

  const [method, setMethod] = useState<PayMethod>('card');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [completedProvider, setCompletedProvider] = useState('');

  const items = cart.items;
  const subtotal = cart.getSubtotal();
  const commission = cart.getCommission();
  const breakdown = calcSellerBreakdown(
    items.map(i => ({
      serviceId: i.serviceId,
      sellerId: i.sellerId,
      sellerName: i.sellerName,
      title: i.title,
      price: i.price,
      extrasTotal: i.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0),
    }))
  ).map(b => ({
    ...b,
    sellerAvatar: items.find(i => i.sellerId === b.sellerId)?.sellerAvatar ?? '',
  }));

  const paymentItems: PaymentItem[] = items.map(i => ({
    serviceId: i.serviceId,
    sellerId: i.sellerId,
    sellerName: i.sellerName,
    title: i.title,
    price: i.price,
    extrasTotal: i.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0),
  }));

  // Crear Payment Intent cuando se selecciona tarjeta
  useEffect(() => {
    if (!open || method !== 'card' || clientSecret) return;
    if (subtotal <= 0) return;

    setLoadingIntent(true);
    setIntentError('');

    createStripePaymentIntent({
      amount: subtotal,
      items: paymentItems,
      userId: user?.id ?? 'guest',
    })
      .then(result => setClientSecret(result.clientSecret))
      .catch(err => setIntentError(err.message))
      .finally(() => setLoadingIntent(false));
  }, [open, method, subtotal]);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setCompleted(false);
      setClientSecret('');
      setIntentError('');
    }
  }, [open]);

  const handleSuccess = (provider: string) => {
    setCompleted(true);
    setCompletedProvider(provider);
    addToast({ message: '¡Pago completado! Los vendedores han sido notificados.', type: 'success' });
    cart.clearCart();
  };

  const handleWalletPay = () => {
    // Simula pago con wallet interno
    setTimeout(() => handleSuccess('Wallet BailaNow'), 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {completed ? (
          <SuccessScreen
            breakdown={breakdown}
            total={subtotal}
            provider={completedProvider}
            onClose={onClose}
          />
        ) : (
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-xl text-gray-900">Checkout seguro</h2>
                <p className="text-xs text-gray-400 mt-0.5">{items.length} servicio{items.length > 1 ? 's' : ''} · BailaNow</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price summary */}
            <div className="bg-gradient-to-r from-pink-50 to-fuchsia-50 rounded-2xl p-4 mb-5 border border-pink-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{items.length} servicio{items.length > 1 ? 's' : ''}</p>
                  <p className="font-black text-2xl text-gray-900">{fmtEur(subtotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Comisión plataforma</p>
                  <p className="text-sm font-bold text-pink-500">{fmtEur(commission)} (15%)</p>
                  <p className="text-[10px] text-gray-400">incluida en el precio</p>
                </div>
              </div>

              {/* Seller breakdown toggle */}
              <button
                onClick={() => setShowBreakdown(v => !v)}
                className="flex items-center gap-1 text-[11px] text-pink-500 font-semibold mt-2"
              >
                {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Ver distribución a vendedores
              </button>

              {showBreakdown && (
                <div className="mt-3 space-y-2">
                  {breakdown.map(s => (
                    <div key={s.sellerId} className="flex items-center justify-between bg-white rounded-xl p-2.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={s.sellerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.sellerName)}&background=EC4899&color=fff`}
                          alt={s.sellerName} className="w-7 h-7 rounded-full"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-gray-900">{s.sellerName}</p>
                          <p className="text-[9px] text-gray-400">−15% comisión</p>
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

            {/* Payment method selector */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Método de pago</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { id: 'card' as PayMethod, icon: '💳', label: 'Tarjeta', badge: 'Stripe' },
                { id: 'paypal' as PayMethod, icon: '🅿️', label: 'PayPal', badge: '' },
                { id: 'wallet' as PayMethod, icon: '👛', label: 'Wallet', badge: '' },
              ].map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    method === pm.id
                      ? 'border-pink-500 bg-pink-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="text-xs font-bold text-gray-900">{pm.label}</span>
                  {pm.badge && (
                    <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{pm.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Payment form */}
            <div className="mb-4">
              {method === 'card' && (
                <>
                  {loadingIntent && (
                    <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
                      <span className="text-sm">Conectando con Stripe...</span>
                    </div>
                  )}
                  {intentError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 mb-4">
                      <p className="font-bold mb-1">⚠️ Stripe no está configurado</p>
                      <p className="text-xs">{intentError}</p>
                      <p className="text-xs mt-2">Añade tu <code>STRIPE_SECRET_KEY</code> en las variables de entorno de Supabase.</p>
                    </div>
                  )}
                  {clientSecret && !loadingIntent && (
                    <StripePayment
                      clientSecret={clientSecret}
                      total={subtotal}
                      onSuccess={(id) => handleSuccess('Stripe')}
                      onError={(msg) => addToast({ message: msg, type: 'error' })}
                    />
                  )}
                  {!clientSecret && !loadingIntent && !intentError && (
                    <button
                      onClick={() => setClientSecret('')}
                      className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black rounded-xl py-4 text-sm"
                    >
                      💳 Pagar {fmtEur(subtotal)} con tarjeta
                    </button>
                  )}
                </>
              )}

              {method === 'paypal' && (
                <PayPalPayment
                  items={paymentItems}
                  total={subtotal}
                  userId={user?.id ?? 'guest'}
                  sellerBreakdown={breakdown}
                  onSuccess={(id) => handleSuccess('PayPal')}
                  onError={(msg) => addToast({ message: msg, type: 'error' })}
                />
              )}

              {method === 'wallet' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">Wallet BailaNow</p>
                        <p className="text-xs text-gray-400">Saldo disponible</p>
                      </div>
                    </div>
                    <p className="font-black text-lg text-pink-500">{fmtEur(user?.wallet ?? 0)}</p>
                  </div>
                  {(user?.wallet ?? 0) >= subtotal ? (
                    <button
                      onClick={handleWalletPay}
                      className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black rounded-xl py-4 text-sm flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" /> Pagar {fmtEur(subtotal)} con Wallet
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                      Saldo insuficiente. Necesitas {fmtEur(subtotal - (user?.wallet ?? 0))} más.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <ShieldCheck className="w-3 h-3 text-green-500" /> SSL 256-bit
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <ShieldCheck className="w-3 h-3 text-green-500" /> Pago escrow
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <ShieldCheck className="w-3 h-3 text-green-500" /> GDPR
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGateway;
