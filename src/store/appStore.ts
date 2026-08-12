import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── PLATFORM COMMISSION ────────────────────────────────────────────────────
// Tasa por defecto (fallback). El valor REAL se lee dinámicamente desde useSiteConfigStore.
export const PLATFORM_COMMISSION_RATE = 0.15;

export const splitAmount = (gross: number, rate: number = PLATFORM_COMMISSION_RATE) => {
  const commission = Math.round(gross * rate * 100) / 100;
  const net = Math.round((gross - commission) * 100) / 100;
  return { gross, commission, net, rate };
};

export type CommissionSource = 'booking' | 'course' | 'offer' | 'class' | 'tip';

export interface CommissionConfig {
  default: number;
  bySource: Record<CommissionSource, number>;
  premiumDiscount: number; // ej 0.07 → premium paga (default - 0.07)
}

export const DEFAULT_COMMISSIONS: CommissionConfig = {
  default: 0.15,
  bySource: {
    booking: 0.15,
    course:  0.20,
    class:   0.15,
    offer:   0.15,
    tip:     0.10,
  },
  premiumDiscount: 0.07, // premium: 15% - 7% = 8%
};

export const computeCommissionRate = (
  cfg: CommissionConfig,
  source: CommissionSource,
  isPremiumSeller = false
): number => {
  const base = cfg.bySource[source] ?? cfg.default;
  const final = isPremiumSeller ? Math.max(0, base - cfg.premiumDiscount) : base;
  return Math.round(final * 1000) / 1000;
};

export type UserRole = 'user' | 'artist' | 'dj' | 'dancer' | 'venue' | 'admin' | 'superadmin' | 'instructor' | 'business' | 'promoter' | 'partner' | 'band' | 'musician';

export interface UserSocials {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  facebook?: string;
  soundcloud?: string;
  twitch?: string;
  website?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  coverPhoto?: string;
  bio?: string;
  phone?: string;
  role: UserRole;
  city: string;
  country?: string;
  isVerified: boolean;
  isPremium: boolean;
  subscriptionPlan?: string;
  wallet: number;
  notifications: number;
  socials?: UserSocials;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<User> & { password: string }) => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;
}

const DEMO_USER: User = {
  id: 'u1',
  name: 'Carlos Rodríguez',
  email: 'carlos@bachasalseros.com',
  avatar: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=7C3AED&color=fff&size=200&bold=true',
  role: 'user',
  city: 'Madrid',
  isVerified: true,
  isPremium: false,
  wallet: 125.50,
  notifications: 3,
};

const DEMO_ARTIST: User = {
  id: 'u2',
  name: 'DJ Mambo King',
  email: 'dj@bachasalseros.com',
  avatar: 'https://ui-avatars.com/api/?name=Mambo+King&background=EC4899&color=fff&size=200&bold=true',
  role: 'dj',
  city: 'Madrid',
  isVerified: true,
  isPremium: true,
  subscriptionPlan: 'pro',
  wallet: 2340.00,
  notifications: 7,
};

const DEMO_ADMIN: User = {
  id: 'u0',
  name: 'Super Admin',
  email: 'admin@bachasalseros.com',
  avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=EC4899&color=fff&size=200&bold=true',
  role: 'admin',
  city: 'Madrid',
  isVerified: true,
  isPremium: true,
  subscriptionPlan: 'enterprise',
  wallet: 0,
  notifications: 12,
};

