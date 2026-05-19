// ============================================================
// MOCK DATA — BachaSalseros Platform
// ============================================================

export type UserRole = 'user' | 'artist' | 'dj' | 'dancer' | 'venue' | 'admin';

export interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'mix';
  url: string;
  thumbnail: string;
  title?: string;
  duration?: string;
  views?: number;
}

export interface OfferPackage {
  id: string;
  tier: 'basic' | 'standard' | 'premium';
  name: string;
  price: number;
  currency: string;
  deliveryDays: number;
  description: string;
  includes: string[];
  revisions: number;
}

export interface ScheduledStream {
  id: string;
  artistId: string;
  title: string;
  date: string;
  time: string;
  category: string;
  thumbnail: string;
  description: string;
  reminders: number;
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  spotify?: string;
  soundcloud?: string;
  twitch?: string;
}

export interface SocialFollowers {
  instagram?: number;
  tiktok?: number;
  youtube?: number;
  facebook?: number;
  spotify?: number;
  soundcloud?: number;
  twitch?: number;
}

export interface Artist {
  id: string;
  name: string;
  type: 'dj' | 'dancer' | 'singer' | 'band' | 'instructor';
  genre: string[];
  avatar: string;
  cover: string;
  city: string;
  country: string;
  rating: number;
  reviews: number;
  followers: number;
  priceFrom: number;
  currency: string;
  bio: string;
  isLive: boolean;
  isVerified: boolean;
  isPremium: boolean;
  tags: string[];
  social: SocialLinks;
  availability: string[];
  completedBookings: number;
  // ── LIVE NOW & MARKETPLACE EXPANSION ──
  performanceStyle?: string;
  languages?: string[];
  gallery?: MediaItem[];
  packages?: OfferPackage[];
  currentStreamId?: string;
  scheduledStreams?: ScheduledStream[];
  responseTime?: string;
  totalStreams?: number;
  totalStreamHours?: number;
  // ── REDES & VIDEO DESTACADO ──
  socialFollowers?: SocialFollowers;
  featuredVideo?: string;       // URL de YouTube / Vimeo / mp4
  featuredVideoTitle?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venueId: string;
  venueName: string;
  city: string;
  date: string;
  time: string;
  endTime: string;
  cover: string;
  category: string[];
  price: number;
  currency: string;
  capacity: number;
  attending: number;
  isOnline: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  artists: string[];
  lat: number;
  lng: number;
}

export interface Venue {
  id: string;
  name: string;
  type: 'club' | 'bar' | 'studio' | 'restaurant' | 'rooftop' | 'lounge';
  city: string;
  address: string;
  cover: string;
  avatar: string;
  rating: number;
  reviews: number;
  capacity: number;
  isOpen: boolean;
  openHours: string;
  description: string;
  isPremium: boolean;
  amenities: string[];
  lat: number;
  lng: number;
  priceRange: 1 | 2 | 3 | 4;
}

export interface Service {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  deliveryDays: number;
  rating: number;
  reviews: number;
  orders: number;
  cover: string;
  tags: string[];
  includes: string[];
}

export interface LiveStream {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar: string;
  title: string;
  thumbnail: string;
  viewers: number;
  peakViewers: number;
  city: string;
  genre: string;
  category: 'dj' | 'dancer' | 'singer' | 'band' | 'instructor';
  tags: string[];
  startedAt: string;
  isLive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  description?: string;
  reactions?: { type: string; count: number }[];
}

