import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, LogOut, LayoutDashboard, Edit3, ShoppingCart, MapPin, MessageCircle, ChevronDown, Shield } from 'lucide-react';
import NotificationsBell from '../NotificationsBell';
import ProfileEditModal from '../ProfileEditModal';
import { useAuthStore, useUIStore, useCartStore, useSiteConfigStore } from '../../store/appStore';
import { supabaseLogout } from '../../hooks/useSupabaseAuth';
import { Avatar } from '../ui';
import LanguageSelector from '../LanguageSelector';
import { TOP_DANCE_CITIES } from '../../data/topDanceCities';

const SELECTED_CITY_KEY = 'bn_selected_city';

interface NavbarProps { onMenuToggle: () => void; }

const ROLE_LABELS: Record<string, string> = {
  admin:     'Superadministrador',
  superadmin:'Superadministrador',
  dj:        'DJ',
  artist:    'Artista',
  musician:  'Músico/a',
  band:      'Banda',
  animador:  'Animador/a',
  dancer:    'Bailarín/a',
  instructor:'Profesor/a',
  venue:     'Local',
  business:  'Vendedor',
  promoter:  'Promotor',
  partner:   'Partner',
  user:      'Usuario',
};

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { siteLogo } = useSiteConfigStore();
  const { addToast } = useUIStore();
  const cart = useCartStore();
  const [showEdit, setShowEdit] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem(SELECTED_CITY_KEY) || 'Madrid');
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cityOpen) return;
    const onClick = (e: MouseEvent) => { if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [cityOpen]);

  const cityMatches = TOP_DANCE_CITIES.filter(c => c.toLowerCase().includes(citySearch.trim().toLowerCase())).slice(0, 8);

  const pickCity = (city: string) => {
    setSelectedCity(city);
    localStorage.setItem(SELECTED_CITY_KEY, city);
    setCityOpen(false);
    setCitySearch('');
    navigate(`/venues?city=${encodeURIComponent(city)}`);
  };

  const handleLogout = async () => {
    await supabaseLogout();   // cierra sesión en Supabase (no solo estado local)
    addToast({ message: 'Sesión cerrada', type: 'success' });
    navigate('/');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : '';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface/90 border-b border-hairline/10 z-50 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 backdrop-blur-xl shadow-elevation-1">
      {/* Hamburger (mobile) */}
      <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl hover:bg-surface-elevated-2 text-ink-secondary flex-shrink-0">
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-1 font-display font-black text-lg flex-shrink-0">
        {siteLogo ? (
          <img src={siteLogo} alt="BailaNow" className="h-8 max-w-[150px] object-contain" />
        ) : (
          <>
            <span className="text-ink-primary">Baila</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-fuchsia-600">Now</span>
          </>
        )}
      </Link>

      {/* City selector (Airbnb style) */}
      <div ref={cityRef} className="relative hidden sm:block flex-shrink-0">
        <button
          onClick={() => setCityOpen(v => !v)}
          className="flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-full border border-hairline/15 hover:shadow-md hover:border-hairline/25 text-ink-secondary transition-all"
          title="Cambiar ciudad"
        >
          <MapPin className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold">{selectedCity}</span>
          <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary" />
        </button>
        {cityOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 bg-surface-elevated border border-hairline/10 rounded-2xl shadow-elevation-3 overflow-hidden z-50">
            <div className="p-2 border-b border-hairline/10">
              <input
                autoFocus
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder="Buscar ciudad..."
                className="w-full px-3 py-2 rounded-xl bg-surface-elevated-2 text-sm text-ink-primary placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-pink-500/40"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {cityMatches.length === 0 ? (
                <p className="px-3.5 py-3 text-sm text-ink-tertiary">Sin resultados</p>
              ) : cityMatches.map(c => (
                <button
                  key={c}
                  onClick={() => pickCity(c)}
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors ${c === selectedCity ? 'text-pink-600 font-semibold' : 'text-ink-secondary'}`}
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-pink-400" /> {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Superbuscador (GlobalSearch) — abre el modal que busca en locales, eventos, artistas, ciudades... */}
      <button
        onClick={() => window.dispatchEvent(new Event('bn:open-search'))}
        className="flex-1 min-w-0 max-w-xl flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/20 border border-pink-200/70 dark:border-pink-900/40 hover:shadow-lg hover:shadow-pink-500/10 hover:border-pink-300 text-ink-tertiary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        title="Buscar (Ctrl+K)"
      >
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Search className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="flex-1 min-w-0 text-left leading-tight">
          <span className="block text-sm text-ink-primary font-semibold truncate">¿Qué quieres hacer hoy?</span>
          <span className="hidden sm:block text-[10px] text-ink-tertiary truncate">Locales, eventos, artistas, ciudades…</span>
        </span>
        <span className="ml-auto text-[10px] hidden md:inline bg-surface-elevated-2 px-1.5 py-0.5 rounded font-mono text-ink-tertiary flex-shrink-0 border border-hairline/10">Ctrl K</span>
      </button>

      <div className="hidden lg:block flex-shrink-0">
        <LanguageSelector />
      </div>

      {isAuthenticated && user ? (
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Messages */}
          <button
            onClick={() => navigate('/chat')}
            className="p-2 rounded-full hover:bg-surface-elevated-2 text-ink-secondary hover:text-pink-500 transition-colors"
            title="Mensajes"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate('/promocionate')}
            className="relative p-2 rounded-full hover:bg-surface-elevated-2 text-ink-secondary hover:text-fuchsia-500 transition-colors"
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
            <button className="flex items-center gap-1.5 hover:bg-surface-elevated-2 rounded-full p-1 sm:pl-2 transition-all">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary hidden sm:block" />
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface-elevated border border-hairline/10 rounded-2xl shadow-elevation-3 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="p-3 border-b border-hairline/10 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10">
                <p className="text-ink-primary font-bold text-sm">{user.name}</p>
                <p className="text-pink-500 text-xs capitalize">{roleLabel}</p>
              </div>
              <div className="p-2">
                <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-elevated-2 text-ink-secondary text-sm transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Mi Dashboard
                </Link>
                <button onClick={() => setShowEdit(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-elevated-2 text-ink-secondary text-sm transition-colors text-left">
                  <Edit3 className="w-4 h-4" /> Editar mi perfil
                </button>
                <Link to="/wallet" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-elevated-2 text-ink-secondary text-sm transition-colors">
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
          <Link to="/auth" className="text-ink-secondary text-sm font-semibold hover:text-pink-500 transition-colors px-3 py-2 hidden sm:block">
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
