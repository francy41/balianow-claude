import React, { useState } from 'react';
import { X, Shield, Calendar as CalIcon, Lock, Briefcase, Gift } from 'lucide-react';
import { useAuthStore, useUIStore, usePerformerStore, useSiteConfigStore, splitAmount, computeCommissionRate, type Transaction } from '../store/appStore';
import { useNavigate } from 'react-router-dom';

// Fidelización: un % del pago vuelve al wallet del cliente como cashback.
const CASHBACK_RATE = 0.05;

export interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  source: Transaction['source'];        // booking | course | class | offer
  defaultConcept: string;
  defaultPrice: number;
  helperText?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  open, onClose, providerId, providerName, source, defaultConcept, defaultPrice, helperText
}) => {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const { addToast } = useUIStore();
  const { recordTransaction, paymentMethods } = usePerformerStore();
  const { commissions } = useSiteConfigStore();
  const navigate = useNavigate();
  const userPaymentMethods = user ? paymentMethods.filter(p => p.userId === user.id) : [];
  const defaultPM = userPaymentMethods.find(p => p.isDefault) || userPaymentMethods[0];
  const [concept, setConcept] = useState(defaultConcept);
  const [price, setPrice] = useState(String(defaultPrice));
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [payMode, setPayMode] = useState<'full' | 'deposit' | 'installments'>('full');
  const [depositPct, setDepositPct] = useState(30);
  const [installments, setInstallments] = useState(3);

  if (!open) return null;

  const gross = parseFloat(price) || 0;
  const amountNow = payMode === 'deposit'
    ? Math.round(gross * depositPct) / 100
    : payMode === 'installments'
      ? Math.round((gross / installments) * 100) / 100
      : gross;
  const remaining = Math.max(0, gross - amountNow);
  const rate = computeCommissionRate(commissions, source as any, false);
  const { commission, net } = splitAmount(amountNow, rate);
  const cashback = Math.round(amountNow * CASHBACK_RATE * 100) / 100;

  const handleSubmit = () => {
    if (!isAuthenticated || !user) {
      addToast({ message: 'Inicia sesión para contratar', type: 'error' });
      onClose();
      navigate('/auth');
      return;
    }
    if (!concept.trim() || gross <= 0) {
      addToast({ message: 'Completa concepto y precio', type: 'error' });
      return;
    }
    if (!date) {
      addToast({ message: 'Elige una fecha para el servicio', type: 'error' });
      return;
    }
    const baseConcept = notes.trim() ? `${concept.trim()} — ${notes.trim()}` : concept.trim();
    const finalConcept = payMode === 'deposit'
      ? `${baseConcept} · Seña €${amountNow.toFixed(2)} de €${gross.toFixed(2)} (resto €${remaining.toFixed(2)} en el local)`
      : payMode === 'installments'
        ? `${baseConcept} · Plan ${installments} plazos de €${amountNow.toFixed(2)} (total €${gross.toFixed(2)})`
        : baseConcept;
    recordTransaction({
      performerId: providerId,
      performerName: providerName,
      clientId: user.id,
      clientName: user.name,
      concept: finalConcept,
      gross: amountNow,
      status: 'pending',  // queda en escrow hasta que el comprador confirme OK
      source,
    });
    if (cashback > 0) updateUser({ wallet: (user.wallet || 0) + cashback });
    const cashbackNote = cashback > 0 ? ` · +€${cashback.toFixed(2)} cashback` : '';
    const baseMsg = payMode === 'deposit'
      ? `Reserva confirmada con seña · €${amountNow.toFixed(2)} pagados · resto €${remaining.toFixed(2)} en el local`
      : payMode === 'installments'
        ? `Reserva confirmada · 1er plazo €${amountNow.toFixed(2)} pagado · ${installments - 1} plazos restantes`
        : `Reserva confirmada · €${gross.toFixed(2)} en escrow · ${providerName} recibirá €${net.toFixed(2)} al completar`;
    addToast({ message: baseMsg + cashbackNote, type: 'success' });
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-brand-orange to-pink-500 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Contratar</p>
              <h3 className="font-display font-black text-lg leading-tight">{providerName}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Concepto del servicio</label>
            <input value={concept} onChange={e => setConcept(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Precio (€)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-field" placeholder="Hora, ubicación, requisitos especiales..." />
          </div>

          {helperText && <p className="text-xs text-gray-400">{helperText}</p>}

          {/* Forma de reserva: pago completo, seña o cuotas */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">Forma de reserva</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayMode('full')}
                className={`rounded-xl border-2 p-2.5 text-center transition-all ${payMode === 'full' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="block text-xs font-bold text-gray-900">Completo</span>
                <span className="block text-[10px] text-gray-500">€{gross.toFixed(2)}</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMode('deposit')}
                className={`rounded-xl border-2 p-2.5 text-center transition-all ${payMode === 'deposit' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="block text-xs font-bold text-gray-900">Seña</span>
                <span className="block text-[10px] text-gray-500">resto en local</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMode('installments')}
                className={`rounded-xl border-2 p-2.5 text-center transition-all ${payMode === 'installments' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="block text-xs font-bold text-gray-900">En cuotas</span>
                <span className="block text-[10px] text-gray-500">a plazos</span>
              </button>
            </div>
            {payMode === 'installments' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-gray-500">Plazos:</span>
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setInstallments(n)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${installments === n ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange'}`}
                  >
                    {n}×
                  </button>
                ))}
              </div>
            )}
            {payMode === 'deposit' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-gray-500">Seña:</span>
                {[20, 30, 50].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDepositPct(p)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${depositPct === p ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange'}`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment method picker */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Pagar con</span>
              <button onClick={() => { onClose(); navigate('/dashboard'); }} className="text-[10px] text-brand-orange font-bold hover:underline">
                + Añadir método
              </button>
            </div>
            {defaultPM ? (
              <div className="flex items-center gap-2 text-sm">
                {defaultPM.type === 'card' ? (
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">{(defaultPM.brand || 'VISA').toUpperCase()}</span>
                ) : <span className="text-xl">{defaultPM.type === 'paypal' ? '🅿️' : '⚡'}</span>}
                <span className="font-mono text-gray-700">
                  {defaultPM.type === 'card' ? `•••• ${defaultPM.last4}` : defaultPM.account}
                </span>
                <span className="text-xs text-gray-400 ml-auto">Default</span>
              </div>
            ) : (
              <p className="text-xs text-yellow-700">⚠ No tienes método de pago. Se te pedirá al confirmar.</p>
            )}
          </div>

          {/* Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Precio total</span>
              <span className="font-bold text-gray-900">€{gross.toFixed(2)}</span>
            </div>
            {payMode === 'deposit' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pagas ahora (seña {depositPct}%)</span>
                  <span className="font-bold text-gray-900">€{amountNow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Resto en el local</span>
                  <span className="text-gray-500 font-semibold">€{remaining.toFixed(2)}</span>
                </div>
              </>
            )}
            {payMode === 'installments' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pagas ahora (1 de {installments})</span>
                  <span className="font-bold text-gray-900">€{amountNow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Restante en {installments - 1} plazos</span>
                  <span className="text-gray-500 font-semibold">€{remaining.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Comisión plataforma {(rate * 100).toFixed(1)}%</span>
              <span className="text-brand-orange font-semibold">€{commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
              <span className="text-gray-600">Recibe el creador (neto)</span>
              <span className="font-black text-green-600">€{net.toFixed(2)}</span>
            </div>
          </div>

          {cashback > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs">
              <Gift className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-emerald-800 font-semibold">Ganas €{cashback.toFixed(2)} de cashback en tu wallet</span>
              <span className="text-emerald-600 ml-auto font-bold">{(CASHBACK_RATE * 100).toFixed(0)}%</span>
            </div>
          )}

          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-3 text-xs text-gray-700 space-y-1.5">
            <p className="flex items-start gap-2 font-semibold text-gray-900">
              <Shield className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
              Pago retenido en escrow
            </p>
            <p className="text-gray-600 pl-6">
              El dinero queda retenido. Cuando confirmes desde "Mis pedidos" que el servicio fue OK, se liberan los fondos al creador y la plataforma cobra el 15%.
            </p>
            <p className="flex items-center gap-1.5 text-gray-500 pl-6">
              <Lock className="w-3 h-3" /> Comunicación 100% por chat interno
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm">
              Cancelar
            </button>
            <button onClick={handleSubmit} className="flex-[2] bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <CalIcon className="w-4 h-4" /> {payMode === 'deposit' ? `Reservar con seña €${amountNow.toFixed(2)}` : payMode === 'installments' ? `Pagar 1er plazo €${amountNow.toFixed(2)}` : `Confirmar y pagar €${gross.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
