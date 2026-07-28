// ── PLANES DE NEGOCIO EN BAILANOW ────────────────────────────────────────
// Fuente única de verdad de las tarifas para negocios. La usan tanto la
// sección "Promociónate" como la página dedicada "Precios para negocios".
// El pago/contratación se gestiona por chat. Facturación mensual, sin permanencia.

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
    id: 'starter',
    name: 'Starter',
    icon: '🚀',
    price: 100,
    period: '/mes',
    gradient: 'bg-green-500',
    tagline: 'Empieza a crecer',
    features: [
      'Perfil/evento destacado en el home',
      'Logo en el mapa interactivo',
      'Badge ⭐ Destacado en tu ficha',
      '🎬 1 vídeo + 🖼️ 4 flyers al mes',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: '📈',
    price: 200,
    period: '/mes',
    gradient: 'bg-amber-500',
    tagline: 'Más clientes y reservas',
    popular: true,
    features: [
      'Todo lo de Starter',
      '📅 Sistema de reservas + 🔳 código QR',
      'Prioridad en "Cerca de mí" y listados',
      '🎬 2 vídeos + 🖼️ 6 flyers al mes',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: '💎',
    price: 400,
    period: '/mes',
    gradient: 'bg-red-500',
    tagline: 'Máximos ingresos',
    features: [
      'Todo lo de Growth',
      '🛒 Ventas online + 📊 estadísticas',
      '1er lugar en búsquedas + banner en la home + push',
      '🎬 4 vídeos + 🖼️ 8 flyers al mes',
    ],
  },
];

// Micro-plan para usuarios y ofertantes: destacar UNA publicación al top por 1 mes.
export const AD_BOOST = {
  price: 5,
  period: '/mes',
  name: 'Destaca tu anuncio',
};