// ── AVATARS (using ui-avatars style placeholders) ──────────────────────────
const avatarUrl = (name: string, bg: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=200&bold=true`;

const coverColors = [
  '7C3AED', 'EC4899', 'F59E0B', '06B6D4', 'EF4444',
  '10B981', '8B5CF6', 'EC4899', '3B82F6', '6366F1'
];

const coverUrl = (seed: number) =>
  `https://picsum.photos/seed/${seed + 100}/800/450`;

const mediaUrl = (seed: string | number) =>
  `https://picsum.photos/seed/media-${seed}/600/400`;

// ── DEFAULT GALLERY (used per artist) ─────────────────────────────────────
const buildGallery = (artistId: string): MediaItem[] => [
  { id: `${artistId}-g1`, type: 'photo', url: mediaUrl(`${artistId}-p1`), thumbnail: mediaUrl(`${artistId}-p1`), title: 'Performance Live' },
  { id: `${artistId}-g2`, type: 'photo', url: mediaUrl(`${artistId}-p2`), thumbnail: mediaUrl(`${artistId}-p2`), title: 'Backstage' },
  { id: `${artistId}-g3`, type: 'video', url: mediaUrl(`${artistId}-v1`), thumbnail: mediaUrl(`${artistId}-v1`), title: 'Highlight Reel', duration: '2:45', views: 12400 },
  { id: `${artistId}-g4`, type: 'photo', url: mediaUrl(`${artistId}-p3`), thumbnail: mediaUrl(`${artistId}-p3`), title: 'On Stage' },
  { id: `${artistId}-g5`, type: 'mix', url: mediaUrl(`${artistId}-m1`), thumbnail: mediaUrl(`${artistId}-m1`), title: 'Mix Latin Vibes 2024', duration: '58:30', views: 24800 },
  { id: `${artistId}-g6`, type: 'video', url: mediaUrl(`${artistId}-v2`), thumbnail: mediaUrl(`${artistId}-v2`), title: 'Studio Session', duration: '4:12', views: 8900 },
];

// ── DEFAULT PACKAGES (Fiverr-style 3-tier) ────────────────────────────────
const buildPackages = (basePrice: number, type: Artist['type']): OfferPackage[] => {
  const labels: Record<Artist['type'], { basic: string; std: string; pro: string }> = {
    dj:         { basic: 'Set Corto 2h',          std: 'Set Completo 4h',         pro: 'Evento Premium 6h' },
    dancer:     { basic: 'Show Solo 15min',       std: 'Show + Clase Magistral',   pro: 'Show + Coreografía Custom' },
    singer:     { basic: 'Actuación 30min',       std: 'Concierto 60min',         pro: 'Concierto Premium 90min' },
    band:       { basic: 'Sesión Acústica 1h',    std: 'Concierto Completo 2h',    pro: 'Tour Show 3h' },
    instructor: { basic: 'Clase Privada 60min',   std: 'Pack 4 Clases',           pro: 'Programa Mensual Premium' },
  };
  const L = labels[type];
  return [
    {
      id: 'pkg-basic', tier: 'basic', name: L.basic, price: basePrice, currency: 'EUR',
      deliveryDays: 7,
      description: 'Servicio profesional con equipo básico incluido.',
      includes: ['Servicio profesional', 'Coordinación previa', 'Equipo básico', 'Música personalizada'],
      revisions: 1,
    },
    {
      id: 'pkg-standard', tier: 'standard', name: L.std, price: Math.round(basePrice * 1.8), currency: 'EUR',
      deliveryDays: 14,
      description: 'Paquete más popular. Servicio extendido con extras de marketing.',
      includes: ['Todo lo del básico', 'Duración extendida', 'Equipo profesional completo', 'Promo en redes', 'Vídeo highlight'],
      revisions: 2,
    },
    {
      id: 'pkg-premium', tier: 'premium', name: L.pro, price: Math.round(basePrice * 3.2), currency: 'EUR',
      deliveryDays: 30,
      description: 'Experiencia VIP completa para eventos premium.',
      includes: ['Todo lo del estándar', 'Producción audiovisual', 'Streaming en vivo opcional', 'Material promocional custom', 'Soporte dedicado 24/7', 'Sesión de fotos'],
      revisions: -1,
    },
  ];
};

// ── DEFAULT SCHEDULED STREAMS ─────────────────────────────────────────────
const buildScheduled = (artistId: string): ScheduledStream[] => [
  {
    id: `${artistId}-sch1`, artistId,
    title: 'Latin Vibes Live Session',
    date: '2026-05-22', time: '21:00', category: 'DJ Set',
    thumbnail: mediaUrl(`${artistId}-sch1`),
    description: 'Sesión semanal en directo con los mejores temas latinos del momento.',
    reminders: 234,
  },
  {
    id: `${artistId}-sch2`, artistId,
    title: 'Q&A + Mini Show',
    date: '2026-05-29', time: '20:30', category: 'Interactive',
    thumbnail: mediaUrl(`${artistId}-sch2`),
    description: 'Charla en vivo con la comunidad + mini actuación.',
    reminders: 89,
  },
];

// ── ARTISTS ────────────────────────────────────────────────────────────────
export const ARTISTS: Artist[] = [
  {
    id: 'a1', name: 'DJ Mambo King', type: 'dj', genre: ['Salsa', 'Bachata', 'Merengue'],
    avatar: avatarUrl('Mambo King', '7C3AED'), cover: coverUrl(1),
    city: 'Madrid', country: 'España', rating: 4.9, reviews: 147, followers: 12400,
    priceFrom: 350, currency: 'EUR', isLive: true, isVerified: true, isPremium: true,
    bio: 'DJ con más de 15 años de experiencia en la escena latina internacional. Residente en Madrid, he actuado en más de 20 países mezclando salsa, bachata y ritmos tropicales.',
    tags: ['Salsa', 'Bachata', 'Eventos', 'Bodas', 'Clubs'],
    social: { instagram: 'djmamboking', tiktok: 'djmamboking', youtube: 'djmamboking', spotify: 'djmamboking', facebook: 'djmamboking', soundcloud: 'djmamboking' },
    socialFollowers: { instagram: 154000, tiktok: 89000, youtube: 67500, spotify: 42000, facebook: 23000, soundcloud: 18500 },
    featuredVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    featuredVideoTitle: 'DJ Mambo King — Set en directo Latin Vibes Madrid',
    availability: ['Viernes', 'Sábado', 'Domingo'], completedBookings: 389,
    performanceStyle: 'Sets enérgicos con fusión moderna de ritmos clásicos',
    languages: ['Español', 'Inglés', 'Portugués'],
    gallery: buildGallery('a1'), packages: buildPackages(350, 'dj'),
    currentStreamId: 'l1', scheduledStreams: buildScheduled('a1'),
    responseTime: '~ 1 hora', totalStreams: 247, totalStreamHours: 1284,
  },
  {
    id: 'a2', name: 'La Reina del Ritmo', type: 'dancer', genre: ['Salsa', 'Son Cubano'],
    avatar: avatarUrl('La Reina', 'EC4899'), cover: coverUrl(2),
    city: 'Barcelona', country: 'España', rating: 5.0, reviews: 89, followers: 8900,
    priceFrom: 200, currency: 'EUR', isLive: false, isVerified: true, isPremium: true,
    bio: 'Bailaora profesional de salsa on2 y son cubano. Campeona del Campeonato Latinoamericano de Salsa 2022. Clases, shows y coreografías para eventos.',
    tags: ['Salsa On2', 'Son Cubano', 'Clases', 'Shows', 'Coreografías'],
    social: { instagram: 'lareina_ritmo', tiktok: 'lareinadelritmo', youtube: 'lareinadelritmo', facebook: 'lareinadelritmo' },
    socialFollowers: { instagram: 89400, tiktok: 215000, youtube: 34200, facebook: 12500 },
    featuredVideo: 'https://www.youtube.com/watch?v=ZyhrYis509A',
    featuredVideoTitle: 'La Reina — Bachata Sensual Workshop Barcelona',
    availability: ['Lunes', 'Miércoles', 'Viernes', 'Sábado'], completedBookings: 234,
    performanceStyle: 'Salsa elegante y técnica con un toque sensual',
    languages: ['Español', 'Inglés', 'Italiano'],
    gallery: buildGallery('a2'), packages: buildPackages(200, 'dancer'),
    scheduledStreams: buildScheduled('a2'),
    responseTime: '~ 2 horas', totalStreams: 89, totalStreamHours: 312,
  },
  {
    id: 'a3', name: 'Orquesta Tropical Fuego', type: 'band', genre: ['Salsa', 'Cumbia', 'Vallenato'],
    avatar: avatarUrl('Orquesta Fuego', 'F59E0B'), cover: coverUrl(3),
    city: 'Valencia', country: 'España', rating: 4.8, reviews: 203, followers: 21000,
    priceFrom: 1200, currency: 'EUR', isLive: false, isVerified: true, isPremium: true,
    bio: 'Orquesta de 12 músicos con repertorio tropical completo. Bodas, eventos corporativos, festivales. Más de 500 shows en toda Europa.',
    tags: ['Orquesta', 'Salsa', 'Cumbia', 'Bodas', 'Festivales'],
    social: { instagram: 'orquestatfuego', youtube: 'orquestatropicalfuego', facebook: 'orquestatropicalfuego', spotify: 'tropicalfuego' },
    socialFollowers: { instagram: 47800, youtube: 28600, facebook: 19200, spotify: 35400 },
    featuredVideo: 'https://www.youtube.com/watch?v=jM8dCGIm6yc',
    featuredVideoTitle: 'Orquesta Tropical Fuego — Concierto Valencia',
    availability: ['Viernes', 'Sábado'], completedBookings: 512,
    performanceStyle: 'Música tropical en vivo con energía contagiosa',
    languages: ['Español', 'Inglés', 'Francés'],
    gallery: buildGallery('a3'), packages: buildPackages(1200, 'band'),
    scheduledStreams: buildScheduled('a3'),
    responseTime: '~ 4 horas', totalStreams: 56, totalStreamHours: 198,
  },
  {
    id: 'a4', name: 'DJ Bacha Flow', type: 'dj', genre: ['Bachata', 'Urban Latin', 'Reggaeton'],
    avatar: avatarUrl('Bacha Flow', '06B6D4'), cover: coverUrl(4),
    city: 'Sevilla', country: 'España', rating: 4.7, reviews: 112, followers: 6700,
    priceFrom: 250, currency: 'EUR', isLive: true, isVerified: true, isPremium: false,
    bio: 'Especialista en bachata sensual y urban latin. Residencias en los mejores clubs de Sevilla. DJ de boda certificado.',
    tags: ['Bachata Sensual', 'Urban Latin', 'Clubs', 'DJ Boda'],
    social: { instagram: 'djbachaflow', tiktok: 'djbachaflow', soundcloud: 'djbachaflow' },
    socialFollowers: { instagram: 26300, tiktok: 41700, soundcloud: 8900 },
    featuredVideo: 'https://www.youtube.com/watch?v=kOkQ4T5WO9E',
    featuredVideoTitle: 'DJ Bacha Flow — Mix urban latin 2026',
    availability: ['Jueves', 'Viernes', 'Sábado'], completedBookings: 178,
    performanceStyle: 'Bachata sensual fusionada con urban latin moderno',
    languages: ['Español', 'Inglés'],
    gallery: buildGallery('a4'), packages: buildPackages(250, 'dj'),
    currentStreamId: 'l3', scheduledStreams: buildScheduled('a4'),
    responseTime: '~ 30 min', totalStreams: 134, totalStreamHours: 478,
  },
  {
    id: 'a5', name: 'Marcos & Elena Dance', type: 'dancer', genre: ['Tango', 'Salsa', 'Bachata'],
    avatar: avatarUrl('Marcos Elena', 'EF4444'), cover: coverUrl(5),
    city: 'Bilbao', country: 'España', rating: 4.9, reviews: 67, followers: 4500,
    priceFrom: 400, currency: 'EUR', isLive: false, isVerified: true, isPremium: false,
    bio: 'Pareja profesional de baile con especialización en tango argentino y bailes latinos. Shows y clases para todos los niveles.',
    tags: ['Pareja', 'Tango', 'Salsa', 'Shows', 'Clases'],
    social: { instagram: 'marcosyelena_dance', youtube: 'marcosyelena', facebook: 'marcosyelena' },
    socialFollowers: { instagram: 56200, youtube: 41300, facebook: 8800 },
    featuredVideo: 'https://www.youtube.com/watch?v=YbJOTdZBX1g',
    featuredVideoTitle: 'Marcos & Elena — Tutorial Bachata Sensual',
    availability: ['Martes', 'Jueves', 'Sábado', 'Domingo'], completedBookings: 145,
    performanceStyle: 'Coreografías cinematográficas y técnica precisa',
    languages: ['Español', 'Inglés'],
    gallery: buildGallery('a5'), packages: buildPackages(400, 'dancer'),
    scheduledStreams: buildScheduled('a5'),
    responseTime: '~ 3 horas', totalStreams: 42, totalStreamHours: 156,
  },
  {
    id: 'a6', name: 'DJ Kumbé', type: 'dj', genre: ['Afrobeats', 'Afro-Latin', 'Cumbia'],
    avatar: avatarUrl('DJ Kumbe', '10B981'), cover: coverUrl(6),
    city: 'Milano', country: 'Italia', rating: 4.6, reviews: 88, followers: 9200,
    priceFrom: 300, currency: 'EUR', isLive: false, isVerified: false, isPremium: false,
    bio: 'DJ afro-latina fusionando ritmos africanos con sonidos latinoamericanos. Residente en Milano. Tours por Europa.',
    tags: ['Afrobeats', 'Fusión', 'Clubs', 'Festivales'],
    social: { instagram: 'djkumbe', tiktok: 'djkumbe', soundcloud: 'djkumbe' },
    socialFollowers: { instagram: 18900, tiktok: 33500, soundcloud: 12200 },
    featuredVideo: 'https://www.youtube.com/watch?v=qbiAYjcF1Tg',
    featuredVideoTitle: 'DJ Kumbé — Cumbia Sessions',
    availability: ['Viernes', 'Sábado', 'Domingo'], completedBookings: 92,
    performanceStyle: 'Fusión afro-latina con énfasis en percusión orgánica',
    languages: ['Español', 'Italiano', 'Inglés'],
    gallery: buildGallery('a6'), packages: buildPackages(300, 'dj'),
    currentStreamId: 'l4', scheduledStreams: buildScheduled('a6'),
    responseTime: '~ 2 horas', totalStreams: 67, totalStreamHours: 234,
  },
  {
    id: 'a7', name: 'Instructora Celia', type: 'instructor', genre: ['Salsa', 'Zumba', 'Bachata'],
    avatar: avatarUrl('Celia', '8B5CF6'), cover: coverUrl(7),
    city: 'Madrid', country: 'España', rating: 4.9, reviews: 310, followers: 15600,
    priceFrom: 60, currency: 'EUR', isLive: true, isVerified: true, isPremium: true,
    bio: 'Instructora certificada con 10 años de experiencia. Clases online y presenciales. Especialista en salsa, zumba y bachata para principiantes y avanzados.',
    tags: ['Clases', 'Online', 'Principiantes', 'Zumba', 'Grupos'],
    social: { instagram: 'celia_instructor', tiktok: 'celiadance', youtube: 'celiadance', facebook: 'celiadance' },
    socialFollowers: { instagram: 73400, tiktok: 128000, youtube: 52100, facebook: 14300 },
    featuredVideo: 'https://www.youtube.com/watch?v=PFKKQuKpFQg',
    featuredVideoTitle: 'Instructora Celia — Clase de salsa para principiantes',
    availability: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], completedBookings: 890,
    performanceStyle: 'Enseñanza paciente, paso a paso, adaptada a cada nivel',
    languages: ['Español', 'Inglés', 'Catalán'],
    gallery: buildGallery('a7'), packages: buildPackages(60, 'instructor'),
    currentStreamId: 'l2', scheduledStreams: buildScheduled('a7'),
    responseTime: '~ 15 min', totalStreams: 412, totalStreamHours: 1834,
  },
  {
    id: 'a8', name: 'Latin Groove Collective', type: 'band', genre: ['Son', 'Timba', 'Jazz Latino'],
    avatar: avatarUrl('Latin Groove', 'EC4899'), cover: coverUrl(8),
    city: 'Paris', country: 'Francia', rating: 4.8, reviews: 156, followers: 18300,
    priceFrom: 1800, currency: 'EUR', isLive: false, isVerified: true, isPremium: true,
    bio: 'Colectivo de 8 músicos especializados en son cubano, timba y jazz latino. Actuaciones en festivales internacionales y eventos privados de lujo.',
    tags: ['Son Cubano', 'Timba', 'Jazz Latino', 'Festivales', 'Lujo'],
    social: { instagram: 'latinguoovecollective', spotify: 'latingroove', youtube: 'latingroove', facebook: 'latingroove' },
    socialFollowers: { instagram: 38700, spotify: 24500, youtube: 19800, facebook: 6400 },
    featuredVideo: 'https://www.youtube.com/watch?v=l482T0yNkeo',
    featuredVideoTitle: 'Latin Groove — Live session 2026',
    availability: ['Viernes', 'Sábado'], completedBookings: 267,
    performanceStyle: 'Jazz latino sofisticado con improvisación virtuosa',
    languages: ['Español', 'Francés', 'Inglés'],
    gallery: buildGallery('a8'), packages: buildPackages(1800, 'band'),
    scheduledStreams: buildScheduled('a8'),
    responseTime: '~ 6 horas', totalStreams: 38, totalStreamHours: 142,
  },
];

