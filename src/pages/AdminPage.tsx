import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Tag, Radio, Users, MapPin, Crown,
  Music2, Sparkles, Calendar, ShoppingBag, BookOpen,
  DollarSign, Palette, Settings, Shield, AlertTriangle,
  Star, Lock, TrendingUp, Eye, CheckCircle, XCircle,
  Edit, Trash2, Plus, Search, Filter, RefreshCw,
  ChevronRight, ArrowUpRight, ArrowDownRight, Clock,
  Wifi, Globe, Bell, Database, Server, FileText
} from 'lucide-react';
import { useAuthStore, useUIStore, useSiteConfigStore, getYouTubeId, usePerformerStore, useAdminOverridesStore, PLATFORM_COMMISSION_RATE, type HeroMediaType, type CommissionSource, type HeroSliderImage } from '../store/appStore';
import AdminCMS from '../components/AdminCMS';
import AdminMediaManager from '../components/AdminMediaManager';
import AdminEditModal, { type EditField } from '../components/AdminEditModal';
import { Avatar, Badge, Button, Input, SearchBar } from '../components/ui';
import { ARTISTS, EVENTS, VENUES, SERVICES, SUBSCRIPTION_PLANS } from '../data/mockData';

// ── ADMIN SECTIONS ─────────────────────────────────────────────────────────
type AdminSection =
  | 'overview' | 'categorias' | 'media' | 'radio' | 'usuarios' | 'localidades'
  | 'suscripciones' | 'artistas' | 'bailarinas' | 'eventos' | 'mercado'
  | 'cursos' | 'finanzas' | 'diseno' | 'configuracion' | 'roles'
  | 'disputas' | 'seguridad' | 'resenas' | 'creators' | 'retiros' | 'comisiones' | 'cms';

