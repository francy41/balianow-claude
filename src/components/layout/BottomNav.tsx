import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, CalendarDays, Megaphone, Navigation2, Building2, User } from 'lucide-react';
import { useAuthStore } from '../../store/appStore';
import { Avatar } from '../ui';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const tabs = [
    { to: '/',             icon: <Home className="w-[18px] h-[18px]" />,        label: 'Inicio' },
    { to: '/cerca',        icon: <Navigation2 className="w-[18px] h-[18px]" />, label: 'Cerca' },
    { to: '/eventos',      icon: <CalendarDays className="w-[18px] h-[18px]" />,label: 'Eventos' },
    { to: '/mapa',         icon: <Building2 className="w-[18px] h-[18px]" />,   label: 'Ciudades' },
    { to: '/promocionate', icon: <Megaphone className="w-[18px] h-[18px]" />,   label: 'Promo', dot: true },
    {
      to: isAuthenticated ? '/dashboard' : '/auth',
      icon: isAuthenticated && user
        ? <Avatar src={user.avatar} name={user.name} size="xs" />
        : <User className="w-[18px] h-[18px]" />,
      label: isAuthenticated ? 'Perfil' : 'Entrar'
    },
  ];

  // En el Home el FAB rosa (HomeFabStack) ya incluye "Buscar" — evitar dos botones superpuestos
  const isHome = location.pathname === '/';

  return (
    <>
    {/* Floating search button — solo móvil, fuera del Home */}
    {!isHome && (
    <button
      onClick={() => window.dispatchEvent(new Event('bn:open-search'))}
      className="lg:hidden fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-brand-orange text-white shadow-2xl shadow-pink-500/40 flex items-center justify-center active:scale-95"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      title="Buscar"
    >
      <Search className="w-5 h-5" />
    </button>
    )}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 border-t border-hairline/10 backdrop-blur-xl shadow-elevation-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center h-14">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to ||
            (tab.to !== '/' && location.pathname.startsWith(tab.to));
          return (
            <Link key={tab.to} to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center h-full gap-1 relative transition-all active:scale-95 ${
                isActive ? 'text-accent' : 'text-ink-tertiary'
              }`}
            >
              <div className={`relative grid place-items-center rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-accent/10 text-accent p-2'
                  : 'p-1.5'
              }`}>
                {tab.icon}
                {tab.dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-lg shadow-pink-500/50" />
                )}
              </div>
              <span className={`text-[8px] sm:text-[9px] font-bold ${isActive ? 'text-accent' : ''}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
};

export default BottomNav;