// ── EVENTS ─────────────────────────────────────────────────────────────────
export const EVENTS: Event[] = [
  {
    id: 'e1', title: 'Salsa & Bachata Night — Gran Gala',
    description: 'La noche más esperada del año. DJs internacionales, shows en vivo, concurso de baile con premios de €2000. Dress code: elegante.',
    venueId: 'v1', venueName: 'Club Tropicana Madrid', city: 'Madrid',
    date: '2026-06-07', time: '22:00', endTime: '05:00',
    cover: coverUrl(10), category: ['Salsa', 'Bachata', 'Fiesta'],
    price: 25, currency: 'EUR', capacity: 500, attending: 387,
    isOnline: false, isFeatured: true, isPremium: true,
    artists: ['a1', 'a2'], lat: 40.4168, lng: -3.7038
  },
  {
    id: 'e2', title: 'Masterclass: Bachata Sensual con DJ Bacha Flow',
    description: 'Aprende los secretos de la bachata sensual con uno de los mejores instructores de España. Nivel intermedio-avanzado.',
    venueId: 'v3', venueName: 'Studio Latino BCN', city: 'Barcelona',
    date: '2026-05-24', time: '18:00', endTime: '21:00',
    cover: coverUrl(11), category: ['Bachata', 'Masterclass', 'Baile'],
    price: 35, currency: 'EUR', capacity: 40, attending: 38,
    isOnline: false, isFeatured: true, isPremium: false,
    artists: ['a4'], lat: 41.3851, lng: 2.1734
  },
  {
    id: 'e3', title: 'Festival Latino BCN 2026',
    description: '3 días de música, baile y cultura latina. +30 artistas internacionales. Talleres, shows, comida latina y mucho más.',
    venueId: 'v5', venueName: 'Parc del Fòrum', city: 'Barcelona',
    date: '2026-07-11', time: '16:00', endTime: '02:00',
    cover: coverUrl(12), category: ['Festival', 'Salsa', 'Cumbia', 'Reggaeton'],
    price: 45, currency: 'EUR', capacity: 5000, attending: 3200,
    isOnline: false, isFeatured: true, isPremium: true,
    artists: ['a1', 'a3', 'a6', 'a8'], lat: 41.4036, lng: 2.2167
  },
  {
    id: 'e4', title: 'Clase Online: Salsa On2 para Principiantes',
    description: 'Sesión online en vivo con La Reina del Ritmo. Aprende la base del salsa on2 desde casa. Material incluido.',
    venueId: '', venueName: 'Online — Zoom', city: 'Online',
    date: '2026-05-20', time: '19:00', endTime: '20:30',
    cover: coverUrl(13), category: ['Salsa', 'Online', 'Principiantes'],
    price: 15, currency: 'EUR', capacity: 100, attending: 67,
    isOnline: true, isFeatured: false, isPremium: false,
    artists: ['a2'], lat: 0, lng: 0
  },
  {
    id: 'e5', title: 'Noche de Timba Cubana',
    description: 'Latin Groove Collective trae la timba cubana auténtica a París. Una noche única para los amantes del son y la timba.',
    venueId: 'v7', venueName: 'La Clave Club Paris', city: 'Paris',
    date: '2026-06-14', time: '21:30', endTime: '04:00',
    cover: coverUrl(14), category: ['Timba', 'Son Cubano', 'Fiesta'],
    price: 20, currency: 'EUR', capacity: 300, attending: 189,
    isOnline: false, isFeatured: false, isPremium: true,
    artists: ['a8'], lat: 48.8566, lng: 2.3522
  },
  {
    id: 'e6', title: 'Bachata & Reggaeton Open Air',
    description: 'Noche al aire libre en la terraza más famosa de Sevilla. Bachata, reggaeton y urban latin toda la noche.',
    venueId: 'v4', venueName: 'Rooftop 360 Sevilla', city: 'Sevilla',
    date: '2026-06-21', time: '23:00', endTime: '06:00',
    cover: coverUrl(15), category: ['Bachata', 'Reggaeton', 'Open Air'],
    price: 18, currency: 'EUR', capacity: 250, attending: 201,
    isOnline: false, isFeatured: true, isPremium: false,
    artists: ['a4'], lat: 37.3886, lng: -5.9823
  },
];

