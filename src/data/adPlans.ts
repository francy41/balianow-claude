// ── PLANES DE NEGOCIO EN BAILANOW ────────────────────────────────────────
// Fuente única de verdad de las tarifas para negocios. La usan tanto la
// sección "Promociónate" como la página dedicada "Precios para negocios".
// El pago/contratación se gestiona por chat.

export interface AdPlan {
  id: string;
  name: string;
  icon: string;
  price: number;
  period: string;
  gradient: string;
  tagline: string;
  popular?: boolean;
  features: string[];
}

export const AD_PLANS: AdPlan[] = [
  {
    id: 'destacado',
    name: 'Destacado',
    icon: '⭐',
    price: 19,
    period: '/semana',
    gradient: 'from-pink-500 to-rose-600',
    tagline: 'Visibilidad instantánea',
    features: [
      'Tu perfil/evento en "Lo más destacado" del home',
      'Logo en el mapa interactivo',
      'Badge ⭐ Destacado en tu ficha',
    ],
  },
  {
    id: 'patrocinador',
    name: 'Patrocinador',
    icon: '🏆',
    price: 49,
    period: '/semana',
    gradient: 'from-fuchsia-500 to-purple-600',
    tagline: 'Empieza a operar',
    popular: true,
    features: [
      'Todo lo de Destacado',
      '📅 Sistema de reservas para tu negocio',
      '🔳 Código QR propio (local, eventos, mesas)',
      'Prioridad en "Cerca de mí" y listados',
      'Badge 🏆 Patrocinador oficial',
    ],
  },
  {
    id: 'top-premium',
    name: 'Top Premium',
    icon: '🚀',
    price: 99,
    period: '/semana',
    gradient: 'from-amber-500 to-orange-600',
    tagline: 'Negocio completo',
    features: [
      'Todo lo de Patrocinador',
      '🛒 Ventas online · tu tienda en BailaNow',
      '📊 Estadísticas y métricas de tu negocio',
      '1er lugar en los resultados de búsqueda',
      'Banner destacado en la home + push a tu ciudad',
    ],
  },
];

// Precio semanal → mensual aproximado (×52/12).
export const monthlyPrice = (weekly: number) => Math.round((weekly * 52) / 12);
