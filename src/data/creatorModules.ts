// Módulos que un artista/bailarín/etc. puede añadir a su panel.
// Pago ÚNICO: 20€ por módulo, o 50€ el Pack Full (todos incluidos).
export interface CreatorModule { id: string; emoji: string; name: string; desc: string; price: number; }

export const MODULE_PRICE = 20;
export const FULL_PACK_PRICE = 50;

export const CREATOR_MODULES: CreatorModule[] = [
  { id: 'reservas',      emoji: '📅', name: 'Reservas',              desc: 'Calendario y reservas online para tus clases y shows.', price: MODULE_PRICE },
  { id: 'contratacion',  emoji: '🤝', name: 'Zona de contratación',  desc: 'Recibe solicitudes y cierra bolos desde tu perfil.',   price: MODULE_PRICE },
  { id: 'pagos',         emoji: '💳', name: 'Pasarelas de pago',     desc: 'Cobra con tarjeta y PayPal, con escrow seguro.',       price: MODULE_PRICE },
  { id: 'cursos',        emoji: '🎓', name: 'Cursos y clases',       desc: 'Publica y vende tus cursos de baile.',                 price: MODULE_PRICE },
  { id: 'transmisiones', emoji: '📡', name: 'Transmisiones online',  desc: 'Directos y clases en vídeo para tu comunidad.',        price: MODULE_PRICE },
  { id: 'perfil-pro',    emoji: '⭐', name: 'Perfil PRO destacado',  desc: 'Aparece destacado y con tu enlace personalizado.',     price: MODULE_PRICE },
];

export const FULL_PACK: CreatorModule = { id: 'full', emoji: '🚀', name: 'Pack Full', desc: 'Todos los módulos incluidos. Todo en uno.', price: FULL_PACK_PRICE };

export const moduleById = (id: string) => CREATOR_MODULES.find(m => m.id === id);
