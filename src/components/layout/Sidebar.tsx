import React, { useState } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import {
  Compass, MapPin, Calendar, Users, Music2,
  Briefcase, BookOpen, Radio, Megaphone, MessageCircle,
  LayoutDashboard, User, ChevronDown, ChevronRight,
  Ticket, Video, Gift, Sparkles, Home
} from 'lucide-react';
import { useSiteConfigStore } from '../../store/appStore';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to?: string;
  children?: { label: string; to: string; icon?: React.ReactNode }[];
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'CERCA DE MÍ',
    items: [
      { label: 'Cerca de mí',  icon: <MapPin className="w-4 h-4" />,     to: '/cerca' },
      { label: 'Ciudades',      icon: <MapPin className="w-4 h-4" />,     to: '/venues' },
      { label: 'Eventos',      icon: <Calendar className="w-4 h-4" />,   to: '/eventos' },
      { label: 'Artistas',     icon: <Music2 className="w-4 h-4" />,     to: '/artistas' },
      { label: 'Bailarines',   icon: <Users className="w-4 h-4" />,      to: '/artistas?tipo=dancer' },
      { label: '🟢 Abiertos Ahora', icon: <MapPin className="w-4 h-4" />, to: '/venues?open=true' },
    ],
  },
  {
    section: 'CATEGORÍAS',
    items: [
      { label: '🪩 Discotecas Latinas',        icon: <MapPin className="w-4 h-4" />,    to: '/venues?type=Discoteca' },
      { label: 'Conciertos y Música en Vivo', icon: <Music2 className="w-4 h-4" />,    to: '/eventos?cat=conciertos' },
      { label: 'Festivales y Congresos',      icon: <Ticket className="w-4 h-4" />,    to: '/eventos?cat=festivales' },
      { label: 'Noches de club',              icon: <Video className="w-4 h-4" />,     to: '/eventos?cat=club' },
      { label: 'Talleres y clases',           icon: <BookOpen className="w-4 h-4" />,  to: '/marketplace?cat=talleres' },
      { label: 'Clases y Academia',           icon: <BookOpen className="w-4 h-4" />,  to: '/marketplace?cat=clases' },
      { label: 'Eventos Sociales',            icon: <Users className="w-4 h-4" />,     to: '/eventos?cat=social' },
      { label: 'Competiciones',               icon: <Gift className="w-4 h-4" />,      to: '/eventos?cat=competiciones' },
      { label: '🤖 Baila con IA',             icon: <Sparkles className="w-4 h-4" />,  to: '/baila-ia' },
      { label: '🎬 Estudio Coreográfico',     icon: <Sparkles className="w-4 h-4" />,  to: '/coreografias' },
    ],
  },
  {
    section: 'MERCADO',
    items: [
      { label: 'Ruta de Hoy',    icon: <Compass className="w-4 h-4" />,    to: '/' },
      { label: 'Proyectos',      icon: <Briefcase className="w-4 h-4" />,  to: '/marketplace' },
      { label: '📢 Promociónate',icon: <Megaphone className="w-4 h-4" />, to: '/promocionate' },
      { label: 'Ofertas',        icon: <Gift className="w-4 h-4" />,       to: '/marketplace?cat=ofertas' },
    ],
  },
  {
    section: 'COMUNIDAD',
    items: [
      { label: 'Anuncios',  icon: <Megaphone className="w-4 h-4" />,      to: '/comunidad' },
      { label: 'Academia',  icon: <BookOpen className="w-4 h-4" />,       to: '/clases' },
      { label: 'Comunidad', icon: <MessageCircle className="w-4 h-4" />,  to: '/chat' },
    ],
  },
  {
    section: 'MI CUENTA',
    items: [
      { label: 'Mi Dashboard',  icon: <LayoutDashboard className="w-4 h-4" />, to: '/dashboard' },
      { label: 'Mi Perfil',     icon: <User className="w-4 h-4" />,            to: '/perfil' },
    ],
  },
];

interface SidebarProps { open: boolean; onClose?: () => void; }

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const siteLogo = useSiteConfigStore(s => s.siteLogo);
  const homeCategories = useSiteConfigStore(s => s.homeCategories);

  // Grupos del sidebar construidos desde homeCategories (Admin → Categorías = fuente única).
  // Solo categorías raíz activas, agrupadas por sección y ordenadas por display_order.
  const SECTION_LABEL: Record<string, string> = { main: 'PRINCIPAL', mercado: 'MERCADO', comunidad: 'COMUNIDAD' };
  const categoryGroups = (['main', 'mercado', 'comunidad'] as const).map(section => ({
    section: SECTION_LABEL[section],
    items: homeCategories
      .filter(c => c.section === section && c.active && !c.parent_id)
      .sort((a, b) => a.display_order - b.display_order)
      .map(c => ({ label: c.name, icon: c.icon, to: c.route || '/' })),
  })).filter(g => g.items.length > 0);

  // isActive que compara pathname + query params para evitar dobles activos
  const isNavItemActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    const [toPath, toQuery] = to.split('?');
    if (location.pathname !== toPath) return false;
    if (!toQuery) return !location.search; // si el link no tiene query, solo activo si URL tampoco
    const toParams = new URLSearchParams(toQuery);
    return Array.from(toParams.entries()).every(([k, v]) => searchParams.get(k) === v);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-60 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-r border-pink-500/10 z-40 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo — enlaza a Inicio */}
        <NavLink to="/" onClick={onClose}
          className="flex items-center gap-2 px-5 h-14 border-b border-pink-500/10 flex-shrink-0 hover:opacity-90 transition-opacity">
          {siteLogo ? (
            <img src={siteLogo} alt="BailaNow" className="h-10 max-w-[180px] object-contain" />
          ) : (
            <>
              <span className="text-2xl">💃</span>
              <span className="font-display font-black text-lg">
                <span className="text-white">Baila</span>
                <span className="bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent">Now</span>
              </span>
            </>
          )}
        </NavLink>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3" style={{ scrollbarWidth: 'none' }}>
          {/* Inicio — acceso fijo (no es categoría) */}
          <NavLink to="/" onClick={onClose}
            className={`nav-link mb-0.5 ${isNavItemActive('/') ? 'active' : ''}`}>
            <Home className="w-4 h-4" />
            <span className="truncate">Inicio</span>
          </NavLink>

          {/* Navegación principal — fuente única: Admin → Categorías (homeCategories) */}
          {categoryGroups.map(group => (
            <div key={group.section}>
              <p className="nav-section">{group.section}</p>
              {group.items.map(item => (
                <NavLink
                  key={item.label + item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`nav-link mb-0.5 ${isNavItemActive(item.to) ? 'active' : ''}`}
                >
                  <span className="w-4 h-4 flex items-center justify-center text-sm">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* MI CUENTA — estático (no son categorías) */}
          {NAV.filter(g => g.section === 'MI CUENTA').map(group => (
            <div key={group.section}>
              <p className="nav-section">{group.section}</p>
              {group.items.map(item => (
                <NavLink
                  key={item.label}
                  to={item.to || '/'}
                  onClick={onClose}
                  className={`nav-link mb-0.5 ${isNavItemActive(item.to || '/') ? 'active' : ''}`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Radio live indicator */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-gray-400 text-xs">
            <Radio className="w-4 h-4 text-pink-400 flex-shrink-0" />
            <span className="truncate text-gray-300">Radio Latino — En directo</span>
            <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse flex-shrink-0 shadow-lg shadow-pink-500/50" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