// ── VENUES ─────────────────────────────────────────────────────────────────
export const VENUES: Venue[] = [
  {
    id: 'v1', name: 'Club Tropicana Madrid', type: 'club',
    city: 'Madrid', address: 'Calle Atocha 125, Madrid',
    cover: coverUrl(20), avatar: avatarUrl('Tropicana', '7C3AED'),
    rating: 4.8, reviews: 892, capacity: 500, isOpen: true,
    openHours: 'Jue-Dom: 22:00 – 06:00', isPremium: true, priceRange: 3,
    description: 'El club de salsa y bachata más famoso de Madrid. Pista de baile de 300m², sistema de sonido premium, barra completa.',
    amenities: ['Pista de Baile', 'Bar VIP', 'Camerinos', 'Coat Check', 'Photobooth'],
    lat: 40.4168, lng: -3.7038
  },
  {
    id: 'v2', name: 'La Sala Latina BCN', type: 'lounge',
    city: 'Barcelona', address: 'Carrer Parlament 40, Barcelona',
    cover: coverUrl(21), avatar: avatarUrl('Sala Latina', 'EC4899'),
    rating: 4.6, reviews: 445, capacity: 200, isOpen: false,
    openHours: 'Mié-Sáb: 20:00 – 03:00', isPremium: true, priceRange: 2,
    description: 'Ambiente íntimo y acogedor para los amantes de la música latina. Salsa, bachata y bossa nova en vivo los fines de semana.',
    amenities: ['Música en Vivo', 'Bar', 'Terraza', 'Reservas VIP'],
    lat: 41.3851, lng: 2.1734
  },
  {
    id: 'v3', name: 'Studio Latino BCN', type: 'studio',
    city: 'Barcelona', address: 'Avinguda Diagonal 280, Barcelona',
    cover: coverUrl(22), avatar: avatarUrl('Studio Latino', 'F59E0B'),
    rating: 4.9, reviews: 312, capacity: 60, isOpen: true,
    openHours: 'Lun-Dom: 09:00 – 22:00', isPremium: false, priceRange: 2,
    description: 'Estudio profesional de danza con 3 salas climatizadas, espejos de pared completa, tarima flotante y sistema de sonido profesional.',
    amenities: ['3 Salas', 'Vestuarios', 'Wi-Fi', 'Climatización', 'Piano'],
    lat: 41.3929, lng: 2.1505
  },
  {
    id: 'v4', name: 'Rooftop 360 Sevilla', type: 'rooftop',
    city: 'Sevilla', address: 'Calle Betis 45, Sevilla',
    cover: coverUrl(23), avatar: avatarUrl('Rooftop 360', 'EF4444'),
    rating: 4.7, reviews: 567, capacity: 250, isOpen: true,
    openHours: 'Vie-Dom: 21:00 – 06:00', isPremium: true, priceRange: 3,
    description: 'La terraza más exclusiva de Sevilla con vistas al Guadalquivir. Eventos de bachata, flamenco fusion y urban latin al aire libre.',
    amenities: ['Terraza', 'Vistas Panorámicas', 'Bar Premium', 'DJ Booth', 'Zona Chill'],
    lat: 37.3886, lng: -5.9823
  },
  {
    id: 'v5', name: 'Parc del Fòrum', type: 'club',
    city: 'Barcelona', address: 'Plaça del Fòrum, Barcelona',
    cover: coverUrl(24), avatar: avatarUrl('Forum BCN', '06B6D4'),
    rating: 4.5, reviews: 1200, capacity: 10000, isOpen: false,
    openHours: 'Según eventos', isPremium: true, priceRange: 2,
    description: 'Espacio al aire libre junto al mar para grandes festivales y eventos multitudinarios. Capacidad hasta 10.000 personas.',
    amenities: ['Escenario Principal', 'Escenario Secundario', 'Zona Comida', 'Parking', 'Acceso Playa'],
    lat: 41.4036, lng: 2.2167
  },
  {
    id: 'v6', name: 'Azúcar Club Valencia', type: 'club',
    city: 'Valencia', address: 'Calle del Mar 28, Valencia',
    cover: coverUrl(25), avatar: avatarUrl('Azucar', '10B981'),
    rating: 4.7, reviews: 389, capacity: 350, isOpen: true,
    openHours: 'Jue-Dom: 22:30 – 06:00', isPremium: false, priceRange: 2,
    description: 'Club de referencia en Valencia para los amantes de la salsa y el merengue. Shows en vivo cada viernes.',
    amenities: ['Shows en Vivo', 'Clases Previas', 'Bar', 'Zona Fumadores', 'Aparacamiento'],
    lat: 39.4699, lng: -0.3763
  },
  {
    id: 'v7', name: 'La Clave Club Paris', type: 'club',
    city: 'Paris', address: '15 Rue de la Roquette, Paris',
    cover: coverUrl(26), avatar: avatarUrl('La Clave', '8B5CF6'),
    rating: 4.8, reviews: 734, capacity: 300, isOpen: true,
    openHours: 'Vie-Sáb: 22:00 – 05:00', isPremium: true, priceRange: 3,
    description: 'El club latino más auténtico de París. Timba cubana, salsa y son en un ambiente íntimo y elegante.',
    amenities: ['Música en Vivo', 'Bar Cubano', 'Clases Incluidas', 'VIP Lounge'],
    lat: 48.8566, lng: 2.3522
  },
];

