import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── TYPES ─────────────────────────────────────────────────────────────────
export interface CMSCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;        // emoji
  color: string;       // hex bg color
  parentId: string | null;
  order: number;
  isActive: boolean;
  isDeleted: boolean;
  layout: 'grid' | 'list' | 'carousel';
  template: 'default' | 'feature' | 'compact';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CMSMenuItem {
  id: string;
  label: string;
  to: string;
  icon: string;        // emoji
  order: number;
  isVisible: boolean;
  isExternal: boolean;
}

export type HomeModuleType =
  | 'admin-panel' | 'creator-panel' | 'buyer-alert'
  | 'hero' | 'radio' | 'ruta' | 'cities' | 'categories'
  | 'artists' | 'community' | 'cta';

export interface HomeModule {
  id: string;
  type: HomeModuleType;
  title: string;
  enabled: boolean;
  order: number;
  config?: Record<string, any>;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  folder: string;
  size?: number;
  mimeType?: string;
  uploadedAt: Date;
}

export interface HistorySnapshot {
  id: string;
  slice: 'categories' | 'menu' | 'modules' | 'media';
  data: any;
  description: string;
  timestamp: Date;
}

// ── DEFAULT SEED DATA ─────────────────────────────────────────────────────
const now = () => new Date();

const DEFAULT_CATEGORIES: CMSCategory[] = [
  { id: 'cat-conciertos',  name: 'Conciertos y Música en Vivo', slug: 'conciertos', icon: '🎤', color: '#EC4899', parentId: null, order: 0, isActive: true, isDeleted: false, layout: 'grid', template: 'feature', createdAt: now(), updatedAt: now() },
  { id: 'cat-festivales',  name: 'Festivales y Congresos',      slug: 'festivales', icon: '🎉', color: '#A855F7', parentId: null, order: 1, isActive: true, isDeleted: false, layout: 'carousel', template: 'feature', createdAt: now(), updatedAt: now() },
  { id: 'cat-club',        name: 'Noches de club',              slug: 'club',       icon: '🎧', color: '#EC4899', parentId: null, order: 2, isActive: true, isDeleted: false, layout: 'grid', template: 'default', createdAt: now(), updatedAt: now() },
  { id: 'cat-talleres',    name: 'Talleres y clases',           slug: 'talleres',   icon: '📚', color: '#10B981', parentId: null, order: 3, isActive: true, isDeleted: false, layout: 'list', template: 'compact', createdAt: now(), updatedAt: now() },
  { id: 'cat-clases',      name: 'Clases y Academia',           slug: 'clases',     icon: '🎓', color: '#3B82F6', parentId: null, order: 4, isActive: true, isDeleted: false, layout: 'grid', template: 'default', createdAt: now(), updatedAt: now() },
  { id: 'cat-social',      name: 'Eventos Sociales',            slug: 'social',     icon: '🤝', color: '#06B6D4', parentId: null, order: 5, isActive: true, isDeleted: false, layout: 'list', template: 'default', createdAt: now(), updatedAt: now() },
  { id: 'cat-competiciones', name: 'Competiciones',             slug: 'competiciones', icon: '🏆', color: '#EAB308', parentId: null, order: 6, isActive: true, isDeleted: false, layout: 'grid', template: 'feature', createdAt: now(), updatedAt: now() },
];

const DEFAULT_MENU: CMSMenuItem[] = [
  { id: 'm-home',    label: 'Inicio',         to: '/',                       icon: '🏠', order: 0, isVisible: true, isExternal: false },
  { id: 'm-near',    label: 'Cerca de mí',    to: '/cerca',                  icon: '📍', order: 1, isVisible: true, isExternal: false },
  { id: 'm-cities',  label: 'Ciudades',       to: '/venues',                 icon: '🏙️', order: 2, isVisible: true, isExternal: false },
  { id: 'm-events',  label: 'Eventos',        to: '/eventos',                icon: '📅', order: 3, isVisible: true, isExternal: false },
  { id: 'm-artists', label: 'Artistas',       to: '/artistas',               icon: '🎶', order: 4, isVisible: true, isExternal: false },
  { id: 'm-dancers', label: 'Bailarines',     to: '/artistas?tipo=dancer',   icon: '💃', order: 5, isVisible: true, isExternal: false },
  { id: 'm-classes', label: 'En Directo',     to: '/live',                   icon: '🔴', order: 6, isVisible: true, isExternal: false },
  { id: 'm-market',  label: 'Marketplace',    to: '/marketplace',            icon: '🛍️', order: 7, isVisible: true, isExternal: false },
  { id: 'm-chat',    label: 'Comunidad',      to: '/chat',                   icon: '💬', order: 8, isVisible: true, isExternal: false },
];

