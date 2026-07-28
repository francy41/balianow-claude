import React, { useMemo, useState } from 'react';
import { X, Users, Copy, Check, Minus, Plus, Share2 } from 'lucide-react';
import { useUIStore } from '../store/appStore';

interface SplitPaymentModalProps {
  open: boolean;
  onClose: () => void;
  defaultAmount?: number;
  defaultConcept?: string;
  shareUrl?: string;
}

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  open,
  onClose,
  defaultAmount = 0,
  defaultConcept = 'Mesa VIP en BailaNow',
  shareUrl,
}) => {
  const { addToast } = useUIStore();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bailanow.com';

  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [concept, setConcept] = useState(defaultConcept);
  const [people, setPeople] = useState(4);
  const [copied, setCopied] = useState(false);

  const total = parseFloat(amount) || 0;
  const link = shareUrl || `${origin}/promocionate`;

  // Reparto equitativo: el resto de céntimos lo asume el organizador (tú).
  const shares = useMemo(() => {
    if (total <= 0 || people <= 0) return [];
    const base = Math.floor((total / people) * 100) / 100;
    const remainder = Math.round((total - base * people) * 100) / 100;
    return Array.from({ length: people }, (_, i) => ({
      label: i === 0 ? 'Tú' : `Amigo ${i}`,
      amount: i === 0 ? Math.round((base + remainder) * 100) / 100 : base,
    }));
  }, [total, people]);

  if (!open) return null;

  const perPerson = people > 0 ? Math.round((total / people) * 100) / 100 : 0;

  const message =
    `🍾 ${concept}\n` +
    `Total: €${total.toFixed(2)} entre ${people} = €${perPerson.toFixed(2)} cada uno.\n` +
    `Reserva y paga tu parte aquí 👉 ${link}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ message: 'No se pudo copiar', type: 'error' });
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </span>
            Dividir el pago
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Divide una mesa VIP, entrada o reserva entre tu grupo y comparte para que cada uno pague su parte.
          </p>

          {/* Concepto */}
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Concepto</label>
          <input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            className="w-full mb-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />

          {/* Importe + personas */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Total (€)</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Personas</label>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setPeople(p => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold shadow-sm hover:bg-gray-100 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center font-black text-gray-900 dark:text-white">{people}</span>
                <button
                  onClick={() => setPeople(p => Math.min(50, p + 1))}
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold shadow-sm hover:bg-gray-100 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Resultado por persona */}
          <div className="rounded-2xl bg-emerald-500 p-4 text-center mb-3">
            <p className="text-white/80 text-[11px] uppercase font-bold tracking-wide">Cada persona paga</p>
            <p className="text-white font-black text-3xl mt-0.5">€{perPerson.toFixed(2)}</p>
            <p className="text-white/70 text-[11px] mt-0.5">€{total.toFixed(2)} entre {people}</p>
          </div>

          {/* Detalle */}
          {shares.length > 0 && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 mb-4 max-h-40 overflow-y-auto">
              {shares.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{s.label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">€{s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={total <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl py-2.5 text-sm hover:border-emerald-400 transition-all disabled:opacity-50"
            >
              {copied ? <><Check className="w-4 h-4 text-green-500" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
            </button>
            <button
              onClick={handleWhatsApp}
              disabled={total <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white font-bold rounded-xl py-2.5 text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentModal;