// ── SERVICES ───────────────────────────────────────────────────────────────
export const SERVICES: Service[] = [
  {
    id: 's1', artistId: 'a1', artistName: 'DJ Mambo King',
    artistAvatar: avatarUrl('Mambo King', '7C3AED'),
    title: 'Set DJ Completo 4h — Salsa & Bachata',
    description: 'Set profesional de 4 horas. Incluye equipo de sonido completo, iluminación básica y transporte en Madrid. Ideal para fiestas, bodas y eventos corporativos.',
    category: 'DJ Set', price: 450, currency: 'EUR', deliveryDays: 7,
    rating: 4.9, reviews: 89, orders: 312, cover: coverUrl(30),
    tags: ['Salsa', 'Bachata', 'Bodas', 'Eventos', 'Equipo incluido'],
    includes: ['4h de música', 'Equipo de sonido', 'Iluminación básica', 'Listas de reproducción personalizadas']
  },
  {
    id: 's2', artistId: 'a2', artistName: 'La Reina del Ritmo',
    artistAvatar: avatarUrl('La Reina', 'EC4899'),
    title: 'Clase Privada de Salsa On2 — 90 min',
    description: 'Clase privada de 90 minutos para 1 o 2 personas. Adaptada a tu nivel. Incluye grabación en vídeo para que puedas repasar en casa.',
    category: 'Clases', price: 120, currency: 'EUR', deliveryDays: 3,
    rating: 5.0, reviews: 145, orders: 567, cover: coverUrl(31),
    tags: ['Salsa On2', 'Privado', 'Principiante', 'Avanzado', 'Vídeo incluido'],
    includes: ['90 min clase', 'Grabación vídeo', 'Plan de práctica', 'Seguimiento 1 semana']
  },
  {
    id: 's3', artistId: 'a7', artistName: 'Instructora Celia',
    artistAvatar: avatarUrl('Celia', '8B5CF6'),
    title: 'Clases Online — Pack 4 Sesiones Mensuales',
    description: 'Pack mensual de 4 clases online de 60 minutos. Salsa, bachata o zumba. Horarios flexibles. Acceso a material exclusivo.',
    category: 'Clases Online', price: 80, currency: 'EUR', deliveryDays: 1,
    rating: 4.9, reviews: 234, orders: 890, cover: coverUrl(32),
    tags: ['Online', 'Salsa', 'Bachata', 'Zumba', 'Flexible'],
    includes: ['4 clases 60min', 'Material digital', 'Grupo privado WhatsApp', 'Replay sesiones']
  },
  {
    id: 's4', artistId: 'a3', artistName: 'Orquesta Tropical Fuego',
    artistAvatar: avatarUrl('Orquesta Fuego', 'F59E0B'),
    title: 'Actuación Orquesta Completa — 2h Show',
    description: '12 músicos en vivo para bodas y eventos de lujo. Repertorio de salsa, cumbia, merengue y vallenato. Rider técnico incluido.',
    category: 'Música en Vivo', price: 2500, currency: 'EUR', deliveryDays: 30,
    rating: 4.8, reviews: 67, orders: 145, cover: coverUrl(33),
    tags: ['Orquesta', 'Boda', 'Lujo', 'Salsa', 'Cumbia'],
    includes: ['2h actuación', 'Prueba de sonido', 'Rider técnico', 'Coordinación evento']
  },
  {
    id: 's5', artistId: 'a5', artistName: 'Marcos & Elena Dance',
    artistAvatar: avatarUrl('Marcos Elena', 'EF4444'),
    title: 'Show de Baile para Boda — 20 min',
    description: 'Espectáculo coreografiado de 20 minutos para tu boda. Tango argentino, salsa o bachata. Incluye ensayo previo y coordinación con el DJ.',
    category: 'Show Baile', price: 600, currency: 'EUR', deliveryDays: 14,
    rating: 4.9, reviews: 43, orders: 89, cover: coverUrl(34),
    tags: ['Boda', 'Show', 'Tango', 'Salsa', 'Coreografía'],
    includes: ['20 min show', '1 ensayo previo', 'Coordinación DJ', 'Vestuario profesional']
  },
  {
    id: 's6', artistId: 'a4', artistName: 'DJ Bacha Flow',
    artistAvatar: avatarUrl('Bacha Flow', '06B6D4'),
    title: 'Mix Profesional Bachata — Descarga Digital',
    description: 'Mix exclusivo de bachata sensual de 90 minutos. Producción profesional, archivo WAV. Licencia para uso en eventos privados.',
    category: 'Producción', price: 75, currency: 'EUR', deliveryDays: 5,
    rating: 4.7, reviews: 112, orders: 234, cover: coverUrl(35),
    tags: ['Bachata', 'Mix', 'Digital', 'Descarga', 'Licencia'],
    includes: ['Mix 90 min', 'Archivo WAV', 'Tracklist', 'Licencia privada']
  },
];

// ── PROMOTION SERVICES (Promociónate) ────────────────────────────────────
export interface PromoSeller {
  id: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  isPro: boolean;
  rating: number;
  reviews: number;
  orders: number;
  responseTime: string;
  memberSince: string;
  bio: string;
  socialProof: {
    platform: string;
    handle: string;
    followers: number;
    monthlyReach: number;
    icon: string;
  }[];
  metricsScreenshots: string[];
}

export interface PromoService {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  description: string;
  category: 'redes-sociales' | 'spotify-playlists' | 'prensa-blogs' | 'video-promo' | 'influencers';
  categoryLabel: string;
  platforms: { name: string; icon: string; accounts: number; totalFollowers: number }[];
  price: number;
  currency: string;
  deliveryDays: number;
  rating: number;
  reviews: number;
  orders: number;
  cover: string;
  tags: string[];
  includes: string[];
  extras: { label: string; price: number }[];
  platformFee: number;
}