const SOLFA_ADMIN: User = {
  id: 'u_solfa',
  name: 'Solfa Mendez',
  email: 'solfamendez41@gmail.com',
  avatar: 'https://ui-avatars.com/api/?name=Solfa+Mendez&background=EC4899&color=fff&size=200&bold=true',
  role: 'superadmin',
  city: 'Madrid',
  isVerified: true,
  isPremium: true,
  subscriptionPlan: 'enterprise',
  wallet: 0,
  notifications: 0,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 800));
    // DEMO FALLBACK — only activates when Supabase auth fails (no real credentials stored here)
    // Real auth goes through supabaseLogin() in useSupabaseAuth.ts
    let user: User;
    // Nota: el login real va por supabaseLogin() (Supabase). Este fallback solo
    // cubre cuentas DEMO con contraseña 'demo'. NO se concede admin sin contraseña.
    if (email === DEMO_ADMIN.email && password === 'demo') {
      user = DEMO_ADMIN;
    } else if (email === DEMO_ARTIST.email && password === 'demo') {
      user = DEMO_ARTIST;
    } else if (email === DEMO_USER.email && password === 'demo') {
      user = DEMO_USER;
    } else {
      set({ isLoading: false });
      return false;
    }
    set({ user, isAuthenticated: true, isLoading: false });
    return true;
  },

  logout: () => set({ user: null, isAuthenticated: false }),

  register: async (data) => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 1000));
    const newUser: User = {
      id: `u_${Date.now()}`,
      name: data.name || 'Usuario Nuevo',
      email: data.email || '',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'U')}&background=7C3AED&color=fff&size=200`,
      role: data.role || 'user',
      city: data.city || 'Madrid',
      isVerified: false,
      isPremium: false,
      wallet: 0,
      notifications: 0,
    };
    set({ user: newUser, isAuthenticated: true, isLoading: false });
    return true;
  },

  updateUser: (updates) =>
    set(state => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'ritmolatino-auth',
      version: 2,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ── HOME CATEGORY ─────────────────────────────────────────────────────────
export interface HomeCategory {
  id: string;
  name: string;
  icon: string;
  route: string;
  section: 'main' | 'mercado' | 'comunidad';
  display_order: number;
  active: boolean;
  parent_id?: string | null;        // null = categoría raíz; uuid = subcategoría
  description?: string;
  image_url?: string;
}

export const DEFAULT_HOME_CATEGORIES: HomeCategory[] = [
  { id: '1',  name: 'Explorador',     icon: '🧭', route: '/explorar',                  section: 'main',      display_order: 1,  active: true },
  { id: '2',  name: 'Ciudades',        icon: '🌆', route: '/venues',                    section: 'main',      display_order: 2,  active: true },
  { id: '3',  name: 'Eventos',         icon: '🎉', route: '/eventos',                   section: 'main',      display_order: 3,  active: true },
  { id: '4',  name: 'Artistas',        icon: '🎧', route: '/artistas?tipo=artist',                  section: 'main',      display_order: 4,  active: true },
  { id: '5',  name: 'Bailarines',      icon: '💃', route: '/artistas?tipo=dancer',      section: 'main',      display_order: 5,  active: true },
  { id: '6',  name: 'Marketplace',     icon: '🏪', route: '/marketplace',               section: 'main',      display_order: 6,  active: true },
  { id: '20', name: 'Promociónate',    icon: '📢', route: '/promocionate',              section: 'main',      display_order: 7,  active: true },
  { id: '7',  name: 'En Directo',      icon: '🔴', route: '/live',                      section: 'main',      display_order: 8,  active: true },
  { id: '8',  name: 'Comunidad',       icon: '💬', route: '/comunidad',                 section: 'main',      display_order: 9,  active: true },
  { id: '9',  name: 'Ruta de Hoy',     icon: '📍', route: '/eventos?type=featured',     section: 'mercado',   display_order: 1,  active: true },
  { id: '10', name: 'Proyectos',       icon: '🚀', route: '/marketplace?cat=Producción',section: 'mercado',   display_order: 2,  active: true },
  { id: '12', name: 'Ofertas',         icon: '⭐', route: '/eventos?featured=true',     section: 'mercado',   display_order: 4,  active: true },
  { id: '13', name: 'Anuncios',        icon: '📢', route: '/comunidad',                 section: 'comunidad', display_order: 1,  active: true },
  { id: '14', name: 'Academia',        icon: '🎓', route: '/marketplace?cat=Clases',    section: 'comunidad', display_order: 2,  active: true },
  { id: '15', name: 'Comunidad',       icon: '👥', route: '/comunidad',                 section: 'comunidad', display_order: 3,  active: true },
  { id: '16', name: 'Chat',            icon: '💬', route: '/chat',                      section: 'comunidad', display_order: 4,  active: true },
];

// ── PROFILE MODULES (pestañas/secciones de los perfiles) ──────────────────
// Activar/ocultar globalmente qué módulos muestran TODOS los perfiles.
// Controlado por el superadmin desde la sección Categorías.
export interface ProfileModule {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

export const DEFAULT_PROFILE_MODULES: ProfileModule[] = [
  { id: 'about',    label: 'Sobre mí',                   icon: '✨', enabled: true },
  { id: 'gallery',  label: 'Galería / Imágenes',         icon: '🖼️', enabled: true },
  { id: 'videos',   label: 'Videos',                     icon: '🎬', enabled: true },
  { id: 'offers',   label: 'Servicios',                  icon: '🏆', enabled: true },
  { id: 'classes',  label: 'Clases',                     icon: '🎓', enabled: true },
  { id: 'courses',  label: 'Cursos',                     icon: '📚', enabled: true },
  { id: 'calendar', label: 'Calendario / Disponibilidad', icon: '📅', enabled: true },
  { id: 'events',   label: 'Eventos',                    icon: '🎉', enabled: true },
  { id: 'live',     label: 'Live / En directo',          icon: '🔴', enabled: true },
  { id: 'reviews',  label: 'Reseñas',                    icon: '⭐', enabled: true },
  // Módulos del dashboard (panel del dueño)
  { id: 'earnings', label: 'Ganancias (dashboard)',      icon: '💰', enabled: true },
  { id: 'payouts',  label: 'Cobrar (dashboard)',         icon: '🏦', enabled: true },
  { id: 'payments', label: 'Pagar (dashboard)',          icon: '💳', enabled: true },
  { id: 'buyers',   label: 'Compradores (dashboard)',    icon: '👥', enabled: true },
  { id: 'scanner',  label: 'Escanear QR (dashboard)',    icon: '📷', enabled: true },
];

// ── SITE CONFIG STORE (hero banner, etc.) ─────────────────────────────────
export type HeroMediaType = 'image' | 'youtube' | 'video';

export interface HeroSliderImage {
  id: string;
  url: string;
  alt: string;
}

export interface HeroMedia {
  type: HeroMediaType;
  url: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
}

interface SiteConfigState {
  heroMedia: HeroMedia;
  heroSliderImages: HeroSliderImage[];
  commissions: CommissionConfig;
  siteLogo: string;
  homeCategories: HomeCategory[];
  profileModules: ProfileModule[];
  homeTvCards: HomeTvCard[];
  setHeroMedia: (media: Partial<HeroMedia>) => void;
  setHeroSliderImages: (images: HeroSliderImage[]) => void;
  setCommission: (source: CommissionSource, rate: number) => void;
  setDefaultCommission: (rate: number) => void;
  setPremiumDiscount: (rate: number) => void;
  resetCommissions: () => void;
  setSiteLogo: (logo: string) => void;
  setHomeCategories: (cats: HomeCategory[]) => void;
  setProfileModules: (mods: ProfileModule[]) => void;
  setHomeTvCards: (cards: HomeTvCard[]) => void;
}

export interface HomeTvCard { title: string; subtitle: string; tag: string; image: string; link: string; }
export const DEFAULT_HOME_TV: HomeTvCard[] = [
  { title: 'Kizomba desde cero', subtitle: 'Kizomba · Principiante', tag: 'NUEVO', image: '', link: '/tv' },
  { title: 'Merengue en pareja', subtitle: 'Merengue · Intermedio', tag: 'NUEVO', image: '', link: '/tv' },
  { title: 'Salsa en línea',     subtitle: 'Salsa · Principiante',   tag: 'NUEVO', image: '', link: '/tv' },
  { title: 'Bachata sensual',    subtitle: 'Bachata · Intermedio',   tag: 'NUEVO', image: '', link: '/tv' },
];

export const useSiteConfigStore = create<SiteConfigState>()(
  persist(
    (set) => ({
      heroMedia: {
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw',
        autoplay: true,
        muted: true,
        loop: true,
      },
      heroSliderImages: [
        { id: '1', url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1400&h=500&fit=crop&crop=center', alt: 'BailaNow - Todo lo que amas del baile latino' },
        { id: '2', url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=1400&h=500&fit=crop&crop=center', alt: 'BailaNow - Encuentra todo el mundo del baile en tus manos' },
      ],
      commissions: DEFAULT_COMMISSIONS,
      siteLogo: '',
      homeCategories: DEFAULT_HOME_CATEGORIES,
      profileModules: DEFAULT_PROFILE_MODULES,
      homeTvCards: DEFAULT_HOME_TV,
      setHeroMedia: (media) =>
        set((state) => ({ heroMedia: { ...state.heroMedia, ...media } })),
      setHeroSliderImages: (images) => set({ heroSliderImages: images }),
      setSiteLogo: (logo) => set({ siteLogo: logo }),
      setHomeCategories: (cats) => set({ homeCategories: cats }),
      setProfileModules: (mods) => set({ profileModules: mods }),
      setHomeTvCards: (cards) => set({ homeTvCards: cards }),
      setCommission: (source, rate) =>
        set((state) => ({
          commissions: {
            ...state.commissions,
            bySource: { ...state.commissions.bySource, [source]: rate }
          }
        })),
      setDefaultCommission: (rate) =>
        set((state) => ({ commissions: { ...state.commissions, default: rate } })),
      setPremiumDiscount: (rate) =>
        set((state) => ({ commissions: { ...state.commissions, premiumDiscount: rate } })),
      resetCommissions: () =>
        set({ commissions: DEFAULT_COMMISSIONS }),
    }),
    {
      name: 'bailanow-site-config-v2',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Force reset to defaults if there's any issue with persisted state
        if (!persistedState || !persistedState.homeCategories || persistedState.homeCategories.length === 0) {
          console.log('📦 SiteConfig: Initializing with defaults (no valid persisted state)');
          return {
            ...(persistedState || {}),
            homeCategories: DEFAULT_HOME_CATEGORIES,
            profileModules: persistedState?.profileModules || DEFAULT_PROFILE_MODULES,
          };
        }
        // Asegura módulos por defecto en estados persistidos antiguos
        if (!persistedState.profileModules || persistedState.profileModules.length === 0) {
          return { ...persistedState, profileModules: DEFAULT_PROFILE_MODULES };
        }
        return persistedState;
      },
    }
  )
);

// Extracts a YouTube video ID from any common URL format.
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^?&]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(url) ? url : null;
}

// ── UI STORE ───────────────────────────────────────────────────────────────
interface UIState {
  activeModal: string | null;
  sidebarOpen: boolean;
  toasts: Toast[];
  darkMode: boolean;
  openModal: (id: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  sidebarOpen: false,
  toasts: [],
  darkMode: typeof window !== 'undefined' && localStorage.getItem('bailanow-dark') === 'true',

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set(state => {
    const next = !state.darkMode;
    localStorage.setItem('bailanow-dark', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: next };
  }),

  addToast: (toast) =>
    set(state => ({
      toasts: [...state.toasts, { ...toast, id: `t_${Date.now()}` }]
    })),

  removeToast: (id) =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

// ── CHAT STORE ─────────────────────────────────────────────────────────────
export type OfferStatus = 'pending' | 'accepted' | 'declined';

export interface OfferPayload {
  title: string;
  price: number;
  description: string;
  deliveryDays?: number;
  status: OfferStatus;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  type?: 'text' | 'offer';
  offer?: OfferPayload;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
  messages: Message[];
}

interface ChatState {
  conversations: Conversation[];
  activeConvId: string | null;
  setActiveConv: (id: string) => void;
  sendMessage: (convId: string, text: string, user: User) => void;
  sendOffer: (convId: string, offer: Omit<OfferPayload, 'status'>, user: User) => void;
  respondOffer: (convId: string, messageId: string, accept: boolean) => void;
}

export const SUPPORT_CONV_ID = 'soporte';

export const useChatStore = create<ChatState>((set) => ({
  conversations: [
    {
      id: SUPPORT_CONV_ID,
      participantId: 'bailanow-support',
      participantName: 'Soporte BailaNow',
      participantAvatar: 'https://ui-avatars.com/api/?name=Soporte&background=EC4899&color=fff&size=200&bold=true',
      lastMessage: '¡Hola! ¿En qué podemos ayudarte hoy?',
      lastMessageTime: new Date(),
      unread: 0,
      messages: [
        {
          id: 'sup-1', senderId: 'bailanow-support', senderName: 'Soporte BailaNow',
          senderAvatar: 'https://ui-avatars.com/api/?name=Soporte&background=EC4899&color=fff&size=200&bold=true',
          text: '¡Hola! 👋 Somos el equipo de soporte de BailaNow. Escríbenos tu duda sobre pagos, reservas, perfiles o publicidad y te responderemos lo antes posible.',
          timestamp: new Date(), isRead: true
        }
      ]
    },
    {
      id: 'conv1',
      participantId: 'a1',
      participantName: 'DJ Mambo King',
      participantAvatar: 'https://ui-avatars.com/api/?name=Mambo+King&background=7C3AED&color=fff&size=200',
      lastMessage: '¡Hola! Vi tu propuesta de booking...',
      lastMessageTime: new Date(Date.now() - 3600000),
      unread: 2,
      messages: [
        {
          id: 'm1', senderId: 'a1', senderName: 'DJ Mambo King',
          senderAvatar: 'https://ui-avatars.com/api/?name=Mambo+King&background=7C3AED&color=fff&size=200',
          text: '¡Hola! Vi tu propuesta de booking para el 15 de junio. Me interesa mucho.',
          timestamp: new Date(Date.now() - 7200000), isRead: true
        },
        {
          id: 'm2', senderId: 'a1', senderName: 'DJ Mambo King',
          senderAvatar: 'https://ui-avatars.com/api/?name=Mambo+King&background=7C3AED&color=fff&size=200',
          text: '¿Cuántas horas necesitas? ¿Es para una boda o evento privado?',
          timestamp: new Date(Date.now() - 3600000), isRead: false
        }
      ]
    },
    {
      id: 'conv2',
      participantId: 'a2',
      participantName: 'La Reina del Ritmo',
      participantAvatar: 'https://ui-avatars.com/api/?name=La+Reina&background=EC4899&color=fff&size=200',
      lastMessage: 'Perfecto, hasta el sábado entonces 💃',
      lastMessageTime: new Date(Date.now() - 86400000),
      unread: 0,
      messages: [
        {
          id: 'm3', senderId: 'u1', senderName: 'Carlos',
          senderAvatar: 'https://ui-avatars.com/api/?name=Carlos&background=7C3AED&color=fff&size=200',
          text: 'Hola! Quisiera reservar una clase privada para este sábado.',
          timestamp: new Date(Date.now() - 172800000), isRead: true
        },
        {
          id: 'm4', senderId: 'a2', senderName: 'La Reina del Ritmo',
          senderAvatar: 'https://ui-avatars.com/api/?name=La+Reina&background=EC4899&color=fff&size=200',
          text: 'Perfecto, hasta el sábado entonces 💃',
          timestamp: new Date(Date.now() - 86400000), isRead: true
        }
      ]
    }
  ],
  activeConvId: null,

  setActiveConv: (id) => set({ activeConvId: id }),

  sendMessage: (convId, text, user) =>
    set(state => ({
      conversations: state.conversations.map(conv => {
        if (conv.id !== convId) return conv;
        const msg: Message = {
          id: `m_${Date.now()}`,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatar,
          text,
          timestamp: new Date(),
          isRead: true
        };
        return {
          ...conv,
          messages: [...conv.messages, msg],
          lastMessage: text,
          lastMessageTime: new Date(),
          unread: 0
        };
      })
    })),

  sendOffer: (convId, offer, user) =>
    set(state => ({
      conversations: state.conversations.map(conv => {
        if (conv.id !== convId) return conv;
        const msg: Message = {
          id: `m_${Date.now()}`,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatar,
          text: `Oferta: ${offer.title} · €${offer.price}`,
          timestamp: new Date(),
          isRead: true,
          type: 'offer',
          offer: { ...offer, status: 'pending' }
        };
        return {
          ...conv,
          messages: [...conv.messages, msg],
          lastMessage: `💼 Oferta enviada: ${offer.title}`,
          lastMessageTime: new Date(),
          unread: 0
        };
      })
    })),

  respondOffer: (convId, messageId, accept) =>
    set(state => ({
      conversations: state.conversations.map(conv => {
        if (conv.id !== convId) return conv;
        return {
          ...conv,
          messages: conv.messages.map(m =>
            m.id === messageId && m.offer
              ? { ...m, offer: { ...m.offer, status: accept ? 'accepted' : 'declined' } }
              : m
          )
        };
      })
    })),
}));

// ── ADMIN OVERRIDES (parches editables sobre datos mock) ──────────────────
type EntityKind = 'artist' | 'event' | 'venue' | 'service' | 'user' | 'category' | 'course' | 'subscription' | 'affiliate' | 'promo';

interface AdminOverridesState {
  patches: Record<string, Record<string, any>>;  // key = `${entity}:${id}`
  setPatch: (entity: EntityKind, id: string, data: Record<string, any>) => void;
  removePatch: (entity: EntityKind, id: string) => void;
  getMerged: <T extends { id: string }>(entity: EntityKind, item: T) => T;
}

export const useAdminOverridesStore = create<AdminOverridesState>()(
  persist(
    (set, get) => ({
      patches: {},
      setPatch: (entity, id, data) =>
        set(state => ({
          patches: { ...state.patches, [`${entity}:${id}`]: { ...(state.patches[`${entity}:${id}`] || {}), ...data } }
        })),
      removePatch: (entity, id) =>
        set(state => {
          const cp = { ...state.patches };
          delete cp[`${entity}:${id}`];
          return { patches: cp };
        }),
      getMerged: (entity, item) => {
        const patch = get().patches[`${entity}:${item.id}`];
        return patch ? ({ ...item, ...patch } as any) : item;
      },
    }),
    {
      name: 'ritmolatino-admin-overrides',
      version: 1,
    }
  )
);

// ── PERFORMER STORE (ganancias + cursos + calendario + clases + ofertas) ──
export interface Transaction {
  id: string;
  performerId: string;
  performerName?: string;
  clientId?: string;
  clientName: string;
  concept: string;
  gross: number;
  commission: number;
  net: number;
  date: Date;
  // pending  = pago en escrow, servicio aún no confirmado por comprador
  // released = comprador confirmó OK → fondos liberados al creador
  // withdrawn = creador ya retiró estos fondos
  // refunded = reembolsado al comprador
  status: 'pending' | 'released' | 'withdrawn' | 'refunded';
  source: 'booking' | 'course' | 'offer' | 'class' | 'tip';
  confirmedAt?: Date;
}

export interface Withdrawal {
  id: string;
  performerId: string;
  performerName: string;
  amount: number;
  method: 'bank' | 'paypal' | 'stripe';
  requestedAt: Date;
  status: 'pending' | 'paid' | 'rejected';
  paidAt?: Date;
  txIds: string[];
}

export interface PayoutMethod {
  id: string;
  performerId: string;
  type: 'stripe' | 'paypal' | 'bank';
  account: string;          // ej: email PayPal, nº cuenta (truncado), id Stripe Connect
  holderName: string;
  verified: boolean;
  isDefault: boolean;
  createdAt: Date;
}

// Métodos de pago (para PAGAR — compradores y creators usan los mismos)
export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'paypal' | 'stripe';
  brand?: 'visa' | 'mastercard' | 'amex' | 'discover';
  last4?: string;
  expMonth?: number;
  expYear?: number;
  account?: string;      // PayPal email / Stripe customer id
  holderName: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface Course {
  id: string;
  performerId: string;
  title: string;
  description: string;
  price: number;
  durationMin: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnail: string;
  videoUrl?: string;
  enrolledCount: number;
  isPublished: boolean;
  createdAt: Date;
}

export interface AvailabilitySlot {
  id: string;
  performerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  isBooked: boolean;
}

export interface OnlineClass {
  id: string;
  performerId: string;
  clientName: string;
  clientId: string;
  topic: string;
  scheduledAt: Date;
  durationMin: number;
  price: number;
  roomUrl: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

export interface OfferRequest {
  id: string;
  performerId: string;
  clientName: string;
  clientAvatar: string;
  title: string;
  description: string;
  proposedPrice: number;
  date: string;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'countered';
  counterPrice?: number;
}

interface PerformerState {
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  payoutMethods: PayoutMethod[];
  paymentMethods: PaymentMethod[];
  courses: Course[];
  slots: AvailabilitySlot[];
  classes: OnlineClass[];
  offers: OfferRequest[];

  confirmServiceOK: (txId: string) => void;
  refundTransaction: (txId: string, reason?: string) => void;
  requestWithdrawal: (performerId: string, performerName: string, amount: number, method: Withdrawal['method']) => boolean;
  approveWithdrawal: (id: string) => void;
  rejectWithdrawal: (id: string) => void;
  addPayoutMethod: (m: Omit<PayoutMethod, 'id' | 'createdAt' | 'verified'>) => void;
  removePayoutMethod: (id: string) => void;
  verifyPayoutMethod: (id: string) => void;
  setDefaultPayoutMethod: (performerId: string, methodId: string) => void;
  addPaymentMethod: (m: Omit<PaymentMethod, 'id' | 'createdAt'>) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (userId: string, methodId: string) => void;
  balanceFor: (performerId: string) => { inEscrow: number; available: number; withdrawn: number; lifetime: number };
  monthlyRevenue: (performerId: string, months?: number) => { month: string; gross: number; net: number }[];

  recordTransaction: (t: Omit<Transaction, 'id' | 'commission' | 'net' | 'date'> & { date?: Date }) => Transaction;
  addCourse: (c: Omit<Course, 'id' | 'enrolledCount' | 'createdAt'>) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  removeCourse: (id: string) => void;
  addSlot: (s: Omit<AvailabilitySlot, 'id' | 'isBooked'>) => void;
  removeSlot: (id: string) => void;
  scheduleClass: (c: Omit<OnlineClass, 'id' | 'roomUrl' | 'status'>) => void;
  setClassStatus: (id: string, status: OnlineClass['status']) => void;
  respondOfferRequest: (id: string, action: 'accept' | 'decline' | 'counter', counterPrice?: number) => void;

  totalsFor: (performerId: string) => {
    grossThisMonth: number;
    netThisMonth: number;
    commissionThisMonth: number;
    grossAllTime: number;
    netAllTime: number;
    pendingPayouts: number;
  };
  platformTotals: () => { totalCommission: number; totalGross: number; totalTransactions: number };
}

const today = new Date();
const daysAgo = (d: number) => new Date(today.getTime() - d * 86400000);

const seedTx = (performerId: string, performerName: string, gross: number, source: Transaction['source'], concept: string, client: string, clientId: string, daysBack: number, status: Transaction['status'] = 'released'): Transaction => {
  const { commission, net } = splitAmount(gross);
  return {
    id: `tx_${Math.random().toString(36).slice(2, 9)}`,
    performerId, performerName, clientId, clientName: client, concept, gross, commission, net,
    date: daysAgo(daysBack), status, source,
    confirmedAt: status !== 'pending' ? daysAgo(daysBack - 1) : undefined,
  };
};

export const usePerformerStore = create<PerformerState>()(
  persist(
    (set, get) => ({
      transactions: [
        seedTx('a1', 'DJ Mambo King', 350, 'booking', 'Set DJ boda Sara & Marco', 'Sara López',  'u1', 2, 'released'),
        seedTx('a1', 'DJ Mambo King',  80, 'course',  'Curso "Mezcla con Pioneer DDJ"', 'Miguel R.', 'u2', 5, 'released'),
        seedTx('a1', 'DJ Mambo King',  60, 'class',   'Clase online de DJing 1h', 'Ana Pérez',  'u3', 8, 'withdrawn'),
        seedTx('a1', 'DJ Mambo King',  25, 'tip',     'Propina stream en directo', 'Carlos M.', 'u1', 1, 'pending'),
        seedTx('a2', 'La Reina del Ritmo', 220, 'booking', 'Show bachata sensual', 'La Habana Bar', 'u4', 3, 'released'),
        seedTx('a2', 'La Reina del Ritmo',  45, 'class',   'Clase online de bachata',  'Elena G.',     'u1', 4, 'pending'),
        seedTx('a3', 'Orquesta Tropical', 180, 'offer',   'Workshop salsa cubana 2h', 'Salsa Madrid', 'u5', 6, 'released'),
      ],
      withdrawals: [
        {
          id: 'wd1', performerId: 'a1', performerName: 'DJ Mambo King',
          amount: 51, method: 'paypal', requestedAt: daysAgo(7),
          status: 'paid', paidAt: daysAgo(5), txIds: []
        },
      ],
      payoutMethods: [
        {
          id: 'pm1', performerId: 'a1', type: 'paypal',
          account: 'dj@bachasalseros.com', holderName: 'DJ Mambo King',
          verified: true, isDefault: true, createdAt: daysAgo(30)
        },
      ],
      paymentMethods: [
        {
          id: 'pay1', userId: 'u1', type: 'card', brand: 'visa', last4: '4242',
          expMonth: 12, expYear: 2027, holderName: 'Carlos Rodríguez',
          isDefault: true, createdAt: daysAgo(20)
        },
      ],
      courses: [
        {
          id: 'c1', performerId: 'a1', title: 'Fundamentos del DJing Latino',
          description: 'Aprende a mezclar salsa, bachata y reggaeton desde cero.',
          price: 49, durationMin: 240, level: 'beginner',
          thumbnail: 'https://picsum.photos/seed/course-dj/400/250',
          enrolledCount: 124, isPublished: true, createdAt: daysAgo(45)
        },
        {
          id: 'c2', performerId: 'a2', title: 'Bachata sensual: técnica corporal',
          description: 'De principiante a nivel intermedio con rutinas explicadas.',
          price: 39, durationMin: 180, level: 'intermediate',
          thumbnail: 'https://picsum.photos/seed/course-bachata/400/250',
          enrolledCount: 87, isPublished: true, createdAt: daysAgo(20)
        },
      ],
      slots: [
        { id: 's1', performerId: 'a1', date: '2026-05-18', startTime: '18:00', endTime: '20:00', isBooked: false },
        { id: 's2', performerId: 'a1', date: '2026-05-19', startTime: '17:00', endTime: '19:00', isBooked: true },
        { id: 's3', performerId: 'a1', date: '2026-05-22', startTime: '20:00', endTime: '22:00', isBooked: false },
      ],
      classes: [
        {
          id: 'cl1', performerId: 'a1', clientName: 'Ana Pérez', clientId: 'u1',
          topic: 'Clase 1:1 de mezcla', scheduledAt: new Date(today.getTime() + 86400000),
          durationMin: 60, price: 60, roomUrl: '/clase/cl1', status: 'scheduled'
        }
      ],
      offers: [
        {
          id: 'of1', performerId: 'a1', clientName: 'Roberto Sanz',
          clientAvatar: 'https://ui-avatars.com/api/?name=Roberto+Sanz&background=EC4899&color=fff',
          title: 'DJ para cumpleaños privado', description: '3 horas, repertorio salsa + reggaeton, 60 invitados.',
          proposedPrice: 280, date: '2026-06-05', createdAt: daysAgo(0), status: 'pending'
        },
        {
          id: 'of2', performerId: 'a1', clientName: 'Club Tropical',
          clientAvatar: 'https://ui-avatars.com/api/?name=Club+Tropical&background=EC4899&color=fff',
          title: 'Residencia DJ los viernes', description: '4 viernes consecutivos, 4h por noche.',
          proposedPrice: 1200, date: '2026-06-12', createdAt: daysAgo(1), status: 'pending'
        },
      ],

      confirmServiceOK: (txId) =>
        set(state => ({
          transactions: state.transactions.map(t =>
            t.id === txId && t.status === 'pending'
              ? { ...t, status: 'released', confirmedAt: new Date() }
              : t
          )
        })),

      refundTransaction: (txId) =>
        set(state => ({
          transactions: state.transactions.map(t =>
            t.id === txId && (t.status === 'pending' || t.status === 'released')
              ? { ...t, status: 'refunded' }
              : t
          )
        })),

      addPayoutMethod: (m) =>
        set(state => {
          const isFirst = state.payoutMethods.filter(p => p.performerId === m.performerId).length === 0;
          return {
            payoutMethods: [...state.payoutMethods, {
              ...m,
              id: `pm_${Date.now()}`,
              verified: false,
              isDefault: m.isDefault || isFirst,
              createdAt: new Date(),
            }]
          };
        }),

      removePayoutMethod: (id) =>
        set(state => ({ payoutMethods: state.payoutMethods.filter(p => p.id !== id) })),

      verifyPayoutMethod: (id) =>
        set(state => ({
          payoutMethods: state.payoutMethods.map(p => p.id === id ? { ...p, verified: true } : p)
        })),

      setDefaultPayoutMethod: (performerId, methodId) =>
        set(state => ({
          payoutMethods: state.payoutMethods.map(p =>
            p.performerId === performerId ? { ...p, isDefault: p.id === methodId } : p
          )
        })),

      addPaymentMethod: (m) =>
        set(state => {
          const isFirst = state.paymentMethods.filter(p => p.userId === m.userId).length === 0;
          return {
            paymentMethods: [...state.paymentMethods, {
              ...m,
              id: `pay_${Date.now()}`,
              isDefault: m.isDefault || isFirst,
              createdAt: new Date(),
            }]
          };
        }),

      removePaymentMethod: (id) =>
        set(state => ({ paymentMethods: state.paymentMethods.filter(p => p.id !== id) })),

      setDefaultPaymentMethod: (userId, methodId) =>
        set(state => ({
          paymentMethods: state.paymentMethods.map(p =>
            p.userId === userId ? { ...p, isDefault: p.id === methodId } : p
          )
        })),

      monthlyRevenue: (performerId, months = 6) => {
        const txs = get().transactions.filter(t =>
          t.performerId === performerId && (t.status === 'released' || t.status === 'withdrawn')
        );
        const now = new Date();
        const out: { month: string; gross: number; net: number }[] = [];
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthTx = txs.filter(t => {
            const dt = new Date(t.date);
            return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
          });
          out.push({
            month: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
            gross: Math.round(monthTx.reduce((s, t) => s + t.gross, 0) * 100) / 100,
            net:   Math.round(monthTx.reduce((s, t) => s + t.net,   0) * 100) / 100,
          });
        }
        return out;
      },

      requestWithdrawal: (performerId, performerName, amount, method) => {
        const state = get();
        const releasedTx = state.transactions.filter(t => t.performerId === performerId && t.status === 'released');
        const available = releasedTx.reduce((s, t) => s + t.net, 0);
        if (amount <= 0 || amount > available + 0.001) return false;
        // selecciona transacciones hasta cubrir el monto
        const chosen: string[] = [];
        let acc = 0;
        for (const t of releasedTx) {
          if (acc + t.net <= amount + 0.001) {
            chosen.push(t.id);
            acc += t.net;
            if (Math.abs(acc - amount) < 0.01) break;
          }
        }
        const w: Withdrawal = {
          id: `wd_${Date.now()}`,
          performerId, performerName, amount, method,
          requestedAt: new Date(), status: 'pending', txIds: chosen,
        };
        set({
          withdrawals: [w, ...state.withdrawals],
          transactions: state.transactions.map(t =>
            chosen.includes(t.id) ? { ...t, status: 'withdrawn' } : t
          ),
        });
        return true;
      },

      approveWithdrawal: (id) =>
        set(state => ({
          withdrawals: state.withdrawals.map(w =>
            w.id === id ? { ...w, status: 'paid', paidAt: new Date() } : w
          )
        })),

      rejectWithdrawal: (id) =>
        set(state => {
          const w = state.withdrawals.find(x => x.id === id);
          if (!w) return state;
          // devuelve las transacciones a 'released'
          return {
            withdrawals: state.withdrawals.map(x => x.id === id ? { ...x, status: 'rejected' } : x),
            transactions: state.transactions.map(t =>
              w.txIds.includes(t.id) ? { ...t, status: 'released' } : t
            ),
          };
        }),

      balanceFor: (performerId) => {
        const txs = get().transactions.filter(t => t.performerId === performerId);
        const sum = (s: Transaction['status']) =>
          Math.round(txs.filter(t => t.status === s).reduce((a, t) => a + t.net, 0) * 100) / 100;
        const inEscrow  = sum('pending');
        const available = sum('released');
        const withdrawn = sum('withdrawn');
        return { inEscrow, available, withdrawn, lifetime: inEscrow + available + withdrawn };
      },

      recordTransaction: (input) => {
        // Lee la tasa dinámica según source desde el site config
        const cfg = useSiteConfigStore.getState().commissions;
        const rate = computeCommissionRate(cfg, (input.source as CommissionSource), false);
        const { commission, net } = splitAmount(input.gross, rate);
        const tx: Transaction = {
          id: `tx_${Date.now()}`,
          commission, net,
          date: input.date || new Date(),
          ...input,
        };
        set(state => ({ transactions: [tx, ...state.transactions] }));
        return tx;
      },

      addCourse: (c) =>
        set(state => ({
          courses: [{
            ...c,
            id: `c_${Date.now()}`,
            enrolledCount: 0,
            createdAt: new Date(),
          }, ...state.courses]
        })),

      updateCourse: (id, updates) =>
        set(state => ({
          courses: state.courses.map(c => c.id === id ? { ...c, ...updates } : c)
        })),

      removeCourse: (id) =>
        set(state => ({ courses: state.courses.filter(c => c.id !== id) })),

      addSlot: (s) =>
        set(state => ({
          slots: [...state.slots, { ...s, id: `s_${Date.now()}`, isBooked: false }]
        })),

      removeSlot: (id) =>
        set(state => ({ slots: state.slots.filter(s => s.id !== id) })),

      scheduleClass: (c) =>
        set(state => ({
          classes: [...state.classes, {
            ...c,
            id: `cl_${Date.now()}`,
            roomUrl: `/clase/cl_${Date.now()}`,
            status: 'scheduled'
          }]
        })),

      setClassStatus: (id, status) =>
        set(state => ({
          classes: state.classes.map(c => c.id === id ? { ...c, status } : c)
        })),

      respondOfferRequest: (id, action, counterPrice) =>
        set(state => ({
          offers: state.offers.map(o => {
            if (o.id !== id) return o;
            if (action === 'accept')  return { ...o, status: 'accepted' };
            if (action === 'decline') return { ...o, status: 'declined' };
            return { ...o, status: 'countered', counterPrice };
          })
        })),

      totalsFor: (performerId) => {
        const completedStatuses: Transaction['status'][] = ['released', 'withdrawn'];
        const all = get().transactions.filter(t => t.performerId === performerId && completedStatuses.includes(t.status));
        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        const monthTx = all.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
        const sum = (arr: Transaction[], key: 'gross' | 'net' | 'commission') =>
          Math.round(arr.reduce((s, t) => s + t[key], 0) * 100) / 100;
        const pending = get().transactions
          .filter(t => t.performerId === performerId && t.status === 'pending');
        return {
          grossThisMonth: sum(monthTx, 'gross'),
          netThisMonth: sum(monthTx, 'net'),
          commissionThisMonth: sum(monthTx, 'commission'),
          grossAllTime: sum(all, 'gross'),
          netAllTime: sum(all, 'net'),
          pendingPayouts: sum(pending, 'net'),
        };
      },

      platformTotals: () => {
        const billable: Transaction['status'][] = ['released', 'withdrawn'];
        const all = get().transactions.filter(t => billable.includes(t.status));
        const sum = (key: 'gross' | 'commission') =>
          Math.round(all.reduce((s, t) => s + t[key], 0) * 100) / 100;
        return {
          totalCommission: sum('commission'),
          totalGross: sum('gross'),
          totalTransactions: all.length,
        };
      },
    }),
    {
      name: 'ritmolatino-performer',
      version: 3,
      migrate: () => undefined as any,
    }
  )
);

// ── PROMO CART STORE ──────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  serviceId: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  price: number;
  currency: string;
  extras: { label: string; price: number; selected: boolean }[];
  quantity: number;
  addedAt: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  toggleExtra: (itemId: string, extraIndex: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getCommission: () => number;
  getTotal: () => number;
  getSellerBreakdown: () => { sellerId: string; sellerName: string; sellerAvatar: string; gross: number; commission: number; net: number }[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find(i => i.serviceId === item.serviceId);
        if (existing) return; // no duplicates
        set(s => ({
          items: [...s.items, {
            ...item,
            id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            quantity: 1,
            addedAt: new Date().toISOString(),
          }],
        }));
      },

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      toggleExtra: (itemId, extraIndex) => set(s => ({
        items: s.items.map(i =>
          i.id === itemId
            ? { ...i, extras: i.extras.map((e, idx) => idx === extraIndex ? { ...e, selected: !e.selected } : e) }
            : i
        ),
      })),

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const extrasTotal = item.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0);
          return sum + item.price + extrasTotal;
        }, 0);
      },

      getCommission: () => Math.round(get().getSubtotal() * PLATFORM_COMMISSION_RATE * 100) / 100,

      getTotal: () => get().getSubtotal(),

      getSellerBreakdown: () => {
        const items = get().items;
        const sellerMap = new Map<string, { sellerId: string; sellerName: string; sellerAvatar: string; gross: number }>();
        items.forEach(item => {
          const extrasTotal = item.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0);
          const itemTotal = item.price + extrasTotal;
          const existing = sellerMap.get(item.sellerId);
          if (existing) {
            existing.gross += itemTotal;
          } else {
            sellerMap.set(item.sellerId, { sellerId: item.sellerId, sellerName: item.sellerName, sellerAvatar: item.sellerAvatar, gross: itemTotal });
          }
        });
        return Array.from(sellerMap.values()).map(s => ({
          ...s,
          commission: Math.round(s.gross * PLATFORM_COMMISSION_RATE * 100) / 100,
          net: Math.round(s.gross * (1 - PLATFORM_COMMISSION_RATE) * 100) / 100,
        }));
      },
    }),
    { name: 'bailanow-promo-cart', version: 1 }
  )
);

// ── ORDERS STORE (Mis Pedidos) ────────────────────────────────────────────
export interface Order {
  id: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentProvider: string;
  total: number;
  items: {
    serviceId: string;
    title: string;
    sellerName: string;
    sellerAvatar: string;
    price: number;
  }[];
  sellerBreakdown: {
    sellerId: string;
    sellerName: string;
    sellerAvatar: string;
    gross: number;
    commission: number;
    net: number;
  }[];
}

interface OrdersState {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Order;
  updateStatus: (id: string, status: Order['status']) => void;
  clearOrders: () => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order) => {
        const newOrder: Order = {
          ...order,
          id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          status: 'confirmed',
        };
        set(s => ({ orders: [newOrder, ...s.orders] }));
        return newOrder;
      },
      updateStatus: (id, status) =>
        set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status } : o) })),
      clearOrders: () => set({ orders: [] }),
    }),
    { name: 'bailanow-orders', version: 1 }
  )
);

// ── SPONSORS STORE ────────────────────────────────────────────────────────
export interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  color: string;
  link: string;
  badge: string;
  type: 'venue' | 'artist' | 'event' | 'brand' | 'profile' | 'company' | 'seller' | 'package';
  // Dónde aparece en el home: slider "Lo más destacado" (top), pie de página (footer) o ambos.
  placement?: 'featured' | 'footer' | 'both';
  refId?: string;       // id del venue/artista vinculado
  active: boolean;
  createdAt: string;
  isPremium: boolean;
  city?: string;
  website?: string;
  phone?: string;
  email?: string;
  description?: string;
}

interface SponsorsState {
  sponsors: Sponsor[];
  addSponsor: (sp: Omit<Sponsor, 'id' | 'createdAt'>) => Sponsor;
  updateSponsor: (id: string, updates: Partial<Sponsor>) => void;
  removeSponsor: (id: string) => void;
  toggleActive: (id: string) => void;
}

// Sponsors iniciales (los que estaban en mockData)
const INITIAL_SPONSORS: Sponsor[] = [
  // Patrocinadores de EJEMPLO (demo) — nombres genéricos, sin marcas reales.
  // Se reemplazan por patrocinadores reales cuando los negocios se den de alta.
  { id: 'sp1', name: 'Sala Ejemplo Madrid', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=EM&background=E11D48&color=fff&size=120&bold=true&rounded=true', color: '#E11D48', link: '/venues?city=Madrid', badge: '✨ Ejemplo', type: 'brand', active: true, createdAt: '2025-01-01', isPremium: true, city: 'Madrid' },
  { id: 'sp2', name: 'Club Demo Valencia', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=DV&background=D97706&color=fff&size=120&bold=true&rounded=true', color: '#D97706', link: '/venues/v6', badge: '✨ Ejemplo', type: 'venue', refId: 'v6', active: true, createdAt: '2025-01-01', isPremium: true, city: 'Valencia' },
  { id: 'sp3', name: 'Salón Demo Barcelona', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=DB&background=7C3AED&color=fff&size=120&bold=true&rounded=true', color: '#7C3AED', link: '/venues/v8', badge: '✨ Ejemplo', type: 'venue', refId: 'v8', active: true, createdAt: '2025-01-01', isPremium: true, city: 'Barcelona' },
  { id: 'sp4', name: 'Sala Muestra Cali', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=MC&background=059669&color=fff&size=120&bold=true&rounded=true', color: '#059669', link: '/venues/v28', badge: '✨ Ejemplo', type: 'venue', refId: 'v28', active: true, createdAt: '2025-01-01', isPremium: false, city: 'Cali' },
  { id: 'sp5', name: 'Espacio Demo París', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=DP&background=EC4899&color=fff&size=120&bold=true&rounded=true', color: '#EC4899', link: '/venues/v16', badge: '✨ Ejemplo', type: 'venue', refId: 'v16', active: true, createdAt: '2025-01-01', isPremium: true, city: 'París' },
  { id: 'sp6', name: 'Café Ejemplo La Habana', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=EH&background=0891B2&color=fff&size=120&bold=true&rounded=true', color: '#0891B2', link: '/venues/v34', badge: '✨ Ejemplo', type: 'venue', refId: 'v34', active: false, createdAt: '2025-01-01', isPremium: false, city: 'La Habana' },
  { id: 'sp7', name: 'Club Muestra Nueva York', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=MN&background=1E40AF&color=fff&size=120&bold=true&rounded=true', color: '#1E40AF', link: '/venues/v40', badge: '✨ Ejemplo', type: 'venue', refId: 'v40', active: true, createdAt: '2025-01-01', isPremium: true, city: 'Nueva York' },
  { id: 'sp8', name: 'Discoteca Demo Santo Domingo', tagline: 'Patrocinador de muestra · tu marca aquí', logo: 'https://ui-avatars.com/api/?name=DS&background=B91C1C&color=fff&size=120&bold=true&rounded=true', color: '#B91C1C', link: '/venues/v21', badge: '✨ Ejemplo', type: 'venue', refId: 'v21', active: true, createdAt: '2025-01-01', isPremium: false, city: 'Santo Domingo' },
];

export const useSponsorsStore = create<SponsorsState>()(
  persist(
    (set) => ({
      sponsors: INITIAL_SPONSORS,
      addSponsor: (sp) => {
        const newSp: Sponsor = { ...sp, id: `sp_${Date.now()}`, createdAt: new Date().toISOString() };
        set(s => ({ sponsors: [...s.sponsors, newSp] }));
        return newSp;
      },
      updateSponsor: (id, updates) =>
        set(s => ({ sponsors: s.sponsors.map(sp => sp.id === id ? { ...sp, ...updates } : sp) })),
      removeSponsor: (id) =>
        set(s => ({ sponsors: s.sponsors.filter(sp => sp.id !== id) })),
      toggleActive: (id) =>
        set(s => ({ sponsors: s.sponsors.map(sp => sp.id === id ? { ...sp, active: !sp.active } : sp) })),
    }),
    { name: 'bailanow-sponsors', version: 1 }
  )
);
