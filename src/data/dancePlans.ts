// Planes de membresía para bailarines + BailaNow TV.
// pareja y familiar permiten varios accesos y la sala de cámaras para practicar juntos.

export interface DancePlan {
  id: 'individual' | 'pareja' | 'familiar';
  name: string;
  price: number;      // €/mes
  seats: number;      // nº de personas
  emoji: string;
  gradient: string;
  popular?: boolean;
  features: string[];
}

export const DANCE_PLANS: DancePlan[] = [
  {
    id: 'individual', name: 'Individual', price: 10, seats: 1, emoji: '💃', gradient: 'from-sky-500 to-blue-600',
    features: ['Todo el catálogo de BailaNow TV', 'Clases en vídeo cuando quieras', 'Sin anuncios'],
  },
  {
    id: 'pareja', name: 'Pareja', price: 16, seats: 2, emoji: '👫', gradient: 'from-orange-500 to-fuchsia-600', popular: true,
    features: ['2 accesos a todo BailaNow TV', 'Sala de cámaras para practicar juntos', 'Interactúa en directo con tu pareja', 'Sin anuncios'],
  },
  {
    id: 'familiar', name: 'Familiar', price: 22, seats: 4, emoji: '👨‍👩‍👧‍👦', gradient: 'from-fuchsia-500 to-purple-600',
    features: ['Hasta 4 accesos a todo BailaNow TV', 'Sala de cámaras para toda la familia', 'Practicad e interactuad juntos', 'Sin anuncios'],
  },
];

export const planById = (id: string) => DANCE_PLANS.find(p => p.id === id);
export const MEMBERSHIP_PLAN_IDS = DANCE_PLANS.map(p => p.id);
