import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { createPayPalOrder, capturePayPalOrder, fmtEur } from '../../lib/payments';
import type { PaymentItem, SellerPayout } from '../../lib/payments';
import { AlertCircle } from 'lucide-react';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;

/* ── Inner buttons ── */
const PayPalButtonsInner: React.FC<{
  items: PaymentItem[];
  total: number;
  userId: string;
  sellerBreakdown: SellerPayout[];
  onSuccess: (captureId: string) => void;
  onError: (msg: string) => void;
}> = ({ items, total, userId, sellerBreakdown, onSuccess, onError }) => {
  const [{ isPending }] = usePayPalScriptReducer();
  const [errorMsg, setErrorMsg] = useState('');

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-4 gap-2 text-gray-400">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-sm">Cargando PayPal...</span>
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <PayPalButtons
        style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 }}
        fundingSource={undefined}
        createOrder={async () => {
          try {
            const result = await createPayPalOrder({ amount: total, items, userId });
            return result.orderId;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error creando orden';
            setErrorMsg(msg);
            throw err;
          }
        }}
        onApprove={async (data) => {
          try {
            const result = await capturePayPalOrder({
              orderId: data.orderID,
              userId,
              sellerBreakdown,
            });
            if (result.success) onSuccess(result.captureId);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error capturando pago';
            setErrorMsg(msg);
            onError(msg);
          }
        }}
        onError={(err) => {
          const msg = String(err) || 'Error en PayPal';
          setErrorMsg(msg);
          onError(msg);
        }}
        onCancel={() => setErrorMsg('Pago cancelado')}
      />

      <p className="text-center text-[10px] text-gray-400 mt-2">
        Pago procesado por PayPal · Protección al comprador incluida
      </p>
    </>
  );
};

/* ── Exported wrapper ── */
const PayPalPayment: React.FC<{
  items: PaymentItem[];
  total: number;
  userId: string;
  sellerBreakdown: SellerPayout[];
  onSuccess: (captureId: string) => void;
  onError: (msg: string) => void;
}> = (props) => {
  if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID.includes('REEMPLAZA')) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center text-sm text-yellow-700">
        ⚠️ PayPal no está configurado. Añade <code>VITE_PAYPAL_CLIENT_ID</code> en .env.local
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: 'EUR',
        locale: 'es_ES',
        intent: 'capture',
        components: 'buttons',
        'enable-funding': 'paylater',
        'disable-funding': 'card,venmo',
      }}
    >
      <PayPalButtonsInner {...props} />
    </PayPalScriptProvider>
  );
};

export default PayPalPayment;
