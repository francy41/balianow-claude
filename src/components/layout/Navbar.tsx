import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Globe, ChevronDown, Menu, LogOut, LayoutDashboard, User, Shield, Edit3, ShoppingCart } from 'lucide-react';
import ProfileEditModal from '../ProfileEditModal';
import { useAuthStore, useUIStore, useCartStore } from '../../store/appStore';
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
  const cart = useCartStore();
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const handleLogout = () => {
    logout();
    addToast({ message: 'Sesión cerrada', type: 'success' });
    navigate('/');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : '';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-pink-500/20 z-50 flex items-center px-4 gap-3 backdrop-blur-xl">
      {/* Hamburger */}
      <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-gray-300 flex-shrink-0">
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-1 font-display font-black text-lg flex-shrink-0">
        <span className="text-white">Baila</span>
        <span className="bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent">Now</span>
      </Link>

      {/* Green OPEN NOW button */}
      <Link to="/venues?open=true" className="hidden sm:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-lg shadow-emerald-500/30 ml-2 animate-pulse hover:animate-none">
        <span className="w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
        <span className="w-2 h-2 bg-white rounded-full absolute ml-0" />
        ABIERTO
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
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 transition-all">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-1.5">

        {isAuthenticated && user && (
          /* Role badge (admin only on desktop) */
          <div className="hidden lg:flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 mr-1 border border-white/10">
            <Shield className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-300 max-w-[120px] truncate">{roleLabel}</span>
            <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
          </div>
        )}

        {/* Globe */}
        <button className="hidden sm:flex p-2 rounded-lg hover:bg-white/10 text-gray-400">
          <Globe className="w-4 h-4" />
        </button>

        {/* Language toggle */}
        <div className="hidden sm:flex items-center gap-0 bg-white/10 rounded-lg p-0.5 border border-white/10">
          <button onClick={() => setLang('ES')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${lang === 'ES' ? 'bg-pink-500 shadow-sm text-white' : 'text-gray-500'}`}>
            ES
          </button>
          <button onClick={() => setLang('EN')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${lang === 'EN' ? 'bg-pink-500 shadow-sm text-white' : 'text-gray-500'}`}>
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
              placeholder="Buscar..." className="bg-white/10 border border-pink-500/30 text-white placeholder-gray-500 rounded-lg py-1.5 px-3 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
            <button onClick={() => setSearchOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
            <Search className="w-4 h-4" />
          </button>
        )}

        {isAuthenticated && user ? (
          <>
            {/* Cart button — always visible when logged in */}
            <button
              onClick={() => navigate('/promocionate')}
              className="relative p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-fuchsia-400 transition-colors"
              title="Mi carrito"
            >
              <ShoppingCart className="w-4 h-4" />
              {cart.items.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full text-[9px] flex items-center justify-center font-black text-white shadow-lg shadow-pink-500/40 animate-pulse">
                  {cart.items.length > 9 ? '9+' : cart.items.length}
                </span>
              )}
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-white/10 text-gray-400">
              <Bell className="w-4 h-4" />
              {user.notifications > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white">
                  {user.notifications > 9 ? '9+' : user.notifications}
                </span>
              )}
            </button>

            {/* User name + role (desktop) */}
            <div className="relative group">
              <button className="hidden sm:flex items-center gap-2 hover:bg-white/10 rounded-xl px-2 py-1 transition-all">
                <div className="text-right">
                  <p className="text-xs font-bold text-white leading-none">{user.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-pink-400 leading-none mt-0.5 capitalize">{roleLabel}</p>
                </div>
                <Avatar src={user.avatar} name={user.name} size="sm" />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-pink-500/20 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="p-3 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10">
                  <p className="text-white font-bold text-sm">{user.name}</p>
                  <p className="text-pink-400 text-xs capitalize">{roleLabel}</p>
                </div>
                <div className="p-2">
                  <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 text-sm transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Mi Dashboard
                  </Link>
                  <button onClick={() => setShowEdit(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 text-sm transition-colors text-left">
                    <Edit3 className="w-4 h-4" /> Editar mi perfil
                  </button>
                  <Link to="/wallet" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 text-sm transition-colors">
                    💳 Wallet — €{user.wallet.toFixed(0)}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-pink-500/20 text-pink-400 text-sm font-semibold transition-colors mt-1">
                      <Shield className="w-4 h-4" /> Panel Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-sm transition-colors mt-1">
                    <LogOut className="w-4 h-4" /> Salir
                  </button>
                </div>
              </div>
            </div>

            {/* Panel link (admin) */}
            {isAdmin && (
              <Link to="/admin"
                className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25">
                ⚙️ Panel Admin
              </Link>
            )}

            {/* SALIR link */}
            <button onClick={handleLogout}
              className="text-xs sm:text-sm font-bold text-red-400 hover:text-red-300 transition-colors px-1">
              SALIR
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-gray-400 text-sm font-semibold hover:text-pink-400 transition-colors px-3 py-1.5 hidden sm:block">
              Entrar
            </Link>
            <Link to="/auth?tab=register" className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-bold py-1.5 px-4 rounded-lg hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25">
              Únete
            </Link>
          </div>
        )}
      </div>
      <ProfileEditModal open={showEdit} onClose={() => setShowEdit(false)} />
    </header>
  );
};

export default Navbar;
