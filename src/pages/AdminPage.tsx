import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Tag, Radio, Users, MapPin, Crown,
  Music2, Sparkles, Calendar, ShoppingBag, BookOpen,
  DollarSign, Palette, Settings, Shield, AlertTriangle,
  Star, Lock, TrendingUp, Eye, CheckCircle, XCircle,
  Edit, Trash2, Plus, Search, Filter, RefreshCw,
  ChevronRight, ArrowUpRight, ArrowDownRight, Clock,
  Wifi, Globe, Bell, Database, Server, FileText, Save, Loader2
} from 'lucide-react';
import { useAuthStore, useUIStore, useSiteConfigStore, getYouTubeId, usePerformerStore, useAdminOverridesStore, useSponsorsStore, PLATFORM_COMMISSION_RATE, DEFAULT_HOME_CATEGORIES, type HeroMediaType, type CommissionSource, type HeroSliderImage, type HomeCategory, type Sponsor } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { saveSiteConfigKey, saveCategoriesToDb } from '../hooks/useSiteConfig';
import AdminCMS from '../components/AdminCMS';
import AdminMediaManager from '../components/AdminMediaManager';
import AdminEditModal, { type EditField } from '../components/AdminEditModal';
import AdminLocationModal from '../components/AdminLocationModal';
import ProfileImporter from '../components/ProfileImporter';
import NewsletterAdminPanel from '../components/NewsletterAdminPanel';
import DanceChoreoAdmin from '../components/DanceChoreoAdmin';
import { uploadImage, uploadVideo } from '../lib/uploadHelper';
import { Avatar, Badge, Button, Input, SearchBar } from '../components/ui';
import { ARTISTS, EVENTS, VENUES, SERVICES, SUBSCRIPTION_PLANS, PROMO_SERVICES } from '../data/mockData';

// ── ADMIN SECTIONS ─────────────────────────────────────────────────────────
type AdminSection =
  | 'overview' | 'categorias' | 'media' | 'radio' | 'usuarios' | 'localidades'
  | 'suscripciones' | 'artistas' | 'bailarinas' | 'eventos' | 'mercado'
  | 'cursos' | 'finanzas' | 'diseno' | 'configuracion' | 'roles'
  | 'disputas' | 'seguridad' | 'resenas' | 'creators' | 'retiros' | 'comisiones' | 'cms'
  | 'patrocinadores' | 'administradores' | 'importar' | 'integraciones' | 'newsletter' | 'danceavatares';

const SECTIONS: { id: AdminSection; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: 'overview',       label: 'Dashboard',               icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'cms',            label: 'CMS · Constructor',       icon: <Palette className="w-4 h-4" />, badge: 'NEW' },
  { id: 'patrocinadores', label: 'Patrocinadores',          icon: <Star className="w-4 h-4" />, badge: 'NEW' },
  { id: 'categorias',     label: 'Categorías',              icon: <Tag className="w-4 h-4" /> },
  { id: 'media',          label: 'Media Manager',           icon: <Palette className="w-4 h-4" />, badge: 'NEW' },
  { id: 'radio',          label: 'Radio Online',            icon: <Radio className="w-4 h-4" />, badge: '2 live' },
  { id: 'usuarios',       label: 'Usuarios',                icon: <Users className="w-4 h-4" /> },
  { id: 'importar',       label: 'Importar perfiles',       icon: <FileText className="w-4 h-4" />, badge: 'NEW' },
  { id: 'integraciones',  label: 'Integraciones (GHL)',     icon: <Globe className="w-4 h-4" />, badge: 'GHL' },
  { id: 'newsletter',     label: 'Newsletter',              icon: <Bell className="w-4 h-4" /> },
  { id: 'danceavatares',  label: 'Avatares de Baile',       icon: <Sparkles className="w-4 h-4" />, badge: 'IA' },
  { id: 'localidades',    label: 'Localidades',             icon: <MapPin className="w-4 h-4" /> },
  { id: 'suscripciones',  label: 'Suscripciones Premium',  icon: <Crown className="w-4 h-4" /> },
  { id: 'artistas',       label: 'Artistas',                icon: <Music2 className="w-4 h-4" /> },
  { id: 'bailarinas',     label: 'Bailarinas',              icon: <Sparkles className="w-4 h-4" /> },
  { id: 'eventos',        label: 'Eventos',                 icon: <Calendar className="w-4 h-4" /> },
  { id: 'mercado',        label: 'Mercado y Escrow',        icon: <ShoppingBag className="w-4 h-4" />, badge: '3 pend.' },
  { id: 'cursos',         label: 'Cursos',                  icon: <BookOpen className="w-4 h-4" /> },
  { id: 'finanzas',       label: 'Finanzas',                icon: <DollarSign className="w-4 h-4" /> },
  { id: 'comisiones',     label: 'Comisiones',              icon: <DollarSign className="w-4 h-4" /> },
  { id: 'creators',       label: 'Dashboards Creators',     icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'retiros',        label: 'Retiros pendientes',      icon: <DollarSign className="w-4 h-4" />, badge: 'esc.' },
  { id: 'diseno',         label: 'Diseño Web',              icon: <Palette className="w-4 h-4" /> },
  { id: 'configuracion',  label: 'Configuración',           icon: <Settings className="w-4 h-4" /> },
  { id: 'roles',          label: 'Roles y Permisos',        icon: <Shield className="w-4 h-4" /> },
  { id: 'disputas',       label: 'Disputas',                icon: <AlertTriangle className="w-4 h-4" />, badge: '5' },
  { id: 'seguridad',      label: 'Seguridad',               icon: <Lock className="w-4 h-4" /> },
  { id: 'resenas',        label: 'Reseñas',                 icon: <Star className="w-4 h-4" />, badge: '12 new' },
  { id: 'administradores', label: 'Administradores',        icon: <Shield className="w-4 h-4" />, badge: 'SUPER' },
];

// ── STAT CARDS DATA ────────────────────────────────────────────────────────
const STATS = [
  { label: 'Usuarios totales',    value: '1,247',  change: '+12%', up: true,  icon: <Users className="w-6 h-6 text-blue-500" />,   color: 'bg-blue-50' },
  { label: 'Artistas activos',    value: '523',    change: '+8%',  up: true,  icon: <Music2 className="w-6 h-6 text-purple-500" />, color: 'bg-purple-50' },
  { label: 'Eventos este mes',    value: '204',    change: '+31%', up: true,  icon: <Calendar className="w-6 h-6 text-green-500" />, color: 'bg-green-50' },
  { label: 'Revenue total',       value: '€48.2k', change: '+22%', up: true,  icon: <DollarSign className="w-6 h-6 text-brand-orange" />, color: 'bg-pink-50' },
  { label: 'Suscripciones activas', value: '312', change: '+19%', up: true,  icon: <Crown className="w-6 h-6 text-yellow-500" />,  color: 'bg-yellow-50' },
  { label: 'Disputas abiertas',   value: '5',      change: '-2',   up: false, icon: <AlertTriangle className="w-6 h-6 text-red-500" />, color: 'bg-red-50' },
];

// ── EDIT CONTEXT (modal compartido por todas las secciones) ──────────────
interface EditRequest {
  entity: 'artist' | 'event' | 'venue' | 'service' | 'user' | 'category' | 'course' | 'subscription';
  title: string;
  item: Record<string, any> & { id: string };
  fields: EditField[];
  onSaved?: (item: Record<string, any>) => void;
}
const EditContext = React.createContext<{
  openEdit: (req: EditRequest) => void;
}>({ openEdit: () => {} });

export const useAdminEdit = () => React.useContext(EditContext);

// Field configs por entidad
export const FIELDS_ARTIST: EditField[] = [
  { key: 'name',  label: 'Nombre',    type: 'text',     required: true },
  { key: 'type',  label: 'Tipo',      type: 'select',   options: [
      { value: 'dj', label: 'DJ' }, { value: 'dancer', label: 'Bailarín/a' },
      { value: 'singer', label: 'Cantante' }, { value: 'band', label: 'Banda' },
      { value: 'instructor', label: 'Instructor/a' }
    ] },
  { key: 'city',  label: 'Ciudad',    type: 'text' },
  { key: 'country', label: 'País',    type: 'text' },
  { key: 'priceFrom', label: 'Precio desde (€)', type: 'number' },
  { key: 'rating', label: 'Rating',   type: 'number' },
  { key: 'bio',   label: 'Biografía', type: 'textarea' },
  { key: 'tags',  label: 'Tags',      type: 'tags', helper: 'Separadas por comas' },
  { key: 'genre', label: 'Géneros',   type: 'tags', helper: 'Separados por comas' },
  { key: 'isPremium',  label: 'Premium',  type: 'checkbox', placeholder: 'Mostrar como PRO' },
  { key: 'isVerified', label: 'Verificado', type: 'checkbox', placeholder: 'Mostrar tick azul' },
];

export const FIELDS_EVENT: EditField[] = [
  { key: 'title', label: 'Título', type: 'text', required: true },
  { key: 'date',  label: 'Fecha',  type: 'date' },
  { key: 'time',  label: 'Hora',   type: 'text', placeholder: '20:00' },
  { key: 'city',  label: 'Ciudad', type: 'text' },
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'capacity', label: 'Aforo', type: 'number' },
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'description', label: 'Descripción', type: 'textarea' },
  { key: 'isFeatured', label: 'Destacado', type: 'checkbox' },
];

export const FIELDS_VENUE: EditField[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true },
  { key: 'type', label: 'Tipo',   type: 'select', options: [
      { value: 'club', label: 'Club' }, { value: 'bar', label: 'Bar' },
      { value: 'studio', label: 'Studio' }, { value: 'rooftop', label: 'Rooftop' },
      { value: 'lounge', label: 'Lounge' }, { value: 'restaurante', label: 'Restaurante' }
    ] },
  { key: 'city', label: 'Ciudad', type: 'text' },
  { key: 'address', label: 'Dirección', type: 'text', cols: 2 },
  { key: 'capacity', label: 'Aforo', type: 'number' },
  { key: 'priceRange', label: 'Rango precio (1-4)', type: 'number' },
  { key: 'openHours', label: 'Horario', type: 'text', cols: 2 },
  { key: 'description', label: 'Descripción', type: 'textarea' },
  { key: 'isOpen', label: 'Abierto ahora', type: 'checkbox' },
  { key: 'isPremium', label: 'Premium', type: 'checkbox' },
];

export const FIELDS_USER: EditField[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'role', label: 'Rol', type: 'select', options: [
    { value: 'user', label: 'Usuario' }, { value: 'dj', label: 'DJ' },
    { value: 'artist', label: 'Artista' }, { value: 'dancer', label: 'Bailarín/a' },
    { value: 'venue', label: 'Venue' }, { value: 'admin', label: 'Admin' }
  ]},
  { key: 'city', label: 'Ciudad', type: 'text' },
  { key: 'bio', label: 'Bio', type: 'textarea', cols: 2 },
  { key: 'avatar', label: 'Foto de perfil', type: 'image' },
  { key: 'isVerified', label: 'Verificado', type: 'checkbox' },
];

export const FIELDS_SERVICE: EditField[] = [
  { key: 'title', label: 'Título del servicio', type: 'text', required: true },
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'deliveryDays', label: 'Plazo (días)', type: 'number' },
  { key: 'description', label: 'Descripción', type: 'textarea' },
];

export const FIELDS_COURSE: EditField[] = [
  { key: 'title', label: 'Título', type: 'text', required: true },
  { key: 'instructor', label: 'Instructor', type: 'text' },
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'duration', label: 'Duración (ej. 3h)', type: 'text' },
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'level', label: 'Nivel', type: 'select', options: [
    { value: 'beginner', label: 'Principiante' }, { value: 'intermediate', label: 'Intermedio' }, { value: 'advanced', label: 'Avanzado' }
  ]},
  { key: 'image_url', label: 'Imagen', type: 'image', cols: 2 },
];

export const FIELDS_SUBSCRIPTION: EditField[] = [
  { key: 'name',  label: 'Nombre del plan', type: 'text', required: true },
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'period', label: 'Periodo', type: 'select', options: [
    { value: 'monthly', label: 'Mensual' }, { value: 'yearly', label: 'Anual' }
  ]},
  { key: 'description', label: 'Descripción', type: 'textarea' },
];

