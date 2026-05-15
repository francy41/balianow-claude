import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, PlaySquare, User } from 'lucide-react';
import { useAuthStore } from '../../store/appStore';
import { Avatar } from '../ui';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  const tabs = [
    { to: '/',       icon: <Home className="w-5 h-5" />,       label: 'Inicio' },
    { to: '/explorar', icon: <Search className="w-5 h-5" />,   label: 'Explorar' },
    { to: '/eventos', icon: <Calendar className="w-5 h-5" />,  label: 'Eventos' },
    { to: '/live',   icon: <PlaySquare className="w-5 h-5" />, label: 'Live', dot: true },
    {
      to: isAuthenticated ? '/dashboard' : '/auth',
      icon: isAuthenticated && user
        ? <Avatar src={user.avatar} name={user.name} size="xs" />
        : <User className="w-5 h-5" />,
      label: isAuthenticated ? 'Perfil' : 'Entrar'
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg safe-area-pb">
      <div className="flex items-center">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to ||
            (tab.to !== '/' && location.pathname.startsWith(tab.to));
          return (
            <Link key={tab.to} to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative transition-all ${
                isActive ? 'text-brand-orange' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-semibold">{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-orange rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