const DEFAULT_HOME_MODULES: HomeModule[] = [
  { id: 'mod-admin-panel',   type: 'admin-panel',   title: 'Panel Superadmin',        enabled: true, order: 0 },
  { id: 'mod-creator-panel', type: 'creator-panel', title: 'Panel Creator',           enabled: true, order: 1 },
  { id: 'mod-buyer-alert',   type: 'buyer-alert',   title: 'Aviso pedidos pendientes',enabled: true, order: 2 },
  { id: 'mod-hero',          type: 'hero',          title: 'Hero / Banner principal', enabled: true, order: 3 },
  { id: 'mod-radio',         type: 'radio',         title: 'Radios en directo',       enabled: true, order: 4 },
  { id: 'mod-ruta',          type: 'ruta',          title: 'La Ruta de Hoy',          enabled: true, order: 5 },
  { id: 'mod-categories',    type: 'categories',    title: 'Categorías principales',  enabled: true, order: 6 },
  { id: 'mod-cities',        type: 'cities',        title: 'Ciudades destacadas',     enabled: true, order: 7 },
  { id: 'mod-artists',       type: 'artists',       title: 'Artistas destacados',     enabled: true, order: 8 },
  { id: 'mod-community',     type: 'community',     title: 'Comunidad',               enabled: false, order: 9 },
  { id: 'mod-cta',           type: 'cta',           title: 'Llamada a la acción',     enabled: true, order: 10 },
];

// ── STORE ─────────────────────────────────────────────────────────────────
interface CMSState {
  categories: CMSCategory[];
  menu: CMSMenuItem[];
  modules: HomeModule[];
  media: MediaAsset[];
  history: HistorySnapshot[];

  // Categorías
  addCategory: (data: Partial<CMSCategory>) => string;
  updateCategory: (id: string, updates: Partial<CMSCategory>) => void;
  softDeleteCategory: (id: string) => void;
  restoreCategory: (id: string) => void;
  hardDeleteCategory: (id: string) => void;
  cloneCategory: (id: string) => void;
  moveCategoryUp: (id: string) => void;
  moveCategoryDown: (id: string) => void;
  nestCategory: (id: string, newParentId: string | null) => void;

  // Menú
  addMenuItem: (data: Partial<CMSMenuItem>) => void;
  updateMenuItem: (id: string, updates: Partial<CMSMenuItem>) => void;
  removeMenuItem: (id: string) => void;
  moveMenuItemUp: (id: string) => void;
  moveMenuItemDown: (id: string) => void;
  toggleMenuItem: (id: string) => void;

  // Módulos home
  toggleModule: (id: string) => void;
  moveModuleUp: (id: string) => void;
  moveModuleDown: (id: string) => void;
  updateModuleTitle: (id: string, title: string) => void;
  resetModules: () => void;

  // Media
  addMedia: (asset: Omit<MediaAsset, 'id' | 'uploadedAt'>) => MediaAsset;
  removeMedia: (id: string) => void;

  // Versiones / rollback
  snapshot: (slice: HistorySnapshot['slice'], description: string) => void;
  rollback: (snapshotId: string) => void;
  clearHistory: () => void;

  // Reset
  resetCategories: () => void;
  resetMenu: () => void;
}

const reindex = <T extends { order: number }>(arr: T[]): T[] =>
  arr.map((it, i) => ({ ...it, order: i }));

const swap = <T extends { id: string; order: number }>(arr: T[], id: string, delta: number): T[] => {
  const sorted = [...arr].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(x => x.id === id);
  if (idx === -1) return arr;
  const target = idx + delta;
  if (target < 0 || target >= sorted.length) return arr;
  [sorted[idx], sorted[target]] = [sorted[target], sorted[idx]];
  return reindex(sorted);
};

