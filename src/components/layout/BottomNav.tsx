import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Calendar, ShoppingBag, User, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/appStore';
import { Avatar } from '../ui';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const tabs = [
    { to: '/',            icon: <Home className="w-5 h-5" />,        label: 'Inicio' },
    { to: '/explorar',    icon: <Search className="w-5 h-5" />,      label: 'Explorar' },
    { to: '/eventos',     icon: <Calendar className="w-5 h-5" />,    label: 'Eventos' },
    { to: '/marketplace', icon: <ShoppingBag className="w-5 h-5" />, label: 'Mercado' },
    {
      to: isAuthenticated ? '/dashboard' : '/auth',
      icon: isAuthenticated && user
        ? <Avatar src={user.avatar} name={user.name} size="xs" />
        : <User className="w-5 h-5" />,
      label: isAuthenticated ? 'Perfil' : 'Entrar',
    },
  ];

  const isHome = location.pathname === '/';

  return (
    <>
      {/* FAB "+" — crear/promocionar (móvil, fuera del Home que ya tiene su propio FAB) */}
      {!isHome && (
        <button
          onClick={() => navigate('/promocionate')}
          className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-2xl shadow-pink-500/40 flex items-center justify-center active:scale-95 transition"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          title="Crear / Promocionar"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-gray-200 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center h-16">
          {tabs.map(tab => {
            const isActive = tab.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 relative active:scale-95 transition-all ${
                  isActive ? 'text-pink-600' : 'text-gray-400'
                }`}
              >
                <div className={`p-1.5 rounded-2xl transition-all ${
                  isActive ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30 -translate-y-0.5' : ''
                }`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] font-bold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