const SECTIONS: { id: AdminSection; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: 'overview',       label: 'Dashboard',               icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'cms',            label: 'CMS · Constructor',       icon: <Palette className="w-4 h-4" />, badge: 'NEW' },
  { id: 'categorias',     label: 'Categorías',              icon: <Tag className="w-4 h-4" /> },
  { id: 'media',          label: 'Media Manager',           icon: <Palette className="w-4 h-4" />, badge: 'NEW' },
  { id: 'radio',          label: 'Radio Online',            icon: <Radio className="w-4 h-4" />, badge: '2 live' },
  { id: 'usuarios',       label: 'Usuarios',                icon: <Users className="w-4 h-4" /> },
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
  { key: 'isVerified', label: 'Verificado', type: 'checkbox' },
  { key: 'isPremium', label: 'Premium', type: 'checkbox' },
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
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'durationMin', label: 'Duración (min)', type: 'number' },
  { key: 'level', label: 'Nivel', type: 'select', options: [
    { value: 'beginner', label: 'Principiante' }, { value: 'intermediate', label: 'Intermedio' }, { value: 'advanced', label: 'Avanzado' }
  ]},
  { key: 'description', label: 'Descripción', type: 'textarea' },
  { key: 'isPublished', label: 'Publicado', type: 'checkbox' },
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

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso restringido</h2>
          <p className="text-gray-400 mb-6">Solo administradores pueden acceder a este panel.</p>
          <p className="text-gray-400 text-sm mb-4">Demo: inicia sesión con <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">admin@bachasalseros.com</span></p>
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
      <main className="flex-1 lg:ml-60 p-4 sm:p-6 mt-0">
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
    <div className={`flex items-center gap-0.5 text-sm font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      {change}
    </div>
  </div>
);

const AdminTable: React.FC<{ headers: string[]; rows: React.ReactNode[][]; }> = ({ headers, rows }) => (
  <div className="card-white overflow-hidden">
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </div>
);

// ── 1. OVERVIEW ────────────────────────────────────────────────────────────
const OverviewSection: React.FC<{ addToast: Function }> = ({ addToast }) => (
  <div>
    <PageHeader title="Dashboard" subtitle="Resumen general de la plataforma" action={
      <button onClick={() => addToast({ message: 'Datos actualizados', type: 'success' })} className="btn-orange flex items-center gap-2 text-sm">
        <RefreshCw className="w-4 h-4" /> Actualizar
      </button>
    } />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {STATS.map(s => <StatCard key={s.label} {...s} />)}
    </div>
    {/* Recent activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-orange" /> Actividad Reciente</h3>
        <div className="space-y-3">
          {[
            { text: 'Nuevo artista registrado: DJ Mambo King', time: 'Hace 5 min', color: 'bg-green-500' },
            { text: 'Disputa abierta: Pedido #1089', time: 'Hace 12 min', color: 'bg-red-500' },
            { text: 'Suscripción Pro activada: venue_madrid', time: 'Hace 30 min', color: 'bg-blue-500' },
            { text: 'Nuevo evento aprobado: Festival BCN', time: 'Hace 1h', color: 'bg-purple-500' },
            { text: 'Pago completado: €450 → DJ Mambo King', time: 'Hace 2h', color: 'bg-brand-orange' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 ${item.color} rounded-full flex-shrink-0`} />
              <p className="text-gray-700 text-sm flex-1">{item.text}</p>
              <span className="text-gray-400 text-xs flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-orange" /> Revenue por Mes</h3>
        <div className="space-y-3">
          {[
            { month: 'Mayo 2026',    amount: 48200, pct: 90 },
            { month: 'Abril 2026',   amount: 39400, pct: 73 },
            { month: 'Marzo 2026',   amount: 35100, pct: 65 },
            { month: 'Febrero 2026', amount: 28600, pct: 53 },
            { month: 'Enero 2026',   amount: 24300, pct: 45 },
          ].map(row => (
            <div key={row.month}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{row.month}</span>
                <span className="font-bold text-gray-900">€{row.amount.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-orange rounded-full" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── 2. CATEGORÍAS ──────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  route: string;
  section: 'main' | 'mercado' | 'comunidad';
  color_start: string;
  color_mid: string;
  color_end: string;
  shadow_color: string;
  display_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const CategoriasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Category>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category & { image_url?: string; border_radius?: number; shadow_intensity?: number; hover_effect?: string }>>({
    name: '',
    icon: '🎉',
    slug: '',
    route: '/',
    section: 'main',
    color_start: '#EC407A',
    color_mid: '#FF1493',
    color_end: '#C2185B',
    active: true,
    display_order: 1,
    image_url: '',
    border_radius: 12,
    shadow_intensity: 1,
    hover_effect: 'scale',
  });

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://lpwwdjujxwxdvyoznehp.supabase.co/rest/v1/categories?select=*&order=section.asc,display_order.asc', {
        headers: {
          'apikey': 'sb_publishable_Kn08qRlITmDXEcMpATB-7Q_GE5MHvvP',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      addToast({ message: 'Error al cargar categorías', type: 'error' });
    }
    setLoading(false);
  };

  // Load on mount
  React.useEffect(() => {
    fetchCategories();
  }, []);

  // Update category in Supabase
  const handleSaveCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const response = await fetch(`https://lpwwdjujxwxdvyoznehp.supabase.co/rest/v1/categories?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': 'sb_publishable_Kn08qRlITmDXEcMpATB-7Q_GE5MHvvP',
          'Content-Type': 'application/json',
          'Authorization': `Bearer sb_publishable_Kn08qRlITmDXEcMpATB-7Q_GE5MHvvP`,
        },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        setEditingId(null);
        addToast({ message: 'Categoría actualizada', type: 'success' });
        fetchCategories();
      } else {
        addToast({ message: 'Error al guardar categoría', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating category:', error);
      addToast({ message: 'Error al guardar cambios', type: 'error' });
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    try {
      const response = await fetch(`https://lpwwdjujxwxdvyoznehp.supabase.co/rest/v1/categories?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': 'sb_publishable_Kn08qRlITmDXEcMpATB-7Q_GE5MHvvP',
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        addToast({ message: 'Categoría eliminada', type: 'success' });
        fetchCategories();
      } else {
        addToast({ message: 'Error al eliminar categoría', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      addToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.slug) {
      addToast({ message: 'Nombre y slug son requeridos', type: 'error' });
      return;
    }
    try {
      const response = await fetch('https://lpwwdjujxwxdvyoznehp.supabase.co/rest/v1/categories', {
        method: 'POST',
        headers: {
          'apikey': 'sb_publishable_Kn08qRlITmDXEcMpATB-7Q_GE5MHvvP',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });
      if (response.ok) {
        addToast({ message: 'Categoría creada', type: 'success' });
        setShowNewForm(false);
        setNewCategory({
          name: '',
          icon: '🎉',
          slug: '',
          route: '/',
          section: 'main',
          color_start: '#EC407A',
          color_mid: '#FF1493',
          color_end: '#C2185B',
          active: true,
          display_order: 1,
        });
        fetchCategories();
      } else {
        const error = await response.json();
        addToast({ message: error.message || 'Error al crear categoría', type: 'error' });
      }
    } catch (error) {
      console.error('Error creating category:', error);
      addToast({ message: 'Error al crear categoría', type: 'error' });
    }
  };

  const categoryBySection = {
    main: categories.filter(c => c.section === 'main'),
    mercado: categories.filter(c => c.section === 'mercado'),
    comunidad: categories.filter(c => c.section === 'comunidad'),
  };

  const SectionCard: React.FC<{ section: 'main' | 'mercado' | 'comunidad'; title: string }> = ({ section, title }) => {
    const isExpanded = expandedSections.has(section);
    return (
    <div className="card-white mb-4 overflow-hidden">
      <button
        onClick={() => {
          const newSet = new Set(expandedSections);
          if (newSet.has(section)) {
            newSet.delete(section);
          } else {
            newSet.add(section);
          }
          setExpandedSections(newSet);
        }}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold text-sm">
            {categoryBySection[section].length}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-gray-400 text-xs">{categoryBySection[section].length} categorías</p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {categoryBySection[section].map(cat => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => setDragId(cat.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragId && dragId !== cat.id) {
                  const dragCat = categories.find(c => c.id === dragId);
                  const dropCat = cat;
                  if (dragCat && dropCat) {
                    // Swap display_order
                    handleSaveCategory(dragCat.id, { display_order: dropCat.display_order });
                    handleSaveCategory(dropCat.id, { display_order: dragCat.display_order });
                  }
                }
                setDragId(null);
              }}
              className={`p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border transition-all cursor-grab active:cursor-grabbing ${dragId === cat.id ? 'border-pink-400 bg-pink-50 opacity-60' : 'border-gray-100 hover:border-pink-300'}`}
            >
              {editingId === cat.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Nombre</label>
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Ícono</label>
                      <input
                        type="text"
                        value={editData.icon || ''}
                        onChange={e => setEditData({ ...editData, icon: e.target.value })}
                        className="input w-full"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Slug</label>
                      <input
                        type="text"
                        value={editData.slug || ''}
                        onChange={e => setEditData({ ...editData, slug: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Ruta</label>
                      <input
                        type="text"
                        value={editData.route || ''}
                        onChange={e => setEditData({ ...editData, route: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  {/* Color pickers with preview */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Color inicio</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editData.color_start || '#EC407A'}
                          onChange={e => setEditData({ ...editData, color_start: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editData.color_start || ''}
                          onChange={e => setEditData({ ...editData, color_start: e.target.value })}
                          className="input text-xs flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Color medio</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editData.color_mid || '#FF1493'}
                          onChange={e => setEditData({ ...editData, color_mid: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editData.color_mid || ''}
                          onChange={e => setEditData({ ...editData, color_mid: e.target.value })}
                          className="input text-xs flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Color fin</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editData.color_end || '#C2185B'}
                          onChange={e => setEditData({ ...editData, color_end: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editData.color_end || ''}
                          onChange={e => setEditData({ ...editData, color_end: e.target.value })}
                          className="input text-xs flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="text-xs font-medium text-gray-600">Imagen de fondo (URL)</label>
                    <input
                      type="text"
                      value={(editData as any).image_url || ''}
                      onChange={e => setEditData({ ...editData, image_url: e.target.value } as any)}
                      className="input w-full"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>

                  {/* Visual controls */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Border Radius</label>
                      <input
                        type="range" min="0" max="30" step="1"
                        value={(editData as any).border_radius || 12}
                        onChange={e => setEditData({ ...editData, border_radius: parseInt(e.target.value) } as any)}
                        className="w-full accent-pink-500"
                      />
                      <span className="text-[10px] text-gray-400">{(editData as any).border_radius || 12}px</span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Sombra</label>
                      <input
                        type="range" min="0" max="5" step="1"
                        value={(editData as any).shadow_intensity || 1}
                        onChange={e => setEditData({ ...editData, shadow_intensity: parseInt(e.target.value) } as any)}
                        className="w-full accent-pink-500"
                      />
                      <span className="text-[10px] text-gray-400">Nivel {(editData as any).shadow_intensity || 1}</span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Efecto Hover</label>
                      <select
                        value={(editData as any).hover_effect || 'scale'}
                        onChange={e => setEditData({ ...editData, hover_effect: e.target.value } as any)}
                        className="input w-full text-xs"
                      >
                        <option value="scale">Zoom</option>
                        <option value="lift">Elevar</option>
                        <option value="glow">Brillo</option>
                        <option value="none">Ninguno</option>
                      </select>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Vista previa:</label>
                    <div
                      className="px-4 py-3 text-white font-bold text-center w-full flex items-center justify-center gap-2"
                      style={{
                        background: (editData as any).image_url
                          ? `linear-gradient(135deg, ${editData.color_start}CC, ${editData.color_end}CC), url(${(editData as any).image_url}) center/cover`
                          : `linear-gradient(135deg, ${editData.color_start}, ${editData.color_mid}, ${editData.color_end})`,
                        borderRadius: `${(editData as any).border_radius || 12}px`,
                        boxShadow: `0 ${((editData as any).shadow_intensity || 1) * 4}px ${((editData as any).shadow_intensity || 1) * 10}px ${editData.shadow_color || 'rgba(0,0,0,0.2)'}`,
                      }}
                    >
                      <span className="text-2xl">{editData.icon}</span> {editData.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Orden</label>
                      <input
                        type="number"
                        value={editData.display_order || 1}
                        onChange={e => setEditData({ ...editData, display_order: parseInt(e.target.value) })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Sección</label>
                      <select
                        value={editData.section || 'main'}
                        onChange={e => setEditData({ ...editData, section: e.target.value as any })}
                        className="input w-full text-xs"
                      >
                        <option value="main">Principal</option>
                        <option value="mercado">Mercado</option>
                        <option value="comunidad">Comunidad</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editData.active}
                          onChange={e => setEditData({ ...editData, active: e.target.checked })}
                          className="w-4 h-4 accent-pink-500"
                        />
                        <span className="text-xs font-medium text-gray-600">Activa</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveCategory(cat.id, editData)}
                      className="flex-1 btn-orange text-sm"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 btn-white text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Mini preview */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0"
                      style={{
                        background: (cat as any).image_url
                          ? `linear-gradient(135deg, ${cat.color_start}CC, ${cat.color_end}CC), url(${(cat as any).image_url}) center/cover`
                          : `linear-gradient(135deg, ${cat.color_start}, ${cat.color_end})`,
                        borderRadius: `${(cat as any).border_radius || 12}px`,
                      }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{cat.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {cat.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.slug} • {cat.route} • Orden: {cat.display_order}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full" style={{ background: cat.color_start }} />
                        <div className="w-3 h-3 rounded-full" style={{ background: cat.color_mid }} />
                        <div className="w-3 h-3 rounded-full" style={{ background: cat.color_end }} />
                        <span className="text-[10px] text-gray-400 ml-1">↕ Arrastra para reordenar</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        // Duplicate
                        const dup = { ...cat, name: cat.name + ' (copia)', slug: cat.slug + '-copy', display_order: cat.display_order + 1 };
                        delete (dup as any).id;
                        handleAddCategory();
                      }}
                      className="p-2 hover:bg-gray-100 text-gray-400 rounded-lg"
                      title="Duplicar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditData(cat);
                      }}
                      className="p-2 hover:bg-pink-50 text-pink-500 rounded-lg"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle="Diseña y gestiona todas las categorías de la plataforma"
        action={
          <Button
            variant="orange"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowNewForm(!showNewForm)}
          >
            Nueva categoría
          </Button>
        }
      />

      {showNewForm && (
        <div className="card-white p-6 mb-6 bg-gradient-to-r from-brand-orange/5 to-transparent border-l-4 border-brand-orange">
          <h3 className="font-bold text-gray-900 mb-4">Nueva categoría</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre *</label>
                <input
                  type="text"
                  value={newCategory.name || ''}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ej: Explorador"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Ícono</label>
                <input
                  type="text"
                  value={newCategory.icon || ''}
                  onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                  placeholder="🎉"
                  maxLength={2}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Slug *</label>
                <input
                  type="text"
                  value={newCategory.slug || ''}
                  onChange={e => setNewCategory({ ...newCategory, slug: e.target.value })}
                  placeholder="explorador"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Sección</label>
                <select
                  value={newCategory.section || 'main'}
                  onChange={e => setNewCategory({ ...newCategory, section: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="main">Main (Principal)</option>
                  <option value="mercado">Mercado</option>
                  <option value="comunidad">Comunidad</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Color inicio</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategory.color_start || '#EC407A'}
                    onChange={e => setNewCategory({ ...newCategory, color_start: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategory.color_start || ''}
                    onChange={e => setNewCategory({ ...newCategory, color_start: e.target.value })}
                    className="input text-xs flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Color medio</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategory.color_mid || '#FF1493'}
                    onChange={e => setNewCategory({ ...newCategory, color_mid: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategory.color_mid || ''}
                    onChange={e => setNewCategory({ ...newCategory, color_mid: e.target.value })}
                    className="input text-xs flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Color fin</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategory.color_end || '#C2185B'}
                    onChange={e => setNewCategory({ ...newCategory, color_end: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategory.color_end || ''}
                    onChange={e => setNewCategory({ ...newCategory, color_end: e.target.value })}
                    className="input text-xs flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddCategory} className="flex-1 btn-orange">
                Crear categoría
              </button>
              <button onClick={() => setShowNewForm(false)} className="flex-1 btn-white">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card-white p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-brand-orange" />
          <p className="text-gray-400 mt-2">Cargando categorías...</p>
        </div>
      ) : (
        <div>
          <SectionCard section="main" title="📌 Principal" />
          <SectionCard section="mercado" title="🏪 Mercado" />
          <SectionCard section="comunidad" title="💬 Comunidad" />
        </div>
      )}
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
  const { openEdit } = useAdminEdit();
  const { getMerged } = useAdminOverridesStore();
  const users = [
    { id: 'usr-1', name: 'Carlos Rodríguez', email: 'carlos@email.com', role: 'user',   status: 'active',   joined: '15 May 2026', revenue: '€0', city: 'Madrid' },
    { id: 'usr-2', name: 'DJ Mambo King',    email: 'dj@email.com',     role: 'dj',     status: 'active',   joined: '10 May 2026', revenue: '€1,620', city: 'Madrid' },
    { id: 'usr-3', name: 'La Reina',         email: 'reina@email.com',  role: 'dancer', status: 'active',   joined: '8 May 2026',  revenue: '€890', city: 'Barcelona' },
    { id: 'usr-4', name: 'Club Tropicana',   email: 'club@email.com',   role: 'venue',  status: 'pending',  joined: '12 May 2026', revenue: '€0', city: 'Madrid' },
    { id: 'usr-5', name: 'Admin User',       email: 'admin@email.com',  role: 'admin',  status: 'active',   joined: '1 Jan 2026',  revenue: '—', city: 'Madrid' },
    { id: 'usr-6', name: 'Spam User',        email: 'spam@email.com',   role: 'user',   status: 'banned',   joined: '14 May 2026', revenue: '€0', city: 'Madrid' },
  ].map(u => getMerged('user', u));
  return (
    <div>
      <PageHeader title="Usuarios" subtitle={`${users.length} usuarios registrados`} action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => openEdit({ entity: 'user', title: 'Nuevo usuario', item: { id: `usr-new-${Date.now()}`, name: '', email: '', role: 'user', city: '' }, fields: FIELDS_USER })}>Nuevo usuario</Button>
      } />
      <div className="flex gap-3 mb-4">
        <SearchBar placeholder="Buscar usuarios..." value={search} onChange={setSearch} className="max-w-xs" />
        <div className="flex gap-1">
          {['todos', 'activos', 'pendientes', 'baneados'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-brand-orange text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>{f}</button>
          ))}
        </div>
      </div>
      <AdminTable
        headers={['Usuario', 'Email', 'Rol', 'Estado', 'Registro', 'Revenue', 'Acciones']}
        rows={users.map(u => [
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-sm font-bold text-brand-orange">{u.name[0]}</div>
            <span className="font-semibold text-gray-800 text-sm">{u.name}</span>
          </div>,
          <span className="text-gray-500 text-sm">{u.email}</span>,
          <Badge variant={u.role === 'admin' ? 'blue' : u.role === 'dj' ? 'orange' : 'gray'} className="capitalize">{u.role}</Badge>,
          <Badge variant={u.status === 'active' ? 'green' : u.status === 'pending' ? 'orange' : 'red'}>
            {u.status === 'active' ? 'Activo' : u.status === 'pending' ? 'Pendiente' : 'Baneado'}
          </Badge>,
          <span className="text-gray-400 text-sm">{u.joined}</span>,
          <span className="font-semibold text-gray-800">{u.revenue}</span>,
          <div className="flex gap-1">
            <button onClick={() => addToast({ message: `Viendo perfil de ${u.name}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
            <button onClick={() => openEdit({ entity: 'user', title: u.name, item: u, fields: FIELDS_USER })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
            <button onClick={() => addToast({ message: `${u.name} baneado`, type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
          </div>
        ])}
      />
    </div>
  );
};

// ── 5. LOCALIDADES ────────────────────────────────────────────────────────
const LocalidadesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const { getMerged } = useAdminOverridesStore();
  return (
  <div>
    <PageHeader title="Localidades" subtitle="Gestiona los venues y locales de la plataforma" action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nueva localidad añadida', type: 'success' })}>Añadir localidad</Button>
    } />
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[{ label: 'Localidades activas', val: '47' }, { label: 'Ciudades', val: '12' }, { label: 'Pendientes aprobación', val: '3' }].map(s => (
        <div key={s.label} className="card-white p-4 text-center"><p className="text-3xl font-black text-brand-orange">{s.val}</p><p className="text-gray-400 text-sm mt-1">{s.label}</p></div>
      ))}
    </div>
    <AdminTable
      headers={['Nombre', 'Ciudad', 'Tipo', 'Estado', 'Eventos', 'Suscripción', 'Acciones']}
      rows={VENUES.map(orig => getMerged('venue', orig)).map(v => [
        <span className="font-semibold">{v.name}</span>,
        <span>{v.city}</span>,
        <Badge variant="gray" className="capitalize">{v.type}</Badge>,
        <Badge variant={v.isOpen ? 'green' : 'gray'}>{v.isOpen ? '🟢 Abierto' : 'Cerrado'}</Badge>,
        <span>3</span>,
        v.isPremium ? <Badge variant="orange">Premium</Badge> : <Badge variant="gray">Básico</Badge>,
        <div className="flex gap-1">
          <button onClick={() => openEdit({ entity: 'venue', title: v.name, item: v, fields: FIELDS_VENUE })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
          <button onClick={() => addToast({ message: `${v.name} eliminado`, type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ])}
    />
  </div>
  );
};

// ── 6. SUSCRIPCIONES ─────────────────────────────────────────────────────
const SuscripcionesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const { getMerged } = useAdminOverridesStore();
  return (
  <div>
    <PageHeader title="Suscripciones Premium" subtitle="Gestiona planes y suscriptores activos" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {SUBSCRIPTION_PLANS.map(orig => getMerged('subscription', orig)).map(plan => (
        <div key={plan.id} className="card-white p-5 text-center">
          <div className={`w-10 h-10 bg-gradient-to-r ${plan.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <p className="font-display font-black text-gray-900">{plan.name}</p>
          <p className="text-brand-orange font-black text-2xl mt-1">€{plan.price}<span className="text-sm text-gray-400 font-normal">/mes</span></p>
          <p className="text-gray-400 text-xs mt-1">{Math.floor(Math.random() * 80) + 10} activos</p>
          <button onClick={() => openEdit({ entity: 'subscription', title: plan.name, item: plan, fields: FIELDS_SUBSCRIPTION })} className="mt-3 text-brand-orange text-xs font-semibold hover:underline">Editar plan →</button>
        </div>
      ))}
    </div>
    <h3 className="font-bold text-gray-900 mb-3">Suscriptores recientes</h3>
    <AdminTable
      headers={['Usuario', 'Plan', 'Inicio', 'Próxima factura', 'Estado', 'Acciones']}
      rows={[
        ['DJ Mambo King', <Badge variant="orange">Pro €50</Badge>, '1 May 2026', '1 Jun 2026', <Badge variant="green">Activa</Badge>],
        ['Instructora Celia', <Badge variant="orange">Elite €150</Badge>, '15 Apr 2026', '15 Jun 2026', <Badge variant="green">Activa</Badge>],
        ['Club Tropicana', <Badge variant="gray">Básico €9</Badge>, '10 May 2026', '10 Jun 2026', <Badge variant="green">Activa</Badge>],
        ['Orquesta Fuego', <Badge variant="orange">Estándar €20</Badge>, '1 Apr 2026', '—', <Badge variant="red">Cancelada</Badge>],
      ].map(row => [...row, <div className="flex gap-1">
        <button onClick={() => openEdit({ entity: 'subscription', title: 'Suscripción', item: { id: 'sub-row-' + Math.random(), name: 'Suscripción', period: 'monthly' }, fields: FIELDS_SUBSCRIPTION })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
        <button onClick={() => addToast({ message: 'Suscripción cancelada', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><XCircle className="w-4 h-4" /></button>
      </div>])}
    />
  </div>
  );
};

// ── 7. ARTISTAS ───────────────────────────────────────────────────────────
const ArtistasSection: React.FC<{ addToast: Function; navigate: Function }> = ({ addToast, navigate }) => {
  const { openEdit } = useAdminEdit();
  const { getMerged } = useAdminOverridesStore();
  return (
  <div>
    <PageHeader title="Artistas" subtitle={`${ARTISTS.length} artistas registrados`} action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Redirigiendo a formulario de artista', type: 'info' })}>Añadir artista</Button>
    } />
    <AdminTable
      headers={['Artista', 'Tipo', 'Ciudad', 'Rating', 'Bookings', 'Premium', 'Acciones']}
      rows={ARTISTS.map(orig => getMerged('artist', orig)).map(a => [
        <div className="flex items-center gap-2">
          <img src={a.avatar} alt={a.name} className="w-8 h-8 rounded-full" />
          <div>
            <p className="font-semibold text-sm">{a.name}</p>
            {a.isVerified && <span className="text-blue-500 text-xs">✓ Verificado</span>}
          </div>
        </div>,
        <Badge variant="gray" className="capitalize">{a.type}</Badge>,
        <span>{a.city}</span>,
        <div className="flex items-center gap-1"><span className="text-brand-orange">⭐</span><span className="font-semibold">{a.rating}</span></div>,
        <span>{a.completedBookings}</span>,
        a.isPremium ? <Badge variant="orange">PRO</Badge> : <Badge variant="gray">Básico</Badge>,
        <div className="flex gap-1">
          <button onClick={() => navigate(`/artistas/${a.id}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
          <button onClick={() => openEdit({ entity: 'artist', title: a.name, item: a, fields: FIELDS_ARTIST })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
          <button onClick={() => addToast({ message: `${a.name} suspendido`, type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><XCircle className="w-4 h-4" /></button>
        </div>
      ])}
    />
  </div>
  );
};

// ── 8. BAILARINAS ─────────────────────────────────────────────────────────
const BailarinasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const dancers = ARTISTS.filter(a => a.type === 'dancer' || a.type === 'instructor');
  return (
    <div>
      <PageHeader title="Bailarines & Instructores" subtitle={`${dancers.length} perfiles activos`} action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => openEdit({ entity: 'artist', title: 'Nuevo bailarín/a', item: { id: `art-new-${Date.now()}`, name: '', type: 'dancer', city: '', country: 'España' }, fields: FIELDS_ARTIST })}>Añadir bailarín/a</Button>
      } />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...dancers, ...ARTISTS.slice(0, 4)].map(a => (
          <div key={a.id} className="card-white p-4 text-center hover:shadow-card-hover transition-shadow">
            <img src={a.avatar} alt={a.name} className="w-16 h-16 rounded-full mx-auto mb-3 ring-2 ring-brand-orange/30" />
            <p className="font-bold text-gray-900 text-sm">{a.name}</p>
            <p className="text-gray-400 text-xs capitalize mt-0.5">{a.type} · {a.city}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-brand-orange text-xs">⭐</span><span className="text-xs font-semibold">{a.rating}</span>
            </div>
            <div className="flex gap-1 mt-3">
              <button onClick={() => openEdit({ entity: 'artist', title: a.name, item: a, fields: FIELDS_ARTIST })} className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Editar</button>
              <button onClick={() => addToast({ message: `${a.name} suspendido`, type: 'error' })} className="flex-1 text-xs py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">Suspender</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 9. EVENTOS ────────────────────────────────────────────────────────────
const EventosSection: React.FC<{ addToast: Function; navigate: Function }> = ({ addToast, navigate }) => {
  const { openEdit } = useAdminEdit();
  const { getMerged } = useAdminOverridesStore();
  return (
  <div>
    <PageHeader title="Eventos" subtitle={`${EVENTS.length} eventos en la plataforma`} action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Redirigiendo a crear evento', type: 'info' })}>Crear evento</Button>
    } />
    <AdminTable
      headers={['Evento', 'Ciudad', 'Fecha', 'Precio', 'Capacidad', 'Estado', 'Acciones']}
      rows={EVENTS.map(orig => getMerged('event', orig)).map(e => [
        <div className="flex items-center gap-2">
          <img src={e.cover} alt="" className="w-10 h-8 rounded-lg object-cover" />
          <p className="font-semibold text-sm line-clamp-1 max-w-[180px]">{e.title}</p>
        </div>,
        <span>{e.city}</span>,
        <span className="text-sm">{new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>,
        <span className="font-semibold">€{e.price}</span>,
        <div>
          <div className="flex items-center gap-1 text-sm"><span>{e.attending}/{e.capacity}</span></div>
          <div className="h-1 bg-gray-100 rounded-full mt-1 w-20"><div className="h-full bg-brand-orange rounded-full" style={{ width: `${(e.attending / e.capacity) * 100}%` }} /></div>
        </div>,
        <Badge variant={e.isFeatured ? 'orange' : 'green'}>{e.isFeatured ? 'Destacado' : 'Activo'}</Badge>,
        <div className="flex gap-1">
          <button onClick={() => navigate(`/eventos/${e.id}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
          <button onClick={() => openEdit({ entity: 'event', title: e.title, item: e, fields: FIELDS_EVENT })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
          <button onClick={() => addToast({ message: 'Evento eliminado', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ])}
    />
  </div>
  );
};

// ── 10. MERCADO Y ESCROW ─────────────────────────────────────────────────
const MercadoSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const orders = [
    { id: '#1089', buyer: 'Carlos R.', seller: 'DJ Mambo King', service: 'Set DJ 4h', amount: 450, commission: 67.5, status: 'escrow' },
    { id: '#1088', buyer: 'Ana M.',    seller: 'La Reina',       service: 'Clase privada', amount: 120, commission: 18, status: 'completed' },
    { id: '#1087', buyer: 'Luis G.',   seller: 'Celia',          service: 'Pack clases online', amount: 80, commission: 12, status: 'dispute' },
    { id: '#1086', buyer: 'María P.',  seller: 'Bacha Flow',     service: 'Mix bachata', amount: 75, commission: 11.25, status: 'completed' },
  ];
  return (
    <div>
      <PageHeader title="Mercado y Depósito en Garantía" subtitle="Control de transacciones y escrow" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{ l: 'En escrow', v: '€1,240', c: 'bg-yellow-50', i: '🔒' }, { l: 'Completados', v: '€38.4k', c: 'bg-green-50', i: '✅' }, { l: 'En disputa', v: '€80', c: 'bg-red-50', i: '⚠️' }, { l: 'Comisión (15%)', v: '€6.2k', c: 'bg-pink-50', i: '💰' }].map(s => (
          <div key={s.l} className="card-white p-4">
            <div className={`w-10 h-10 ${s.c} rounded-xl flex items-center justify-center text-xl mb-2`}>{s.i}</div>
            <p className="text-gray-400 text-xs">{s.l}</p>
            <p className="font-black text-xl text-gray-900">{s.v}</p>
          </div>
        ))}
      </div>
      <AdminTable
        headers={['Pedido', 'Comprador', 'Vendedor', 'Servicio', 'Importe', 'Comisión', 'Estado', 'Acciones']}
        rows={orders.map(o => [
          <span className="font-mono text-xs text-gray-500">{o.id}</span>,
          <span className="font-semibold text-sm">{o.buyer}</span>,
          <span className="text-gray-600 text-sm">{o.seller}</span>,
          <span className="text-gray-500 text-sm">{o.service}</span>,
          <span className="font-bold">€{o.amount}</span>,
          <span className="text-brand-orange font-semibold">€{o.commission}</span>,
          <Badge variant={o.status === 'completed' ? 'green' : o.status === 'dispute' ? 'red' : 'orange'}>
            {o.status === 'escrow' ? '🔒 Escrow' : o.status === 'completed' ? '✅ Completado' : '⚠️ Disputa'}
          </Badge>,
          <div className="flex gap-1">
            {o.status === 'escrow' && <button onClick={() => addToast({ message: `Pago liberado: ${o.id}`, type: 'success' })} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200">Liberar</button>}
            {o.status === 'dispute' && <button onClick={() => addToast({ message: `Disputa ${o.id} asignada a revisión`, type: 'info' })} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200">Revisar</button>}
            <button onClick={() => addToast({ message: `Viendo detalle ${o.id}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
          </div>
        ])}
      />
    </div>
  );
};

// ── 11. CURSOS ────────────────────────────────────────────────────────────
const CursosSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { openEdit } = useAdminEdit();
  const { getMerged } = useAdminOverridesStore();
  return (
  <div>
    <PageHeader title="Cursos y Academia" subtitle="Gestiona los cursos de la plataforma" action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nuevo curso creado', type: 'success' })}>Nuevo curso</Button>
    } />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { id: 'crs-1', title: 'Bachata Sensual — Nivel Principiante', instructor: 'DJ Bacha Flow', students: 234, price: 49, status: 'active', level: 'beginner', durationMin: 180 },
        { id: 'crs-2', title: 'Salsa On2 — Curso Completo',           instructor: 'La Reina del Ritmo', students: 567, price: 89, status: 'active', level: 'intermediate', durationMin: 360 },
        { id: 'crs-3', title: 'Kizomba Fusion',                        instructor: 'Instructora Celia', students: 123, price: 39, status: 'draft', level: 'beginner', durationMin: 120 },
        { id: 'crs-4', title: 'DJ Latinity — Producción Musical',      instructor: 'DJ Mambo King', students: 89, price: 149, status: 'active', level: 'advanced', durationMin: 480 },
        { id: 'crs-5', title: 'Técnicas de Improvisación en Salsa',    instructor: 'Marcos & Elena', students: 45, price: 59, status: 'active', level: 'intermediate', durationMin: 240 },
      ].map(orig => getMerged('course', orig)).map(course => (
        <div key={course.title} className="card-white p-5 hover:shadow-card-hover transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <Badge variant={course.status === 'active' ? 'green' : 'gray'}>{course.status === 'active' ? 'Publicado' : 'Borrador'}</Badge>
            <span className="font-black text-brand-orange text-lg">€{course.price}</span>
          </div>
          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{course.title}</h3>
          <p className="text-gray-400 text-xs mb-3">por {course.instructor}</p>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">👥 {course.students} estudiantes</span>
            <div className="flex gap-1">
              <button onClick={() => openEdit({ entity: 'course', title: course.title, item: course, fields: FIELDS_COURSE })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
              <button onClick={() => addToast({ message: 'Curso eliminado', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
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

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const updated = [...images, { id: Date.now().toString(), url: newUrl.trim(), alt: newAlt.trim() || 'Slider image' }];
    setImages(updated);
    setHeroSliderImages(updated);
    setNewUrl('');
    setNewAlt('');
    addToast({ message: 'Imagen añadida al slider', type: 'success' });
  };

  const handleRemove = (id: string) => {
    const updated = images.filter(i => i.id !== id);
    setImages(updated);
    setHeroSliderImages(updated);
    addToast({ message: 'Imagen eliminada', type: 'info' });
  };

  const handleUrlChange = (id: string, url: string) => {
    const updated = images.map(i => i.id === id ? { ...i, url } : i);
    setImages(updated);
    setHeroSliderImages(updated);
  };

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🖼️ Slider Hero (banner negro)</h4>
      <p className="text-gray-400 text-xs mb-4">Imágenes en movimiento horizontal en el hero. Se recomienda 3 imágenes.</p>
      <div className="space-y-3">
        {images.map((img, idx) => (
          <div key={img.id} className="flex items-center gap-2">
            <img src={img.url} alt={img.alt} className="w-16 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/160/100'; }} />
            <div className="flex-1 min-w-0">
              <input type="text" value={img.url} onChange={e => handleUrlChange(img.id, e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange" placeholder="URL de imagen" />
            </div>
            <button onClick={() => handleRemove(img.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)}
          placeholder="URL nueva imagen..." className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-orange" />
        <Button variant="orange" onClick={handleAdd} className="flex-shrink-0 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Añadir
        </Button>
      </div>
    </div>
  );
};

// ── 13. DISEÑO WEB ────────────────────────────────────────────────────────
// ── HERO BANNER EDITOR (image / YouTube / video) ──────────────────────────
const HeroBannerEditor: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const { heroMedia, setHeroMedia } = useSiteConfigStore();
  const [draftUrl, setDraftUrl] = useState(heroMedia.url);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const TYPES: { id: HeroMediaType; label: string; icon: string; desc: string }[] = [
    { id: 'image',   label: 'Imagen',          icon: '🖼️', desc: 'URL de imagen (jpg/png)' },
    { id: 'youtube', label: 'YouTube',         icon: '▶️', desc: 'Pega cualquier URL de YouTube' },
    { id: 'video',   label: 'Vídeo local',     icon: '🎬', desc: 'Sube un .mp4 desde tu equipo' },
  ];

  const apply = () => {
    if (!draftUrl.trim()) {
      addToast({ message: 'Introduce una URL o sube un archivo', type: 'error' });
      return;
    }
    if (heroMedia.type === 'youtube' && !getYouTubeId(draftUrl)) {
      addToast({ message: 'URL de YouTube inválida', type: 'error' });
      return;
    }
    setHeroMedia({ url: draftUrl.trim() });
    addToast({ message: 'Banner actualizado en la portada', type: 'success' });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      addToast({ message: 'El archivo debe ser un vídeo', type: 'error' });
      return;
    }
    const url = URL.createObjectURL(file);
    setDraftUrl(url);
    setHeroMedia({ type: 'video', url });
    addToast({ message: `Vídeo cargado: ${file.name}`, type: 'success' });
  };

  const yt = heroMedia.type === 'youtube' ? getYouTubeId(heroMedia.url) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Banner principal (Hero)</h3>
          <p className="text-xs text-gray-400 mt-0.5">Elige imagen, vídeo de YouTube o vídeo local para la portada</p>
        </div>
      </div>

      {/* Tipo selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => { setHeroMedia({ type: t.id }); setDraftUrl(''); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              heroMedia.type === t.id
                ? 'border-brand-orange bg-pink-50'
                : 'border-gray-200 bg-white hover:border-brand-orange/50'
            }`}
          >
            <div className="text-xl mb-1">{t.icon}</div>
            <p className="text-sm font-bold text-gray-900">{t.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Input según tipo */}
      {heroMedia.type === 'video' ? (
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 hover:border-brand-orange rounded-xl p-6 text-center transition-all"
          >
            <div className="text-3xl mb-1">📁</div>
            <p className="text-sm font-semibold text-gray-700">Subir vídeo (.mp4, .webm)</p>
            <p className="text-xs text-gray-400 mt-1">Máx. recomendado: 20 MB · 1200×600px</p>
          </button>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
          {heroMedia.url && heroMedia.url.startsWith('blob:') && (
            <p className="text-xs text-green-600 font-semibold">✅ Vídeo local cargado</p>
          )}
        </div>
      ) : (
        <div className="flex gap-2 mb-3">
          <input
            value={draftUrl}
            onChange={e => setDraftUrl(e.target.value)}
            placeholder={heroMedia.type === 'youtube'
              ? 'https://www.youtube.com/watch?v=...'
              : 'https://picsum.photos/seed/.../1200/600'}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
          />
          <Button variant="orange" onClick={apply}>Aplicar</Button>
        </div>
      )}

      {/* Opciones de reproducción (solo vídeo/youtube) */}
      {heroMedia.type !== 'image' && (
        <div className="flex flex-wrap gap-4 my-4 p-3 bg-gray-50 rounded-xl">
          {(['autoplay', 'muted', 'loop'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={heroMedia[opt]}
                onChange={e => setHeroMedia({ [opt]: e.target.checked } as any)}
                className="w-4 h-4 accent-brand-orange"
              />
              <span className="text-xs text-gray-700 capitalize">{opt === 'muted' ? 'Silenciado' : opt === 'loop' ? 'Bucle' : 'Autoplay'}</span>
            </label>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-black" style={{ aspectRatio: '16 / 9' }}>
        {heroMedia.type === 'youtube' && yt ? (
          <iframe
            src={`https://www.youtube.com/embed/${yt}?controls=1&modestbranding=1&rel=0`}
            title="Hero preview"
            className="w-full h-full"
            allow="encrypted-media"
          />
        ) : heroMedia.type === 'video' && heroMedia.url ? (
          <video src={heroMedia.url} controls muted className="w-full h-full object-cover" />
        ) : heroMedia.type === 'image' && heroMedia.url ? (
          <img src={heroMedia.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">Sin contenido</div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        URL actual: <span className="font-mono break-all">{heroMedia.url || '(vacía)'}</span>
      </p>
    </div>
  );
};

const DisenoSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [colors, setColors] = useState({ primary: '#EC4899', secondary: '#111111', accent: '#DB2777' });
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
              { label: 'Color primario (naranja)', key: 'primary' as const },
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
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4">
            <div className="text-4xl mb-2">🎵</div>
            <p className="font-display font-black text-xl"><span style={{ color: colors.secondary }}>¡Ritmo </span><span style={{ color: colors.primary }}>Latino!</span></p>
            <p className="text-gray-400 text-sm mt-2">Vista previa del logo</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => addToast({ message: 'Subir logo próximamente', type: 'info' })}>
            📁 Subir nuevo logo
          </Button>
          <HeroSliderEditor addToast={addToast} />
        </div>
        <div className="card-white p-6">
          <h3 className="font-bold text-gray-900 mb-4">Textos y SEO</h3>
          <div className="space-y-4">
            <Input label="Nombre del sitio" defaultValue="¡Ritmo Latino!" />
            <Input label="Claim / Tagline" defaultValue="Encuentra tu Pasión Latina" />
            <Input label="Meta descripción" defaultValue="La plataforma #1 de entretenimiento latino..." />
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
const ConfiguracionSection: React.FC<{ addToast: Function }> = ({ addToast }) => (
  <div>
    <PageHeader title="Configuración" subtitle="Ajustes generales de la plataforma" action={
      <Button variant="orange" onClick={() => addToast({ message: 'Configuración guardada', type: 'success' })}>Guardar</Button>
    } />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[
        { title: 'General', icon: <Settings className="w-5 h-5 text-brand-orange" />, fields: [
          { label: 'Nombre plataforma', val: '¡Ritmo Latino!' },
          { label: 'Email contacto', val: 'admin@ritmolatino.com' },
          { label: 'Teléfono soporte', val: '+34 900 000 000' },
          { label: 'Zona horaria', val: 'Europe/Madrid (UTC+2)' },
        ]},
        { title: 'Pagos & Comisiones', icon: <DollarSign className="w-5 h-5 text-green-500" />, fields: [
          { label: 'Comisión plataforma', val: '15%' },
          { label: 'Pasarela de pago', val: 'Stripe Connect' },
          { label: 'Moneda principal', val: 'EUR (€)' },
          { label: 'Período escrow', val: '48 horas tras evento' },
        ]},
        { title: 'Notificaciones', icon: <Bell className="w-5 h-5 text-blue-500" />, fields: [
          { label: 'Email nuevo usuario', val: '✅ Activado' },
          { label: 'Email nuevo pago', val: '✅ Activado' },
          { label: 'Alerta disputa', val: '✅ Activado (inmediato)' },
          { label: 'Resumen diario', val: '✅ 08:00 AM' },
        ]},
        { title: 'Integraciones API', icon: <Globe className="w-5 h-5 text-purple-500" />, fields: [
          { label: 'Google Maps', val: '✅ Conectado' },
          { label: 'Stripe', val: '✅ Conectado' },
          { label: 'Agora.io (Live)', val: '⚠️ Pendiente configurar' },
          { label: 'SendGrid', val: '✅ Conectado' },
        ]},
      ].map(section => (
        <div key={section.title} className="card-white p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">{section.icon} {section.title}</h3>
          <div className="space-y-3">
            {section.fields.map(f => (
              <div key={f.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-500 text-sm">{f.label}</span>
                <span className="text-gray-900 font-semibold text-sm">{f.val}</span>
              </div>
            ))}
          </div>
          <button onClick={() => addToast({ message: `Editando: ${section.title}`, type: 'info' })} className="mt-4 text-brand-orange text-sm font-semibold hover:underline">Editar configuración →</button>
        </div>
      ))}
    </div>
  </div>
);

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
  { role: 'admin',    label: 'Superadministrador', color: 'bg-red-100 text-red-700', perms: ['Todo', 'Configuración', 'Finanzas', 'Roles'] },
  { role: 'moderator', label: 'Moderador',        color: 'bg-blue-100 text-blue-700', perms: ['Reseñas', 'Disputas', 'Contenido'] },
  { role: 'artist',   label: 'Artista',            color: 'bg-purple-100 text-purple-700', perms: ['Mi perfil', 'Servicios', 'Bookings'] },
  { role: 'dj',       label: 'DJ',                 color: 'bg-pink-100 text-pink-700', perms: ['Mi perfil', 'Sets', 'Bookings'] },
  { role: 'dancer',   label: 'Bailarín/a',         color: 'bg-indigo-100 text-indigo-700', perms: ['Mi perfil', 'Shows', 'Clases'] },
  { role: 'business', label: 'Venue / Local',      color: 'bg-green-100 text-green-700', perms: ['Mi local', 'Eventos', 'Estadísticas'] },
  { role: 'promoter', label: 'Promotor',           color: 'bg-yellow-100 text-yellow-700', perms: ['Eventos', 'Marketing', 'Ventas'] },
  { role: 'user',     label: 'Usuario',            color: 'bg-gray-100 text-gray-600', perms: ['Explorar', 'Reservar', 'Reseñar'] },
];

const RolesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
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
                                <button onClick={() => startEdit(user)} className="p-1.5 rounded-lg hover:bg-pink-100 text-gray-400 hover:text-brand-orange transition-colors" title="Editar">
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

// ── 16. DISPUTAS ──────────────────────────────────────────────────────────
const DisputasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const disputes = [
    { id: '#D-001', buyer: 'Luis G.',  seller: 'Celia',      issue: 'Servicio no completado',   amount: 80,  days: 3, status: 'open' },
    { id: '#D-002', buyer: 'Ana P.',   seller: 'DJ Kumbé',   issue: 'Artista no se presentó',   amount: 300, days: 1, status: 'reviewing' },
    { id: '#D-003', buyer: 'Pedro R.', seller: 'Orquesta F.',issue: 'Calidad inferior acordada', amount: 500, days: 7, status: 'resolved' },
    { id: '#D-004', buyer: 'Marta L.', seller: 'Bacha Flow', issue: 'Retraso en entrega',        amount: 75,  days: 2, status: 'open' },
    { id: '#D-005', buyer: 'David M.', seller: 'La Reina',   issue: 'Cancelación tardía',        amount: 120, days: 5, status: 'reviewing' },
  ];
  return (
    <div>
      <PageHeader title="Disputas" subtitle="Gestiona los conflictos entre compradores y vendedores" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ l: 'Abiertas', v: 2, c: 'text-red-600' }, { l: 'En revisión', v: 2, c: 'text-yellow-600' }, { l: 'Resueltas', v: 1, c: 'text-green-600' }].map(s => (
          <div key={s.l} className="card-white p-4 text-center"><p className={`text-3xl font-black ${s.c}`}>{s.v}</p><p className="text-gray-400 text-sm">{s.l}</p></div>
        ))}
      </div>
      <div className="space-y-3">
        {disputes.map(d => (
          <div key={d.id} className="card-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-gray-400">{d.id}</span>
                <Badge variant={d.status === 'open' ? 'red' : d.status === 'reviewing' ? 'orange' : 'green'}>
                  {d.status === 'open' ? 'Abierta' : d.status === 'reviewing' ? 'Revisando' : 'Resuelta'}
                </Badge>
                <span className="text-gray-400 text-xs">Hace {d.days} día{d.days > 1 ? 's' : ''}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{d.issue}</p>
              <p className="text-gray-400 text-xs mt-0.5">{d.buyer} (comprador) vs {d.seller} (vendedor) · €{d.amount}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {d.status !== 'resolved' && (
                <>
                  <button onClick={() => addToast({ message: `Reembolso enviado a ${d.buyer}`, type: 'success' })} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200">Reembolsar</button>
                  <button onClick={() => addToast({ message: `Pago liberado a ${d.seller}`, type: 'success' })} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-200">Liberar pago</button>
                  <button onClick={() => addToast({ message: `Disputa ${d.id} cerrada`, type: 'info' })} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200">Cerrar</button>
                </>
              )}
              <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Eye className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
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
  const reviews = [
    { author: 'María G.',  target: 'DJ Mambo King',     rating: 5, text: '¡Increíble! Hizo que nuestra boda fuera perfecta.', status: 'approved', date: '12 May' },
    { author: 'Carlos P.', target: 'La Reina del Ritmo', rating: 5, text: 'Profesional y puntual. Lo contrataré de nuevo.', status: 'pending', date: '13 May' },
    { author: 'Ana M.',    target: 'Instructora Celia',  rating: 4, text: 'Muy buena clase aunque llegó un poco tarde.', status: 'approved', date: '11 May' },
    { author: 'Luis S.',   target: 'Club Tropicana',     rating: 2, text: 'El sonido era muy malo y el ambiente no estaba bien.', status: 'pending', date: '14 May' },
    { author: 'Rosa T.',   target: 'DJ Bacha Flow',      rating: 5, text: 'Excelente selección musical, ¡bailamos toda la noche!', status: 'approved', date: '10 May' },
    { author: 'SPAM123',   target: 'DJ Mambo King',      rating: 1, text: 'Fake review para bajar competencia...', status: 'spam', date: '15 May' },
  ];
  return (
    <div>
      <PageHeader title="Reseñas" subtitle="Modera las reseñas de la plataforma" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ l: 'Aprobadas', v: 3, c: 'text-green-600' }, { l: 'Pendientes', v: 2, c: 'text-yellow-600' }, { l: 'Spam', v: 1, c: 'text-red-600' }].map(s => (
          <div key={s.l} className="card-white p-4 text-center"><p className={`text-3xl font-black ${s.c}`}>{s.v}</p><p className="text-gray-400 text-sm">{s.l}</p></div>
        ))}
      </div>
      <div className="space-y-3">
        {reviews.map((r, i) => (
          <div key={i} className={`card-white p-4 flex gap-4 ${r.status === 'spam' ? 'border border-red-100' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center font-bold text-brand-orange flex-shrink-0">{r.author[0]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-gray-900 text-sm">{r.author}</span>
                <span className="text-gray-400 text-xs">→ {r.target}</span>
                <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-xs ${s <= r.rating ? 'text-brand-orange' : 'text-gray-200'}`}>★</span>)}</div>
                <Badge variant={r.status === 'approved' ? 'green' : r.status === 'spam' ? 'red' : 'orange'}>
                  {r.status === 'approved' ? 'Aprobada' : r.status === 'spam' ? '🚫 Spam' : 'Pendiente'}
                </Badge>
                <span className="text-gray-400 text-xs ml-auto">{r.date}</span>
              </div>
              <p className="text-gray-600 text-sm">{r.text}</p>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              {r.status !== 'approved' && <button onClick={() => addToast({ message: 'Reseña aprobada', type: 'success' })} className="p-1.5 hover:bg-green-50 rounded-lg text-green-500"><CheckCircle className="w-4 h-4" /></button>}
              <button onClick={() => addToast({ message: 'Reseña eliminada', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