export const PROMO_SELLERS: PromoSeller[] = [
  {
    id: 'ps1', name: 'Latino Viral Media', avatar: avatarUrl('Latino Viral', 'EC4899'),
    isVerified: true, isPro: true, rating: 4.9, reviews: 347, orders: 1280,
    responseTime: '< 1 hora', memberSince: '2023',
    bio: 'Agencia de marketing digital especializada en la escena latina. Gestionamos más de 30 páginas en Facebook, Instagram, TikTok y YouTube con más de 2M de seguidores combinados.',
    socialProof: [
      { platform: 'Facebook', handle: '@LatinoViralMedia', followers: 850000, monthlyReach: 3200000, icon: '📘' },
      { platform: 'Instagram', handle: '@latinoviral', followers: 420000, monthlyReach: 1800000, icon: '📸' },
      { platform: 'TikTok', handle: '@latinoviralmedia', followers: 560000, monthlyReach: 5400000, icon: '🎵' },
      { platform: 'YouTube', handle: '@LatinoViralTV', followers: 180000, monthlyReach: 920000, icon: '▶️' },
    ],
    metricsScreenshots: [coverUrl(60), coverUrl(61), coverUrl(62)],
  },
  {
    id: 'ps2', name: 'BachaSalseros Official', avatar: avatarUrl('BachaSalseros', 'D81B60'),
    isVerified: true, isPro: true, rating: 5.0, reviews: 512, orders: 2100,
    responseTime: '< 30 min', memberSince: '2022',
    bio: 'La cuenta oficial de BachaSalseros. Publicamos tu contenido en todas nuestras redes con alcance masivo en la comunidad latina de baile.',
    socialProof: [
      { platform: 'TikTok', handle: '@bachasalseros', followers: 320000, monthlyReach: 4800000, icon: '🎵' },
      { platform: 'YouTube', handle: '@BachaSalserosTV', followers: 145000, monthlyReach: 780000, icon: '▶️' },
      { platform: 'Facebook', handle: '@BachaSalseros', followers: 680000, monthlyReach: 2100000, icon: '📘' },
      { platform: 'Instagram', handle: '@bachasalseros', followers: 390000, monthlyReach: 1500000, icon: '📸' },
    ],
    metricsScreenshots: [coverUrl(63), coverUrl(64)],
  },
  {
    id: 'ps3', name: 'Madrid Bachata Oficial', avatar: avatarUrl('Madrid Bachata', 'F59E0B'),
    isVerified: true, isPro: false, rating: 4.8, reviews: 189, orders: 670,
    responseTime: '< 2 horas', memberSince: '2023',
    bio: 'La comunidad de bachata más grande de Madrid. Publicamos eventos, artistas y contenido de baile para toda la comunidad madrileña.',
    socialProof: [
      { platform: 'Instagram', handle: '@madridbachata', followers: 185000, monthlyReach: 890000, icon: '📸' },
      { platform: 'Facebook', handle: '@MadridBachataOficial', followers: 230000, monthlyReach: 1100000, icon: '📘' },
      { platform: 'TikTok', handle: '@madridbachata', followers: 95000, monthlyReach: 1200000, icon: '🎵' },
    ],
    metricsScreenshots: [coverUrl(65)],
  },
  {
    id: 'ps4', name: 'DJ Playlist Master', avatar: avatarUrl('Playlist Master', '8B5CF6'),
    isVerified: true, isPro: true, rating: 4.7, reviews: 278, orders: 890,
    responseTime: '< 4 horas', memberSince: '2022',
    bio: 'Curador de playlists en Spotify con más de 500K oyentes mensuales combinados. Especializado en bachata, salsa, reggaetón y latin urban.',
    socialProof: [
      { platform: 'Spotify', handle: 'Bachata Sensual Hits', followers: 180000, monthlyReach: 520000, icon: '🎧' },
      { platform: 'Spotify', handle: 'Salsa Brava Mix', followers: 95000, monthlyReach: 280000, icon: '🎧' },
      { platform: 'Spotify', handle: 'Latin Urban Fire', followers: 230000, monthlyReach: 670000, icon: '🎧' },
    ],
    metricsScreenshots: [coverUrl(66), coverUrl(67)],
  },
  {
    id: 'ps5', name: 'Baila Conmigo Studio', avatar: avatarUrl('Baila Conmigo', '06B6D4'),
    isVerified: true, isPro: false, rating: 4.9, reviews: 156, orders: 430,
    responseTime: '< 3 horas', memberSince: '2024',
    bio: 'Productora audiovisual especializada en contenido de baile latino. Creamos reels, TikToks y videos promocionales virales para artistas y escuelas.',
    socialProof: [
      { platform: 'Instagram', handle: '@bailaconmigostudio', followers: 78000, monthlyReach: 450000, icon: '📸' },
      { platform: 'TikTok', handle: '@bailaconmigo', followers: 210000, monthlyReach: 3200000, icon: '🎵' },
      { platform: 'YouTube', handle: '@BailaConmigoStudio', followers: 45000, monthlyReach: 180000, icon: '▶️' },
    ],
    metricsScreenshots: [coverUrl(68), coverUrl(69)],
  },
];

