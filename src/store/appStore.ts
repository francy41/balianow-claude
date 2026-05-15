import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'artist' | 'dj' | 'dancer' | 'venue' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  city: string;
  isVerified: boolean;
  isPremium: boolean;
  subscriptionPlan?: string;
  wallet: number;
  notifications: number;
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
  avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=F97316&color=fff&size=200&bold=true',
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
  name: 'Solfa Mende',
  email: 'solfamende41@gmail.com',
  avatar: 'https://ui-avatars.com/api/?name=Solfa+Mende&background=F97316&color=fff&size=200&bold=true',
  role: 'admin',
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
    let user: User;
    if (email === 'solfamende41@gmail.com' && password === 'Solfa11111111@') {
      user = SOLFA_ADMIN;
    } else if (email.includes('admin')) {
      user = DEMO_ADMIN;
    } else if (email.includes('dj')) {
      user = DEMO_ARTIST;
    } else {
      user = DEMO_USER;
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
    { name: 'ritmolatino-auth', partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }) }
  )
);

// ── UI STORE ───────────────────────────────────────────────────────────────
interface UIState {
  activeModal: string | null;
  sidebarOpen: boolean;
  toasts: Toast[];
  openModal: (id: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
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

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  addToast: (toast) =>
    set(state => ({
      toasts: [...state.toasts, { ...toast, id: `t_${Date.now()}` }]
    })),

  removeToast: (id) =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

// ── CHAT STORE ─────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
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
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [
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
}));
