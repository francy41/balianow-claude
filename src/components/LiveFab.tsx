/**
 * LiveFab — Botón flotante "Emitir en directo" visible en cada categoría
 *
 * Se monta una sola vez por página (es position:fixed). Si el usuario tiene
 * rol de creador, abre GoLiveModal. Si no, redirige a auth o muestra toast.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store/appStore';
import GoLiveModal from './GoLiveModal';

interface Props {
  /** Para pre-rellenar el tipo del live al abrir el modal */
  category?: 'show' | 'class' | 'event' | 'jam' | 'workshop';
  /** Texto del botón. Por defecto "Iniciar Live" */
  label?: string;
  /** Posición vertical desde el borde inferior (px). Default: 88px (encima de BottomNav) */
  bottom?: number;
  /** Posición horizontal desde la izquierda (px). Default: 16 */
  left?: number;
}

const LiveFab: React.FC<Props> = ({ category = 'show', label = 'Iniciar Live', bottom = 88, left = 16 }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);

  const canGoLive = isAuthenticated && user &&
    ['dj', 'artist', 'dancer', 'instructor', 'venue', 'business', 'promoter', 'admin', 'superadmin'].includes(user.role);

  const handleClick = () => {
    if (!isAuthenticated) {
      addToast({ message: 'Inicia sesión para emitir en directo', type: 'warning' });
      navigate('/auth');
      return;
    }
    if (!canGoLive) {
      addToast({ message: 'Tu perfil aún es de usuario. Cambia tu rol a DJ / artista / bailarín / instructor para emitir.', type: 'warning' });
      navigate('/perfil');
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        style={{ bottom, left }}
        className="fixed z-40 bg-gradient-to-r from-red-500 via-pink-500 to-fuchsia-600 text-white font-black text-sm pl-3 pr-4 py-3 rounded-full shadow-2xl shadow-pink-500/40 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
        aria-label={label}
      >
        <span className="relative flex items-center justify-center w-7 h-7 bg-white/20 rounded-full">
          <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
          <Radio className="w-4 h-4 relative" />
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">LIVE</span>
      </button>

      <GoLiveModal open={open} onClose={() => setOpen(false)} initialCategory={category} />
    </>
  );
};

export default LiveFab;
