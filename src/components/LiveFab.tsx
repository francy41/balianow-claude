import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import GoLiveModal from './GoLiveModal';

interface Props {
  defaultCategory?: 'show' | 'class' | 'event' | 'jam' | 'workshop';
  label?: string;
  className?: string;
}

const LiveFab: React.FC<Props> = ({ defaultCategory = 'show', label, className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`fixed bottom-36 lg:bottom-6 right-4 z-40 bg-brand-orange text-white font-bold rounded-full px-5 py-3 shadow-lg shadow-pink-500/40 flex items-center gap-2 active:scale-95 transition-transform ${className}`}>
        <Radio className="w-5 h-5 animate-pulse" />
        <span className="text-sm">{label || 'Iniciar Live'}</span>
      </button>
      <GoLiveModal isOpen={open} onClose={() => setOpen(false)} defaultCategory={defaultCategory} />
    </>
  );
};

export default LiveFab;
