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
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar, Badge, Button, Input, SearchBar } from '../components/ui';
import { ARTISTS, EVENTS, VENUES, SERVICES, SUBSCRIPTION_PLANS } from '../data/mockData';

// ── ADMIN SECTIONS ─────────────────────────────────────────────────────────
type AdminSection =
  | 'overview' | 'categorias' | 'radio' | 'usuarios' | 'localidades'
  | 'suscripciones' | 'artistas' | 'bailarinas' | 'eventos' | 'mercado'
  | 'cursos' | 'finanzas' | 'diseno' | 'configuracion' | 'roles'
  | 'disputas' | 'seguridad' | 'resenas';

const SECTIONS: { id: AdminSection; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: 'overview',       label: 'Dashboard',               icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'categorias',     label: 'Categorías',              icon: <Tag className="w-4 h-4" /> },
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
  { label: 'Revenue total',       value: '€48.2k', change: '+22%', up: true,  icon: <DollarSign className="w-6 h-6 text-brand-orange" />, color: 'bg-orange-50' },
  { label: 'Suscripciones activas', value: '312', change: '+19%', up: true,  icon: <Crown className="w-6 h-6 text-yellow-500" />,  color: 'bg-yellow-50' },
  { label: 'Disputas abiertas',   value: '5',      change: '-2',   up: false, icon: <AlertTriangle className="w-6 h-6 text-red-500" />, color: 'bg-red-50' },
];

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [active, setActive] = useState<AdminSection>('overview');

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── ADMIN SIDEBAR ── */}
      <aside className="w-60 bg-white border-r border-gray-100 flex-shrink-0 fixed top-14 bottom-0 overflow-y-auto z-20" style={{ scrollbarWidth: 'none' }}>
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
            <button key={sec.id} onClick={() => setActive(sec.id)}
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
      <main className="flex-1 ml-60 p-6 mt-0">
        {active === 'overview'       && <OverviewSection addToast={addToast} />}
        {active === 'categorias'     && <CategoriasSection addToast={addToast} />}
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
        {active === 'diseno'         && <DisenoSection addToast={addToast} />}
        {active === 'configuracion'  && <ConfiguracionSection addToast={addToast} />}
        {active === 'roles'          && <RolesSection addToast={addToast} />}
        {active === 'disputas'       && <DisputasSection addToast={addToast} />}
        {active === 'seguridad'      && <SeguridadSection />}
        {active === 'resenas'        && <ResenasSection addToast={addToast} />}
      </main>
    </div>
  );
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────
const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="font-display font-black text-2xl text-gray-900">{title}</h1>
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
const CategoriasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const cats = ['Conciertos y Música en Vivo', 'Festivales y Congresos', 'Noches de club', 'Talleres y clases magistrales', 'Clases y Academia', 'Eventos Sociales', 'Competiciones', 'Bachata', 'Salsa', 'Kizomba'];
  return (
    <div>
      <PageHeader title="Categorías" subtitle="Gestiona las categorías de la plataforma" action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nueva categoría creada', type: 'success' })}>Nueva categoría</Button>
      } />
      <AdminTable
        headers={['#', 'Nombre', 'Eventos', 'Artistas', 'Estado', 'Acciones']}
        rows={cats.map((cat, i) => [
          <span className="text-gray-400">{i + 1}</span>,
          <span className="font-semibold text-gray-800">{cat}</span>,
          <span>{Math.floor(Math.random() * 50) + 5}</span>,
          <span>{Math.floor(Math.random() * 30) + 2}</span>,
          <Badge variant="green">Activa</Badge>,
          <div className="flex gap-2">
            <button onClick={() => addToast({ message: `Editando: ${cat}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"><Edit className="w-4 h-4" /></button>
            <button onClick={() => addToast({ message: 'Categoría eliminada', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ])}
      />
    </div>
  );
};

// ── 3. RADIO ──────────────────────────────────────────────────────────────
const RadioSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const stations = [
    { name: 'Radio Bachata', status: 'live', listeners: 342, bitrate: '128kbps' },
    { name: 'Radio Latina Variada', status: 'live', listeners: 218, bitrate: '128kbps' },
    { name: 'Radio Salsa Clásica', status: 'offline', listeners: 0, bitrate: '96kbps' },
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
            <button onClick={() => addToast({ message: `Editando: ${s.name}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
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
  const users = [
    { name: 'Carlos Rodríguez', email: 'carlos@email.com', role: 'user',   status: 'active',   joined: '15 May 2026', revenue: '€0' },
    { name: 'DJ Mambo King',    email: 'dj@email.com',     role: 'dj',     status: 'active',   joined: '10 May 2026', revenue: '€1,620' },
    { name: 'La Reina',         email: 'reina@email.com',  role: 'dancer', status: 'active',   joined: '8 May 2026',  revenue: '€890' },
    { name: 'Club Tropicana',   email: 'club@email.com',   role: 'venue',  status: 'pending',  joined: '12 May 2026', revenue: '€0' },
    { name: 'Admin User',       email: 'admin@email.com',  role: 'admin',  status: 'active',   joined: '1 Jan 2026',  revenue: '—' },
    { name: 'Spam User',        email: 'spam@email.com',   role: 'user',   status: 'banned',   joined: '14 May 2026', revenue: '€0' },
  ];
  return (
    <div>
      <PageHeader title="Usuarios" subtitle={`${users.length} usuarios registrados`} action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Función próximamente', type: 'info' })}>Nuevo usuario</Button>
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
            <button onClick={() => addToast({ message: `Editando ${u.name}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
            <button onClick={() => addToast({ message: `${u.name} baneado`, type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
          </div>
        ])}
      />
    </div>
  );
};

// ── 5. LOCALIDADES ────────────────────────────────────────────────────────
const LocalidadesSection: React.FC<{ addToast: Function }> = ({ addToast }) => (
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
      rows={VENUES.map(v => [
        <span className="font-semibold">{v.name}</span>,
        <span>{v.city}</span>,
        <Badge variant="gray" className="capitalize">{v.type}</Badge>,
        <Badge variant={v.isOpen ? 'green' : 'gray'}>{v.isOpen ? '🟢 Abierto' : 'Cerrado'}</Badge>,
        <span>3</span>,
        v.isPremium ? <Badge variant="orange">Premium</Badge> : <Badge variant="gray">Básico</Badge>,
        <div className="flex gap-1">
          <button onClick={() => addToast({ message: `Editando ${v.name}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
          <button onClick={() => addToast({ message: `${v.name} eliminado`, type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ])}
    />
  </div>
);

// ── 6. SUSCRIPCIONES ─────────────────────────────────────────────────────
const SuscripcionesSection: React.FC<{ addToast: Function }> = ({ addToast }) => (
  <div>
    <PageHeader title="Suscripciones Premium" subtitle="Gestiona planes y suscriptores activos" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {SUBSCRIPTION_PLANS.map(plan => (
        <div key={plan.id} className="card-white p-5 text-center">
          <div className={`w-10 h-10 bg-gradient-to-r ${plan.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <p className="font-display font-black text-gray-900">{plan.name}</p>
          <p className="text-brand-orange font-black text-2xl mt-1">€{plan.price}<span className="text-sm text-gray-400 font-normal">/mes</span></p>
          <p className="text-gray-400 text-xs mt-1">{Math.floor(Math.random() * 80) + 10} activos</p>
          <button onClick={() => addToast({ message: `Editando plan ${plan.name}`, type: 'info' })} className="mt-3 text-brand-orange text-xs font-semibold hover:underline">Editar plan →</button>
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
        <button onClick={() => addToast({ message: 'Suscripción editada', type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
        <button onClick={() => addToast({ message: 'Suscripción cancelada', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><XCircle className="w-4 h-4" /></button>
      </div>])}
    />
  </div>
);

// ── 7. ARTISTAS ───────────────────────────────────────────────────────────
const ArtistasSection: React.FC<{ addToast: Function; navigate: Function }> = ({ addToast, navigate }) => (
  <div>
    <PageHeader title="Artistas" subtitle={`${ARTISTS.length} artistas registrados`} action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Redirigiendo a formulario de artista', type: 'info' })}>Añadir artista</Button>
    } />
    <AdminTable
      headers={['Artista', 'Tipo', 'Ciudad', 'Rating', 'Bookings', 'Premium', 'Acciones']}
      rows={ARTISTS.map(a => [
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
          <button onClick={() => addToast({ message: `Editando ${a.name}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
          <button onClick={() => addToast({ message: `${a.name} suspendido`, type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><XCircle className="w-4 h-4" /></button>
        </div>
      ])}
    />
  </div>
);

// ── 8. BAILARINAS ─────────────────────────────────────────────────────────
const BailarinasSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const dancers = ARTISTS.filter(a => a.type === 'dancer' || a.type === 'instructor');
  return (
    <div>
      <PageHeader title="Bailarines & Instructores" subtitle={`${dancers.length} perfiles activos`} action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Función próximamente', type: 'info' })}>Añadir bailarín/a</Button>
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
              <button onClick={() => addToast({ message: `Editando ${a.name}`, type: 'info' })} className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Editar</button>
              <button onClick={() => addToast({ message: `${a.name} suspendido`, type: 'error' })} className="flex-1 text-xs py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">Suspender</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 9. EVENTOS ────────────────────────────────────────────────────────────
const EventosSection: React.FC<{ addToast: Function; navigate: Function }> = ({ addToast, navigate }) => (
  <div>
    <PageHeader title="Eventos" subtitle={`${EVENTS.length} eventos en la plataforma`} action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Redirigiendo a crear evento', type: 'info' })}>Crear evento</Button>
    } />
    <AdminTable
      headers={['Evento', 'Ciudad', 'Fecha', 'Precio', 'Capacidad', 'Estado', 'Acciones']}
      rows={EVENTS.map(e => [
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
          <button onClick={() => addToast({ message: `Editando: ${e.title}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
          <button onClick={() => addToast({ message: 'Evento eliminado', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ])}
    />
  </div>
);

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
        {[{ l: 'En escrow', v: '€1,240', c: 'bg-yellow-50', i: '🔒' }, { l: 'Completados', v: '€38.4k', c: 'bg-green-50', i: '✅' }, { l: 'En disputa', v: '€80', c: 'bg-red-50', i: '⚠️' }, { l: 'Comisión (15%)', v: '€6.2k', c: 'bg-orange-50', i: '💰' }].map(s => (
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
const CursosSection: React.FC<{ addToast: Function }> = ({ addToast }) => (
  <div>
    <PageHeader title="Cursos y Academia" subtitle="Gestiona los cursos de la plataforma" action={
      <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nuevo curso creado', type: 'success' })}>Nuevo curso</Button>
    } />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { title: 'Bachata Sensual — Nivel Principiante', instructor: 'DJ Bacha Flow', students: 234, price: 49, status: 'active' },
        { title: 'Salsa On2 — Curso Completo',           instructor: 'La Reina del Ritmo', students: 567, price: 89, status: 'active' },
        { title: 'Kizomba Fusion',                        instructor: 'Instructora Celia', students: 123, price: 39, status: 'draft' },
        { title: 'DJ Latinity — Producción Musical',      instructor: 'DJ Mambo King', students: 89, price: 149, status: 'active' },
        { title: 'Técnicas de Improvisación en Salsa',    instructor: 'Marcos & Elena', students: 45, price: 59, status: 'active' },
      ].map(course => (
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
              <button onClick={() => addToast({ message: `Editando: ${course.title}`, type: 'info' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit className="w-4 h-4" /></button>
              <button onClick={() => addToast({ message: 'Curso eliminado', type: 'error' })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── 12. FINANZAS ──────────────────────────────────────────────────────────
const FinanzasSection: React.FC = () => (
  <div>
    <PageHeader title="Finanzas" subtitle="Control financiero completo de la plataforma" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: 'Revenue total', value: '€48,200', sub: '+22% este mes', color: 'text-green-600' },
        { label: 'Comisiones (15%)', value: '€7,230', sub: 'Este mes', color: 'text-brand-orange' },
        { label: 'Suscripciones', value: '€6,240', sub: '312 activas', color: 'text-purple-600' },
        { label: 'Pendiente pago', value: '€3,120', sub: 'En escrow', color: 'text-yellow-600' },
      ].map(s => (
        <div key={s.label} className="card-white p-5">
          <p className="text-gray-400 text-xs font-medium">{s.label}</p>
          <p className={`font-black text-2xl ${s.color} mt-1`}>{s.value}</p>
          <p className="text-gray-400 text-xs mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4">Revenue mensual</h3>
        {[
          { month: 'May 2026', val: 48200, pct: 100 },
          { month: 'Abr 2026', val: 39400, pct: 82 },
          { month: 'Mar 2026', val: 35100, pct: 73 },
          { month: 'Feb 2026', val: 28600, pct: 59 },
          { month: 'Ene 2026', val: 24300, pct: 50 },
        ].map(r => (
          <div key={r.month} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{r.month}</span>
              <span className="font-bold">€{r.val.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-full bg-brand-orange rounded-full" style={{ width: `${r.pct}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-4">Pagos pendientes de liberar</h3>
        {[
          { artist: 'DJ Mambo King', amount: '€450', event: 'Boda García', date: '20 Jun' },
          { artist: 'La Reina',      amount: '€350', event: 'Festival BCN', date: '14 Jun' },
          { artist: 'Orquesta Fuego', amount: '€2,500', event: 'Congreso Mundial', date: '25 Jun' },
        ].map(p => (
          <div key={p.artist} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-semibold text-sm text-gray-800">{p.artist}</p>
              <p className="text-gray-400 text-xs">{p.event} · {p.date}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-gray-900">{p.amount}</span>
              <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200">Liberar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── 13. DISEÑO WEB ────────────────────────────────────────────────────────
const DisenoSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const [colors, setColors] = useState({ primary: '#F97316', secondary: '#111111', accent: '#EA580C' });
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
        </div>
        <div className="card-white p-6">
          <h3 className="font-bold text-gray-900 mb-4">Textos y SEO</h3>
          <div className="space-y-4">
            <Input label="Nombre del sitio" defaultValue="¡Ritmo Latino!" />
            <Input label="Claim / Tagline" defaultValue="Encuentra tu Pasión Latina" />
            <Input label="Meta descripción" defaultValue="La plataforma #1 de entretenimiento latino..." />
          </div>
        </div>
        <div className="card-white p-6">
          <h3 className="font-bold text-gray-900 mb-4">Hero Section</h3>
          <div className="space-y-4">
            <Input label="Título principal" defaultValue="Encuentra tu Pasión Latina" />
            <Input label="Subtítulo" defaultValue="Explora la colección más exclusiva de locales..." />
            <div>
              <label className="text-gray-600 text-sm font-medium block mb-1">Imagen del hero</label>
              <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3 bg-gray-50">
                <img src="https://picsum.photos/seed/latinodance/60/40" alt="" className="w-16 h-10 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">hero-dancing.jpg</p>
                  <p className="text-xs text-gray-400">1400 × 500px</p>
                </div>
                <button onClick={() => addToast({ message: 'Cambiar imagen próximamente', type: 'info' })} className="text-brand-orange text-sm font-semibold hover:underline">Cambiar</button>
              </div>
            </div>
          </div>
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
const RolesSection: React.FC<{ addToast: Function }> = ({ addToast }) => {
  const roles = [
    { name: 'Superadministrador', users: 1,  color: 'bg-red-100 text-red-700',    perms: ['Todo', 'Configuración', 'Finanzas', 'Roles'] },
    { name: 'Administrador',      users: 3,  color: 'bg-orange-100 text-orange-700', perms: ['Usuarios', 'Eventos', 'Artistas', 'Moderación'] },
    { name: 'Moderador',          users: 8,  color: 'bg-blue-100 text-blue-700',   perms: ['Reseñas', 'Disputas', 'Contenido'] },
    { name: 'Artista',            users: 523, color: 'bg-purple-100 text-purple-700', perms: ['Mi perfil', 'Servicios', 'Bookings'] },
    { name: 'Venue',              users: 47,  color: 'bg-green-100 text-green-700', perms: ['Mi local', 'Eventos', 'Estadísticas'] },
    { name: 'Usuario',            users: 665, color: 'bg-gray-100 text-gray-600',  perms: ['Explorar', 'Reservar', 'Reseñar'] },
  ];
  return (
    <div>
      <PageHeader title="Roles y Permisos" subtitle="Gestiona los roles de acceso a la plataforma" action={
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => addToast({ message: 'Nuevo rol creado', type: 'success' })}>Nuevo rol</Button>
      } />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <div key={role.name} className="card-white p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${role.color}`}>{role.name}</span>
              <span className="text-gray-400 text-sm">{role.users} usuarios</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.perms.map(p => <span key={p} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg">{p}</span>)}
            </div>
            <button onClick={() => addToast({ message: `Editando rol: ${role.name}`, type: 'info' })} className="mt-4 text-brand-orange text-xs font-semibold hover:underline">Editar permisos →</button>
          </div>
        ))}
      </div>
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
        { label: 'IPs bloqueadas', val: '4', icon: <Shield className="w-5 h-5 text-orange-500" />, color: 'bg-orange-50' },
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
