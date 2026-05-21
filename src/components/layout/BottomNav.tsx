import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, Megaphone, MapPin, User } from 'lucide-react';
import { useAuthStore } from '../../store/appStore';
import { Avatar } from '../ui';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const tabs = [
    { to: '/',       icon: <Home className="w-5 h-5" />,       label: 'Inicio' },
    { to: '/explorar', icon: <Search className="w-5 h-5" />,   label: 'Explorar' },
    { to: '/eventos',      icon: <Calendar className="w-5 h-5" />,  label: 'Eventos' },
    { to: '/venues',       icon: <MapPin className="w-5 h-5" />,    label: 'Ciudades' },
    { to: '/promocionate', icon: <Megaphone className="w-5 h-5" />, label: 'Promo', dot: true },
    {
      to: isAuthenticated ? '/dashboard' : '/auth',
      icon: isAuthenticated && user
        ? <Avatar src={user.avatar} name={user.name} size="xs" />
        : <User className="w-5 h-5" />,
      label: isAuthenticated ? 'Perfil' : 'Entrar'
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-gray-950 via-gray-900 to-gray-900/95 border-t border-pink-500/20 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center h-14">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to ||
            (tab.to !== '/' && location.pathname.startsWith(tab.to));
          return (
            <Link key={tab.to} to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 relative transition-all active:scale-95 ${
                isActive ? 'text-pink-400' : 'text-gray-500'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-pink-500/15' : ''}`}>
                {tab.icon}
                {tab.dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-lg shadow-pink-500/50" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold">{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full shadow-lg shadow-pink-500/50" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
