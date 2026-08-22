import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Heart, X, Loader2, CreditCard, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createDonationCheckout } from '../lib/payments';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';

const HIDE_PREFIXES = ['/admin', '/auth', '/dashboard', '/wallet', '/chat', '/partner', '/pago-exitoso', '/practicar'];
const AMOUNTS = [1, 3, 5, 10, 20];
const PAYPAL_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

const DonationButton: React.FC = () => {
  const loc = useLocation();
  const { addToast } = useUIStore();
  // Ocultamos el botón mientras el banner de cookies ocupa el borde inferior (evita que lo tape).
  const [consent, setConsent] = useState(() => typeof localStorage !== 'undefined' && !!localStorage.getItem('bailanow-cookie-consent'));
  React.useEffect(() => {
    const onConsent = () => setConsent(true);
    window.addEventListener('bn:cookie-consent', onConsent);
    return () => window.removeEventListener('bn:cookie-consent', onConsent);
  }, []);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'amount' | 'method' | 'done'>('amount');
  const [amount, setAmount] = useState<number>(5);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const hidden = HIDE_PREFIXES.some(p => loc.pathname === p || loc.pathname.startsWith(p + '/'));
  if (hidden || !consent) return null;

  const value = custom ? parseFloat(custom) : amount;
  const validAmount = Number.isFinite(value) && value >= 1;

  const reset = () => { setStep('amount'); setLoading(false); };
  const close = () => { setOpen(false); setTimeout(reset, 200); };

  const payStripe = async () => {
    setLoading(true);
    try {
      const res = await createDonationCheckout({ amount: value, message: message.trim() || undefined });
      if (res.notConfigured) { addToast({ message: 'Los pagos con tarjeta estarán disponibles muy pronto 🙌', type: 'info' }); setLoading(false); return; }
      if (res.url) { window.location.href = res.url; return; }
      throw new Error(res.error || 'sin url');
    } catch (e) {
      // Mensaje amable para el donante; el detalle técnico va a la consola.
      console.error('[donación stripe]', e);
      addToast({ message: 'Ahora mismo no podemos procesar el pago. Inténtalo en unos minutos 🙏', type: 'info' });
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Donar a BailaNow" className="fixed left-3 bottom-44 lg:bottom-6 z-[45] flex items-center gap-2 group">
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-60 animate-ping" />
          <span className="relative w-12 h-12 rounded-full bg-brand-orange shadow-lg shadow-fuchsia-600/40 flex items-center justify-center animate-pulse group-hover:animate-none">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </span>
        </span>
        <span className="hidden sm:inline bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-bold rounded-full px-3 py-1.5 shadow-md border border-gray-100 dark:border-gray-700">Donar ❤️</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !loading && close()}>
          <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            {step === 'done' ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
                <h3 className="font-display font-black text-xl text-gray-900 dark:text-white">¡Gracias por tu donación! ❤️</h3>
                <p className="text-gray-500 text-sm mt-1">Tu apoyo mantiene viva la comunidad de BailaNow.</p>
                <button onClick={close} className="mt-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl px-6 py-2.5">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {step === 'method' && <button onClick={() => setStep('amount')} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></button>}
                    <div>
                      <h3 className="font-display font-black text-xl text-gray-900 dark:text-white">Apoya a BailaNow ❤️</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{step === 'amount' ? 'Desde 1€. Elige cuánto quieres aportar.' : `Vas a donar ${value}€. Elige cómo pagar.`}</p>
                    </div>
                  </div>
                  <button onClick={close} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                {step === 'amount' && (
                  <>
                    <div className="grid grid-cols-5 gap-2 mt-5">
                      {AMOUNTS.map(a => (
                        <button key={a} onClick={() => { setAmount(a); setCustom(''); }} className={`rounded-xl py-3 font-black text-sm transition ${!custom && amount === a ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>{a}€</button>
                      ))}
                    </div>
                    <input value={custom} onChange={e => setCustom(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Otra cantidad (mín. 1€)" className="w-full mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-fuchsia-500" />
                    <input value={message} onChange={e => setMessage(e.target.value)} maxLength={140} placeholder="Mensaje (opcional)" className="w-full mt-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-fuchsia-500" />
                    <button onClick={() => validAmount ? setStep('method') : addToast({ message: 'La donación mínima es 1€', type: 'error' })} className="w-full mt-4 bg-brand-orange text-white font-bold rounded-xl py-3.5">Continuar · {validAmount ? value + '€' : '—'}</button>
                  </>
                )}

                {step === 'method' && (
                  <div className="mt-5 space-y-3">
                    <button onClick={payStripe} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl py-3.5 disabled:opacity-60">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />} Pagar con tarjeta
                    </button>
                    <div className="flex items-center gap-2 text-gray-300 text-xs"><span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /> o <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
                    {PAYPAL_ID ? (
                      <PayPalScriptProvider options={{ clientId: PAYPAL_ID, currency: 'EUR', intent: 'capture' }}>
                        <PayPalButtons
                          style={{ layout: 'horizontal', color: 'gold', shape: 'rect', label: 'paypal', height: 46, tagline: false }}
                          createOrder={async () => {
                            const { data, error } = await supabase.functions.invoke('donation-paypal', { body: { action: 'create', amount: value } });
                            if (error || !data?.orderId) throw new Error('No se pudo iniciar PayPal');
                            return data.orderId as string;
                          }}
                          onApprove={async (d) => {
                            const { data } = await supabase.functions.invoke('donation-paypal', { body: { action: 'capture', orderId: d.orderID, message: message.trim() || undefined } });
                            if (data?.success) setStep('done'); else addToast({ message: 'No se pudo completar el pago', type: 'error' });
                          }}
                          onError={() => addToast({ message: 'Error con PayPal, prueba con tarjeta', type: 'error' })}
                        />
                      </PayPalScriptProvider>
                    ) : (
                      <p className="text-center text-xs text-gray-400">PayPal se activará muy pronto.</p>
                    )}
                    <p className="text-center text-[11px] text-gray-400">Pago seguro · tarjeta vía Stripe o PayPal</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DonationButton;
