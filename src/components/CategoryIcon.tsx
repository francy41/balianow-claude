import React from 'react';

/**
 * Set de iconos de trazo propio para las categorías del Home — la excepción de marca
 * del sistema de iconos (DESIGN_AUDIT.md §4): mismo grosor de trazo (2px) y caja óptica
 * (24px) que el resto de la app, pero dibujados a medida en vez de reusar Lucide.
 * Si el nombre de la categoría no tiene icono propio, se usa el emoji real de la BD
 * (`fallback`) — nunca se pierde información por una categoría nueva sin mapear.
 */

const stroke: React.SVGProps<SVGSVGElement> = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
};

// La pieza insignia: pareja bailando en cierre, para Bailarines / Planes Para Bailar / Salsa / Bachata / Kizomba.
const Dancers = () => (
  <svg {...stroke}>
    <circle cx="8.5" cy="4.5" r="1.6" />
    <circle cx="16" cy="3.2" r="1.6" />
    <path d="M8.5 7c-1.6 0-2.6 1.3-2.6 2.8v3.4l-1.6 5.6" />
    <path d="M8.5 7c1.3 0 2.1.7 2.6 1.7l2.3 1.6" />
    <path d="M16 5.5c-1.7 0-2.8 1.1-2.8 2.6 0 1 .5 1.7 1.3 2.3l3.9 2.8-.9 5.6" />
    <path d="M13.5 10.4l-2 2.4-1.3 6" />
  </svg>
);
const Nearby = () => (
  <svg {...stroke}>
    <circle cx="12" cy="12" r="2.4" />
    <circle cx="12" cy="12" r="8" strokeOpacity="0.5" />
    <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22" />
  </svg>
);
const Cities = () => (
  <svg {...stroke}>
    <path d="M4 21V9l5-4v16" /><path d="M14 21V4l6 3v14" />
    <path d="M4 21h16" /><path d="M8 9h.01M8 13h.01M8 17h.01" />
    <path d="M17 9h.01M17 13h.01M17 17h.01" />
  </svg>
);
const Ticket = () => (
  <svg {...stroke}>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
    <path d="M13 6v2M13 11v2M13 16v2" />
  </svg>
);
const Mic = () => (
  <svg {...stroke}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4M9 22h6" />
  </svg>
);
const Bag = () => (
  <svg {...stroke}>
    <path d="M6 8h12l1 12.5a2 2 0 0 1-2 1.5H7a2 2 0 0 1-2-1.5L6 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
const Megaphone = () => (
  <svg {...stroke}>
    <path d="M3 10v4a1 1 0 0 0 1 1h2l9 5V4l-9 5H4a1 1 0 0 0-1 1z" />
    <path d="M17 9.5a4 4 0 0 1 0 5" />
  </svg>
);
const LiveSignal = () => (
  <svg {...stroke}>
    <circle cx="12" cy="12" r="2.6" />
    <path d="M8.3 15.7a5.5 5.5 0 0 1 0-7.4M15.7 8.3a5.5 5.5 0 0 1 0 7.4" />
    <path d="M5.6 18.4a9.5 9.5 0 0 1 0-12.8M18.4 5.6a9.5 9.5 0 0 1 0 12.8" strokeOpacity="0.55" />
  </svg>
);
const Chat = () => (
  <svg {...stroke}>
    <path d="M4 5h16v11H8l-4 4V5z" />
    <path d="M8 9h8M8 12.5h5" />
  </svg>
);
const Rocket = () => (
  <svg {...stroke}>
    <path d="M12 2c3 2 4.5 5.5 4.5 9 0 2-1 4-2 5l-5 0c-1-1-2-3-2-5 0-3.5 1.5-7 4.5-9z" />
    <circle cx="12" cy="9" r="1.6" />
    <path d="M9 16l-3 5 4-2M15 16l3 5-4-2" />
  </svg>
);
const Handshake = () => (
  <svg {...stroke}>
    <path d="M2 12l4-4 3 2 4-3 3 2 4-3 2 2" />
    <path d="M6 10l4 5.5a1.6 1.6 0 0 0 2.3.3l.5-.4a1.6 1.6 0 0 0 .3-2.2" />
    <path d="M13.5 14.5l1 .9a1.5 1.5 0 0 0 2.2-.2l.3-.4" />
  </svg>
);
const GradCap = () => (
  <svg {...stroke}>
    <path d="M2 8l10-4 10 4-10 4-10-4z" />
    <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
    <path d="M22 8v6" />
  </svg>
);
const People = () => (
  <svg {...stroke}>
    <circle cx="9" cy="7" r="3" /><circle cx="17" cy="8" r="2.4" />
    <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
    <path d="M15.5 14a4 4 0 0 1 4.5 4v2" />
  </svg>
);

const ICONS: Record<string, React.FC> = {
  'cerca de mí': Nearby,
  'ciudades': Cities,
  'eventos': Ticket,
  'artistas': Mic,
  'bailarines': Dancers,
  'marketplace': Bag,
  'promociónate': Megaphone,
  'en directo': LiveSignal,
  'comunidad': Chat,
  'planes para bailar': Dancers,
  'proyectos': Rocket,
  'ofertas': Handshake,
  'anuncios': Megaphone,
  'academia': GradCap,
  'chat': Chat,
  'salsa': Dancers,
  'bachata': Dancers,
  'kizomba': Dancers,
  'pareja de baile': People,
};

export const CategoryIcon: React.FC<{ name: string; fallback: string; className?: string }> = ({ name, fallback, className }) => {
  const Icon = ICONS[name.trim().toLowerCase()];
  if (!Icon) return <span className={className}>{fallback}</span>;
  return (
    <span className={className}>
      <Icon />
    </span>
  );
};

export default CategoryIcon;
