import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Compass, MapPin, Calendar, Users, Music2,
  Briefcase, BookOpen, Radio, Megaphone, MessageCircle,
  LayoutDashboard, User, ChevronDown, ChevronRight,
  Ticket, Video, Gift
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to?: string;
  children?: { label: string; to: string; icon?: React.ReactNode }[];
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'EXPLORADOR',
    items: [
      { label: 'Explorador',   icon: <Compass className="w-4 h-4" />,    to: '/explorar' },
      { label: 'Localidades',  icon: <MapPin className="w-4 h-4" />,     to: '/venues' },
      { label: 'Eventos',      icon: <Calendar className="w-4 h-4" />,   to: '/eventos' },
      { label: 'Artistas',     icon: <Music2 className="w-4 h-4" />,     to: '/artistas' },
      { label: 'Bailarines',   icon: <Users className="w-4 h-4" />,      to: '/artistas?tipo=dancer' },
    ],
  },
  {
    section: 'CATEGORÍAS',
    items: [
      { label: 'Conciertos y Música en Vivo', icon: <Music2 className="w-4 h-4" />,    to: '/eventos?cat=conciertos' },
      { label: 'Festivales y Congresos',      icon: <Ticket className="w-4 h-4" />,    to: '/eventos?cat=festivales' },
      { label: 'Noches de club',              icon: <Video className="w-4 h-4" />,     to: '/eventos?cat=club' },
      { label: 'Talleres y clases',           icon: <BookOpen className="w-4 h-4" />,  to: '/marketplace?cat=talleres' },
      { label: 'Clases y Academia',           icon: <BookOpen className="w-4 h-4" />,  to: '/marketplace?cat=clases' },
      { label: 'Eventos Sociales',            icon: <Users className="w-4 h-4" />,     to: '/eventos?cat=social' },
      { label: 'Competiciones',               icon: <Gift className="w-4 h-4" />,      to: '/eventos?cat=competiciones' },
    ],
  },
  {
    section: 'MERCADO',
    items: [
      { label: 'Ruta de Hoy',   icon: <Compass className="w-4 h-4" />,    to: '/' },
      { label: 'Proyectos',     icon: <Briefcase className="w-4 h-4" />,  to: '/marketplace' },
      { label: 'Clases en vivo',icon: <Video className="w-4 h-4" />,      to: '/live' },
      { label: 'Ofertas',       icon: <Gift className="w-4 h-4" />,       to: '/marketplace?cat=ofertas' },
    ],
  },
  {
    section: 'COMUNIDAD',
    items: [
      { label: 'Anuncios',  icon: <Megaphone className="w-4 h-4" />,      to: '/comunidad' },
      { label: 'Academia',  icon: <BookOpen className="w-4 h-4" />,       to: '/academia' },
      { label: 'Comunidad', icon: <MessageCircle className="w-4 h-4" />,  to: '/chat' },
    ],
  },
  {
    section: 'MI CUENTA',
    items: [
      { label: 'Mi Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, to: '/dashboard' },
      { label: 'Mi Perfil',    icon: <User className="w-4 h-4" />,            to: '/perfil' },
    ],
  },
];

interface SidebarProps { open: boolean; onClose?: () => void; }

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 z-40 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-100 flex-shrink-0">
          <span className="text-2xl">🎵</span>
          <span className="font-display font-black text-lg">
            <span className="text-gray-900">¡Ritmo </span>
            <span className="text-brand-orange">Latino!</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(group => (
            <div key={group.section}>
              <p className="nav-section">{group.section}</p>
              {group.items.map(item => (
                <NavLink
                  key={item.label}
                  to={item.to || '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link mb-0.5 ${isActive && item.to !== '/' ? 'active' : ''}`
                  }
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 text-xs">
            <Radio className="w-4 h-4 text-brand-orange flex-shrink-0" />
            <span className="truncate">Radio Latino — En directo</span>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
