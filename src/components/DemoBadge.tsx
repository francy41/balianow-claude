import React from 'react';
import { isClaimed } from '../lib/ownership';

// Sello "Ejemplo" para contenido demo sin dueño (user_id NULL).
// No muestra nada si el perfil ya está reclamado por un dueño real.
const DemoBadge: React.FC<{ ownerId?: string | null; className?: string }> = ({ ownerId, className = '' }) =>
  isClaimed(ownerId) ? null : (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black shadow ${className}`}
      title="Perfil de ejemplo — aún sin dueño verificado. ¿Es tuyo? Recláma gratis."
    >
      ✨ Ejemplo
    </span>
  );

export default DemoBadge;
