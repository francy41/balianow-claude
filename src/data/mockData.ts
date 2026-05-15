// ============================================================
// MOCK DATA — BachaSalseros Platform
// ============================================================

export type UserRole = 'user' | 'artist' | 'dj' | 'dancer' | 'venue' | 'admin';

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
  social: { instagram?: string; tiktok?: string; youtube?: string; spotify?: string };
  availability: string[];
  completedBookings: number;
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
  city: string;
  genre: string;
  startedAt: string;
  isLive: boolean;
}

// ── AVATARS (using ui-avatars style placeholders) ──────────────────────────
const avatarUrl = (name: string, bg: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=200&bold=true`;

const coverColors = [
  '7C3AED', 'EC4899', 'F59E0B', '06B6D4', 'EF4444',
  '10B981', '8B5CF6', 'F97316', '3B82F6', '6366F1'
];

const coverUrl = (seed: number) =>
  `https://picsum.photos/seed/${seed + 100}/800/450`;

// ── ARTISTS ────────────────────────────────────────────────────────────────
export const ARTISTS: Artist[] = [
  {
    id: 'a1', name: 'DJ Mambo King', type: 'dj', genre: ['Salsa', 'Bachata', 'Merengue'],
    avatar: avatarUrl('Mambo King', '7C3AED'), cover: coverUrl(1),
    city: 'Madrid', country: 'España', rating: 4.9, reviews: 147, followers: 12400,
    priceFrom: 350, currency: 'EUR', isLive: true, isVerified: true, isPremium: true,
    bio: 'DJ con más de 15 años de experiencia en la escena latina internacional. Residente en Madrid, he actuado en más de 20 países mezclando salsa, bachata y ritmos tropicales.',
    tags: ['Salsa', 'Bachata', 'Eventos', 'Bodas', 'Clubs'],
    social: { instagram: 'djmamboking', tiktok: 'djmamboking', spotify: 'djmamboking' },
    availability: ['Viernes', 'Sábado', 'Domingo'], completedBookings: 389
  },
  {
    id: 'a2', name: 'La Reina del Ritmo', type: 'dancer', genre: ['Salsa', 'Son Cubano'],
    avatar: avatarUrl('La Reina', 'EC4899'), cover: coverUrl(2),
    city: 'Barcelona', country: 'España', rating: 5.0, reviews: 89, followers: 8900,
    priceFrom: 200, currency: 'EUR', isLive: false, isVerified: true, isPremium: true,
    bio: 'Bailaora profesional de salsa on2 y son cubano. Campeona del Campeonato Latinoamericano de Salsa 2022. Clases, shows y coreografías para eventos.',
    tags: ['Salsa On2', 'Son Cubano', 'Clases', 'Shows', 'Coreografías'],
    social: { instagram: 'lareina_ritmo', tiktok: 'lareinadelritmo', youtube: 'lareinadelritmo' },
    availability: ['Lunes', 'Miércoles', 'Viernes', 'Sábado'], completedBookings: 234
  },
  {
    id: 'a3', name: 'Orquesta Tropical Fuego', type: 'band', genre: ['Salsa', 'Cumbia', 'Vallenato'],
    avatar: avatarUrl('Orquesta Fuego', 'F59E0B'), cover: coverUrl(3),
    city: 'Valencia', country: 'España', rating: 4.8, reviews: 203, followers: 21000,
    priceFrom: 1200, currency: 'EUR', isLive: false, isVerified: true, isPremium: true,
    bio: 'Orquesta de 12 músicos con repertorio tropical completo. Bodas, eventos corporativos, festivales. Más de 500 shows en toda Europa.',
    tags: ['Orquesta', 'Salsa', 'Cumbia', 'Bodas', 'Festivales'],
    social: { instagram: 'orquestatfuego', youtube: 'orquestatropicalfuego' },
    availability: ['Viernes', 'Sábado'], completedBookings: 512
  },
  {
    id: 'a4', name: 'DJ Bacha Flow', type: 'dj', genre: ['Bachata', 'Urban Latin', 'Reggaeton'],
    avatar: avatarUrl('Bacha Flow', '06B6D4'), cover: coverUrl(4),
    city: 'Sevilla', country: 'España', rating: 4.7, reviews: 112, followers: 6700,
    priceFrom: 250, currency: 'EUR', isLive: true, isVerified: true, isPremium: false,
    bio: 'Especialista en bachata sensual y urban latin. Residencias en los mejores clubs de Sevilla. DJ de boda certificado.',
    tags: ['Bachata Sensual', 'Urban Latin', 'Clubs', 'DJ Boda'],
    social: { instagram: 'djbachaflow', tiktok: 'djbachaflow' },
    availability: ['Jueves', 'Viernes', 'Sábado'], completedBookings: 178
  },
  {
    id: 'a5', name: 'Marcos & Elena Dance', type: 'dancer', genre: ['Tango', 'Salsa', 'Bachata'],
    avatar: avatarUrl('Marcos Elena', 'EF4444'), cover: coverUrl(5),
    city: 'Bilbao', country: 'España', rating: 4.9, reviews: 67, followers: 4500,
    priceFrom: 400, currency: 'EUR', isLive: false, isVerified: true, isPremium: false,
    bio: 'Pareja profesional de baile con especialización en tango argentino y bailes latinos. Shows y clases para todos los niveles.',
    tags: ['Pareja', 'Tango', 'Salsa', 'Shows', 'Clases'],
    social: { instagram: 'marcosyelena_dance', youtube: 'marcosyelena' },
    availability: ['Martes', 'Jueves', 'Sábado', 'Domingo'], completedBookings: 145
  },
  {
    id: 'a6', name: 'DJ Kumbé', type: 'dj', genre: ['Afrobeats', 'Afro-Latin', 'Cumbia'],
    avatar: avatarUrl('DJ Kumbe', '10B981'), cover: coverUrl(6),
    city: 'Milano', country: 'Italia', rating: 4.6, reviews: 88, followers: 9200,
    priceFrom: 300, currency: 'EUR', isLive: false, isVerified: false, isPremium: false,
    bio: 'DJ afro-latina fusionando ritmos africanos con sonidos latinoamericanos. Residente en Milano. Tours por Europa.',
    tags: ['Afrobeats', 'Fusión', 'Clubs', 'Festivales'],
    social: { instagram: 'djkumbe', tiktok: 'djkumbe' },
    availability: ['Viernes', 'Sábado', 'Domingo'], completedBookings: 92
  },
  {
    id: 'a7', name: 'Instructora Celia', type: 'instructor', genre: ['Salsa', 'Zumba', 'Bachata'],
    avatar: avatarUrl('Celia', '8B5CF6'), cover: coverUrl(7),
    city: 'Madrid', country: 'España', rating: 4.9, reviews: 310, followers: 15600,
    priceFrom: 60, currency: 'EUR', isLive: true, isVerified: true, isPremium: true,
    bio: 'Instructora certificada con 10 años de experiencia. Clases online y presenciales. Especialista en salsa, zumba y bachata para principiantes y avanzados.',
    tags: ['Clases', 'Online', 'Principiantes', 'Zumba', 'Grupos'],
    social: { instagram: 'celia_instructor', tiktok: 'celiadance', youtube: 'celiadance' },
    availability: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], completedBookings: 890
  },
  {
    id: 'a8', name: 'Latin Groove Collective', type: 'band', genre: ['Son', 'Timba', 'Jazz Latino'],
    avatar: avatarUrl('Latin Groove', 'F97316'), cover: coverUrl(8),
    city: 'Paris', country: 'Francia', rating: 4.8, reviews: 156, followers: 18300,
    priceFrom: 1800, currency: 'EUR', isLive: false, isVerified: true, isPremium: true,
    bio: 'Colectivo de 8 músicos especializados en son cubano, timba y jazz latino. Actuaciones en festivales internacionales y eventos privados de lujo.',
    tags: ['Son Cubano', 'Timba', 'Jazz Latino', 'Festivales', 'Lujo'],
    social: { instagram: 'latinguoovecollective', spotify: 'latingroove' },
    availability: ['Viernes', 'Sábado'], completedBookings: 267
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

// ── LIVE STREAMS ───────────────────────────────────────────────────────────
export const LIVE_STREAMS: LiveStream[] = [
  {
    id: 'l1', artistId: 'a1', artistName: 'DJ Mambo King',
    artistAvatar: avatarUrl('Mambo King', '7C3AED'),
    title: '🔴 LIVE — Salsa Night Warmup Mix', thumbnail: coverUrl(40),
    viewers: 1847, city: 'Madrid', genre: 'Salsa', startedAt: '21:30', isLive: true
  },
  {
    id: 'l2', artistId: 'a7', artistName: 'Instructora Celia',
    artistAvatar: avatarUrl('Celia', '8B5CF6'),
    title: '🔴 Clase Gratis Bachata — ¡Únete!', thumbnail: coverUrl(41),
    viewers: 934, city: 'Madrid', genre: 'Bachata', startedAt: '19:00', isLive: true
  },
  {
    id: 'l3', artistId: 'a4', artistName: 'DJ Bacha Flow',
    artistAvatar: avatarUrl('Bacha Flow', '06B6D4'),
    title: '🔴 Sesión Bachata Sensual en Vivo', thumbnail: coverUrl(42),
    viewers: 672, city: 'Sevilla', genre: 'Bachata', startedAt: '22:00', isLive: true
  },
  {
    id: 'l4', artistId: 'a6', artistName: 'DJ Kumbé',
    artistAvatar: avatarUrl('DJ Kumbe', '10B981'),
    title: '🔴 Afro-Latin Vibes — Studio Session', thumbnail: coverUrl(43),
    viewers: 445, city: 'Milano', genre: 'Afrobeats', startedAt: '20:15', isLive: true
  },
];

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
  { id: 'c9', name: 'Clases', icon: '🎓', color: '#F97316', route: '/marketplace?cat=clases' },
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
    color: 'from-yellow-400 to-orange-500',
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
