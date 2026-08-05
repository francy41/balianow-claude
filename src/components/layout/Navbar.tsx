import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, LogOut, LayoutDashboard, Edit3, ShoppingCart, MapPin, MessageCircle, ChevronDown, Shield } from 'lucide-react';
import NotificationsBell from '../NotificationsBell';
import ProfileEditModal from '../ProfileEditModal';
import { useAuthStore, useUIStore, useCartStore, useSiteConfigStore } from '../../store/appStore';
import { supabaseLogout } from '../../hooks/useSupabaseAuth';
import { Avatar } from '../ui';
import LanguageSelector from '../LanguageSelector';

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
  const { user, isAuthenticated } = useAuthStore();
  const { siteLogo } = useSiteConfigStore();
  const { addToast } = useUIStore();
  const cart = useCartStore();
  const [showEdit, setShowEdit] = useState(false);

  const handleLogout = async () => {
    await supabaseLogout();   // cierra sesión en Supabase (no solo estado local)
    addToast({ message: 'Sesión cerrada', type: 'success' });
    navigate('/');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : '';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 border-b border-gray-200/80 z-50 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 backdrop-blur-xl shadow-sm">
      {/* Hamburger (mobile) */}
      <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 flex-shrink-0">
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-1 font-display font-black text-lg flex-shrink-0">
        {siteLogo ? (
          <img src={siteLogo} alt="BailaNow" className="h-8 max-w-[150px] object-contain" />
        ) : (
          <>
            <span className="text-gray-900">Baila</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-fuchsia-600">Now</span>
          </>
        )}
      </Link>

      {/* City selector (Airbnb style) */}
      <button
        onClick={() => navigate('/venues')}
        className="hidden sm:flex items-center gap-1.5 flex-shrink-0 pl-3 pr-2.5 py-2 rounded-full border border-gray-200 hover:shadow-md hover:border-gray-300 text-gray-700 transition-all"
        title="Cambiar ciudad"
      >
        <MapPin className="w-4 h-4 text-pink-500" />
        <span className="text-sm font-semibold">Madrid, España</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {/* Search (Airbnb pill) — abre el GlobalSearch (Ctrl+K) */}
      <button
        onClick={() => window.dispatchEvent(new Event('bn:open-search'))}
        className="flex-1 max-w-xl flex items-center gap-2.5 px-4 py-2 rounded-full border border-gray-200 hover:shadow-md hover:border-gray-300 text-gray-500 transition-all"
        title="Buscar (Ctrl+K)"
      >
        <Search className="w-4 h-4 text-pink-500 flex-shrink-0" />
        <span className="text-sm truncate">¿Qué quieres hacer hoy?</span>
        <span className="ml-auto text-[10px] hidden md:inline bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-400 flex-shrink-0">Ctrl K</span>
      </button>

      <div className="hidden lg:block flex-shrink-0">
        <LanguageSelector />
      </div>

      {isAuthenticated && user ? (
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Messages */}
          <button
            onClick={() => navigate('/chat')}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-pink-500 transition-colors"
            title="Mensajes"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate('/promocionate')}
            className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-fuchsia-500 transition-colors"
            title="Mi carrito"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.items.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-pink-500 rounded-full text-[9px] flex items-center justify-center font-black text-white shadow-lg shadow-pink-500/40 animate-pulse">
                {cart.items.length > 9 ? '9+' : cart.items.length}
              </span>
            )}
          </button>

          {/* Notifications */}
          <NotificationsBell />

          {/* Profile */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:bg-gray-100 rounded-full p-1 sm:pl-2 transition-all">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10">
                <p className="text-gray-900 font-bold text-sm">{user.name}</p>
                <p className="text-pink-500 text-xs capitalize">{roleLabel}</p>
              </div>
              <div className="p-2">
                <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Mi Dashboard
                </Link>
                <button onClick={() => setShowEdit(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm transition-colors text-left">
                  <Edit3 className="w-4 h-4" /> Editar mi perfil
                </button>
                <Link to="/wallet" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm transition-colors">
                  💳 Wallet — €{user.wallet.toFixed(0)}
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-pink-50 text-pink-600 text-sm font-semibold transition-colors mt-1">
                    <Shield className="w-4 h-4" /> Panel Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 text-sm transition-colors mt-1">
                  <LogOut className="w-4 h-4" /> Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/auth" className="text-gray-600 text-sm font-semibold hover:text-pink-500 transition-colors px-3 py-2 hidden sm:block">
            Entrar
          </Link>
          <Link to="/auth?tab=register" className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-bold py-2 px-4 rounded-full hover:shadow-lg hover:shadow-pink-500/30 transition-all">
            Únete
          </Link>
        </div>
      )}
      <ProfileEditModal open={showEdit} onClose={() => setShowEdit(false)} />
    </header>
  );
};

export default Navbar;
