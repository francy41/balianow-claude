import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Globe, ChevronDown, Menu, LogOut, LayoutDashboard, User, Shield } from 'lucide-react';
import { useAuthStore, useUIStore } from '../../store/appStore';
import { Avatar } from '../ui';

interface NavbarProps { onMenuToggle: () => void; }

const ROLE_LABELS: Record<string, string> = {
  admin:   'Superadministrador',
  dj:      'DJ / Artista',
  artist:  'Artista',
  dancer:  'Bailarín/a',
  venue:   'Local',
  user:    'Usuario',
};

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { addToast } = useUIStore();
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleLogout = () => {
    logout();
    addToast({ message: 'Sesión cerrada', type: 'success' });
    navigate('/');
  };

  const isAdmin = user?.role === 'admin';
  const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : '';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-50 flex items-center px-4 gap-3">
      {/* Hamburger */}
      <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0">
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-0.5 font-display font-black text-lg flex-shrink-0">
        <span className="text-gray-900">¡Ritmo </span>
        <span className="text-brand-orange">Latino!</span>
      </Link>

      {/* Desktop nav links */}
      <nav className="hidden lg:flex items-center gap-0.5 ml-4">
        {[
          { label: 'Explorador', to: '/explorar' },
          { label: 'Mercado',    to: '/marketplace' },
          { label: 'Eventos',    to: '/eventos' },
          { label: 'Artistas',   to: '/artistas' },
        ].map(link => (
          <Link key={link.to} to={link.to}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-brand-orange hover:bg-orange-50 transition-all">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-1.5">

        {isAuthenticated && user && (
          /* Role badge (admin only on desktop) */
          <div className="hidden lg:flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 mr-1">
            <Shield className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-700 max-w-[120px] truncate">{roleLabel}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
          </div>
        )}

        {/* Globe */}
        <button className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Globe className="w-4 h-4" />
        </button>

        {/* Language toggle */}
        <div className="hidden sm:flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setLang('ES')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${lang === 'ES' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
            ES
          </button>
          <button onClick={() => setLang('EN')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${lang === 'EN' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
            EN
          </button>
        </div>

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { navigate(`/explorar?q=${search}`); setSearchOpen(false); }
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Buscar..." className="input-field py-1.5 text-sm w-44" />
            <button onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Search className="w-4 h-4" />
          </button>
        )}

        {isAuthenticated && user ? (
          <>
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell className="w-4 h-4" />
              {user.notifications > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white">
                  {user.notifications > 9 ? '9+' : user.notifications}
                </span>
              )}
            </button>

            {/* User name + role (desktop) */}
            <div className="relative group">
              <button className="hidden sm:flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1 transition-all">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-800 leading-none">{user.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5 capitalize">{roleLabel}</p>
                </div>
                <Avatar src={user.avatar} name={user.name} size="sm" />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-gray-800 font-bold text-sm">{user.name}</p>
                  <p className="text-gray-400 text-xs capitalize">{roleLabel}</p>
                </div>
                <div className="p-2">
                  <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-sm transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Mi Dashboard
                  </Link>
                  <Link to="/perfil" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-sm transition-colors">
                    <User className="w-4 h-4" /> Mi Perfil
                  </Link>
                  <Link to="/wallet" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-sm transition-colors">
                    💳 Wallet — €{user.wallet.toFixed(0)}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-orange-50 text-brand-orange text-sm font-semibold transition-colors mt-1">
                      <Shield className="w-4 h-4" /> Panel Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 text-sm transition-colors mt-1">
                    <LogOut className="w-4 h-4" /> Salir
                  </button>
                </div>
              </div>
            </div>

            {/* Panel link (admin) */}
            {isAdmin && (
              <Link to="/admin"
                className="hidden sm:flex items-center gap-1.5 bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors">
                ⚙️ Panel Admin
              </Link>
            )}

            {/* SALIR link */}
            <button onClick={handleLogout}
              className="hidden sm:block text-sm font-bold text-red-500 hover:text-red-600 transition-colors px-1">
              SALIR
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-gray-600 text-sm font-semibold hover:text-brand-orange transition-colors px-3 py-1.5 hidden sm:block">
              Entrar
            </Link>
            <Link to="/auth?tab=register" className="btn-orange text-sm py-1.5 px-4 rounded-lg">
              Únete
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