export const FIELDS_CATEGORY: EditField[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true },
  { key: 'icon', label: 'Ícono (emoji)', type: 'text', placeholder: '🎉' },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'route', label: 'Ruta', type: 'text', placeholder: '/eventos' },
  { key: 'image_url', label: 'URL Imagen de fondo', type: 'text', placeholder: 'https://...' },
  { key: 'section', label: 'Sección', type: 'select', required: true, options: [
    { value: 'main', label: 'Main (Principal)' },
    { value: 'mercado', label: 'Mercado' },
    { value: 'comunidad', label: 'Comunidad' }
  ]},
  { key: 'color_start', label: 'Color inicial', type: 'color', helper: 'Hex color (ej: #EC407A)' },
  { key: 'color_mid', label: 'Color medio', type: 'color', helper: 'Hex color (ej: #FF1493)' },
  { key: 'color_end', label: 'Color final', type: 'color', helper: 'Hex color (ej: #C2185B)' },
  { key: 'display_order', label: 'Orden de visualización', type: 'number', placeholder: '1' },
  { key: 'active', label: 'Activo', type: 'checkbox' },
];

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [active, setActive] = useState<AdminSection>('overview');
  const [editReq, setEditReq] = useState<EditRequest | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  if (!isAuthenticated || !['admin', 'superadmin'].includes(user?.role ?? '')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso restringido</h2>
          <p className="text-gray-400 mb-6">Solo administradores pueden acceder a este panel.</p>
          <Button variant="orange" onClick={() => navigate('/auth')}>Iniciar Sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <EditContext.Provider value={{ openEdit: setEditReq }}>
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── MOBILE SIDEBAR TOGGLE ── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-16 left-2 z-30 bg-brand-orange text-white p-2 rounded-xl shadow-lg"
        aria-label="Toggle admin menu"
      >
        <LayoutDashboard className="w-5 h-5" />
      </button>

      {/* ── MOBILE BACKDROP ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── ADMIN SIDEBAR ── */}
      <aside className={`w-60 bg-white border-r border-gray-100 flex-shrink-0 fixed top-14 bottom-0 overflow-y-auto z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`} style={{ scrollbarWidth: 'none' }}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Super Admin</p>
              <p className="text-gray-400 text-xs">{user?.name}</p>
            </div>
          </div>
        </div>
        <nav className="p-3">
          {SECTIONS.map(sec => (
            <button key={sec.id} onClick={() => { setActive(sec.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all text-left ${
                active === sec.id
                  ? 'bg-brand-orange text-white shadow-orange'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span className={active === sec.id ? 'text-white' : 'text-gray-400'}>{sec.icon}</span>
              <span className="flex-1 truncate">{sec.label}</span>
              {sec.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active === sec.id ? 'bg-white/20 text-white' : 'bg-brand-orange/10 text-brand-orange'}`}>
                  {sec.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 lg:ml-60 p-3 sm:p-6 mt-0 min-w-0 overflow-x-hidden">
        {active === 'overview'       && <OverviewSection addToast={addToast} />}
        {active === 'categorias'     && <CategoriasSection addToast={addToast} />}
        {active === 'media'          && <MediaSection />}
        {active === 'radio'          && <RadioSection addToast={addToast} />}
        {active === 'usuarios'       && <UsuariosSection addToast={addToast} />}
        {active === 'localidades'    && <LocalidadesSection addToast={addToast} />}
        {active === 'suscripciones'  && <SuscripcionesSection addToast={addToast} />}
        {active === 'artistas'       && <ArtistasSection addToast={addToast} navigate={navigate} />}
        {active === 'bailarinas'     && <BailarinasSection addToast={addToast} />}
        {active === 'eventos'        && <EventosSection addToast={addToast} navigate={navigate} />}
        {active === 'mercado'        && <MercadoSection addToast={addToast} />}
        {active === 'cursos'         && <CursosSection addToast={addToast} />}
        {active === 'finanzas'       && <FinanzasSection />}
        {active === 'creators'       && <CreatorsSection />}
        {active === 'retiros'        && <RetirosSection addToast={addToast} />}
        {active === 'comisiones'     && <ComisionesSection addToast={addToast} />}
        {active === 'cms'            && <AdminCMS />}
        {active === 'diseno'         && <DisenoSection addToast={addToast} />}
        {active === 'configuracion'  && <ConfiguracionSection addToast={addToast} />}
        {active === 'roles'          && <RolesSection addToast={addToast} />}
        {active === 'disputas'       && <DisputasSection addToast={addToast} />}
        {active === 'seguridad'      && <SeguridadSection />}
        {active === 'resenas'        && <ResenasSection addToast={addToast} />}
        {active === 'patrocinadores'  && <PatrocinadoresSection addToast={addToast} />}
        {active === 'administradores' && <AdministradoresSection addToast={addToast} isSuperAdmin={isSuperAdmin} />}
        {active === 'importar'        && <ProfileImporter />}
        {active === 'integraciones'   && <IntegracionesSection addToast={addToast} />}
        {active === 'newsletter'      && <NewsletterAdminPanel />}
        {active === 'danceavatares'   && <DanceChoreoAdmin />}
      </main>

      {/* Modal de edición global */}
      {editReq && (
        <AdminEditModal
          open={true}
          onClose={() => setEditReq(null)}
          title={editReq.title}
          entity={editReq.entity}
          item={editReq.item}
          fields={editReq.fields}
          onSaved={editReq.onSaved}
        />
      )}
    </div>
    </EditContext.Provider>
  );
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────
const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
    <div>
      <h1 className="font-display font-black text-xl sm:text-2xl text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const StatCard: React.FC<typeof STATS[0]> = ({ label, value, change, up, icon, color }) => (
  <div className="card-white p-5 flex items-center gap-4">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
    <div className="flex-1">
      <p className="text-gray-400 text-xs font-medium">{label}</p>
      <p className="font-black text-2xl text-gray-900 mt-0.5">{value}</p>
    </div>
    {change ? (
      <div className={`flex items-center gap-0.5 text-sm font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {change}
      </div>
    ) : null}
  </div>
);

const AdminTable: React.FC<{ headers: string[]; rows: React.ReactNode[][]; }> = ({ headers, rows }) => (
  <div className="card-white overflow-hidden">
    {/* Desktop: tabla normal */}
    <div className="hidden md:block overflow-x-auto">
      <table className="admin-table">
        <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {/* Móvil: cards con label+value */}
    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
      {rows.map((row, i) => (
        <div key={i} className="p-3 space-y-1.5">
          {row.map((cell, j) => (
            <div key={j} className="flex items-start gap-2 text-sm">
              {j < headers.length - 1 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-20 flex-shrink-0 mt-1">{headers[j]}</span>
              )}
              <div className={`flex-1 min-w-0 ${j === headers.length - 1 ? 'pt-1' : ''}`}>{cell}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── 1. OVERVIEW (stats reales de la BD) ─────────────────────────────────────
const OverviewSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [counts, setCounts] = useState({ users: 0, artists: 0, events: 0, venues: 0, lives: 0, disputes: 0 });
  const [recent, setRecent] = useState<{ text: string; time: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const c = (t: string, b?: (q: any) => any) => {
      let q = supabase.from(t).select('*', { count: 'exact', head: true });
      if (b) q = b(q);
      return q;
    };
    const [users, artists, events, venues, lives, disputes, recentArtists, recentEvents] = await Promise.all([
      c('profiles'),
      c('artists'),
      c('events'),
      c('venues'),
      c('live_sessions', q => q.eq('status', 'live')),
      c('disputes', q => q.eq('status', 'open')),
      supabase.from('artists').select('name, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('events').select('title, created_at').order('created_at', { ascending: false }).limit(3),
    ]);
    setCounts({
      users: users.count || 0, artists: artists.count || 0, events: events.count || 0,
      venues: venues.count || 0, lives: lives.count || 0, disputes: disputes.count || 0,
    });
    const ago = (d: string) => {
      const diff = Date.now() - new Date(d).getTime(); const m = Math.floor(diff / 60000);
      if (m < 60) return `Hace ${m} min`; const h = Math.floor(m / 60); if (h < 24) return `Hace ${h}h`; return `Hace ${Math.floor(h / 24)}d`;
    };
    const act = [
      ...((recentArtists.data || []).map((a: any) => ({ text: `Artista: ${a.name}`, time: ago(a.created_at), color: 'bg-green-500' }))),
      ...((recentEvents.data || []).map((e: any) => ({ text: `Evento: ${e.title}`, time: ago(e.created_at), color: 'bg-purple-500' }))),
    ].slice(0, 6);
    setRecent(act);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: 'Usuarios totales', value: counts.users.toLocaleString(), icon: <Users className="w-6 h-6 text-blue-500" />, color: 'bg-blue-50' },
    { label: 'Artistas / perfiles', value: counts.artists.toLocaleString(), icon: <Music2 className="w-6 h-6 text-purple-500" />, color: 'bg-purple-50' },
    { label: 'Eventos', value: counts.events.toLocaleString(), icon: <Calendar className="w-6 h-6 text-green-500" />, color: 'bg-green-50' },
    { label: 'Locales', value: counts.venues.toLocaleString(), icon: <MapPin className="w-6 h-6 text-pink-500" />, color: 'bg-pink-50' },
    { label: 'Directos ahora', value: counts.lives.toLocaleString(), icon: <Radio className="w-6 h-6 text-red-500" />, color: 'bg-red-50' },
    { label: 'Disputas abiertas', value: counts.disputes.toLocaleString(), icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />, color: 'bg-yellow-50' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general (datos reales de la base de datos)" action={
        <button onClick={() => { load(); addToast({ message: 'Datos actualizados', type: 'success' }); }} className="btn-orange flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      } />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map(s => <StatCard key={s.label} {...s} change="" up={true} />)}
      </div>
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-orange" /> Actividad Reciente</h3>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin actividad reciente.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 ${item.color} rounded-full flex-shrink-0`} />
                <p className="text-gray-700 text-sm flex-1">{item.text}</p>
                <span className="text-gray-400 text-xs flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 2. CATEGORÍAS ──────────────────────────────────────────────────────────

const CategoriasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { homeCategories, setHomeCategories } = useSiteConfigStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HomeCategory>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCat, setNewCat] = useState<Omit<HomeCategory, 'id'>>({
    name: '', icon: '🎉', route: '/', section: 'main', display_order: 99, active: true,
  });

  const save = async (updated: HomeCategory[]) => {
    setHomeCategories(updated);
    const { error } = await saveCategoriesToDb(updated);
    if (error) addToast({ message: `⚠ Guardado local, BD falló: ${error}`, type: 'warning' });
  };

  const toggleActive = (id: string) => {
    save(homeCategories.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const deleteCategory = (id: string) => {
    if (!confirm('¿Eliminar esta categoría del home?')) return;
    save(homeCategories.filter(c => c.id !== id));
    addToast({ message: 'Categoría eliminada', type: 'info' });
  };

  const moveCategory = (id: string, dir: -1 | 1) => {
    const section = homeCategories.find(c => c.id === id)?.section;
    const sectionCats = [...homeCategories.filter(c => c.section === section)].sort((a, b) => a.display_order - b.display_order);
    const idx = sectionCats.findIndex(c => c.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sectionCats.length) return;
    const updated = [...homeCategories];
    const aOrder = sectionCats[idx].display_order;
    const bOrder = sectionCats[newIdx].display_order;
    const ai = updated.findIndex(c => c.id === sectionCats[idx].id);
    const bi = updated.findIndex(c => c.id === sectionCats[newIdx].id);
    updated[ai] = { ...updated[ai], display_order: bOrder };
    updated[bi] = { ...updated[bi], display_order: aOrder };
    save(updated);
  };

  const saveEdit = () => {
    if (!editData.name?.trim()) { addToast({ message: 'El nombre es requerido', type: 'error' }); return; }
    save(homeCategories.map(c => c.id === editingId ? { ...c, ...editData } : c));
    setEditingId(null);
    addToast({ message: 'Categoría actualizada', type: 'success' });
  };

  const addCategory = () => {
    if (!newCat.name.trim() || !newCat.route.trim()) {
      addToast({ message: 'Nombre y ruta son requeridos', type: 'error' }); return;
    }
    const id = Date.now().toString();
    save([...homeCategories, { ...newCat, id, parent_id: null }]);
    setShowNewForm(false);
    setNewCat({ name: '', icon: '🎉', route: '/', section: 'main', display_order: 99, active: true });
    addToast({ message: `"${newCat.name}" añadida al home`, type: 'success' });
  };

  // ── SUBCATEGORIAS ─────────────────────────────────────────────
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState<{ parentId: string; name: string; icon: string; route: string } | null>(null);

  const addSubcategory = () => {
    if (!subDraft || !subDraft.name.trim()) {
      addToast({ message: 'El nombre es requerido', type: 'error' }); return;
    }
    const parent = homeCategories.find(c => c.id === subDraft.parentId);
    if (!parent) return;
    const id = `sub-${Date.now()}`;
    const childrenCount = homeCategories.filter(c => c.parent_id === parent.id).length;
    const newSub: HomeCategory = {
      id,
      name: subDraft.name.trim(),
      icon: subDraft.icon || '🏷️',
      route: subDraft.route.trim() || parent.route,
      section: parent.section,
      display_order: childrenCount + 1,
      active: true,
      parent_id: parent.id,
    };
    save([...homeCategories, newSub]);
    setSubDraft(null);
    addToast({ message: `Subcategoría "${newSub.name}" añadida a ${parent.name}`, type: 'success' });
  };

  const getChildren = (parentId: string) =>
    homeCategories.filter(c => c.parent_id === parentId).sort((a, b) => a.display_order - b.display_order);

  const resetToDefault = () => {
    if (!confirm('¿Restaurar las categorías por defecto? Se perderán los cambios.')) return;
    save(DEFAULT_HOME_CATEGORIES);
    addToast({ message: 'Categorías restauradas', type: 'success' });
  };

  const SECTION_LABELS: Record<string, string> = { main: '⭐ Principales', mercado: '🏪 Mercado', comunidad: '💬 Comunidad' };

  const CatRow: React.FC<{ cat: HomeCategory; sectionCats: HomeCategory[] }> = ({ cat, sectionCats }) => {
    const idx = sectionCats.findIndex(c => c.id === cat.id);
    const isEditing = editingId === cat.id;
    return (
      <div className={`rounded-xl border p-3 transition-all ${cat.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Ícono</label>
                <input value={editData.icon || ''} onChange={e => setEditData(d => ({ ...d, icon: e.target.value }))}
                  className="input w-full text-center text-lg" maxLength={2} />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre</label>
                <input value={editData.name || ''} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                  className="input w-full" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Ruta</label>
                <input value={editData.route || ''} onChange={e => setEditData(d => ({ ...d, route: e.target.value }))}
                  className="input w-full text-xs font-mono" placeholder="/eventos" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Posición</label>
                <input type="number" min="1" value={editData.display_order ?? ''}
                  onChange={e => setEditData(d => ({ ...d, display_order: Number(e.target.value) || 99 }))}
                  className="input w-full text-xs" placeholder="1" title="Menor número = más arriba" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Sección</label>
              <select value={editData.section || 'main'} onChange={e => setEditData(d => ({ ...d, section: e.target.value as any }))}
                className="input w-full text-xs">
                <option value="main">⭐ Principal</option>
                <option value="mercado">🏪 Mercado</option>
                <option value="comunidad">💬 Comunidad</option>
              </select>
            </div>
            {/* Live preview */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-xl">{editData.icon}</div>
              <span className="text-xs font-bold text-gray-700">{editData.name}</span>
              <span className="text-[10px] text-gray-400 font-mono ml-auto">{editData.route}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold text-sm rounded-lg py-2">Guardar</button>
              <button onClick={() => setEditingId(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold text-sm rounded-lg py-2">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Posición editable */}
            <div className="flex-shrink-0 flex flex-col items-center" title="Posición en la home (menor = arriba)">
              <input type="number" min="1" max="99"
                value={cat.display_order}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (!isFinite(v) || v < 1) return;
                  save(homeCategories.map(c => c.id === cat.id ? { ...c, display_order: v } : c));
                }}
                className="w-12 h-10 text-center text-sm font-bold border border-pink-200 rounded-lg bg-pink-50 text-pink-700 focus:ring-2 focus:ring-pink-400 focus:outline-none"
              />
              <span className="text-[8px] text-gray-400 mt-0.5 uppercase font-bold">pos</span>
            </div>
            {/* Icon preview */}
            <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-xl flex-shrink-0">{cat.icon}</div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900">{cat.name}</p>
              <p className="text-[11px] text-gray-400 font-mono truncate">{cat.route}</p>
            </div>
            {/* Status badge */}
            <button onClick={() => toggleActive(cat.id)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 transition-all ${cat.active ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
              {cat.active ? '✓ Activa' : '○ Oculta'}
            </button>
            {/* Reorder con flechas */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveCategory(cat.id, -1)} disabled={idx === 0}
                className="p-0.5 text-gray-300 hover:text-pink-500 disabled:opacity-20 transition-colors text-xs">▲</button>
              <button onClick={() => moveCategory(cat.id, 1)} disabled={idx === sectionCats.length - 1}
                className="p-0.5 text-gray-300 hover:text-pink-500 disabled:opacity-20 transition-colors text-xs">▼</button>
            </div>
            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => { setEditingId(cat.id); setEditData(cat); }}
                className="p-1.5 hover:bg-pink-50 text-pink-400 hover:text-pink-600 rounded-lg transition-all">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteCategory(cat.id)}
                className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeCount = homeCategories.filter(c => c.active).length;

  return (
    <div>
      <PageHeader
        title="Categorías del Home"
        subtitle={`${activeCount} categorías visibles · Desde aquí puedes agregar, eliminar, ocultar y mover categorías del homepage al instante`}
        action={
          <div className="flex gap-2">
            <button onClick={resetToDefault} className="border border-gray-200 text-gray-600 text-sm font-bold px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Restaurar
            </button>
            <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewForm(v => !v)}>
              Nueva categoría
            </Button>
          </div>
        }
      />

      {/* Live preview strip */}
      <div className="card-white p-4 mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Vista previa — así se ve en el home</p>
        <div className="flex flex-wrap gap-2">
          {homeCategories.filter(c => c.active).sort((a, b) => {
            const sOrder = { main: 0, mercado: 1, comunidad: 2 };
            return (sOrder[a.section] - sOrder[b.section]) || (a.display_order - b.display_order);
          }).map(cat => (
            <div key={cat.id} className="flex flex-col items-center gap-1 w-16">
              <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-lg">{cat.icon}</div>
              <span className="text-[9px] text-gray-600 font-semibold text-center leading-tight line-clamp-2">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* New category form */}
      {showNewForm && (
        <div className="card-white p-5 mb-5 border-l-4 border-pink-500 bg-pink-50/30">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-pink-500" /> Nueva categoría</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Ícono</label>
                <input value={newCat.icon} onChange={e => setNewCat(d => ({ ...d, icon: e.target.value }))}
                  className="input w-full text-center text-xl" maxLength={2} />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre *</label>
                <input value={newCat.name} onChange={e => setNewCat(d => ({ ...d, name: e.target.value }))}
                  placeholder="Ej: Festivales" className="input w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Ruta *</label>
                <input value={newCat.route} onChange={e => setNewCat(d => ({ ...d, route: e.target.value }))}
                  placeholder="/eventos?cat=festivales" className="input w-full text-xs font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Sección</label>
                <select value={newCat.section} onChange={e => setNewCat(d => ({ ...d, section: e.target.value as any }))}
                  className="input w-full text-xs">
                  <option value="main">⭐ Principal</option>
                  <option value="mercado">🏪 Mercado</option>
                  <option value="comunidad">💬 Comunidad</option>
                </select>
              </div>
            </div>
            {/* Preview */}
            {newCat.name && (
              <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-pink-200">
                <div className="w-10 h-10 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-xl">{newCat.icon}</div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{newCat.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{newCat.route}</p>
                </div>
                <span className="ml-auto text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold capitalize">{newCat.section}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={addCategory} className="flex-1 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold text-sm rounded-xl py-2.5">
                Agregar al home
              </button>
              <button onClick={() => setShowNewForm(false)} className="flex-1 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl py-2.5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories by section */}
      {(['main', 'mercado', 'comunidad'] as const).map(section => {
        const sectionCats = homeCategories.filter(c => c.section === section).sort((a, b) => a.display_order - b.display_order);
        const activeInSection = sectionCats.filter(c => c.active).length;
        return (
          <div key={section} className="card-white mb-4 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center font-black text-sm text-pink-500">
                  {activeInSection}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{SECTION_LABELS[section]}</h3>
                  <p className="text-[11px] text-gray-400">{activeInSection} activas · {sectionCats.length - activeInSection} ocultas</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {sectionCats.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Sin categorías en esta sección</p>
              ) : (
                sectionCats.filter(c => !c.parent_id).map(parent => {
                  const children = getChildren(parent.id);
                  const siblings = sectionCats.filter(c => !c.parent_id);
                  const isExpanded = expandedParent === parent.id;
                  return (
                    <div key={parent.id} className="space-y-2">
                      <CatRow cat={parent} sectionCats={siblings} />
                      <div className="ml-6 pl-3 border-l-2 border-pink-100 space-y-2">
                        {children.length > 0 && (
                          <>
                            <button onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                              className="text-[11px] font-bold text-pink-500 hover:text-pink-700 flex items-center gap-1">
                              {isExpanded ? '▼' : '▶'} {children.length} subcategoría{children.length === 1 ? '' : 's'}
                            </button>
                            {isExpanded && children.map(child => (
                              <CatRow key={child.id} cat={child} sectionCats={children} />
                            ))}
                          </>
                        )}
                        {subDraft?.parentId === parent.id ? (
                          <div className="card-white p-3 border-l-4 border-pink-300 bg-pink-50/40">
                            <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">Nueva subcategoría de "{parent.name}"</p>
                            <div className="grid grid-cols-5 gap-2 mb-2">
                              <input value={subDraft.icon} onChange={e => setSubDraft(d => d && { ...d, icon: e.target.value })}
                                maxLength={2} placeholder="🏷️" className="input col-span-1 text-center text-lg" />
                              <input value={subDraft.name} onChange={e => setSubDraft(d => d && { ...d, name: e.target.value })}
                                placeholder="Nombre" className="input col-span-4" />
                            </div>
                            <input value={subDraft.route} onChange={e => setSubDraft(d => d && { ...d, route: e.target.value })}
                              placeholder={`Ruta (por defecto ${parent.route})`} className="input w-full text-xs font-mono mb-2" />
                            <div className="flex gap-2">
                              <button onClick={addSubcategory} className="flex-1 bg-pink-500 text-white font-bold text-xs rounded-lg py-2">Crear</button>
                              <button onClick={() => setSubDraft(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold text-xs rounded-lg py-2">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setSubDraft({ parentId: parent.id, name: '', icon: '🏷️', route: '' })}
                            className="text-[11px] font-bold text-gray-400 hover:text-pink-500 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Añadir subcategoría
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── 2b. MEDIA MANAGER ────────────────────────────────────────────────────
const MediaSection: React.FC = () => (
  <div>
    <PageHeader title="Media Manager" subtitle="Gestiona todas las imágenes, banners, vídeos e iconos de la plataforma" />
    <div className="card-white p-6">
      <AdminMediaManager />
    </div>
  </div>
);

// ── 3. RADIO ──────────────────────────────────────────────────────────────
const RadioSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const stations = [
    { id: 'rad-1', name: 'Radio Bachata', status: 'live', listeners: 342, bitrate: '128kbps' },
    { id: 'rad-2', name: 'Radio Latina Variada', status: 'live', listeners: 218, bitrate: '128kbps' },
    { id: 'rad-3', name: 'Radio Salsa Clásica', status: 'offline', listeners: 0, bitrate: '96kbps' },
  ];
  return (
    <div>
      <PageHeader title="Radio Online" subtitle="Gestiona las emisoras de radio en directo" action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nueva emisora creada', type: 'success' })}>Añadir emisora</Button>
      } />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card-white p-4 text-center"><p className="text-3xl font-black text-brand-orange">2</p><p className="text-gray-400 text-sm">En directo</p></div>
        <div className="card-white p-4 text-center"><p className="text-3xl font-black text-gray-900">560</p><p className="text-gray-400 text-sm">Oyentes activos</p></div>
        <div className="card-white p-4 text-center"><p className="text-3xl font-black text-gray-900">24/7</p><p className="text-gray-400 text-sm">Uptime</p></div>
      </div>
      <AdminTable
        headers={['Emisora', 'Estado', 'Oyentes', 'Bitrate', 'Stream URL', 'Acciones']}
        rows={stations.map(s => [
          <span className="font-semibold">{s.name}</span>,
          s.status === 'live' ? <Badge variant="live">🔴 En directo</Badge> : <Badge variant="gray">Offline</Badge>,
          <span>{s.listeners}</span>,
          <span>{s.bitrate}</span>,
          <span className="text-gray-400 text-xs font-mono">rtmp://stream.ritmolatino.com/live</span>,
          <div className="flex gap-2">
            <button onClick={() => openEdit({ entity: 'category', title: s.name, item: s, fields: [
              { key: 'name', label: 'Nombre', type: 'text', required: true },
              { key: 'bitrate', label: 'Bitrate', type: 'text' },
              { key: 'status', label: 'Estado', type: 'select', options: [{ value: 'live', label: 'En directo' }, { value: 'offline', label: 'Offline' }] },
            ] })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
            <button onClick={() => addToast({ message: `${s.name} ${s.status === 'live' ? 'detenida' : 'iniciada'}`, type: s.status === 'live' ? 'error' : 'success' })}
              className={`p-1.5 rounded-lg ${s.status === 'live' ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`}>
              {s.status === 'live' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </button>
          </div>
        ])}
      />
    </div>
  );
};

// ── 4. USUARIOS ────────────────────────────────────────────────────────────
const UsuariosSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { openEdit } = useAdminEdit();
  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status, city, location, avatar_url, created_at, verified')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const mapped = (data || []).map((u: any) => ({
        id:     u.id,
        name:   u.full_name || u.email?.split('@')[0] || 'Usuario',
        email:  u.email || '',
        role:   u.role || 'user',
        status: u.status || 'active',
        city:   u.city || u.location || '',
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        avatar: u.avatar_url || '',
        verified: !!u.verified,
      }));
      setUsers(mapped);
    } catch (e: any) {
      console.error('[admin] users load', e);
      addToast({ message: `Error cargando usuarios: ${e.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'activos'    && u.status !== 'active')  return false;
    if (filter === 'pendientes' && u.status !== 'pending') return false;
    if (filter === 'baneados'   && u.status !== 'banned')  return false;
    return true;
  });

  const handleBan = async (u: any) => {
    if (!confirm(`¿${u.status === 'banned' ? 'Desbloquear' : 'Banear'} a ${u.name}?`)) return;
    const newStatus = u.status === 'banned' ? 'active' : 'banned';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', u.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: `${u.name} ${newStatus === 'banned' ? 'baneado' : 'desbloqueado'}`, type: 'success' });
    loadUsers();
  };

  return (
    <div>
      <PageHeader title="Usuarios" subtitle={loading ? 'Cargando...' : `${filtered.length} de ${users.length} usuarios`} action={
        <div className="flex gap-2">
          <Button variant="dark" icon={<RefreshCw className="w-4 h-4" />} onClick={loadUsers}>Recargar</Button>
          <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => {
            // Para CREAR un usuario real con auth, redirigir a la pagina de signup o invitar
            addToast({ message: 'Para crear un usuario nuevo, comparte el link de registro o usa "Invitar admin" si quieres dar permisos.', type: 'info' });
          }}>Nuevo usuario</Button>
        </div>
      } />
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar placeholder="Buscar por nombre o email..." value={search} onChange={setSearch} className="max-w-xs" />
        <div className="flex gap-1 flex-wrap">
          {['todos', 'activos', 'pendientes', 'baneados'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-brand-orange text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>{f}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          Cargando usuarios desde Supabase...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No hay usuarios que coincidan</p>
        </div>
      ) : (
        <AdminTable
          headers={['Usuario', 'Email', 'Rol', 'Estado', 'Ciudad', 'Registro', 'Acciones']}
          rows={filtered.map(u => [
            <div className="flex items-center gap-2">
              {u.avatar
                ? <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-sm font-bold text-brand-orange">{u.name[0]?.toUpperCase()}</div>}
              <div>
                <span className="font-semibold text-gray-800 text-sm">{u.name}</span>
                {u.verified && <CheckCircle className="w-3 h-3 text-blue-500 inline ml-1" />}
              </div>
            </div>,
            <span className="text-gray-500 text-sm">{u.email}</span>,
            <Badge variant={u.role === 'superadmin' ? 'red' : u.role === 'admin' ? 'blue' : u.role === 'dj' ? 'orange' : 'gray'} className="capitalize">{u.role}</Badge>,
            <Badge variant={u.status === 'active' ? 'green' : u.status === 'pending' ? 'orange' : 'red'}>
              {u.status === 'active' ? 'Activo' : u.status === 'pending' ? 'Pendiente' : 'Baneado'}
            </Badge>,
            <span className="text-gray-500 text-sm">{u.city}</span>,
            <span className="text-gray-400 text-sm">{u.joined}</span>,
            <div className="flex gap-1">
              <button onClick={() => navigate(`/p/${u.id}`)} title="Ver perfil público" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
              <button onClick={() => openEdit({ entity: 'user', title: u.name, item: u, fields: FIELDS_USER, onSaved: () => loadUsers() } as any)} title="Editar" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleBan(u)} title={u.status === 'banned' ? 'Desbloquear' : 'Banear'} className={`p-1.5 rounded-lg ${u.status === 'banned' ? 'hover:bg-green-50 text-green-500' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}><XCircle className="w-4 h-4" /></button>
            </div>
          ])}
        />
      )}
    </div>
  );
};

// ── 5. LOCALIDADES ────────────────────────────────────────────────────────
const LocalidadesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVenue, setShowAddVenue] = React.useState(false);
  const [showAddEvent, setShowAddEvent] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('venues').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setVenues(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const cities = new Set(venues.map(v => v.city).filter(Boolean)).size;
  const active = venues.filter(v => v.status !== 'inactive').length;
  const pending = venues.filter(v => v.admin_status === 'pending').length;

  return (
  <div>
    <PageHeader title="Localidades" subtitle={`${venues.length} venues en la plataforma`} action={
      <div className="flex gap-2">
        <Button variant="dark" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddEvent(true)}>Nuevo evento</Button>
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddVenue(true)}>Nueva localidad</Button>
      </div>
    } />
    <AdminLocationModal open={showAddVenue} mode="venue" onClose={() => setShowAddVenue(false)} onSaved={() => { addToast({ message: '✅ Local guardado', type: 'success' }); load(); }} />
    <AdminLocationModal open={showAddEvent} mode="event" onClose={() => setShowAddEvent(false)} onSaved={() => addToast({ message: '✅ Evento guardado', type: 'success' })} />
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
      {[{ label: 'Localidades activas', val: active }, { label: 'Ciudades', val: cities }, { label: 'Pendientes aprobación', val: pending }].map(s => (
        <div key={s.label} className="card-white p-4 text-center"><p className="text-3xl font-black text-brand-orange">{s.val}</p><p className="text-gray-400 text-sm mt-1">{s.label}</p></div>
      ))}
    </div>
    {loading ? <div className="py-12 text-center text-gray-400">Cargando…</div> : venues.length === 0 ? (
      <div className="card-white p-10 text-center text-gray-400"><MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No hay venues. Usa "Nueva localidad" para añadir el primero.</p></div>
    ) : (
      <AdminTable
        headers={['Nombre', 'Ciudad', 'Tipo', 'Estado', 'Suscripción', 'Acciones']}
        rows={venues.map(v => [
          <span className="font-semibold">{v.name}</span>,
          <span>{v.city || '—'}</span>,
          <Badge variant="gray" className="capitalize">{v.type || 'local'}</Badge>,
          <Badge variant={v.is_open ? 'green' : 'gray'}>{v.is_open ? '🟢 Abierto' : 'Cerrado'}</Badge>,
          v.is_premium ? <Badge variant="orange">Premium</Badge> : <Badge variant="gray">Básico</Badge>,
          <div className="flex gap-1">
            <button onClick={() => openEdit({ entity: 'venue', title: v.name, item: v, fields: FIELDS_VENUE, onSaved: load })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
            <button onClick={async () => {
              if (!confirm(`¿Eliminar el local "${v.name}"?`)) return;
              const { error } = await supabase.from('venues').delete().eq('id', v.id);
              if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); return; }
              addToast({ message: `✅ ${v.name} eliminado`, type: 'success' }); load();
            }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ])}
      />
    )}
  </div>
  );
};

// ── 6. SUSCRIPCIONES (suscriptores reales de la tabla subscriptions) ────────
const SuscripcionesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200);
    const list = data || [];
    setSubs(list);
    const ids = Array.from(new Set(list.map((s: any) => s.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name || String(p.id).slice(0, 8); });
      setNames(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (s: any, status: string, msg: string) => {
    if (status === 'canceled' && !confirm('¿Cancelar esta suscripción?')) return;
    const { error } = await supabase.from('subscriptions').update({ status }).eq('id', s.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: msg, type: 'success' });
    setSubs(ss => ss.map(x => x.id === s.id ? { ...x, status } : x));
  };

  const activeByPlan = (planId: string) => subs.filter(s => s.status === 'active' && (s.plan === planId || s.plan === SUBSCRIPTION_PLANS.find(p => p.id === planId)?.name)).length;
  const mrr = subs.filter(s => s.status === 'active').reduce((a, s) => a + (Number(s.price) || 0), 0);

  return (
  <div>
    <PageHeader title="Suscripciones Premium" subtitle="Planes y suscriptores reales" action={
      <button onClick={load} className="btn-orange flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
    } />
    <div className="card-white p-4 mb-6 flex items-center gap-3">
      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">💶</div>
      <div><p className="text-gray-400 text-xs">Ingreso recurrente mensual (MRR)</p><p className="font-black text-2xl text-gray-900">€{mrr.toLocaleString('es-ES')}</p></div>
      <div className="ml-auto text-right"><p className="text-gray-400 text-xs">Activas</p><p className="font-black text-2xl text-green-600">{subs.filter(s => s.status === 'active').length}</p></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {SUBSCRIPTION_PLANS.map(plan => (
        <div key={plan.id} className="card-white p-5 text-center">
          <div className={`w-10 h-10 bg-gradient-to-r ${plan.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <p className="font-display font-black text-gray-900">{plan.name}</p>
          <p className="text-brand-orange font-black text-2xl mt-1">€{plan.price}<span className="text-sm text-gray-400 font-normal">/mes</span></p>
          <p className="text-gray-400 text-xs mt-1">{activeByPlan(plan.id)} activos</p>
        </div>
      ))}
    </div>
    <h3 className="font-bold text-gray-900 mb-3">Suscriptores</h3>
    {loading ? (
      <div className="py-12 text-center text-gray-400">Cargando…</div>
    ) : subs.length === 0 ? (
      <div className="card-white p-10 text-center text-gray-400">
        <Crown className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>Aún no hay suscriptores. Aparecerán aquí cuando los usuarios contraten un plan.</p>
      </div>
    ) : (
      <AdminTable
        headers={['Usuario', 'Plan', 'Importe', 'Inicio', 'Próx. factura', 'Estado', 'Acciones']}
        rows={subs.map(s => [
          <span className="font-semibold text-sm">{names[s.user_id] || (s.user_id ? String(s.user_id).slice(0, 8) : '—')}</span>,
          <Badge variant="orange">{s.plan_name || s.plan}</Badge>,
          <span className="font-bold">€{Number(s.price) || 0}</span>,
          <span className="text-gray-500 text-sm">{s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}</span>,
          <span className="text-gray-500 text-sm">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}</span>,
          <Badge variant={s.status === 'active' ? 'green' : s.status === 'pending' ? 'orange' : s.status === 'past_due' ? 'orange' : 'red'}>
            {s.status === 'active' ? 'Activa' : s.status === 'pending' ? 'Pendiente' : s.status === 'past_due' ? 'Impago' : 'Cancelada'}
          </Badge>,
          <div className="flex gap-1">
            {s.status !== 'active' && s.status !== 'canceled' && <button onClick={() => setStatus(s, 'active', '✅ Suscripción activada')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200" title="Activar">Activar</button>}
            {s.status === 'active' && <button onClick={() => setStatus(s, 'canceled', 'Suscripción cancelada')} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Cancelar"><XCircle className="w-4 h-4" /></button>}
          </div>,
        ])}
      />
    )}
  </div>
  );
};

// ── 7. ARTISTAS ───────────────────────────────────────────────────────────
const ArtistasSection: React.FC<{ addToast: Function; navigate: Function }> = ({ addToast, navigate }) => {
  const { openEdit } = useAdminEdit();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const combined: any[] = [];
    try {
      const { data } = await supabase.from('artists').select('*');
      data?.forEach((a: any) => combined.push({ ...a, source: 'artist' }));
    } catch (e) { console.warn('artists', e); }
    try {
      const { data } = await supabase.from('profiles').select('*').in('role', ['artist','dj','singer','band','musician','promoter']);
      data?.forEach((p: any) => combined.push({
        id: p.id, name: p.full_name || p.email, type: p.role,
        city: p.city || p.location, avatar: p.avatar_url,
        rating: 0, completedBookings: 0, isVerified: p.verified, isPremium: false,
        source: 'profile',
      }));
    } catch (e) { console.warn('profiles', e); }
    setItems(combined);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Eliminar "${item.name}" de la BD?`)) return;
    const table = item.source === 'profile' ? 'profiles' : 'artists';
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (error) addToast({ message: error.message, type: 'error' });
    else { addToast({ message: `✅ ${item.name} eliminado`, type: 'success' }); load(); }
  };

  return (
    <div>
      <PageHeader title="Artistas" subtitle={loading ? 'Cargando…' : `${items.length} artistas/perfiles desde BD`} action={
        <div className="flex gap-2">
          <Button variant="dark" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Recargar</Button>
          <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => openEdit({ entity: 'artist', title: 'Nuevo artista', item: { id: `art-new-${Date.now()}`, name: '', type: 'singer', city: '', country: 'España' }, fields: FIELDS_ARTIST, onSaved: () => load() } as any)}>Añadir artista</Button>
        </div>
      } />
      {loading ? <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
       : items.length === 0 ? <div className="text-center py-12 text-gray-400">No hay artistas en la BD aún</div>
       : (
        <AdminTable
          headers={['Artista', 'Tipo', 'Ciudad', 'Rating', 'Fuente', 'Acciones']}
          rows={items.map(a => [
            <div className="flex items-center gap-2">
              {a.avatar
                ? <img src={a.avatar} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-xs font-bold text-brand-orange">{(a.name || '?')[0]?.toUpperCase()}</div>}
              <div>
                <p className="font-semibold text-sm">{a.name}</p>
                {a.isVerified && <span className="text-blue-500 text-xs">✓ Verificado</span>}
              </div>
            </div>,
            <Badge variant="gray" className="capitalize">{a.type}</Badge>,
            <span>{a.city || '—'}</span>,
            <div className="flex items-center gap-1"><span className="text-brand-orange">⭐</span><span className="font-semibold">{a.rating || '—'}</span></div>,
            <Badge variant={a.source === 'profile' ? 'blue' : 'orange'}>{a.source === 'profile' ? 'Usuario' : 'Artista'}</Badge>,
            <div className="flex gap-1">
              <button onClick={() => navigate(a.source === 'profile' ? `/p/${a.id}` : `/artistas/${a.id}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
              <button onClick={() => navigate(a.source === 'profile' ? `/p/${a.id}?edit=1` : `/artistas/${a.id}?edit=1`)} title="Editar en el perfil real" className="p-1.5 hover:bg-pink-50 rounded-lg text-gray-400 hover:text-pink-500"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(a)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ])}
        />
      )}
    </div>
  );
};

// ── 8. BAILARINAS ─────────────────────────────────────────────────────────
const BailarinasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const combined: any[] = [];
    try {
      const { data } = await supabase.from('artists').select('*').in('type', ['dancer','instructor']);
      data?.forEach((a: any) => combined.push({ ...a, source: 'artist' }));
    } catch (e) { console.warn('artists', e); }
    try {
      const { data } = await supabase.from('profiles').select('*').in('role', ['dancer','instructor']);
      data?.forEach((p: any) => combined.push({
        id: p.id, name: p.full_name || p.email, type: p.role,
        city: p.city || p.location, avatar: p.avatar_url,
        rating: 0, source: 'profile',
      }));
    } catch (e) { console.warn('profiles', e); }
    setItems(combined);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Eliminar "${item.name}" de la BD?`)) return;
    const table = item.source === 'profile' ? 'profiles' : 'artists';
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (error) addToast({ message: error.message, type: 'error' });
    else { addToast({ message: `✅ ${item.name} eliminado`, type: 'success' }); load(); }
  };

  return (
    <div>
      <PageHeader title="Bailarines & Instructores" subtitle={loading ? 'Cargando…' : `${items.length} perfiles desde BD`} action={
        <div className="flex gap-2">
          <Button variant="dark" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>Recargar</Button>
          <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => openEdit({ entity: 'artist', title: 'Nuevo bailarín/a', item: { id: `art-new-${Date.now()}`, name: '', type: 'dancer', city: '', country: 'España' }, fields: FIELDS_ARTIST, onSaved: () => load() } as any)}>Añadir bailarín/a</Button>
        </div>
      } />
      {loading ? <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
       : items.length === 0 ? <div className="text-center py-12 text-gray-400">No hay bailarines/instructores en la BD aún</div>
       : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(a => (
            <div key={`${a.source}-${a.id}`} className="card-white p-4 text-center hover:shadow-card-hover transition-shadow">
              {a.avatar
                ? <img src={a.avatar} alt={a.name} className="w-16 h-16 rounded-full mx-auto mb-3 ring-2 ring-brand-orange/30 object-cover" />
                : <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-pink-400 to-fuchsia-600 flex items-center justify-center text-white text-xl font-bold">{(a.name || '?')[0]?.toUpperCase()}</div>}
              <p className="font-bold text-gray-900 text-sm">{a.name}</p>
              <p className="text-gray-400 text-xs capitalize mt-0.5">{a.type} · {a.city || '—'}</p>
              {a.rating > 0 && <div className="flex items-center justify-center gap-1 mt-1"><span className="text-brand-orange text-xs">⭐</span><span className="text-xs font-semibold">{a.rating}</span></div>}
              <div className="flex gap-1 mt-3">
                <button onClick={() => {
                  const url = a.source === 'profile' ? `/p/${a.id}?edit=1` : `/artistas/${a.id}?edit=1`;
                  window.open(url, '_blank');
                }} className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Editar</button>
                <button onClick={() => handleDelete(a)} className="flex-1 text-xs py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 9. EVENTOS ────────────────────────────────────────────────────────────
const EventosSection: React.FC<{ addToast: Function; navigate: Function }> = ({ addToast, navigate }) => {
  const { openEdit } = useAdminEdit();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').is('deleted_at', null).order('date', { ascending: false }).limit(200);
    setEvents(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
  <div>
    <PageHeader title="Eventos" subtitle={`${events.length} eventos en la plataforma`} action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/eventos')}>Ver eventos</Button>
    } />
    {loading ? <div className="py-12 text-center text-gray-400">Cargando…</div> : events.length === 0 ? (
      <div className="card-white p-10 text-center text-gray-400"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No hay eventos. Crea el primero desde la sección Localidades.</p></div>
    ) : (
      <AdminTable
        headers={['Evento', 'Ciudad', 'Fecha', 'Precio', 'Capacidad', 'Estado', 'Acciones']}
        rows={events.map(e => [
          <div className="flex items-center gap-2">
            {e.cover && <img src={e.cover} alt="" className="w-10 h-8 rounded-lg object-cover" />}
            <p className="font-semibold text-sm line-clamp-1 max-w-[180px]">{e.title}</p>
          </div>,
          <span>{e.city || e.location || '—'}</span>,
          <span className="text-sm">{e.date ? new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</span>,
          <span className="font-semibold">{e.price != null ? `€${e.price}` : '—'}</span>,
          <div>
            {e.capacity ? <>
              <div className="flex items-center gap-1 text-sm"><span>{e.attending || 0}/{e.capacity}</span></div>
              <div className="h-1 bg-gray-100 rounded-full mt-1 w-20"><div className="h-full bg-brand-orange rounded-full" style={{ width: `${Math.min(((e.attending || 0) / e.capacity) * 100, 100)}%` }} /></div>
            </> : <span className="text-gray-400 text-sm">—</span>}
          </div>,
          <Badge variant={e.is_featured ? 'orange' : 'green'}>{e.is_featured ? 'Destacado' : 'Activo'}</Badge>,
          <div className="flex gap-1">
            <button onClick={() => navigate(`/eventos/${e.id}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
            <button onClick={() => openEdit({ entity: 'event', title: e.title, item: e, fields: FIELDS_EVENT, onSaved: load })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
            <button onClick={async () => {
              if (!confirm(`¿Eliminar el evento "${e.title}"?`)) return;
              const { error } = await supabase.from('events').delete().eq('id', e.id);
              if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); return; }
              addToast({ message: `✅ "${e.title}" eliminado`, type: 'success' }); load();
            }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ])}
      />
    )}
  </div>
  );
};

// ── 10. MERCADO Y ESCROW ─────────────────────────────────────────────────
const MercadoSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('escrows').select('*').order('created_at', { ascending: false }).limit(200);
    const list = data || [];
    setRows(list);
    // Resolver nombres de payer/payee (best-effort) desde profiles
    const ids = Array.from(new Set(list.flatMap((e: any) => [e.payer_id, e.payee_id]).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name || p.id.slice(0, 8); });
      setNames(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (e: any, status: string, msg: string) => {
    const patch: any = { status };
    if (status === 'released') patch.release_date = new Date().toISOString();
    const { error } = await supabase.from('escrows').update(patch).eq('id', e.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: msg, type: 'success' });
    setRows(rs => rs.map(x => x.id === e.id ? { ...x, ...patch } : x));
  };

  const eur = (n: number) => '€' + (Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 });
  const sum = (pred: (e: any) => boolean, field = 'amount') => rows.filter(pred).reduce((a, e) => a + (Number(e[field]) || 0), 0);
  const inEscrow = (e: any) => ['pending', 'held', 'escrow'].includes(e.status);
  const done = (e: any) => ['released', 'completed'].includes(e.status);

  const stats = [
    { l: 'En escrow', v: eur(sum(inEscrow)), c: 'bg-yellow-50', i: '🔒' },
    { l: 'Liberado', v: eur(sum(done)), c: 'bg-green-50', i: '✅' },
    { l: 'Reembolsado', v: eur(sum(e => e.status === 'refunded')), c: 'bg-red-50', i: '↩️' },
    { l: 'Comisión total', v: eur(sum(() => true, 'commission')), c: 'bg-pink-50', i: '💰' },
  ];

  return (
    <div>
      <PageHeader title="Mercado y Depósito en Garantía" subtitle="Escrow real (tabla escrows)" action={
        <button onClick={load} className="btn-orange flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
      } />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.l} className="card-white p-4">
            <div className={`w-10 h-10 ${s.c} rounded-xl flex items-center justify-center text-xl mb-2`}>{s.i}</div>
            <p className="text-gray-400 text-xs">{s.l}</p>
            <p className="font-black text-xl text-gray-900">{s.v}</p>
          </div>
        ))}
      </div>
      {loading ? (
        <div className="py-12 text-center text-gray-400">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="card-white p-10 text-center text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay operaciones en escrow todavía. Aparecerán cuando se realicen pagos con depósito en garantía.</p>
        </div>
      ) : (
        <AdminTable
          headers={['ID', 'Pagador', 'Cobra', 'Importe', 'Comisión', 'Neto', 'Estado', 'Acciones']}
          rows={rows.map(e => [
            <span className="font-mono text-xs text-gray-500">{String(e.id).slice(0, 8)}</span>,
            <span className="font-semibold text-sm">{names[e.payer_id] || (e.payer_id ? String(e.payer_id).slice(0, 8) : '—')}</span>,
            <span className="text-gray-600 text-sm">{names[e.payee_id] || (e.payee_id ? String(e.payee_id).slice(0, 8) : '—')}</span>,
            <span className="font-bold">{eur(e.amount)}</span>,
            <span className="text-brand-orange font-semibold">{eur(e.commission)}</span>,
            <span className="text-gray-600">{eur(e.net_amount)}</span>,
            <Badge variant={done(e) ? 'green' : e.status === 'refunded' ? 'red' : 'orange'}>
              {inEscrow(e) ? '🔒 Escrow' : done(e) ? '✅ Liberado' : e.status === 'refunded' ? '↩️ Reembolsado' : e.status}
            </Badge>,
            <div className="flex gap-1">
              {inEscrow(e) && <>
                <button onClick={() => setStatus(e, 'released', 'Pago liberado al vendedor')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200">Liberar</button>
                <button onClick={() => setStatus(e, 'refunded', 'Importe reembolsado al pagador')} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200">Reembolsar</button>
              </>}
            </div>,
          ])}
        />
      )}
    </div>
  );
};

// ── 11. CURSOS ────────────────────────────────────────────────────────────
const CursosSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(data || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (c: any) => {
    if (!confirm(`¿Eliminar el curso "${c.title}"?`)) return;
    const { error } = await supabase.from('courses').delete().eq('id', c.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: '✅ Curso eliminado', type: 'success' });
    setCourses(cs => cs.filter(x => x.id !== c.id));
  };

  return (
  <div>
    <PageHeader title="Cursos y Academia" subtitle="Cursos reales de la base de datos" action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />}
        onClick={() => openEdit({ entity: 'course', title: 'Nuevo curso', item: { id: 'new' }, fields: FIELDS_COURSE, onSaved: load })}>
        Nuevo curso
      </Button>
    } />
    {loading ? (
      <div className="py-12 text-center text-gray-400">Cargando…</div>
    ) : courses.length === 0 ? (
      <div className="card-white p-10 text-center text-gray-400">
        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>No hay cursos todavía. Crea el primero con "Nuevo curso".</p>
      </div>
    ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map(course => (
        <div key={course.id} className="card-white p-5 hover:shadow-card-hover transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <Badge variant={course.admin_status === 'approved' ? 'green' : 'gray'}>{course.admin_status === 'approved' ? 'Publicado' : 'Pendiente'}</Badge>
            <span className="font-black text-brand-orange text-lg">€{course.price ?? 0}</span>
          </div>
          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{course.title}</h3>
          <p className="text-gray-400 text-xs mb-3">por {course.instructor || '—'}{course.level ? ` · ${course.level}` : ''}</p>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">{course.category || 'Sin categoría'}</span>
            <div className="flex gap-1">
              <button onClick={() => openEdit({ entity: 'course', title: course.title, item: course, fields: FIELDS_COURSE, onSaved: load })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
              <button onClick={() => del(course)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
    )}
  </div>
  );
};

// ── 12. FINANZAS ──────────────────────────────────────────────────────────
// ── ADMIN: COMISIONES DINÁMICAS ───────────────────────────────────────────
const ComisionesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { commissions, setCommission, setDefaultCommission, setPremiumDiscount, resetCommissions } = useSiteConfigStore();

  const sources: { id: CommissionSource; label: string; icon: string; desc: string }[] = [
    { id: 'booking', label: 'Reservas (DJs, artistas, venues)', icon: '📅', desc: 'Bookings de eventos privados y públicos' },
    { id: 'course',  label: 'Cursos digitales',                 icon: '🎓', desc: 'Cursos en vídeo y materiales descargables' },
    { id: 'class',   label: 'Clases online 1:1',                icon: '🎥', desc: 'Sesiones individuales en directo' },
    { id: 'offer',   label: 'Ofertas personalizadas',           icon: '💼', desc: 'Propuestas custom enviadas por chat' },
    { id: 'tip',     label: 'Propinas y donaciones',            icon: '💝', desc: 'Tips en streams y perfiles' },
  ];

  return (
    <div>
      <PageHeader
        title="Comisiones dinámicas"
        subtitle="Configura el % que la plataforma cobra en cada tipo de transacción. Los cambios afectan a TODAS las contrataciones nuevas."
        action={
          <button onClick={() => { resetCommissions(); addToast({ message: 'Comisiones restauradas al valor por defecto', type: 'info' }); }}
            className="text-sm text-gray-500 hover:text-gray-800 font-semibold">↺ Restaurar valores por defecto</button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card-white p-5">
          <p className="text-xs text-gray-400 font-semibold uppercase">Comisión default</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" step="0.5" min="0" max="100"
              value={(commissions.default * 100).toFixed(1)}
              onChange={e => setDefaultCommission((parseFloat(e.target.value) || 0) / 100)}
              className="input-field text-3xl font-black text-brand-orange w-32" />
            <span className="text-3xl font-black text-brand-orange">%</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Tasa aplicada si no hay override por categoría</p>
        </div>

        <div className="card-white p-5">
          <p className="text-xs text-gray-400 font-semibold uppercase">Descuento sellers premium</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" step="0.5" min="0" max="100"
              value={(commissions.premiumDiscount * 100).toFixed(1)}
              onChange={e => setPremiumDiscount((parseFloat(e.target.value) || 0) / 100)}
              className="input-field text-3xl font-black text-purple-600 w-32" />
            <span className="text-3xl font-black text-purple-600">%</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Sellers 👑 PRO pagan {((commissions.default - commissions.premiumDiscount) * 100).toFixed(1)}% en lugar de {(commissions.default * 100).toFixed(1)}%
          </p>
        </div>

        <div className="card-white p-5">
          <p className="text-xs text-gray-400 font-semibold uppercase">Vista rápida</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Default:</span><span className="font-black text-brand-orange">{(commissions.default * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Premium:</span><span className="font-black text-purple-600">{((commissions.default - commissions.premiumDiscount) * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-100"><span>Diferencia</span><span>-{(commissions.premiumDiscount * 100).toFixed(1)} pp</span></div>
          </div>
        </div>
      </div>

      <div className="card-white overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Comisión por tipo de transacción</h3>
          <p className="text-xs text-gray-400 mt-0.5">Override que se aplica antes que el valor default</p>
        </div>
        <div className="divide-y divide-gray-50">
          {sources.map(s => {
            const rate = commissions.bySource[s.id];
            const premiumRate = Math.max(0, rate - commissions.premiumDiscount);
            return (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.5" min="0" max="100"
                    value={(rate * 100).toFixed(1)}
                    onChange={e => setCommission(s.id, (parseFloat(e.target.value) || 0) / 100)}
                    className="input-field w-24 text-center font-bold text-brand-orange" />
                  <span className="font-bold text-gray-700">%</span>
                  <div className="ml-3 text-right hidden sm:block">
                    <p className="text-[10px] text-purple-600 font-bold">Premium {(premiumRate * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400">€100 → recibe €{(100 - 100 * rate).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── ADMIN: DASHBOARDS DE CREATORS (vista global) ──────────────────────────
const CreatorsSection: React.FC = () => {
  const { transactions, balanceFor, totalsFor } = usePerformerStore();
  const [filter, setFilter] = useState('');
  // Agrupa por performerId
  const performers = Array.from(
    transactions.reduce((map, t) => {
      if (!map.has(t.performerId)) {
        map.set(t.performerId, { id: t.performerId, name: t.performerName || t.performerId, txCount: 0 });
      }
      map.get(t.performerId)!.txCount++;
      return map;
    }, new Map<string, { id: string; name: string; txCount: number }>())
    .values()
  );

  const filtered = performers.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <PageHeader title="Dashboards de creators" subtitle="Vista superadmin de todos los proveedores (artistas, DJs, bailarines, venues, etc.)" />
      <div className="card-white p-4 mb-6">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="🔍 Buscar creator por nombre..."
          className="input-field"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(p => {
          const b = balanceFor(p.id);
          const t = totalsFor(p.id);
          return (
            <div key={p.id} className="card-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=EC4899&color=fff`} name={p.name} size="md" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{p.name}</h4>
                  <p className="text-xs text-gray-400 font-mono">{p.id} · {p.txCount} transacciones</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-yellow-50 rounded-lg p-2">
                  <p className="text-yellow-700 font-semibold">En escrow</p>
                  <p className="text-lg font-black text-gray-900">€{b.inEscrow}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-green-700 font-semibold">Disponible</p>
                  <p className="text-lg font-black text-gray-900">€{b.available}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-600 font-semibold">Retirado</p>
                  <p className="text-lg font-black text-gray-900">€{b.withdrawn}</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-2">
                  <p className="text-brand-orange font-semibold">Comisión a plataforma</p>
                  <p className="text-lg font-black text-gray-900">€{Math.round((t.grossAllTime - t.netAllTime) * 100) / 100}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                <span>Bruto: <span className="font-bold text-gray-900">€{t.grossAllTime}</span></span>
                <span>Neto: <span className="font-bold text-green-600">€{t.netAllTime}</span></span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8 col-span-full">Sin creators que coincidan.</p>
        )}
      </div>
    </div>
  );
};

// ── ADMIN: RETIROS PENDIENTES ─────────────────────────────────────────────
const RetirosSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { withdrawals, approveWithdrawal, rejectWithdrawal } = usePerformerStore();
  const all = [...withdrawals].sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
  const pending = all.filter(w => w.status === 'pending');

  return (
    <div>
      <PageHeader title="Retiros pendientes" subtitle={`${pending.length} solicitud(es) por aprobar · pago al creador tras validación`} />
      <div className="card-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Creator</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-right px-4 py-3">Importe</th>
              <th className="text-left px-4 py-3">Fecha solicitud</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {all.map(w => (
              <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{w.performerName}</td>
                <td className="px-4 py-3 text-gray-500">{w.method}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">€{w.amount}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(w.requestedAt).toLocaleString('es-ES')}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    w.status === 'paid' ? 'bg-green-100 text-green-700' :
                    w.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-pink-100 text-brand-orange'
                  }`}>{w.status === 'paid' ? 'Pagado' : w.status === 'rejected' ? 'Rechazado' : 'Pendiente'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {w.status === 'pending' ? (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { approveWithdrawal(w.id); addToast({ message: `Retiro de €${w.amount} aprobado y pagado a ${w.performerName}`, type: 'success' }); }}
                        className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-lg hover:bg-green-200">
                        ✓ Aprobar
                      </button>
                      <button onClick={() => { rejectWithdrawal(w.id); addToast({ message: 'Retiro rechazado', type: 'info' }); }}
                        className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-lg hover:bg-red-200">
                        ✕ Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {all.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin solicitudes de retiro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FinanzasSection: React.FC = () => {
  const { platformTotals, transactions, refundTransaction } = usePerformerStore();
  const { commissions } = useSiteConfigStore();
  const { addToast } = useUIStore();
  const totals = platformTotals();
  const pendingTx = transactions.filter(t => t.status === 'pending');
  const refundedCount = transactions.filter(t => t.status === 'refunded').length;

  // GMV mensual (gross released + withdrawn)
  const billable = transactions.filter(t => t.status === 'released' || t.status === 'withdrawn');
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthTx = billable.filter(t => {
      const dt = new Date(t.date);
      return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
    });
    return {
      label: d.toLocaleDateString('es-ES', { month: 'short' }),
      gross: monthTx.reduce((s, t) => s + t.gross, 0),
      commission: monthTx.reduce((s, t) => s + t.commission, 0),
    };
  });
  const maxGross = Math.max(...monthly.map(m => m.gross), 1);

  // Top creators
  const byCreator = new Map<string, { name: string; gross: number; commission: number; tx: number }>();
  billable.forEach(t => {
    const key = t.performerId;
    const cur = byCreator.get(key) || { name: t.performerName || key, gross: 0, commission: 0, tx: 0 };
    cur.gross += t.gross; cur.commission += t.commission; cur.tx++;
    byCreator.set(key, cur);
  });
  const topCreators = Array.from(byCreator.values()).sort((a, b) => b.gross - a.gross).slice(0, 5);

  const handleRefund = (txId: string, concept: string) => {
    refundTransaction(txId);
    addToast({ message: `Reembolso emitido · "${concept}"`, type: 'success' });
  };

  const stats = [
    { label: 'GMV total',     value: `€${totals.totalGross.toLocaleString()}`, sub: `${totals.totalTransactions} transacciones`, color: 'text-green-600' },
    { label: 'Comisiones',    value: `€${totals.totalCommission.toLocaleString()}`, sub: `Default ${(commissions.default * 100).toFixed(1)}%`, color: 'text-brand-orange' },
    { label: 'En escrow',     value: `€${pendingTx.reduce((s, t) => s + t.gross, 0).toFixed(0)}`, sub: `${pendingTx.length} sin confirmar`, color: 'text-yellow-600' },
    { label: 'Reembolsos',    value: String(refundedCount), sub: 'Histórico', color: 'text-red-600' },
  ];
  return (
  <div>
    <PageHeader title="Finanzas" subtitle="GMV, comisiones, escrow y reembolsos — todo en tiempo real" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map(s => (
        <div key={s.label} className="card-white p-5">
          <p className="text-gray-400 text-xs font-medium">{s.label}</p>
          <p className={`font-black text-2xl ${s.color} mt-1`}>{s.value}</p>
          <p className="text-gray-400 text-xs mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4">GMV mensual (últimos 6 meses)</h3>
        <div className="flex items-end gap-2 h-40 mb-2">
          {monthly.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full bg-gray-100 rounded-t-lg flex-1 flex items-end overflow-hidden">
                <div className="w-full bg-gradient-to-t from-brand-orange to-pink-300 rounded-t-lg transition-all"
                  style={{ height: `${(m.gross / maxGross) * 100}%`, minHeight: m.gross > 0 ? 4 : 0 }} />
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">{m.label}</span>
              <span className="text-[10px] text-gray-400">€{Math.round(m.gross)}</span>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-gray-100 flex justify-between text-xs">
          <span className="text-gray-500">Total 6m: <span className="font-bold text-gray-900">€{monthly.reduce((s, m) => s + m.gross, 0).toFixed(0)}</span></span>
          <span className="text-brand-orange font-bold">Comisión: €{monthly.reduce((s, m) => s + m.commission, 0).toFixed(0)}</span>
        </div>
      </div>

      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4">Top creators por facturación</h3>
        {topCreators.length === 0 && <p className="text-sm text-gray-400">Sin datos aún.</p>}
        {topCreators.map((c, i) => {
          const pct = (c.gross / topCreators[0].gross) * 100;
          return (
            <div key={c.name} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700"><span className="font-black text-brand-orange mr-2">#{i + 1}</span>{c.name}</span>
                <span className="font-bold">€{c.gross.toFixed(0)} <span className="text-gray-400 text-xs font-normal">({c.tx} tx)</span></span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-orange to-pink-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-brand-orange mt-0.5">€{c.commission.toFixed(0)} comisión generada</p>
            </div>
          );
        })}
      </div>
    </div>

    <div className="card-white mt-6 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Transacciones — vista superadmin</h3>
        <p className="text-xs text-gray-400">Puedes reembolsar transacciones en escrow o ya liberadas</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Concepto</th>
              <th className="text-left px-4 py-3">Creator</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Bruto</th>
              <th className="text-right px-4 py-3">Comisión</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 20).map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                <td className="px-4 py-3 text-gray-900 font-medium truncate max-w-[200px]">{t.concept}</td>
                <td className="px-4 py-3 text-gray-700">{t.performerName || t.performerId}</td>
                <td className="px-4 py-3 text-gray-500">{t.clientName}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    t.status === 'pending'   ? 'bg-yellow-50 text-yellow-700' :
                    t.status === 'released'  ? 'bg-green-50 text-green-700' :
                    t.status === 'withdrawn' ? 'bg-gray-100 text-gray-600' :
                                               'bg-red-50 text-red-600'
                  }`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-right">€{t.gross}</td>
                <td className="px-4 py-3 text-right text-brand-orange font-bold">€{t.commission}</td>
                <td className="px-4 py-3 text-right">
                  {(t.status === 'pending' || t.status === 'released') ? (
                    <button onClick={() => handleRefund(t.id, t.concept)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded">
                      Reembolsar
                    </button>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};

// ── HERO SLIDER EDITOR ────────────────────────────────────────────────────
const HeroSliderEditor: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { heroSliderImages, setHeroSliderImages } = useSiteConfigStore();
  const [images, setImages] = useState<HeroSliderImage[]>(heroSliderImages);
  const [newUrl, setNewUrl] = useState('');
  const [newAlt, setNewAlt] = useState('');

  // Sync con Supabase + store
  useEffect(() => { setImages(heroSliderImages); }, [heroSliderImages]);

  const persistImages = async (updated: HeroSliderImage[]) => {
    setImages(updated);
    setHeroSliderImages(updated);
    const { error } = await saveSiteConfigKey('hero_slider_images', updated);
    if (error) addToast({ message: `Error BD: ${error}`, type: 'error' });
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const updated = [...images, { id: Date.now().toString(), url: newUrl.trim(), alt: newAlt.trim() || 'Slider image' }];
    persistImages(updated);
    setNewUrl('');
    setNewAlt('');
    addToast({ message: 'Imagen añadida al slider', type: 'success' });
  };

  const handleRemove = (id: string) => {
    persistImages(images.filter(i => i.id !== id));
    addToast({ message: 'Imagen eliminada', type: 'info' });
  };

  const handleUrlChange = (id: string, url: string) => {
    persistImages(images.map(i => i.id === id ? { ...i, url } : i));
  };

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🖼️ Slider Hero (Banner Principal)</h4>
      <p className="text-gray-400 text-xs mb-4">Banners del slider principal. Tamaño recomendado: 1200×400px. El texto "alt" se usa como subtitulo del slide.</p>
      <div className="space-y-3">
        {images.map((img, idx) => (
          <div key={img.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-start gap-3">
              <img src={img.url} alt={img.alt} className="w-24 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/160/100'; }} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <input type="text" value={img.url} onChange={e => handleUrlChange(img.id, e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange" placeholder="URL de imagen del banner" />
                <input type="text" value={img.alt} onChange={e => {
                  const updated = images.map(i => i.id === img.id ? { ...i, alt: e.target.value } : i);
                  setImages(updated);
                  setHeroSliderImages(updated);
                }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange" placeholder="Texto / subtitulo del slide" />
              </div>
              <button onClick={() => handleRemove(img.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 mt-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 ml-[108px]">Slide {idx + 1} de {images.length}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)}
          placeholder="URL nueva imagen banner..." className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-orange" />
        <input type="text" value={newAlt} onChange={e => setNewAlt(e.target.value)}
          placeholder="Texto del slide..." className="w-40 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-orange" />
        <Button variant="orange" onClick={handleAdd} className="flex-shrink-0 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Añadir
        </Button>
      </div>
    </div>
  );
};

// ── 13. DISEÑO WEB ────────────────────────────────────────────────────────
// ── HERO BANNER EDITOR (image / YouTube / video) ──────────────────────────
// ── 13. DISEÑO WEB — UNIFIED BANNER MANAGER ──────────────────────────
const HeroBannerEditor: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { heroMedia, setHeroMedia, heroSliderImages, setHeroSliderImages } = useSiteConfigStore();
  const [draftUrl, setDraftUrl] = useState(heroMedia.url);
  const [addMode, setAddMode] = useState<'url' | 'youtube' | 'upload'>('url');
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideAlt, setNewSlideAlt] = useState('');
  const [slides, setSlides] = useState<HeroSliderImage[]>(heroSliderImages);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const imgFileRef = React.useRef<HTMLInputElement>(null);

  // Sincroniza estado local con store cuando llega data fresca de Supabase
  useEffect(() => { setSlides(heroSliderImages); }, [heroSliderImages]);
  useEffect(() => { setDraftUrl(heroMedia.url); }, [heroMedia.url]);

  // Carga directa desde Supabase al montar (independiente del store)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('site_config').select('key, value').in('key', ['hero_slider_images', 'hero_media']);
        if (!data) return;
        for (const row of data) {
          if (row.key === 'hero_slider_images' && Array.isArray(row.value) && row.value.length > 0) {
            console.log('[Admin] Sync slider from Supabase:', row.value.length, 'slides');
            setSlides(row.value);
            setHeroSliderImages(row.value);
          }
          if (row.key === 'hero_media' && row.value?.url) {
            console.log('[Admin] Sync hero media from Supabase');
            setHeroMedia(row.value);
            setDraftUrl(row.value.url);
          }
        }
      } catch (err) { console.error('[Admin] Sync error:', err); }
    })();
  }, []);

  const saveSlides = async (updated: HeroSliderImage[]) => {
    setSlides(updated);
    setHeroSliderImages(updated);
    const { error } = await saveSiteConfigKey('hero_slider_images', updated);
    if (error) addToast({ message: `Error al guardar: ${error}`, type: 'error' });
  };

  const addSlide = () => {
    if (!newSlideUrl.trim()) return;
    const updated = [...slides, { id: Date.now().toString(), url: newSlideUrl.trim(), alt: newSlideAlt.trim() || 'Banner slide' }];
    saveSlides(updated);
    setNewSlideUrl('');
    setNewSlideAlt('');
    addToast({ message: 'Slide agregado al banner', type: 'success' });
  };

  const removeSlide = (id: string) => {
    saveSlides(slides.filter(s => s.id !== id));
    addToast({ message: 'Slide eliminado', type: 'info' });
  };

  const updateSlide = (id: string, field: 'url' | 'alt', value: string) => {
    saveSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const arr = [...slides];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    saveSlides(arr);
  };

  const handleImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addToast({ message: '📤 Subiendo imagen...', type: 'info' });
    const r = await uploadImage(file, 'slider');
    if (r.url) {
      setNewSlideUrl(r.url);
      addToast({ message: r.fallback ? '⚠ Local (sin servidor)' : `✅ Subida: ${file.name}`, type: r.fallback ? 'warning' : 'success' });
    } else {
      addToast({ message: `❌ ${r.error}`, type: 'error' });
    }
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('[video] file:', { name: file.name, size: (file.size/1024/1024).toFixed(1) + 'MB', type: file.type });

    if (file.size > 100 * 1024 * 1024) {
      addToast({ message: `❌ Video demasiado grande (${(file.size/1024/1024).toFixed(0)}MB). Max 100MB. Comprime o usa YouTube.`, type: 'error' });
      return;
    }

    addToast({ message: `📤 Subiendo video ${(file.size/1024/1024).toFixed(1)}MB...`, type: 'info' });
    const r = await uploadVideo(file, 'hero');
    console.log('[video] upload result:', r);

    if (r.url) {
      setDraftUrl(r.url);
      setHeroMedia({ type: 'video', url: r.url });
      const { error } = await saveSiteConfigKey('hero_media', { type: 'video', url: r.url });
      if (error) {
        addToast({ message: `⚠ Video subido pero BD falló: ${error}`, type: 'warning' });
      } else {
        addToast({ message: `✅ Video guardado: ${file.name}`, type: 'success' });
      }
      return;
    }
    addToast({ message: `❌ ${r.error || 'Error desconocido'}`, type: 'error' });
  };

  const applyOverlay = async () => {
    if (!draftUrl.trim()) { addToast({ message: 'Introduce una URL', type: 'error' }); return; }
    if (heroMedia.type === 'youtube' && !getYouTubeId(draftUrl)) { addToast({ message: 'URL de YouTube invalida', type: 'error' }); return; }
    const updated = { ...heroMedia, url: draftUrl.trim() };
    setHeroMedia({ url: draftUrl.trim() });
    await saveSiteConfigKey('hero_media', updated);
    addToast({ message: 'Video overlay actualizado', type: 'success' });
  };

  const yt = heroMedia.type === 'youtube' ? getYouTubeId(heroMedia.url) : null;

  return (
    <div className="space-y-6">
      {/* ── SLIDER BANNER (Imagenes) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">🖼️ Slider Banner Principal</h3>
            <p className="text-xs text-gray-400 mt-0.5">Imagenes del slider hero. Recomendado: 1400x500px. Se muestran en la portada.</p>
          </div>
          <span className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded-full font-bold">{slides.length} slides</span>
        </div>

        {/* Current slides */}
        <div className="space-y-2 mb-4">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200 hover:border-pink-300 transition-colors">
              <div className="flex items-start gap-3">
                <img src={slide.url} alt={slide.alt}
                  className="w-28 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0 bg-gray-200"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/280/160'; }} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input type="text" value={slide.url} onChange={e => updateSlide(slide.id, 'url', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange font-mono" placeholder="URL de la imagen" />
                  <input type="text" value={slide.alt} onChange={e => updateSlide(slide.id, 'alt', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange" placeholder="Texto descriptivo del slide" />
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs p-1">▲</button>
                  <button onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs p-1">▼</button>
                  <button onClick={() => removeSlide(slide.id)}
                    className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Slide {idx + 1} de {slides.length}</p>
            </div>
          ))}
        </div>

        {/* Add new slide */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-600 mb-3">Agregar nuevo slide:</p>
          <div className="flex gap-2 mb-3">
            {[
              { id: 'url' as const, label: '🔗 URL', desc: 'Pegar URL de imagen' },
              { id: 'youtube' as const, label: '▶️ YouTube', desc: 'Thumbnail de YouTube' },
              { id: 'upload' as const, label: '📁 Subir', desc: 'Desde tu equipo' },
            ].map(m => (
              <button key={m.id} onClick={() => setAddMode(m.id)}
                className={`flex-1 p-2 rounded-lg border text-center transition-all ${
                  addMode === m.id ? 'border-brand-orange bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                }`}>
                <p className="text-xs font-bold">{m.label}</p>
                <p className="text-[9px] text-gray-400">{m.desc}</p>
              </button>
            ))}
          </div>

          {addMode === 'upload' ? (
            <div className="space-y-2">
              <button onClick={() => imgFileRef.current?.click()}
                className="w-full border border-gray-200 hover:border-brand-orange rounded-lg p-3 text-center transition-all text-xs text-gray-600 hover:text-pink-600">
                📁 Click para seleccionar imagen (jpg, png, webp)
              </button>
              <input ref={imgFileRef} type="file" accept="image/*" className="hidden" onChange={handleImgFile} />
              {newSlideUrl && <img src={newSlideUrl} alt="" className="w-full h-20 object-cover rounded-lg" />}
            </div>
          ) : addMode === 'youtube' ? (
            <input value={newSlideUrl} onChange={e => {
              setNewSlideUrl(e.target.value);
              const ytId = getYouTubeId(e.target.value);
              if (ytId) setNewSlideUrl(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`);
            }} placeholder="https://www.youtube.com/watch?v=... (se extrae el thumbnail)"
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-orange" />
          ) : (
            <input value={newSlideUrl} onChange={e => setNewSlideUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen-banner.jpg"
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-orange" />
          )}

          <input value={newSlideAlt} onChange={e => setNewSlideAlt(e.target.value)}
            placeholder="Texto descriptivo (opcional)"
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:border-brand-orange" />

          <Button variant="orange" onClick={addSlide} className="w-full mt-3 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Agregar Slide al Banner
          </Button>
        </div>
      </div>

      {/* ── VIDEO OVERLAY (Desktop hover) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">🎬 Video Overlay (Desktop)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Video que aparece al pasar el mouse sobre el banner en desktop</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            { id: 'image' as HeroMediaType, label: 'Imagen', icon: '🖼️' },
            { id: 'youtube' as HeroMediaType, label: 'YouTube', icon: '▶️' },
            { id: 'video' as HeroMediaType, label: 'Video local', icon: '🎬' },
          ]).map(t => (
            <button key={t.id} onClick={() => { setHeroMedia({ type: t.id }); setDraftUrl(''); }}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                heroMedia.type === t.id ? 'border-brand-orange bg-pink-50' : 'border-gray-200 hover:border-pink-300'
              }`}>
              <span className="text-lg">{t.icon}</span>
              <p className="text-xs font-bold mt-0.5">{t.label}</p>
            </button>
          ))}
        </div>

        {heroMedia.type === 'video' ? (
          <div className="space-y-2">
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 hover:border-brand-orange rounded-xl p-4 text-center transition-all">
              <p className="text-sm font-semibold text-gray-700">📁 Subir video (.mp4, .webm)</p>
              <p className="text-xs text-gray-400 mt-1">Max. 20 MB</p>
            </button>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={draftUrl} onChange={e => setDraftUrl(e.target.value)}
              placeholder={heroMedia.type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://ejemplo.com/imagen.jpg'}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" />
            <Button variant="orange" onClick={applyOverlay}>Aplicar</Button>
          </div>
        )}

        {heroMedia.type !== 'image' && (
          <div className="flex flex-wrap gap-4 mt-3 p-3 bg-gray-50 rounded-xl">
            {(['autoplay', 'muted', 'loop'] as const).map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={heroMedia[opt]}
                  onChange={e => setHeroMedia({ [opt]: e.target.checked } as any)}
                  className="w-4 h-4 accent-brand-orange" />
                <span className="text-xs text-gray-700">{opt === 'muted' ? 'Silenciado' : opt === 'loop' ? 'Bucle' : 'Autoplay'}</span>
              </label>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-black mt-3" style={{ aspectRatio: '21 / 9' }}>
          {heroMedia.type === 'youtube' && yt ? (
            <iframe src={`https://www.youtube.com/embed/${yt}?controls=1&modestbranding=1&rel=0`}
              title="Preview" className="w-full h-full" allow="encrypted-media" />
          ) : heroMedia.type === 'video' && heroMedia.url ? (
            <video src={heroMedia.url} controls muted className="w-full h-full object-cover" />
          ) : heroMedia.type === 'image' && heroMedia.url ? (
            <img src={heroMedia.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">Sin contenido</div>
          )}
        </div>
      </div>
    </div>
  );
};

const DisenoSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [colors, setColors] = useState({ primary: '#EC4899', secondary: '#111111', accent: '#DB2777' });
  const { siteLogo, setSiteLogo } = useSiteConfigStore();
  const logoFileRef = React.useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState('');

  // Load logo from Supabase on mount (cross-device)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('site_config').select('value').eq('key', 'site_logo').maybeSingle();
        if (data?.value?.url) { setSiteLogo(data.value.url); console.log('[Admin] Logo cargado de BD'); }
      } catch (e) { console.error('[Admin] Error cargando logo:', e); }
    })();
  }, []);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addToast({ message: '📤 Subiendo logo...', type: 'info' });
    const r = await uploadImage(file, 'logo');
    if (r.url) {
      setSiteLogo(r.url);
      await saveSiteConfigKey('site_logo', { url: r.url });
      addToast({ message: r.fallback ? '⚠ Logo local (sin servidor)' : `✅ Logo guardado en BD: ${file.name}`, type: r.fallback ? 'warning' : 'success' });
    } else {
      addToast({ message: `❌ ${r.error}`, type: 'error' });
    }
  };

  const handleLogoUrl = async () => {
    if (!logoUrl.trim()) { addToast({ message: 'Introduce una URL válida', type: 'error' }); return; }
    const url = logoUrl.trim();
    setSiteLogo(url);
    const { error } = await saveSiteConfigKey('site_logo', { url });
    setLogoUrl('');
    addToast({ message: error ? `⚠ Local OK, BD falló: ${error}` : '✅ Logo guardado en BD por URL', type: error ? 'warning' : 'success' });
  };

  return (
    <div>
      <PageHeader title="Diseño Web" subtitle="Personaliza la apariencia de la plataforma" action={
        <Button variant="orange" onClick={() => addToast({ message: 'Cambios guardados y aplicados', type: 'success' })}>Guardar cambios</Button>
      } />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-white p-6">
          <h3 className="font-bold text-gray-900 mb-4">Colores de la marca</h3>
          <div className="space-y-4">
            {[
              { label: 'Color primario (rosa)', key: 'primary' as const },
              { label: 'Color secundario (fondo)', key: 'secondary' as const },
              { label: 'Color acento', key: 'accent' as const },
            ].map(c => (
              <div key={c.key} className="flex items-center gap-4">
                <input type="color" value={colors[c.key]} onChange={e => setColors(prev => ({ ...prev, [c.key]: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{c.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{colors[c.key]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-white p-6">
          <h3 className="font-bold text-gray-900 mb-4">Logo y branding</h3>
          {/* Preview */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-4 bg-gray-50">
            {siteLogo ? (
              <div className="space-y-2">
                <img src={siteLogo} alt="Logo actual" className="max-h-20 max-w-full mx-auto object-contain rounded-lg" />
                <p className="text-xs text-green-600 font-semibold">✅ Logo guardado</p>
                <button onClick={() => { setSiteLogo(''); addToast({ message: 'Logo eliminado', type: 'info' }); }}
                  className="text-xs text-red-400 hover:text-red-600 underline">Eliminar logo</button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">💃</div>
                <p className="font-display font-black text-xl">
                  <span style={{ color: colors.secondary }}>Baila</span>
                  <span style={{ color: colors.primary }}>Now</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">Sin logo personalizado</p>
              </>
            )}
          </div>
          {/* Upload from file */}
          <button onClick={() => logoFileRef.current?.click()}
            className="w-full border-2 border-dashed border-pink-300 hover:border-pink-500 rounded-xl py-3 text-sm font-semibold text-pink-500 hover:text-pink-700 hover:bg-pink-50 transition-all mb-2">
            📁 Subir logo desde archivo (PNG, SVG, JPG)
          </button>
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          {/* Or by URL */}
          <div className="flex gap-2 mt-2">
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-orange" />
            <Button variant="orange" onClick={handleLogoUrl} className="text-xs px-3">Guardar URL</Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">💡 Los archivos locales se convierten a base64 y se guardan permanentemente</p>
        </div>
        <div className="card-white p-6">
          <h3 className="font-bold text-gray-900 mb-4">Textos y SEO</h3>
          <div className="space-y-4">
            <Input label="Nombre del sitio" defaultValue="BailaNow" />
            <Input label="Claim / Tagline" defaultValue="Encuentra tu Pasion Latina" />
            <Input label="Meta descripcion" defaultValue="La plataforma #1 de entretenimiento latino..." />
          </div>
        </div>
        <div className="card-white p-6 lg:col-span-2">
          <HeroBannerEditor addToast={addToast} />
        </div>
      </div>
    </div>
  );
};

// ── 14. CONFIGURACIÓN ─────────────────────────────────────────────────────
const CONFIG_FIELDS: { key: string; label: string; placeholder: string; group: string }[] = [
  { key: 'platform_name', label: 'Nombre de la plataforma', placeholder: 'BailaNow', group: 'General' },
  { key: 'contact_email', label: 'Email de contacto', placeholder: 'soporte@bailanow.com', group: 'General' },
  { key: 'support_phone', label: 'Teléfono de soporte', placeholder: '+34 ...', group: 'General' },
  { key: 'commission_pct', label: 'Comisión plataforma (%)', placeholder: '15', group: 'Pagos' },
  { key: 'main_currency', label: 'Moneda principal', placeholder: 'EUR', group: 'Pagos' },
  { key: 'escrow_hours', label: 'Período escrow (horas)', placeholder: '48', group: 'Pagos' },
];

const ConfiguracionSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const keys = CONFIG_FIELDS.map(f => `cfg_${f.key}`);
      const { data } = await supabase.from('site_config').select('key, value').in('key', keys);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        const k = String(r.key).replace(/^cfg_/, '');
        map[k] = typeof r.value === 'string' ? r.value : (r.value?.v ?? '');
      });
      setVals(map); setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const rows = CONFIG_FIELDS
      .filter(f => vals[f.key] !== undefined)
      .map(f => ({ key: `cfg_${f.key}`, value: { v: vals[f.key] ?? '' } }));
    const { error } = await supabase.from('site_config').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    addToast(error
      ? { message: `Error: ${error.message}`, type: 'error' }
      : { message: '✅ Configuración guardada en la BD', type: 'success' });
  };

  const groups = Array.from(new Set(CONFIG_FIELDS.map(f => f.group)));
  return (
    <div>
      <PageHeader title="Configuración" subtitle="Ajustes generales (se guardan en la base de datos)" action={
        <Button variant="orange" onClick={save} icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      } />
      {loading ? <div className="py-10 text-center text-gray-400">Cargando…</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map(g => (
            <div key={g} className="card-white p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                {g === 'General' ? <Settings className="w-5 h-5 text-brand-orange" /> : <DollarSign className="w-5 h-5 text-green-500" />} {g}
              </h3>
              <div className="space-y-3">
                {CONFIG_FIELDS.filter(f => f.group === g).map(f => (
                  <div key={f.key}>
                    <label className="text-gray-500 text-xs font-semibold block mb-1">{f.label}</label>
                    <input value={vals[f.key] ?? ''} placeholder={f.placeholder}
                      onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                      className="input-field" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 15. ROLES Y PERMISOS ──────────────────────────────────────────────────
interface SupaProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  whatsapp: string;
  avatar_url: string;
  verified: boolean;
  location: string;
  created_at: string;
}

const ROLE_CONFIG = [
  { role: 'superadmin', label: 'Superadministrador', color: 'bg-red-100 text-red-700', perms: ['Todo', 'Configuración', 'Finanzas', 'Roles', 'Invitar Admins'] },
  { role: 'admin',    label: 'Administrador', color: 'bg-orange-100 text-orange-700', perms: ['Panel Admin', 'Usuarios', 'Eventos', 'Artistas'] },
  { role: 'moderator', label: 'Moderador',        color: 'bg-blue-100 text-blue-700', perms: ['Reseñas', 'Disputas', 'Contenido'] },
  { role: 'artist',   label: 'Artista',            color: 'bg-purple-100 text-purple-700', perms: ['Mi perfil', 'Servicios', 'Bookings'] },
  { role: 'dj',       label: 'DJ',                 color: 'bg-pink-100 text-pink-700', perms: ['Mi perfil', 'Sets', 'Bookings'] },
  { role: 'dancer',   label: 'Bailarín/a',         color: 'bg-indigo-100 text-indigo-700', perms: ['Mi perfil', 'Shows', 'Clases'] },
  { role: 'business', label: 'Venue / Local',      color: 'bg-green-100 text-green-700', perms: ['Mi local', 'Eventos', 'Estadísticas'] },
  { role: 'promoter', label: 'Promotor',           color: 'bg-yellow-100 text-yellow-700', perms: ['Eventos', 'Marketing', 'Ventas'] },
  { role: 'user',     label: 'Usuario',            color: 'bg-gray-100 text-gray-600', perms: ['Explorar', 'Reservar', 'Reseñar'] },
];

const RolesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<SupaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<SupaProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', whatsapp: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch profiles from Supabase
  React.useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, whatsapp, avatar_url, verified, location, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        setProfiles(data || []);
      } catch (e: any) {
        console.warn('Error loading profiles:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const profilesByRole = React.useMemo(() => {
    const map: Record<string, SupaProfile[]> = {};
    ROLE_CONFIG.forEach(r => { map[r.role] = []; });
    profiles.forEach(p => {
      const key = map[p.role] ? p.role : 'user';
      map[key].push(p);
    });
    return map;
  }, [profiles]);

  const filteredUsers = React.useMemo(() => {
    if (!expandedRole) return [];
    const users = profilesByRole[expandedRole] || [];
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.whatsapp || '').includes(q)
    );
  }, [expandedRole, profilesByRole, search]);

  const startEdit = (user: SupaProfile) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name || '', email: user.email || '', whatsapp: user.whatsapp || '', role: user.role });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('profiles').update({
        full_name: editForm.full_name,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        role: editForm.role,
      }).eq('id', editingUser.id);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, ...editForm } : p));
      setEditingUser(null);
      addToast({ message: `Usuario ${editForm.full_name} actualizado`, type: 'success' });
    } catch (e: any) {
      addToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: SupaProfile) => {
    if (!confirm(`¿Eliminar a ${user.full_name || user.email}?`)) return;
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      setProfiles(prev => prev.filter(p => p.id !== user.id));
      addToast({ message: 'Usuario eliminado', type: 'success' });
    } catch (e: any) {
      addToast({ message: `Error: ${e.message}`, type: 'error' });
    }
  };

  return (
    <div>
      <PageHeader title="Roles y Permisos" subtitle="Gestiona los roles de acceso a la plataforma" action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nuevo rol creado', type: 'success' })}>Nuevo rol</Button>
      } />

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full mx-auto" /><p className="text-gray-400 mt-3">Cargando usuarios de Supabase...</p></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            <div className="card-white p-4 text-center">
              <p className="text-3xl font-black text-gray-900">{profiles.length}</p>
              <p className="text-gray-400 text-xs mt-1">Total usuarios</p>
            </div>
            <div className="card-white p-4 text-center">
              <p className="text-3xl font-black text-green-600">{profiles.filter(p => p.verified).length}</p>
              <p className="text-gray-400 text-xs mt-1">Verificados</p>
            </div>
            <div className="card-white p-4 text-center">
              <p className="text-3xl font-black text-blue-600">{profiles.filter(p => p.whatsapp).length}</p>
              <p className="text-gray-400 text-xs mt-1">Con WhatsApp</p>
            </div>
            <div className="card-white p-4 text-center">
              <p className="text-3xl font-black text-purple-600">{profiles.filter(p => p.email).length}</p>
              <p className="text-gray-400 text-xs mt-1">Con email</p>
            </div>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_CONFIG.map(rc => {
              const users = profilesByRole[rc.role] || [];
              const isExpanded = expandedRole === rc.role;
              return (
                <div key={rc.role} className={`card-white p-5 transition-all ${isExpanded ? 'ring-2 ring-brand-orange col-span-full' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${rc.color}`}>{rc.label}</span>
                    <span className="text-gray-400 text-sm font-semibold">{users.length} usuarios</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {rc.perms.map(p => <span key={p} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg">{p}</span>)}
                  </div>
                  <button
                    onClick={() => { setExpandedRole(isExpanded ? null : rc.role); setSearch(''); }}
                    className="text-brand-orange text-xs font-semibold hover:underline"
                  >
                    {isExpanded ? '← Cerrar lista' : `Ver ${users.length} usuarios →`}
                  </button>

                  {/* Expanded user list */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Buscar por nombre, email o WhatsApp..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-orange"
                        />
                      </div>

                      {filteredUsers.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No hay usuarios con este rol</p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {filteredUsers.map(user => (
                            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-pink-50 transition-colors">
                              <img
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=6B7280&color=fff&size=40`}
                                alt={user.full_name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-gray-900 font-semibold text-sm truncate">{user.full_name || 'Sin nombre'}</p>
                                  {user.verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-0.5">
                                  {user.email && (
                                    <a href={`mailto:${user.email}`} className="text-xs text-gray-500 hover:text-brand-orange truncate flex items-center gap-1">
                                      📧 {user.email}
                                    </a>
                                  )}
                                  {user.whatsapp && (
                                    <a href={`https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
                                      📱 {user.whatsapp}
                                    </a>
                                  )}
                                </div>
                                {user.location && <p className="text-[10px] text-gray-400 mt-0.5">📍 {user.location}</p>}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => navigate(`/artistas/${user.id}`)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors" title="Ver perfil público">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => startEdit(user)} className="p-1.5 rounded-lg hover:bg-pink-100 text-gray-400 hover:text-brand-orange transition-colors" title="Editar (admin)">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteUser(user)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {user.whatsapp && (
                                  <a href={`https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors" title="WhatsApp">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Editar Usuario</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange" placeholder="Nombre y apellidos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input type="tel" value={editForm.whatsapp} onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange" placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange bg-white">
                  {ROLE_CONFIG.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button variant="orange" className="flex-1" onClick={saveEdit} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 16. DISPUTAS (tabla real) ──────────────────────────────────────────────
const DisputasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('disputes').select('*').order('created_at', { ascending: false });
    setDisputes(data || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (d: any, status: string, msg: string) => {
    const { error } = await supabase.from('disputes').update({ status }).eq('id', d.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: msg, type: 'success' });
    setDisputes(ds => ds.map(x => x.id === d.id ? { ...x, status } : x));
  };

  const counts = {
    open: disputes.filter(d => d.status === 'open').length,
    reviewing: disputes.filter(d => d.status === 'reviewing').length,
    resolved: disputes.filter(d => d.status === 'resolved' || d.status === 'refunded' || d.status === 'released').length,
  };

  return (
    <div>
      <PageHeader title="Disputas" subtitle="Conflictos reales entre compradores y vendedores" action={
        <button onClick={load} className="btn-orange flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
      } />
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[{ l: 'Abiertas', v: counts.open, c: 'text-red-600' }, { l: 'En revisión', v: counts.reviewing, c: 'text-yellow-600' }, { l: 'Resueltas', v: counts.resolved, c: 'text-green-600' }].map(s => (
          <div key={s.l} className="card-white p-4 text-center"><p className={`text-3xl font-black ${s.c}`}>{s.v}</p><p className="text-gray-400 text-sm">{s.l}</p></div>
        ))}
      </div>
      {loading ? (
        <div className="py-12 text-center text-gray-400">Cargando…</div>
      ) : disputes.length === 0 ? (
        <div className="card-white p-10 text-center text-gray-400">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay disputas. 🎉 Cuando un usuario abra una, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const resolved = ['resolved', 'refunded', 'released'].includes(d.status);
            return (
            <div key={d.id} className="card-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{String(d.id).slice(0, 8)}</span>
                  <Badge variant={d.status === 'open' ? 'red' : d.status === 'reviewing' ? 'orange' : 'green'}>
                    {d.status === 'open' ? 'Abierta' : d.status === 'reviewing' ? 'Revisando' : 'Resuelta'}
                  </Badge>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{d.reason || 'Sin motivo'}</p>
                {d.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{d.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!resolved && (
                  <>
                    <button onClick={() => setStatus(d, 'refunded', 'Disputa marcada como reembolsada')} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200">Reembolsar</button>
                    <button onClick={() => setStatus(d, 'released', 'Pago liberado al vendedor')} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-200">Liberar pago</button>
                    <button onClick={() => setStatus(d, 'resolved', 'Disputa cerrada')} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200">Cerrar</button>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 17. SEGURIDAD ─────────────────────────────────────────────────────────
const SeguridadSection: React.FC = () => (
  <div>
    <PageHeader title="Seguridad" subtitle="Monitoreo de seguridad y accesos de la plataforma" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Intentos login fallidos (24h)', val: '23', icon: <Lock className="w-5 h-5 text-red-500" />, color: 'bg-red-50' },
        { label: 'IPs bloqueadas', val: '4', icon: <Shield className="w-5 h-5 text-pink-500" />, color: 'bg-pink-50' },
        { label: 'Sesiones activas', val: '847', icon: <Wifi className="w-5 h-5 text-green-500" />, color: 'bg-green-50' },
        { label: 'Uptime del servidor', val: '99.9%', icon: <Server className="w-5 h-5 text-blue-500" />, color: 'bg-blue-50' },
      ].map(s => (
        <div key={s.label} className="card-white p-4 flex items-center gap-3">
          <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
          <div><p className="font-black text-xl text-gray-900">{s.val}</p><p className="text-gray-400 text-xs">{s.label}</p></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Alertas recientes</h3>
        <div className="space-y-3">
          {[
            { msg: 'Intento de acceso masivo desde IP 192.168.1.x', time: 'Hace 2h', level: 'high' },
            { msg: 'Usuario spam_user baneado automáticamente', time: 'Hace 5h', level: 'medium' },
            { msg: 'Certificado SSL renovado correctamente', time: 'Hace 1 día', level: 'info' },
            { msg: 'Backup automático completado', time: 'Hace 6h', level: 'info' },
          ].map((a, i) => (
            <div key={i} className={`flex gap-3 p-3 rounded-xl ${a.level === 'high' ? 'bg-red-50' : a.level === 'medium' ? 'bg-yellow-50' : 'bg-gray-50'}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.level === 'high' ? 'bg-red-500' : a.level === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
              <div><p className="text-gray-800 text-sm">{a.msg}</p><p className="text-gray-400 text-xs">{a.time}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-blue-500" /> Sistema y backups</h3>
        <div className="space-y-3">
          {[
            { label: 'Último backup', val: 'Hace 6 horas', ok: true },
            { label: 'Base de datos', val: 'PostgreSQL — Saludable', ok: true },
            { label: 'CDN', val: 'Cloudflare — Activo', ok: true },
            { label: 'SSL/HTTPS', val: 'Válido hasta Nov 2026', ok: true },
            { label: 'Variables de entorno', val: 'Configuradas y seguras', ok: true },
            { label: 'Agora.io API', val: 'Pendiente configurar', ok: false },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500 text-sm">{r.label}</span>
              <span className={`text-sm font-semibold flex items-center gap-1 ${r.ok ? 'text-green-600' : 'text-yellow-600'}`}>
                {r.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {r.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── 18. RESEÑAS ───────────────────────────────────────────────────────────
const ResenasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(100);
    setReviews(data || []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (r: any) => {
    if (!confirm('¿Eliminar esta reseña?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', r.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: '✅ Reseña eliminada', type: 'success' });
    setReviews(rs => rs.filter(x => x.id !== r.id));
  };

  const avg = reviews.length ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—';

  return (
    <div>
      <PageHeader title="Reseñas" subtitle="Reseñas reales de la plataforma" action={
        <button onClick={load} className="btn-orange flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
      } />
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
        <div className="card-white p-4 text-center"><p className="text-3xl font-black text-gray-900">{reviews.length}</p><p className="text-gray-400 text-sm">Total reseñas</p></div>
        <div className="card-white p-4 text-center"><p className="text-3xl font-black text-brand-orange">★ {avg}</p><p className="text-gray-400 text-sm">Media</p></div>
      </div>
      {loading ? (
        <div className="py-12 text-center text-gray-400">Cargando…</div>
      ) : reviews.length === 0 ? (
        <div className="card-white p-10 text-center text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Aún no hay reseñas. Aparecerán aquí cuando los usuarios valoren.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="card-white p-4 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center font-bold text-brand-orange flex-shrink-0">★</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-xs ${s <= (r.rating || 0) ? 'text-brand-orange' : 'text-gray-200'}`}>★</span>)}</div>
                  {r.target_type && <span className="text-gray-400 text-xs">{r.target_type}</span>}
                  <span className="text-gray-400 text-xs ml-auto">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                </div>
                <p className="text-gray-600 text-sm">{r.comment || '(sin comentario)'}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => del(r)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── PATROCINADORES SECTION ────────────────────────────────────────────────
const BADGE_OPTIONS = ['🏆 Patrocinador','⭐ Destacado','🎵 Club Oficial','💃 Leyenda','🗼 Internacional','🌴 Caribe','🗽 USA','🎺 Cuba','🔥 Premium','🌟 VIP'];
const COLOR_PRESETS = ['#E11D48','#D97706','#7C3AED','#059669','#EC4899','#0891B2','#1E40AF','#B91C1C','#F97316','#8B5CF6'];

const PatrocinadoresSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { sponsors, addSponsor, updateSponsor, removeSponsor, toggleActive } = useSponsorsStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<'venue' | 'artist' | 'event' | 'dancer' | 'vendor' | 'promo' | 'category' | 'custom'>('venue');
  const [form, setForm] = useState<Partial<Sponsor>>({
    name: '', tagline: '', logo: '', color: '#E11D48', link: '', badge: '🏆 Patrocinador',
    type: 'venue', active: true, isPremium: false, city: '', website: '', phone: '', email: '', description: '',
  });

  const setF = (k: keyof Sponsor, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Sync sponsors to Supabase site_config (cross-device)
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('site_config').select('value').eq('key', 'sponsors').maybeSingle();
        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          // Replace local store with BD data
          useSponsorsStore.setState({ sponsors: data.value });
          console.log('[admin] sponsors loaded from BD:', data.value.length);
        }
      } catch (e) { console.error('[admin] sponsors load error:', e); }
    })();
  }, []);

  const persistSponsors = async (next: Sponsor[]) => {
    await saveSiteConfigKey('sponsors', next);
  };

  const openNew = () => { setEditId(null); setForm({ name:'', tagline:'', logo:'', color:'#E11D48', link:'', badge:'🏆 Patrocinador', type:'venue', active:true, isPremium:false, city:'', website:'', phone:'', email:'', description:'' }); setShowForm(true); };
  const openEdit = (sp: Sponsor) => { setEditId(sp.id); setForm(sp); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name?.trim()) { addToast({ message: 'El nombre es obligatorio', type: 'error' }); return; }
    if (!form.link?.trim()) { addToast({ message: 'El enlace es obligatorio', type: 'error' }); return; }
    let nextSponsors: Sponsor[];
    if (editId) {
      updateSponsor(editId, form as Partial<Sponsor>);
      nextSponsors = sponsors.map(sp => sp.id === editId ? { ...sp, ...(form as Partial<Sponsor>) } as Sponsor : sp);
      addToast({ message: '✅ Patrocinador actualizado en BD', type: 'success' });
    } else {
      const newSp = addSponsor(form as Omit<Sponsor, 'id' | 'createdAt'>);
      nextSponsors = [...sponsors, newSp];
      addToast({ message: '✅ Patrocinador añadido en BD', type: 'success' });
    }
    await persistSponsors(nextSponsors);
    setShowForm(false);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2, sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        setF('logo', canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const logoRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">🏆 Patrocinadores</h2>
          <p className="text-gray-500 text-sm">{sponsors.filter(s => s.active).length} activos · {sponsors.length} total</p>
        </div>
        <button onClick={openNew} className="btn-orange flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Patrocinador
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-brand-orange to-pink-500 p-5 rounded-t-3xl flex items-center justify-between">
              <h3 className="text-white font-black text-lg">{editId ? '✏️ Editar Patrocinador' : '➕ Nuevo Patrocinador'}</h3>
              <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">

              {/* Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white flex-shrink-0"
                  style={{ boxShadow: `0 4px 16px ${form.color}50` }}>
                  {form.logo
                    ? <img src={form.logo} alt="logo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: form.color }}>
                        <span className="text-white font-black text-lg">{(form.name || 'S')[0]}</span>
                      </div>
                  }
                </div>
                <div>
                  <p className="font-black text-gray-900">{form.name || 'Nombre del patrocinador'}</p>
                  <p className="text-gray-500 text-sm">{form.tagline || 'Descripción corta'}</p>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{form.badge}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Nombre *</label>
                  <input value={form.name || ''} onChange={e => setF('name', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="Ej: Madrid Bachata Festival" />
                </div>
                {/* Tagline */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Tagline / Descripción corta *</label>
                  <input value={form.tagline || ''} onChange={e => setF('tagline', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="El congreso #1 de bachata en Madrid" />
                </div>
                {/* Logo */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Logo</label>
                  <div className="flex gap-2">
                    <input value={form.logo?.startsWith('data:') ? '' : (form.logo || '')} onChange={e => setF('logo', e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="https://... o sube una imagen" />
                    <button onClick={() => logoRef.current?.click()} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 rounded-xl px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap">
                      <Eye className="w-3.5 h-3.5" /> Subir
                    </button>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  </div>
                </div>
                {/* Color */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Color de marca</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map(c => (
                      <button key={c} onClick={() => setF('color', c)} className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                        style={{ background: c, borderColor: form.color === c ? '#000' : 'transparent' }} />
                    ))}
                    <input type="color" value={form.color || '#E11D48'} onChange={e => setF('color', e.target.value)} className="w-8 h-8 rounded-full border cursor-pointer" />
                  </div>
                </div>
                {/* Badge */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Badge / Etiqueta</label>
                  <select value={form.badge || ''} onChange={e => setF('badge', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                    {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {/* Tipo */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Tipo de patrocinador</label>
                  <select value={form.type || 'venue'} onChange={e => setF('type', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                    <option value="venue">🏠 Local / Venue</option>
                    <option value="artist">🎧 Artista / DJ</option>
                    <option value="event">🎉 Evento</option>
                    <option value="brand">🏢 Marca / Empresa</option>
                  </select>
                </div>
                {/* Ciudad */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Ciudad</label>
                  <input value={form.city || ''} onChange={e => setF('city', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="Madrid, Cali, Miami..." />
                </div>
                {/* Enlace — múltiples categorías */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 mb-2 block">Enlace al hacer clic</label>
                  <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {([
                      { id: 'venue',    label: '🏠 Local',       defaultLink: '/venues' },
                      { id: 'artist',   label: '🎤 Artista',     defaultLink: '/artistas' },
                      { id: 'event',    label: '🎉 Evento',      defaultLink: '/eventos' },
                      { id: 'dancer',   label: '💃 Bailarín',    defaultLink: '/artistas?tipo=dancer' },
                      { id: 'vendor',   label: '🏪 Vendedor',    defaultLink: '/promocionate' },
                      { id: 'promo',    label: '📢 Promoción',   defaultLink: '/promocionate' },
                      { id: 'category', label: '🗂️ Categoría',   defaultLink: '/cerca' },
                      { id: 'custom',   label: '🔗 URL libre',   defaultLink: '' },
                    ] as const).map(m => (
                      <button key={m.id} onClick={() => { setLinkMode(m.id); setF('link', m.defaultLink); }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all flex-shrink-0 ${linkMode===m.id ? 'bg-brand-orange text-white border-brand-orange' : 'border-gray-200 text-gray-600 hover:border-brand-orange'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {linkMode === 'venue' && (
                    <select onChange={e => setF('link', `/venues/${e.target.value}`)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona un local —</option>
                      {VENUES.map(v => <option key={v.id} value={v.id}>{v.name} · {v.city}</option>)}
                    </select>
                  )}
                  {linkMode === 'artist' && (
                    <select onChange={e => setF('link', `/artistas/${e.target.value}`)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona un artista —</option>
                      {ARTISTS.filter(a => a.type === 'singer' || a.type === 'band').map(a => <option key={a.id} value={a.id}>{a.name} · {a.city}</option>)}
                    </select>
                  )}
                  {linkMode === 'event' && (
                    <select onChange={e => setF('link', `/eventos/${e.target.value}`)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona un evento —</option>
                      {EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.title} · {ev.city || ''}</option>)}
                    </select>
                  )}
                  {linkMode === 'dancer' && (
                    <select onChange={e => setF('link', `/artistas/${e.target.value}`)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona un bailarín/a —</option>
                      {ARTISTS.filter(a => a.type === 'dancer' || a.type === 'instructor').map(a => <option key={a.id} value={a.id}>{a.name} · {a.city}</option>)}
                    </select>
                  )}
                  {linkMode === 'vendor' && (
                    <select onChange={e => setF('link', `/promocionate?vendor=${e.target.value}`)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona un vendedor —</option>
                      {PROMO_SERVICES.filter((v, i, arr) => arr.findIndex(x => x.sellerId === v.sellerId) === i).map(v => (
                        <option key={v.sellerId} value={v.sellerId}>{v.sellerName}</option>
                      ))}
                    </select>
                  )}
                  {linkMode === 'promo' && (
                    <select onChange={e => setF('link', `/promocionate?service=${e.target.value}`)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona una promoción —</option>
                      {PROMO_SERVICES.map(p => <option key={p.id} value={p.id}>{p.title.slice(0, 60)} · €{p.price}</option>)}
                    </select>
                  )}
                  {linkMode === 'category' && (
                    <select onChange={e => setF('link', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange">
                      <option value="">— Selecciona categoría —</option>
                      <optgroup label="📍 Búsqueda por ubicación">
                        <option value="/cerca">Cerca de mí</option>
                        <option value="/mapa">Mapa interactivo</option>
                      </optgroup>
                      <optgroup label="🎵 Estilos de baile">
                        <option value="/cerca?style=Bachata">Bachata</option>
                        <option value="/cerca?style=Bachata Dominicana">Bachata Dominicana</option>
                        <option value="/cerca?style=Bachata Moderna">Bachata Moderna</option>
                        <option value="/cerca?style=Bachata Sensual">Bachata Sensual</option>
                        <option value="/cerca?style=Bachata Urbana">Bachata Urbana</option>
                        <option value="/cerca?style=Salsa">Salsa</option>
                        <option value="/cerca?style=Salsa Cubana">Salsa Cubana</option>
                        <option value="/cerca?style=Salsa Colombiana (Caleña)">Salsa Colombiana (Caleña)</option>
                        <option value="/cerca?style=Cha-cha-chá">Cha-cha-chá</option>
                        <option value="/cerca?style=Cumbia">Cumbia</option>
                        <option value="/cerca?style=Reparto Cubano">Reparto Cubano</option>
                        <option value="/cerca?style=Kizomba">Kizomba</option>
                        <option value="/cerca?style=Reggaeton">Reggaeton</option>
                        <option value="/cerca?style=Merengue">Merengue</option>
                      </optgroup>
                      <optgroup label="🎉 Eventos">
                        <option value="/eventos?cat=festivales">Festivales</option>
                        <option value="/eventos?cat=congresos">Congresos</option>
                        <option value="/eventos?cat=club">Noches de club</option>
                        <option value="/eventos?cat=social">Eventos sociales</option>
                      </optgroup>
                      <optgroup label="🎓 Aprender">
                        <option value="/clases">Clases en directo</option>
                        <option value="/marketplace?cat=talleres">Talleres</option>
                        <option value="/marketplace?cat=clases">Academia</option>
                      </optgroup>
                      <optgroup label="📢 Promoción">
                        <option value="/promocionate?cat=redes-sociales">Redes sociales</option>
                        <option value="/promocionate?cat=spotify-playlists">Spotify & Playlists</option>
                        <option value="/promocionate?cat=video-promo">Video promo</option>
                        <option value="/promocionate?cat=influencers">Influencers</option>
                      </optgroup>
                      <optgroup label="🏛️ Sitios">
                        <option value="/venues">Todos los locales</option>
                        <option value="/venues?open=true">Abiertos ahora</option>
                        <option value="/artistas">Todos los artistas</option>
                        <option value="/artistas?tipo=dj">Solo DJs</option>
                        <option value="/artistas?tipo=dancer">Solo bailarines</option>
                      </optgroup>
                    </select>
                  )}
                  {linkMode === 'custom' && (
                    <input value={form.link || ''} onChange={e => setF('link', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="/venues, /artistas, https://..." />
                  )}
                </div>
                {/* Contacto */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Email de contacto</label>
                  <input value={form.email || ''} onChange={e => setF('email', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="hola@ejemplo.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Teléfono</label>
                  <input value={form.phone || ''} onChange={e => setF('phone', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="+34 600 000 000" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Web del patrocinador</label>
                  <input value={form.website || ''} onChange={e => setF('website', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange" placeholder="https://..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Descripción completa</label>
                  <textarea value={form.description || ''} onChange={e => setF('description', e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange resize-none" placeholder="Descripción del local, artista o marca..." />
                </div>
                {/* Flags */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.active} onChange={e => setF('active', e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                    <span className="text-sm font-semibold text-gray-700">Activo (visible)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.isPremium} onChange={e => setF('isPremium', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700">Premium</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
                <button onClick={handleSave} className="flex-1 btn-orange">
                  {editId ? 'Guardar cambios' : 'Añadir Patrocinador'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {sponsors.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🏆</div>
            <p className="font-bold">Aún no hay patrocinadores</p>
            <p className="text-sm">Pulsa "Nuevo Patrocinador" para añadir el primero</p>
          </div>
        )}
        {sponsors.map(sp => (
          <div key={sp.id} className={`card-white p-4 flex items-center gap-4 ${!sp.active ? 'opacity-50' : ''}`}>
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md flex-shrink-0 border-2 border-white" style={{ boxShadow: `0 4px 14px ${sp.color}40` }}>
              {sp.logo
                ? <img src={sp.logo} alt={sp.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xl font-black text-white" style={{ background: sp.color }}>{sp.name[0]}</div>
              }
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-gray-900 text-sm">{sp.name}</p>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{sp.badge}</span>
                {sp.isPremium && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">PRO</span>}
                {sp.active
                  ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">● Activo</span>
                  : <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">Inactivo</span>
                }
              </div>
              <p className="text-gray-500 text-xs mt-0.5 truncate">{sp.tagline}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                {sp.city && <span>📍 {sp.city}</span>}
                <span>🔗 {sp.link}</span>
                <span className="capitalize">Tipo: {sp.type}</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleActive(sp.id)} title={sp.active ? 'Desactivar' : 'Activar'}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${sp.active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                {sp.active ? <CheckCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => openEdit(sp)} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-all">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={async () => {
                  if (!confirm(`¿Eliminar a "${sp.name}"?`)) return;
                  removeSponsor(sp.id);
                  await persistSponsors(sponsors.filter(s => s.id !== sp.id));
                  addToast({ message: '✅ Patrocinador eliminado de BD', type: 'success' });
                }}
                className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── ADMINISTRADORES ────────────────────────────────────────────────────────

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  created_at: string;
}

interface AdminInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const AdministradoresSection: React.FC<{ addToast: Function; isSuperAdmin: boolean }> = ({ addToast, isSuperAdmin }) => {
  const [admins, setAdmins]             = useState<AdminProfile[]>([]);
  const [invitations, setInvitations]   = useState<AdminInvitation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState<'admin' | 'superadmin'>('admin');
  const [sending, setSending]           = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: adminData, error: adminErr }, { data: invData }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,avatar_url,role,created_at').in('role', ['admin','superadmin']).order('role', { ascending: false }),
      supabase.from('admin_invitations').select('id,email,role,expires_at,used_at,created_at').order('created_at', { ascending: false }).limit(20),
    ]);
    if (adminErr) console.error('[admin] load admins error:', adminErr);
    // Map to interface (name → full_name, avatar → avatar_url)
    const mapped = (adminData ?? []).map((a: any) => ({
      id: a.id, name: a.full_name || a.email?.split('@')[0] || 'Admin',
      email: a.email, avatar: a.avatar_url || '', role: a.role, created_at: a.created_at,
    }));
    setAdmins(mapped);
    setInvitations(invData ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setSending(true);
    try {
      // 1) Si el usuario YA existe → directamente le subimos el rol
      const { data: existing } = await supabase.from('profiles').select('id,full_name').eq('email', email).maybeSingle();
      if (existing) {
        const { error: upErr } = await supabase.from('profiles').update({ role: inviteRole }).eq('id', existing.id);
        if (upErr) throw upErr;
        addToast({ type: 'success', message: `✅ ${existing.full_name || email} ahora es ${inviteRole}` });
      } else {
        // 2) Si NO existe → crear invitación pendiente
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const { error: invErr } = await supabase.from('admin_invitations').insert({
          email, role: inviteRole, expires_at: expiresAt,
        });
        if (invErr) throw invErr;
        addToast({ type: 'success', message: `✅ Invitación creada para ${email} (válida 48h)` });
      }
      setInviteEmail('');
      load();
    } catch (err: any) {
      console.error('[admin] invite error:', err);
      addToast({ type: 'error', message: `❌ ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    await supabase.from('admin_invitations').delete().eq('id', id);
    addToast({ type: 'success', message: 'Invitación revocada' });
    load();
  };

  const handleRemoveAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`¿Quitar permisos de admin a ${adminName}?`)) return;
    await supabase.from('profiles').update({ role: 'user' }).eq('id', adminId);
    addToast({ type: 'success', message: `${adminName} ya no es administrador` });
    load();
  };

  const roleBadge = (role: string) =>
    role === 'superadmin'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-brand-orange" />
        <div>
          <h2 className="font-display font-black text-xl text-gray-900">Administradores</h2>
          <p className="text-gray-400 text-sm">Gestiona el equipo de administración de BailaNow</p>
        </div>
      </div>

      {/* Invite form */}
      {isSuperAdmin && (
        <div className="card-white rounded-2xl p-6 border border-gray-100 shadow-card">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-orange" /> Invitar nuevo administrador
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
              onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'superadmin')}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 bg-white"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <button
              onClick={handleSendInvite}
              disabled={sending || !inviteEmail.trim()}
              className="btn-orange text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {sending ? 'Enviando...' : 'Invitar por correo'}
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Se enviará un email con un enlace seguro válido por 48 horas.
          </p>
        </div>
      )}

      {/* Current admins */}
      <div className="card-white rounded-2xl p-6 border border-gray-100 shadow-card">
        <h3 className="font-bold text-gray-900 mb-4">Equipo actual ({admins.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Cargando administradores...
          </div>
        ) : admins.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No se encontraron administradores en la base de datos.</p>
        ) : (
          <div className="space-y-3">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <img
                  src={admin.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=EC4899&color=fff&size=80`}
                  alt={admin.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{admin.name}</p>
                  <p className="text-gray-400 text-xs truncate">{admin.email}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${roleBadge(admin.role)}`}>
                  {admin.role === 'superadmin' ? '👑 Superadmin' : '🛡️ Admin'}
                </span>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Quitar permisos"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      <div className="card-white rounded-2xl p-6 border border-gray-100 shadow-card">
        <h3 className="font-bold text-gray-900 mb-4">Invitaciones pendientes</h3>
        {invitations.filter(i => !i.used_at && new Date(i.expires_at) > new Date()).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No hay invitaciones pendientes.</p>
        ) : (
          <div className="space-y-2">
            {invitations
              .filter(i => !i.used_at && new Date(i.expires_at) > new Date())
              .map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <Bell className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                    <p className="text-xs text-gray-400">
                      Expira: {new Date(inv.expires_at).toLocaleString('es-ES')} · Rol: <strong>{inv.role}</strong>
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revocar invitación"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Used invitations */}
        {invitations.filter(i => i.used_at).length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Aceptadas</h4>
            <div className="space-y-1.5">
              {invitations.filter(i => i.used_at).map(inv => (
                <div key={inv.id} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-gray-600">{inv.email}</span>
                  <span className="ml-auto text-gray-400">Aceptada {new Date(inv.used_at!).toLocaleDateString('es-ES')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// INTEGRACIONES (GHL): chat widget, newsletter form, brands
// ════════════════════════════════════════════════════════════════
const IntegracionesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [cfg, setCfg] = useState<{ chatWidget?: string; formId?: string; webhook?: string; subs?: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['ghl_chat_widget_id', 'ghl_newsletter_form_id', 'ghl_newsletter_webhook']);
      const next: typeof cfg = {};
      for (const row of (data || [])) {
        const v = (row as any).value;
        const val = typeof v === 'string' ? v : (v?.id || v?.url || '');
        if (row.key === 'ghl_chat_widget_id')        next.chatWidget = val;
        if (row.key === 'ghl_newsletter_form_id')    next.formId = val;
        if (row.key === 'ghl_newsletter_webhook')    next.webhook = val;
      }
      // Count newsletter subscribers
      const { count } = await supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true });
      next.subs = count ?? 0;
      setCfg(next);
    } catch (e) { console.warn('[integraciones] load', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveKey = async (key: string, raw: string, isUrl = false) => {
    setSaving(true);
    try {
      const trimmed = raw.trim();
      if (!trimmed) {
        await supabase.from('site_config').delete().eq('key', key);
        addToast({ message: 'Eliminado', type: 'info' });
      } else {
        const value = isUrl ? { url: trimmed } : { id: trimmed };
        const { error } = await supabase.from('site_config')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
        addToast({ message: '✅ Guardado', type: 'success' });
      }
      load();
    } catch (e: any) {
      addToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Integraciones GHL" subtitle="Conecta GoHighLevel: chat widget, newsletter, automatizaciones" />

      {/* Chat widget */}
      <div className="card-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <div>
            <h3 className="font-bold text-gray-900">Chat de soporte automático</h3>
            <p className="text-xs text-gray-500">El widget de GHL aparecerá flotante en toda la app</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="font-bold text-blue-700 mb-1">¿Dónde encontrar el Widget ID?</p>
          <p>GHL → Sites → <b>Chat Widget</b> → crea o selecciona el widget → "Install Code" → copia el valor de <code className="bg-white px-1 rounded">data-widget-id</code></p>
        </div>
        <ConfigInput
          label="Widget ID"
          initial={cfg.chatWidget || ''}
          placeholder="Ej: 6589abcd1234ef..."
          onSave={(v) => saveKey('ghl_chat_widget_id', v)}
          saving={saving}
        />
      </div>

      {/* Newsletter */}
      <div className="card-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📬</span>
          <div>
            <h3 className="font-bold text-gray-900">Newsletter — Formulario GHL</h3>
            <p className="text-xs text-gray-500">
              {cfg.subs !== undefined && <span className="font-bold text-pink-600">{cfg.subs} suscriptores</span>}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="font-bold text-blue-700 mb-1">Opción A — Form embed de GHL</p>
          <p>GHL → Sites → <b>Forms → Builder</b> → crea form → Integrate → Inline embed → copia el Form ID (el código alfanumérico al final de la URL del iframe)</p>
        </div>
        <ConfigInput
          label="Form ID (opcional)"
          initial={cfg.formId || ''}
          placeholder="Si lo configuras, sustituye el form propio por el de GHL"
          onSave={(v) => saveKey('ghl_newsletter_form_id', v)}
          saving={saving}
        />

        <div className="text-xs text-gray-500 bg-purple-50 border border-purple-200 rounded-lg p-3 mt-4">
          <p className="font-bold text-purple-700 mb-1">Opción B — Webhook Inbound de GHL (recomendado)</p>
          <p>GHL → Automation → Workflows → New → Trigger: <b>Webhook</b> → "Inbound Webhook" → copia la URL.</p>
          <p className="mt-1">Crea un workflow que: añada el contacto, le ponga tag "newsletter", envíe email de bienvenida, etc.</p>
        </div>
        <ConfigInput
          label="Webhook URL"
          initial={cfg.webhook || ''}
          placeholder="https://services.leadconnectorhq.com/hooks/..."
          onSave={(v) => saveKey('ghl_newsletter_webhook', v, true)}
          saving={saving}
        />
      </div>

      {/* Publicación bulk en todas las marcas (Edge Function + GHL API) */}
      <div className="card-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📡</span>
          <div>
            <h3 className="font-bold text-gray-900">Publicar en TODAS las marcas a la vez</h3>
            <p className="text-xs text-gray-500">Requiere un token de GHL guardado como secret en Supabase</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
          <p className="font-bold text-purple-700">Cómo activarlo (5 minutos)</p>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>En GHL Agency → <b>Settings → API Keys → Private Integrations</b></li>
            <li>Click <b>"New"</b> → ponle nombre "BailaNow Bulk" → marca scopes:
              <br/><code className="bg-white px-1 rounded">social-media-posting.readonly</code>
              <br/><code className="bg-white px-1 rounded">social-media-posting.write</code>
            </li>
            <li>Click <b>Create</b> → copia el token (empieza por <code>pit-...</code>)</li>
            <li>En tu terminal local, ejecuta:
              <pre className="bg-gray-900 text-green-400 p-2 rounded mt-1 text-[10px] overflow-x-auto">supabase secrets set GHL_API_TOKEN=pit-XXXXXXXXX --project-ref lpwwdjujxwxdvyoznehp</pre>
            </li>
            <li>Y deploy de la Edge Function:
              <pre className="bg-gray-900 text-green-400 p-2 rounded mt-1 text-[10px] overflow-x-auto">supabase functions deploy ghl-bulk-post --project-ref lpwwdjujxwxdvyoznehp</pre>
            </li>
          </ol>
          <p className="mt-2">Una vez hecho, la publicación masiva quedará disponible vía GHL 📡</p>
        </div>
      </div>

      {/* Info adicional */}
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">📊</span> Lo que GHL hace por ti
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><span><b>Automatizaciones (Workflows)</b>: emails automáticos, SMS, secuencias de bienvenida</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><span><b>Chat de soporte</b>: AI responde 24/7, escala a humano cuando hace falta</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><span><b>Newsletter</b>: campaign builder + segmentación por tags</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><span><b>Social posting</b>: ya activo en /redes con 20+ marcas</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><span><b>CRM completo</b>: gestiona todos los suscriptores y clientes</span></li>
        </ul>
      </div>
    </div>
  );
};

const ConfigInput: React.FC<{
  label: string; initial: string; placeholder?: string;
  onSave: (v: string) => void | Promise<void>; saving: boolean;
}> = ({ label, initial, placeholder, onSave, saving }) => {
  const [value, setValue] = useState(initial);
  React.useEffect(() => setValue(initial), [initial]);
  const dirty = value !== initial;
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text" value={value} onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className="input-field font-mono text-xs flex-1"
        />
        <button onClick={() => onSave(value)} disabled={!dirty || saving}
          className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
          {saving ? '...' : value.trim() ? 'Guardar' : 'Vaciar'}
        </button>
      </div>
    </div>
  );
};

export default AdminPage;