export const PROMO_SERVICES: PromoService[] = [
  {
    id: 'promo1', sellerId: 'ps1', sellerName: 'Latino Viral Media', sellerAvatar: avatarUrl('Latino Viral', 'EC4899'),
    title: 'Pack Viral — Publicación en 10 Facebook + 8 Instagram + 6 TikTok + 8 YouTube',
    description: 'Tu evento, canción o contenido publicado en nuestras 32 cuentas de redes sociales con más de 2 millones de seguidores combinados. Incluye diseño de artes, copy optimizado para cada plataforma, programación en horarios de máximo alcance y reporte de métricas a las 72h.',
    category: 'redes-sociales', categoryLabel: 'Redes Sociales',
    platforms: [
      { name: 'Facebook', icon: '📘', accounts: 10, totalFollowers: 850000 },
      { name: 'Instagram', icon: '📸', accounts: 8, totalFollowers: 420000 },
      { name: 'TikTok', icon: '🎵', accounts: 6, totalFollowers: 560000 },
      { name: 'YouTube', icon: '▶️', accounts: 8, totalFollowers: 180000 },
    ],
    price: 89, currency: 'EUR', deliveryDays: 3,
    rating: 4.9, reviews: 347, orders: 1280, cover: coverUrl(70),
    tags: ['Viral', 'Multi-plataforma', '32 cuentas', '2M+ seguidores', 'Reporte métricas'],
    includes: ['Publicación en 32 cuentas', 'Diseño de artes incluido', 'Copy optimizado', 'Horarios peak', 'Reporte métricas 72h', 'Soporte prioritario'],
    extras: [
      { label: 'Story/Reel adicional en todas las cuentas', price: 35 },
      { label: 'Video promocional 30s', price: 55 },
      { label: 'Campaña 7 días (3 publicaciones)', price: 149 },
    ],
    platformFee: 15,
  },
  {
    id: 'promo2', sellerId: 'ps2', sellerName: 'BachaSalseros Official', sellerAvatar: avatarUrl('BachaSalseros', 'D81B60'),
    title: 'Publícate en BachaSalseros — TikTok, YouTube, Facebook e Instagram',
    description: 'Tu contenido publicado en todas las cuentas oficiales de BachaSalseros. Alcanza directamente a la comunidad latina de baile más activa. Ideal para artistas, DJs, escuelas de baile y organizadores de eventos.',
    category: 'redes-sociales', categoryLabel: 'Redes Sociales',
    platforms: [
      { name: 'TikTok', icon: '🎵', accounts: 1, totalFollowers: 320000 },
      { name: 'YouTube', icon: '▶️', accounts: 1, totalFollowers: 145000 },
      { name: 'Facebook', icon: '📘', accounts: 1, totalFollowers: 680000 },
      { name: 'Instagram', icon: '📸', accounts: 1, totalFollowers: 390000 },
    ],
    price: 5, currency: 'EUR', deliveryDays: 1,
    rating: 5.0, reviews: 512, orders: 2100, cover: coverUrl(71),
    tags: ['Oficial', 'Comunidad baile', '1.5M seguidores', 'Entrega rápida', 'Desde 5€'],
    includes: ['Post en 4 plataformas', 'Diseño incluido', 'Hashtags optimizados', 'Mención en stories'],
    extras: [
      { label: 'Pin en portada 24h', price: 10 },
      { label: 'Reel/TikTok dedicado', price: 25 },
      { label: 'Newsletter a 50K suscriptores', price: 45 },
    ],
    platformFee: 15,
  },
  {
    id: 'promo3', sellerId: 'ps3', sellerName: 'Madrid Bachata Oficial', sellerAvatar: avatarUrl('Madrid Bachata', 'F59E0B'),
    title: 'Promoción Madrid Bachata — Alcance local garantizado',
    description: 'Tu evento o academia publicada en las cuentas de Madrid Bachata Oficial. Público ultra-segmentado: bailarines y amantes de la bachata en Madrid y alrededores. Máxima conversión para eventos locales.',
    category: 'redes-sociales', categoryLabel: 'Redes Sociales',
    platforms: [
      { name: 'Instagram', icon: '📸', accounts: 1, totalFollowers: 185000 },
      { name: 'Facebook', icon: '📘', accounts: 1, totalFollowers: 230000 },
      { name: 'TikTok', icon: '🎵', accounts: 1, totalFollowers: 95000 },
    ],
    price: 8, currency: 'EUR', deliveryDays: 1,
    rating: 4.8, reviews: 189, orders: 670, cover: coverUrl(72),
    tags: ['Madrid', 'Local', 'Bachata', 'Eventos', 'Alta conversión'],
    includes: ['Post en 3 plataformas', 'Story con enlace', 'Geolocalización Madrid', 'Reporte alcance'],
    extras: [
      { label: 'Destacado en stories 48h', price: 12 },
      { label: 'Pack semanal (3 posts)', price: 18 },
    ],
    platformFee: 15,
  },
  {
    id: 'promo4', sellerId: 'ps4', sellerName: 'DJ Playlist Master', sellerAvatar: avatarUrl('Playlist Master', '8B5CF6'),
    title: 'Agrega tu canción a playlist Spotify — +100K oyentes mensuales',
    description: 'Tu canción añadida a nuestras playlists de Spotify con más de 500K oyentes mensuales combinados. Permanencia mínima de 30 días. Ideal para artistas de bachata, salsa, reggaetón y latin urban que quieren crecer en streams.',
    category: 'spotify-playlists', categoryLabel: 'Spotify & Playlists',
    platforms: [
      { name: 'Spotify', icon: '🎧', accounts: 3, totalFollowers: 505000 },
    ],
    price: 25, currency: 'EUR', deliveryDays: 2,
    rating: 4.7, reviews: 278, orders: 890, cover: coverUrl(73),
    tags: ['Spotify', 'Playlist', '100K+ oyentes', '30 días', 'Streams reales'],
    includes: ['Inclusión en 1 playlist', '30 días mínimo', 'Reporte de streams', 'Feedback editorial', 'Promoción cruzada redes'],
    extras: [
      { label: 'Inclusión en 3 playlists simultáneas', price: 55 },
      { label: 'Permanencia 90 días', price: 45 },
      { label: 'Artículo blog + playlist', price: 35 },
    ],
    platformFee: 15,
  },
  {
    id: 'promo5', sellerId: 'ps5', sellerName: 'Baila Conmigo Studio', sellerAvatar: avatarUrl('Baila Conmigo', '06B6D4'),
    title: 'Video Promocional Viral — Reel + TikTok + YouTube Short',
    description: 'Creamos un video promocional profesional de tu evento, escuela o marca. Editado con efectos trending, música con licencia y optimizado para viralizarse. Publicación en nuestras cuentas incluida.',
    category: 'video-promo', categoryLabel: 'Video Promocional',
    platforms: [
      { name: 'Instagram', icon: '📸', accounts: 1, totalFollowers: 78000 },
      { name: 'TikTok', icon: '🎵', accounts: 1, totalFollowers: 210000 },
      { name: 'YouTube', icon: '▶️', accounts: 1, totalFollowers: 45000 },
    ],
    price: 45, currency: 'EUR', deliveryDays: 5,
    rating: 4.9, reviews: 156, orders: 430, cover: coverUrl(74),
    tags: ['Video', 'Viral', 'Reel', 'TikTok', 'Profesional'],
    includes: ['Video 15-60s', 'Edición profesional', 'Música con licencia', 'Publicación en 3 cuentas', '2 revisiones', 'Archivo original'],
    extras: [
      { label: 'Versión larga (2-3 min)', price: 75 },
      { label: 'Subtítulos en 3 idiomas', price: 20 },
      { label: 'Pack 3 videos temáticos', price: 99 },
    ],
    platformFee: 15,
  },
  {
    id: 'promo6', sellerId: 'ps1', sellerName: 'Latino Viral Media', sellerAvatar: avatarUrl('Latino Viral', 'EC4899'),
    title: 'Campaña Influencer Latino — 5 Micro-influencers',
    description: 'Tu marca o evento promocionada por 5 micro-influencers latinos (10K-50K seguidores cada uno). Contenido auténtico, alto engagement. Reporte completo con métricas de alcance, interacciones y conversiones.',
    category: 'influencers', categoryLabel: 'Influencers',
    platforms: [
      { name: 'Instagram', icon: '📸', accounts: 5, totalFollowers: 175000 },
      { name: 'TikTok', icon: '🎵', accounts: 5, totalFollowers: 220000 },
    ],
    price: 199, currency: 'EUR', deliveryDays: 7,
    rating: 4.8, reviews: 93, orders: 210, cover: coverUrl(75),
    tags: ['Influencers', 'Micro', 'Alto engagement', 'Contenido auténtico', 'Reporte'],
    includes: ['5 influencers', 'Post + stories cada uno', 'Contenido original', 'Brief personalizado', 'Reporte métricas', 'Derechos de uso'],
    extras: [
      { label: '10 influencers en vez de 5', price: 299 },
      { label: 'Video reel por influencer', price: 150 },
    ],
    platformFee: 15,
  },
  {
    id: 'promo7', sellerId: 'ps2', sellerName: 'BachaSalseros Official', sellerAvatar: avatarUrl('BachaSalseros', 'D81B60'),
    title: 'Artículo destacado en Blog + Newsletter BachaSalseros',
    description: 'Artículo dedicado en el blog de BachaSalseros con distribución a nuestra newsletter de 50.000 suscriptores activos. SEO optimizado, enlace permanente. Ideal para lanzamientos, academias y eventos grandes.',
    category: 'prensa-blogs', categoryLabel: 'Prensa & Blogs',
    platforms: [
      { name: 'Blog', icon: '📝', accounts: 1, totalFollowers: 85000 },
      { name: 'Newsletter', icon: '📧', accounts: 1, totalFollowers: 50000 },
    ],
    price: 35, currency: 'EUR', deliveryDays: 3,
    rating: 4.9, reviews: 124, orders: 380, cover: coverUrl(76),
    tags: ['Blog', 'SEO', 'Newsletter', '50K suscriptores', 'Enlace permanente'],
    includes: ['Artículo 500+ palabras', 'SEO optimizado', 'Newsletter 50K', '3 imágenes', 'Enlace permanente', 'Compartido en redes'],
    extras: [
      { label: 'Entrevista en video para YouTube', price: 55 },
      { label: 'Banner sidebar 30 días', price: 25 },
    ],
    platformFee: 15,
  },
];

