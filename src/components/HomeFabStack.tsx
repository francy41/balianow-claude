/**
 * HomeFabStack — pila de botones flotantes con menú expansible
 *
 * Botón principal pulsa → despliega N acciones rápidas:
 *  - 🔴 Iniciar Live
 *  - 📍 Ver mapa
 *  - 🔍 Buscar
 *  - 💬 Chat
 *  - 📱 Promociónate
 *
 * Único componente para no llenar la pantalla de FABs sueltos.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Radio, Map, Search, MessageCircle, Megaphone, Calendar, Music } from 'lucide-react';
import GoLiveModal from './GoLiveModal';

interface Action {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

const HomeFabStack: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [goLiveOpen, setGoLiveOpen] = useState(false);

  const actions: Action[] = [
    {
      label: 'Iniciar Live',
      icon: <Radio className="w-5 h-5 animate-pulse" />,
      onClick: () => { setGoLiveOpen(true); setOpen(false); },
      color: 'bg-red-500',
    },
    {
      label: 'Ver mapa',
      icon: <Map className="w-5 h-5" />,
      onClick: () => navigate('/mapa'),
      color: 'bg-cyan-500',
    },
    {
      label: 'Buscar',
      icon: <Search className="w-5 h-5" />,
      onClick: () => { window.dispatchEvent(new Event('bn:open-search')); setOpen(false); },
      color: 'bg-purple-500',
    },
    {
      label: 'Eventos',
      icon: <Calendar className="w-5 h-5" />,
      onClick: () => navigate('/eventos'),
      color: 'bg-orange-500',
    },
    {
      label: 'Artistas',
      icon: <Music className="w-5 h-5" />,
      onClick: () => navigate('/artistas'),
      color: 'bg-violet-500',
    },
    {
      label: 'Promociónate',
      icon: <Megaphone className="w-5 h-5" />,
      onClick: () => navigate('/promocionate'),
      color: 'bg-yellow-400',
    },
    {
      label: 'Chat',
      icon: <MessageCircle className="w-5 h-5" />,
      onClick: () => navigate('/chat'),
      color: 'bg-emerald-500',
    },
  ];

  return (
    <>
      {/* Backdrop al abrir */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Botones de acción (se despliegan en columna) */}
      <div className="fixed bottom-28 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        {actions.map((action, i) => (
          <div
            key={action.label}
            className={`flex items-center gap-3 transition-all duration-300 ${open ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-8 pointer-events-none'}`}
            style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
          >
            <span className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap max-w-[70vw] truncate">
              {action.label}
            </span>
            <button
              onClick={action.onClick}
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform`}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Botón principal toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 right-4 z-40 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 active:scale-95 ${open ? 'bg-gray-800 rotate-45' : 'bg-brand-orange hover:scale-110 shadow-pink-500/50'}`}
        aria-label={open ? 'Cerrar menú' : 'Abrir acciones rápidas'}
      >
        {open ? <X className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
      </button>

      <GoLiveModal isOpen={goLiveOpen} onClose={() => setGoLiveOpen(false)} defaultCategory="show" />
    </>
  );
};

export default HomeFabStack;
