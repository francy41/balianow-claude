import React, { useState } from 'react';
import { X, Shield, Calendar as CalIcon, Lock, Briefcase } from 'lucide-react';
import { useAuthStore, useUIStore, usePerformerStore, useSiteConfigStore, splitAmount, computeCommissionRate, type Transaction } from '../store/appStore';
import { useNavigate } from 'react-router-dom';

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
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const { recordTransaction } = usePerformerStore();
  const { commissions } = useSiteConfigStore();
  const navigate = useNavigate();
  const [concept, setConcept] = useState(defaultConcept);
  const [price, setPrice] = useState(String(defaultPrice));
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const gross = parseFloat(price) || 0;
  const rate = computeCommissionRate(commissions, source as any, false);
  const { commission, net } = splitAmount(gross, rate);

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
    recordTransaction({
      performerId: providerId,
      performerName: providerName,
      clientId: user.id,
      clientName: user.name,
      concept: notes.trim() ? `${concept.trim()} — ${notes.trim()}` : concept.trim(),
      gross,
      status: 'pending',  // queda en escrow hasta que el comprador confirme OK
      source,
    });
    addToast({
      message: `Reserva confirmada · €${gross} en escrow · ${providerName} recibirá €${net} al completar`,
      type: 'success'
    });
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-brand-orange to-orange-500 text-white p-5 flex items-center justify-between">
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

          {/* Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pago bruto</span>
              <span className="font-bold text-gray-900">€{gross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Comisión plataforma {(rate * 100).toFixed(1)}%</span>
              <span className="text-brand-orange font-semibold">€{commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
              <span className="text-gray-600">Recibe el creador (neto)</span>
              <span className="font-black text-green-600">€{net.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-xs text-gray-700 space-y-1.5">
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
              <CalIcon className="w-4 h-4" /> Confirmar y pagar €{gross.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