export const useCMSStore = create<CMSState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      menu: DEFAULT_MENU,
      modules: DEFAULT_HOME_MODULES,
      media: [],
      history: [],

      addCategory: (data) => {
        const id = `cat_${Date.now()}`;
        const order = get().categories.length;
        set(state => ({
          categories: [...state.categories, {
            id,
            name: data.name || 'Nueva categoría',
            slug: (data.slug || data.name || 'nueva').toLowerCase().replace(/\s+/g, '-'),
            icon: data.icon || '✨',
            color: data.color || '#EC4899',
            parentId: data.parentId ?? null,
            order, isActive: true, isDeleted: false,
            layout: data.layout || 'grid',
            template: data.template || 'default',
            description: data.description,
            createdAt: new Date(), updatedAt: new Date(),
          }]
        }));
        return id;
      },

      updateCategory: (id, updates) =>
        set(state => ({
          categories: state.categories.map(c => c.id === id
            ? { ...c, ...updates, updatedAt: new Date() }
            : c)
        })),

      softDeleteCategory: (id) =>
        set(state => ({
          categories: state.categories.map(c => c.id === id ? { ...c, isDeleted: true, isActive: false, updatedAt: new Date() } : c)
        })),

      restoreCategory: (id) =>
        set(state => ({
          categories: state.categories.map(c => c.id === id ? { ...c, isDeleted: false, isActive: true, updatedAt: new Date() } : c)
        })),

      hardDeleteCategory: (id) =>
        set(state => ({
          categories: reindex(state.categories.filter(c => c.id !== id))
        })),

      cloneCategory: (id) => {
        const src = get().categories.find(c => c.id === id);
        if (!src) return;
        const newId = `cat_${Date.now()}`;
        set(state => ({
          categories: [...state.categories, {
            ...src,
            id: newId,
            name: `${src.name} (copia)`,
            slug: `${src.slug}-copia`,
            order: state.categories.length,
            isDeleted: false,
            createdAt: new Date(), updatedAt: new Date(),
          }]
        }));
      },

      moveCategoryUp:   (id) => set(state => ({ categories: swap(state.categories, id, -1) })),
      moveCategoryDown: (id) => set(state => ({ categories: swap(state.categories, id,  1) })),

      nestCategory: (id, newParentId) =>
        set(state => ({
          categories: state.categories.map(c => c.id === id ? { ...c, parentId: newParentId, updatedAt: new Date() } : c)
        })),

      addMenuItem: (data) =>
        set(state => ({
          menu: [...state.menu, {
            id: `m_${Date.now()}`,
            label: data.label || 'Nuevo enlace',
            to: data.to || '/',
            icon: data.icon || '🔗',
            order: state.menu.length,
            isVisible: true,
            isExternal: data.isExternal || false,
          }]
        })),

      updateMenuItem: (id, updates) =>
        set(state => ({
          menu: state.menu.map(m => m.id === id ? { ...m, ...updates } : m)
        })),

      removeMenuItem: (id) =>
        set(state => ({ menu: reindex(state.menu.filter(m => m.id !== id)) })),

      moveMenuItemUp:   (id) => set(state => ({ menu: swap(state.menu, id, -1) })),
      moveMenuItemDown: (id) => set(state => ({ menu: swap(state.menu, id,  1) })),
      toggleMenuItem: (id) =>
        set(state => ({
          menu: state.menu.map(m => m.id === id ? { ...m, isVisible: !m.isVisible } : m)
        })),

      toggleModule: (id) =>
        set(state => ({
          modules: state.modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
        })),

      moveModuleUp:   (id) => set(state => ({ modules: swap(state.modules, id, -1) })),
      moveModuleDown: (id) => set(state => ({ modules: swap(state.modules, id,  1) })),
      updateModuleTitle: (id, title) =>
        set(state => ({
          modules: state.modules.map(m => m.id === id ? { ...m, title } : m)
        })),
      resetModules: () => set({ modules: DEFAULT_HOME_MODULES }),

      addMedia: (asset) => {
        const m: MediaAsset = {
          ...asset,
          id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          uploadedAt: new Date(),
        };
        set(state => ({ media: [m, ...state.media] }));
        return m;
      },

      removeMedia: (id) =>
        set(state => ({ media: state.media.filter(m => m.id !== id) })),

      snapshot: (slice, description) => {
        const state = get();
        const data =
          slice === 'categories' ? state.categories :
          slice === 'menu'       ? state.menu :
          slice === 'modules'    ? state.modules :
                                   state.media;
        set((s: CMSState) => ({
          history: [
            {
              id: `snap_${Date.now()}`,
              slice, data: JSON.parse(JSON.stringify(data)),
              description, timestamp: new Date(),
            },
            ...(s.history || []),
          ].slice(0, 30)
        }));
      },

      rollback: (snapshotId: string) => {
        const snap = get().history.find((h: HistorySnapshot) => h.id === snapshotId);
        if (!snap) return;
        if (snap.slice === 'categories') set({ categories: snap.data });
        if (snap.slice === 'menu')       set({ menu: snap.data });
        if (snap.slice === 'modules')    set({ modules: snap.data });
        if (snap.slice === 'media')      set({ media: snap.data });
      },

      clearHistory: () => set({ history: [] }),

      resetCategories: () => set({ categories: DEFAULT_CATEGORIES }),
      resetMenu:       () => set({ menu: DEFAULT_MENU }),
    }),
    {
      name: 'ritmolatino-cms',
      version: 5,
      // Si cambias DEFAULT_*, sube la versión y los datos viejos se descartan
      migrate: () => undefined as any,
    }
  )
);

// Helpers — defensivos frente a arrays undefined
export const visibleHomeModules = (mods?: HomeModule[]) =>
  (mods || []).filter(m => m.enabled).sort((a, b) => a.order - b.order);

export const activeCategories = (cats?: CMSCategory[]) =>
  (cats || []).filter(c => !c.isDeleted && c.isActive).sort((a, b) => a.order - b.order);
