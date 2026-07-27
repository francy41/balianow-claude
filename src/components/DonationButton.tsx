import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Heart, X, Loader2 } from 'lucide-react';
import { createDonationCheckout } from '../lib/payments';
import { useUIStore } from '../store/appStore';

// Rutas donde NO mostramos el botón (áreas privadas / de gestión / checkout)
const HIDE_PREFIXES = ['/admin', '/auth', '/dashboard', '/wallet', '/chat', '/partner', '/pago-exitoso'];
const AMOUNTS = [3, 5, 10, 20];

const DonationButton: React.FC = () => {
  const loc = useLocation();
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(5);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const hidden = HIDE_PREFIXES.some(p => loc.pathname === p || loc.pathname.startsWith(p + '/'));
  if (hidden) return null;

  const donate = async () => {
    const value = custom ? parseFloat(custom) : amount;
    if (!Number.isFinite(value) || value < 1) { addToast({ message: 'Elige un importe (mín. 1€)', type: 'error' }); return; }
    setLoading(true);
    try {
      const res = await createDonationCheckout({ amount: value, message: message.trim() || undefined });
      if (res.notConfigured) { addToast({ message: 'Las donaciones estarán disponibles muy pronto 🙌', type: 'info' }); setLoading(false); return; }
      if (res.url) { window.location.href = res.url; return; }
      throw new Error(res.error || 'No se pudo iniciar la donación');
    } catch (e) {
      addToast({ message: (e as Error).message, type: 'error' });
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante parpadeante */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Donar a BailaNow"
        className="fixed left-4 bottom-24 lg:bottom-6 z-40 flex items-center gap-2 group"
      >
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-60 animate-ping" />
          <span className="relative w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-fuchsia-600 shadow-lg shadow-fuchsia-600/40 flex items-center justify-center animate-pulse group-hover:animate-none">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </span>
        </span>
        <span className="hidden sm:inline bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-bold rounded-full px-3 py-1.5 shadow-md border border-gray-100 dark:border-gray-700">
          Donar ❤️
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !loading && setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-black text-xl text-gray-900 dark:text-white">Apoya a BailaNow ❤️</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Tu donación mantiene viva la comunidad de danza latina.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-5">
              {AMOUNTS.map(a => (
                <button key={a} onClick={() => { setAmount(a); setCustom(''); }}
                  className={`rounded-xl py-3 font-black text-sm transition ${!custom && amount === a ? 'bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
                  {a}€
                </button>
              ))}
            </div>

            <input value={custom} onChange={e => setCustom(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
              placeholder="Otra cantidad (€)"
              className="w-full mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-fuchsia-500" />

            <input value={message} onChange={e => setMessage(e.target.value)} maxLength={140}
              placeholder="Mensaje (opcional)"
              className="w-full mt-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-fuchsia-500" />

            <button onClick={donate} disabled={loading}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl py-3.5 disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" fill="currentColor" />}
              {loading ? 'Redirigiendo…' : `Donar ${custom ? (parseFloat(custom) || '') + '€' : amount + '€'}`}
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-2">Pago seguro con Stripe · tarjeta</p>
          </div>
        </div>
      )}
    </>
  );
};

export default DonationButton;
