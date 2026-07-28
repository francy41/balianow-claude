import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, fmtEur } from '../../lib/payments';
import { Lock, AlertCircle } from 'lucide-react';

/* ── Inner form (needs stripe context) ── */
const StripeForm: React.FC<{
  total: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}> = ({ total, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pago-exitoso`,
      },
      redirect: 'if_required',
    });

    if (error) {
      const msg = error.message ?? 'Error procesando el pago';
      setErrorMsg(msg);
      onError(msg);
      setLoading(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'auto', email: 'auto' } },
          terms: { card: 'never' },
        }}
      />

      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-brand-orange text-white font-black rounded-xl py-4 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
        ) : (
          <><Lock className="w-4 h-4" /> Pagar {fmtEur(total)} con tarjeta</>
        )}
      </button>

      <p className="text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Pago cifrado con TLS · Procesado por Stripe
      </p>
    </form>
  );
};

/* ── Exported wrapper ── */
const StripePayment: React.FC<{
  clientSecret: string;
  total: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}> = ({ clientSecret, total, onSuccess, onError }) => {
  const stripe = getStripe();

  if (!stripe) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center text-sm text-yellow-700">
        ⚠️ Stripe no está configurado. Añade <code>VITE_STRIPE_PUBLISHABLE_KEY</code> en .env.local
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#EC4899',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '12px',
            spacingUnit: '4px',
          },
        },
        locale: 'es',
      }}
    >
      <StripeForm total={total} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
};

export default StripePayment;
