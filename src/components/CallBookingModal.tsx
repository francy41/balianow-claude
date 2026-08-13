import React from 'react';
import { X, Phone } from 'lucide-react';
import GhlBookingWidget from './GhlBookingWidget';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CallBookingModal: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2"><Phone className="w-5 h-5 text-brand-orange" /> Reserva una llamada</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Elige día y hora, un miembro de nuestro equipo te llamará.</p>
        <GhlBookingWidget />
      </div>
    </div>
  );
};

export default CallBookingModal;
