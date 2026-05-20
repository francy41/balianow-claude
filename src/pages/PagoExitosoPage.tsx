import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, LayoutDashboard } from 'lucide-react';

/**
 * Página de éxito tras pago con Stripe (redirect_url)
 * Se muestra cuando Stripe redirige al usuario después de confirmar el pago
 */
const PagoExitosoPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentIntentId = params.get('payment_intent');
  const status = params.get('redirect_status');
  const [countdown, setCountdown] = useState(5);

  const isSuccess = status === 'succeeded' || !status;

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {isSuccess ? (
          <>
            {/* Success animation */}
            <div className="relative mx-auto w-28 h-28 mb-6">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-40" />
              <div className="relative w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">¡Pago completado! 🎉</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base mb-2">
              Tu pago se ha procesado con éxito. Los vendedores han sido notificados y comenzarán a trabajar en tus servicios.
            </p>

            {paymentIntentId && (
              <p className="text-xs text-gray-400 font-mono mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 inline-block">
                Ref: {paymentIntentId.slice(-12).toUpperCase()}
              </p>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 mb-6 border border-gray-100 dark:border-gray-800 text-left space-y-3">
              {[
                { icon: '📧', text: 'Recibirás un email de confirmación' },
                { icon: '⏱️', text: 'Los vendedores tienen 24h para confirmar' },
                { icon: '💬', text: 'Puedes chatear directamente con ellos' },
                { icon: '🛡️', text: 'Tu pago está protegido en escrow hasta confirmar' },
              ].map(item => (
                <div key={item.icon} className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{item.text}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Redirigiendo a tu dashboard en <span className="font-bold text-pink-500">{countdown}s</span>...
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <Home className="w-4 h-4" /> Inicio
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold py-3 rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25"
              >
                <LayoutDashboard className="w-4 h-4" /> Mi Dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Error state */}
            <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Pago no completado</h1>
            <p className="text-gray-500 mb-6">
              El pago no se ha podido procesar. No se ha realizado ningún cargo. Puedes intentarlo de nuevo.
            </p>
            <button
              onClick={() => navigate('/promocionate')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold py-3 rounded-xl"
            >
              <ArrowRight className="w-4 h-4" /> Volver a intentarlo
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PagoExitosoPage;