// ── LIVE STREAMS ───────────────────────────────────────────────────────────
export const LIVE_STREAMS: LiveStream[] = [
  {
    id: 'l1', artistId: 'a1', artistName: 'DJ Mambo King',
    artistAvatar: avatarUrl('Mambo King', '7C3AED'),
    title: '🔴 LIVE — Salsa Night Warmup Mix', thumbnail: coverUrl(40),
    viewers: 1847, peakViewers: 2340, city: 'Madrid', genre: 'Salsa',
    category: 'dj', tags: ['Salsa', 'Open Format', 'Madrid'],
    startedAt: '21:30', isLive: true, isFeatured: true, isPremium: true,
    description: 'Calentando para la noche más caliente del año en Tropicana Madrid.',
    reactions: [
      { type: '🔥', count: 2840 }, { type: '❤️', count: 1920 },
      { type: '💃', count: 1450 }, { type: '🎵', count: 980 }
    ]
  },
  {
    id: 'l2', artistId: 'a7', artistName: 'Instructora Celia',
    artistAvatar: avatarUrl('Celia', '8B5CF6'),
    title: '🔴 Clase Gratis Bachata — ¡Únete!', thumbnail: coverUrl(41),
    viewers: 934, peakViewers: 1120, city: 'Madrid', genre: 'Bachata',
    category: 'instructor', tags: ['Bachata', 'Principiantes', 'Clase Gratis'],
    startedAt: '19:00', isLive: true, isFeatured: true, isPremium: false,
    description: 'Aprende los básicos de bachata sensual paso a paso, en directo.',
    reactions: [{ type: '❤️', count: 890 }, { type: '🙌', count: 540 }]
  },
  {
    id: 'l3', artistId: 'a4', artistName: 'DJ Bacha Flow',
    artistAvatar: avatarUrl('Bacha Flow', '06B6D4'),
    title: '🔴 Sesión Bachata Sensual en Vivo', thumbnail: coverUrl(42),
    viewers: 672, peakViewers: 890, city: 'Sevilla', genre: 'Bachata',
    category: 'dj', tags: ['Bachata', 'Urban Latin', 'Sevilla'],
    startedAt: '22:00', isLive: true, isFeatured: false, isPremium: false,
    description: 'Sesión nocturna desde el rooftop más exclusivo de Sevilla.',
    reactions: [{ type: '🔥', count: 720 }, { type: '💃', count: 480 }]
  },
  {
    id: 'l4', artistId: 'a6', artistName: 'DJ Kumbé',
    artistAvatar: avatarUrl('DJ Kumbe', '10B981'),
    title: '🔴 Afro-Latin Vibes — Studio Session', thumbnail: coverUrl(43),
    viewers: 445, peakViewers: 567, city: 'Milano', genre: 'Afrobeats',
    category: 'dj', tags: ['Afrobeats', 'Fusión', 'Milano'],
    startedAt: '20:15', isLive: true, isFeatured: false, isPremium: false,
    description: 'Sesión de estudio fusionando ritmos africanos con latinos.',
    reactions: [{ type: '🔥', count: 420 }, { type: '🎵', count: 280 }]
  },
];

// ── SCHEDULED STREAMS (próximos) ───────────────────────────────────────────
export const SCHEDULED_STREAMS: ScheduledStream[] = [
  ...buildScheduled('a1'),
  ...buildScheduled('a2'),
  ...buildScheduled('a7'),
  ...buildScheduled('a8'),
];

// ── SOCIAL ICON HELPERS ────────────────────────────────────────────────────
export const SOCIAL_NETWORK_URLS: Record<keyof SocialLinks, string> = {
  instagram:  'https://instagram.com/',
  tiktok:     'https://tiktok.com/@',
  youtube:    'https://youtube.com/@',
  facebook:   'https://facebook.com/',
  spotify:    'https://open.spotify.com/artist/',
  soundcloud: 'https://soundcloud.com/',
  twitch:     'https://twitch.tv/',
};

// ── CATEGORIES ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'c1', name: 'DJs', icon: '🎧', color: '#7C3AED', route: '/artistas?tipo=dj' },
  { id: 'c2', name: 'Bailarines', icon: '💃', color: '#EC4899', route: '/artistas?tipo=dancer' },
  { id: 'c3', name: 'Bandas', icon: '🎺', color: '#F59E0B', route: '/artistas?tipo=band' },
  { id: 'c4', name: 'Eventos', icon: '🎉', color: '#06B6D4', route: '/eventos' },
  { id: 'c5', name: 'Tickets', icon: '🎫', color: '#EF4444', route: '/eventos' },
  { id: 'c6', name: 'Live Now', icon: '📡', color: '#EF4444', route: '/live' },
  { id: 'c7', name: 'Venues', icon: '🏛️', color: '#10B981', route: '/venues' },
  { id: 'c8', name: 'Servicios', icon: '💼', color: '#8B5CF6', route: '/marketplace' },
  { id: 'c9', name: 'Clases', icon: '🎓', color: '#EC4899', route: '/marketplace?cat=clases' },
  { id: 'c10', name: 'Mapa', icon: '🗺️', color: '#3B82F6', route: '/mapa' },
];

// ── SUBSCRIPTION PLANS ─────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic', name: 'Básico', price: 9, currency: 'EUR', period: 'mes',
    color: 'from-purple-600 to-purple-800',
    description: 'Ideal para empezar a crecer',
    features: [
      'Perfil verificado con badge',
      'Visibilidad premium en búsquedas',
      'Estadísticas básicas',
      'Soporte por chat',
    ],
    flyers: 0, videos: 0
  },
  {
    id: 'standard', name: 'Estándar', price: 20, currency: 'EUR', period: 'mes',
    color: 'from-pink-600 to-purple-700',
    description: 'Para artistas activos',
    features: [
      'Todo lo del plan Básico',
      '4 flyers profesionales/mes',
      'Perfil destacado en categoría',
      'Acceso a estadísticas avanzadas',
      'Prioridad en listados',
    ],
    flyers: 4, videos: 0, popular: true
  },
  {
    id: 'pro', name: 'Pro', price: 50, currency: 'EUR', period: 'mes',
    color: 'from-yellow-500 to-pink-600',
    description: 'Para profesionales serios',
    features: [
      'Todo lo del plan Estándar',
      '8 flyers profesionales/mes',
      '4 vídeos promocionales/mes',
      'Máxima visibilidad en homepage',
      'Badge "Pro" en perfil',
      'Analytics completo',
    ],
    flyers: 8, videos: 4
  },
  {
    id: 'elite', name: 'Elite', price: 150, currency: 'EUR', period: 'mes',
    color: 'from-yellow-400 to-pink-500',
    description: 'Presencia total en el ecosistema',
    features: [
      'Todo lo del plan Pro',
      'Grabación en ubicación (filming)',
      'Cobertura en redes sociales',
      'Campañas premium personalizadas',
      'Máxima visibilidad garantizada',
      'Manager dedicado',
      'Flyers y vídeos ilimitados',
    ],
    flyers: -1, videos: -1
  },
];
