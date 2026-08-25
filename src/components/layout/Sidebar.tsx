import React, { useState } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import {
  Compass, MapPin, Calendar, Users, Music2,
  Briefcase, BookOpen, Radio, Megaphone, MessageCircle,
  LayoutDashboard, User, ChevronDown, ChevronRight,
  Ticket, Video, Gift, Sparkles, Home, Tv, Heart, Trophy, LogOut
} from 'lucide-react';
import { useSiteConfigStore, useAuthStore } from '../../store/appStore';
import { supabaseLogout } from '../../hooks/useSupabaseAuth';

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
      { label: '👤 Mi perfil (público)', icon: <Users className="w-4 h-4" />, to: '/mi-perfil' },
      { label: '🎬 BailaNow TV', icon: <Tv className="w-4 h-4" />,       to: '/tv' },
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
      { label: '❤️ Planes Para Bailar', icon: <Compass className="w-4 h-4" />, to: '/rutas' },
      { label: 'Proyectos',      icon: <Briefcase className="w-4 h-4" />,  to: '/marketplace' },
      { label: '📢 Promociónate',icon: <Megaphone className="w-4 h-4" />, to: '/promocionate' },
      { label: 'Ofertas',        icon: <Gift className="w-4 h-4" />,       to: '/marketplace?cat=ofertas' },
    ],
  },
  {
    section: 'COMUNIDAD',
    items: [
      { label: '💃 Pareja de baile',  icon: <Heart className="w-4 h-4" />,         to: '/parejas' },
      { label: '🏆 Retos de baile',   icon: <Trophy className="w-4 h-4" />,        to: '/retos' },
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
  const { isAuthenticated } = useAuthStore();
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

  // Puntúa cuánto coincide un link con la URL actual (path + query). -1 = no coincide.
  // Query específica puntúa más que ruta pelada, para elegir el match más concreto.
  const scoreOf = (to: string): number => {
    if (to === '/') return location.pathname === '/' ? 1 : -1;
    const [toPath, toQuery] = to.split('?');
    if (location.pathname !== toPath) return -1;
    if (!toQuery) return location.search ? -1 : 1; // ruta sin query: solo activa si la URL tampoco tiene query
    const toParams = new URLSearchParams(toQuery);
    for (const [k, v] of toParams.entries()) if (searchParams.get(k) !== v) return -1;
    return 10 + Array.from(toParams.keys()).length;
  };

  // Un ÚNICO ganador: el primer item (en orden de render) con la mejor puntuación.
  // Evita que varias categorías con la misma ruta (/artistas) se marquen todas a la vez.
  const orderedItems: { id: string; to: string }[] = [
    { id: 'inicio', to: '/' },
    ...categoryGroups.flatMap(g => g.items.map(i => ({ id: i.label + i.to, to: i.to }))),
    ...NAV.filter(g => g.section === 'MI CUENTA').flatMap(g => g.items.map(i => ({ id: i.label, to: i.to || '/' }))),
  ];
  let bestScore = -1;
  let activeId = '';
  for (const it of orderedItems) {
    const s = scoreOf(it.to);
    if (s > bestScore) { bestScore = s; activeId = it.id; }
  }
  const isNavItemActive = (id: string) => bestScore >= 1 && id === activeId;

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-60 bg-surface-elevated border-r border-hairline/10 z-40 flex flex-col transition-transform duration-300 shadow-elevation-1 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo — enlaza a Inicio */}
        <NavLink to="/" onClick={onClose}
          className="flex items-center gap-2 px-5 h-14 border-b border-hairline/10 flex-shrink-0 hover:opacity-90 transition-opacity">
          {siteLogo ? (
            <img src={siteLogo} alt="BailaNow" className="h-10 max-w-[180px] object-contain" />
          ) : (
            <>
              <span className="text-2xl">💃</span>
              <span className="font-display font-black text-lg">
                <span className="text-ink-primary">Baila</span>
                <span className="bg-gradient-to-r from-pink-500 to-fuchsia-600 bg-clip-text text-transparent">Now</span>
              </span>
            </>
          )}
        </NavLink>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3" style={{ scrollbarWidth: 'none' }}>
          {/* Inicio — acceso fijo (no es categoría) */}
          <NavLink to="/" onClick={onClose}
            className={() => `nav-link mb-0.5 ${isNavItemActive('inicio') ? 'active' : ''}`}>
            <Home className="w-[18px] h-[18px] flex-shrink-0" />
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
                  className={() => `nav-link mb-0.5 ${isNavItemActive(item.label + item.to) ? 'active' : ''}`}
                >
                  <span className="w-[18px] flex items-center justify-center text-base flex-shrink-0">{item.icon}</span>
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
                  className={() => `nav-link mb-0.5 ${isNavItemActive(item.label) ? 'active' : ''}`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
              {isAuthenticated && (
                <button
                  onClick={async () => { onClose?.(); await supabaseLogout(); }}
                  className="nav-link mb-0.5 w-full text-left text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="truncate">Cerrar sesión</span>
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Premium CTA */}
        <div className="px-3 pb-3">
          <NavLink to="/promocionate" onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">👑</span>
            <div className="min-w-0">
              <p className="font-black text-xs leading-tight">Baila sin límites</p>
              <p className="text-white/80 text-[10px] leading-tight">Hazte Premium</p>
            </div>
          </NavLink>
        </div>

        {/* Radio live indicator */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 border border-pink-100 text-gray-500 text-xs">
            <Radio className="w-4 h-4 text-pink-500 flex-shrink-0" />
            <span className="truncate text-gray-600">Radio Latino — En directo</span>
            <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse flex-shrink-0 shadow-lg shadow-pink-500/50" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
