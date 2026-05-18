import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronRight, MapPin, Star, Check, X, ArrowRight, LayoutDashboard, Wallet, Briefcase, Clock, Shield, DollarSign, Users, TrendingUp } from 'lucide-react';
import { ARTISTS, EVENTS, VENUES } from '../data/mockData';
import { useAuthStore, useSiteConfigStore, getYouTubeId, usePerformerStore, PLATFORM_COMMISSION_RATE, type HeroSliderImage } from '../store/appStore';
import { useCMSStore, visibleHomeModules, activeCategories } from '../store/cmsStore';
import { Avatar, StarRating, SearchBar } from '../components/ui';

// Category interface
interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  route: string;
  section: 'main' | 'mercado' | 'comunidad';
  color_start: string;
  color_mid: string;
  color_end: string;
  shadow_color: string;
  display_order: number;
  active: boolean;
}

// ── COMMUNITY POSTS (Ruta de Hoy) ────────────────────────────────────────
const COMMUNITY_POSTS = [
  { id: 1, user: 'Elena G.',  text: '"Primera vez en Madrid, busca un local c..."', status: 'APROBADO' },
  { id: 2, user: 'Miguel A.', text: '"¿Alguien para practicar ruedas de casino..."', status: 'APROBADO' },
  { id: 3, user: 'Sofía T.',  text: '"Tengo 2 entradas extra para el concierto..."', status: 'RECHAZAR' },
  { id: 4, user: 'Daniel C.', text: '"¿Cuál es la mejor discoteca latina abierta..."', status: 'APROBADO' },
  { id: 5, user: 'María V.',  text: '"Buscamos grupo para ir a Tropical House..."', status: 'APROBADO' },
  { id: 6, user: 'Pedro K.',  text: '"Mensaje de spam: compra criptomo..."', status: 'RECHAZAR' },
  { id: 7, user: 'Carlos M.', text: '"El viernes voy a Madrid, ¿donde puedo sal..."', status: 'APROBADO' },
  { id: 8, user: 'Laura S.',  text: '"Busco pareja para ir a la social de salsa..."', status: 'APROBADO' },
  { id: 9, user: 'David R.',  text: '"¿Algún evento de Kizomba..."', status: 'APROBADO' },
];

// ── CITIES ────────────────────────────────────────────────────────────────
const CITIES = [
  { name: 'Madrid',    venues: 12, events: 8,  img: 'https://picsum.photos/seed/madrid2024/800/400' },
  { name: 'Barcelona', venues: 8,  events: 5,  img: 'https://picsum.photos/seed/barcelona2024/800/400' },
  { name: 'Valencia',  venues: 5,  events: 3,  img: 'https://picsum.photos/seed/valencia2024/800/400' },
  { name: 'Medellín',  venues: 6,  events: 4,  img: 'https://picsum.photos/seed/medellin2024/800/400' },
  { name: 'Cali',      venues: 9,  events: 6,  img: 'https://picsum.photos/seed/cali2024/800/400' },
];

// ── CATEGORIES ────────────────────────────────────────────────────────────
const CATEGORY_CARDS = [
  {
    name: 'Conciertos y Música en Vivo',
    img: 'https://picsum.photos/seed/concert2024/800/500',
    to: '/eventos?cat=conciertos',
    btnColor: 'bg-brand-orange',
  },
  {
    name: 'Festivales y Congresos',
    img: 'https://picsum.photos/seed/festival2024/800/500',
    to: '/eventos?cat=festivales',
    btnColor: 'bg-purple-600',
  },
  {
    name: 'Noches de club',
    img: 'https://picsum.photos/seed/nightclub2024/800/500',
    to: '/eventos?cat=club',
    btnColor: 'bg-pink-500',
  },
];

// ── RADIO STATIONS ─────────────────────────────────────────────────────────
const RADIO_STATIONS = [
  {
    name: 'Radio Bachata',
    sub: 'En directo 24/7',
    img: 'https://picsum.photos/seed/bachata-radio/120/120',
  },
  {
    name: 'Radio Latina Variada',
    sub: 'En directo 24/7',
    img: 'https://picsum.photos/seed/latina-radio/120/120',
  },
];

// ── HERO SLIDER ──────────────────────────────────────────────────────────
const HeroSlider: React.FC<{ images: HeroSliderImage[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % images.length), 3500);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  return (
    <div className="mt-6 overflow-hidden rounded-xl relative" style={{ height: 80 }}>
      <div
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ width: `${images.length * 100}%`, transform: `translateX(-${(current * 100) / images.length}%)` }}
      >
        {images.map(img => (
          <img key={img.id} src={img.url} alt={img.alt} className="h-full object-cover flex-shrink-0" style={{ width: `${100 / images.length}%` }} />
        ))}
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-brand-orange w-4' : 'bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

// Category interface with images
interface CategoryWithImage extends Category {
  image_url?: string;
}

// ── DEFAULT CATEGORIES (Fallback) ────────────────────────────────────────
const DEFAULT_CATEGORIES: CategoryWithImage[] = [
  { id: '1', name: 'Explorador', icon: '🧭', slug: 'explorador', route: '/explorar', section: 'main', color_start: '#EC407A', color_mid: '#FF1493', color_end: '#C2185B', shadow_color: 'rgba(236, 64, 122, 0.4)', display_order: 1, active: true, image_url: 'https://picsum.photos/seed/explorer2024/800/400' },
  { id: '2', name: 'Localidades', icon: '📍', slug: 'localidades', route: '/venues', section: 'main', color_start: '#F06292', color_mid: '#FF69B4', color_end: '#EC407A', shadow_color: 'rgba(240, 98, 146, 0.4)', display_order: 2, active: true, image_url: 'https://picsum.photos/seed/venues2024/800/400' },
  { id: '3', name: 'Eventos', icon: '🎉', slug: 'eventos', route: '/eventos', section: 'main', color_start: '#D81B60', color_mid: '#F50057', color_end: '#C2185B', shadow_color: 'rgba(216, 27, 96, 0.4)', display_order: 3, active: true, image_url: 'https://picsum.photos/seed/events2024/800/400' },
  { id: '4', name: 'Artistas', icon: '🎧', slug: 'artistas', route: '/artistas', section: 'main', color_start: '#FF6B9D', color_mid: '#FF1493', color_end: '#EC407A', shadow_color: 'rgba(255, 107, 157, 0.4)', display_order: 4, active: true, image_url: 'https://picsum.photos/seed/artists2024/800/400' },
  { id: '5', name: 'Bailarines', icon: '💃', slug: 'bailarines', route: '/artistas?tipo=dancer', section: 'main', color_start: '#E91E63', color_mid: '#F06292', color_end: '#F48FB1', shadow_color: 'rgba(233, 30, 99, 0.4)', display_order: 5, active: true, image_url: 'https://picsum.photos/seed/dancers2024/800/400' },
  { id: '6', name: 'Marketplace', icon: '🏪', slug: 'marketplace', route: '/marketplace', section: 'main', color_start: '#AD1457', color_mid: '#E91E63', color_end: '#C2185B', shadow_color: 'rgba(173, 20, 87, 0.4)', display_order: 6, active: true, image_url: 'https://picsum.photos/seed/marketplace2024/800/400' },
  { id: '7', name: 'Clases en vivo', icon: '🎥', slug: 'clases-vivo', route: '/live', section: 'main', color_start: '#FF6B9D', color_mid: '#FF1493', color_end: '#FF69B4', shadow_color: 'rgba(255, 107, 157, 0.4)', display_order: 7, active: true, image_url: 'https://picsum.photos/seed/classes2024/800/400' },
  { id: '8', name: 'Comunidad', icon: '💬', slug: 'comunidad', route: '/chat', section: 'main', color_start: '#E91E63', color_mid: '#F06292', color_end: '#AD1457', shadow_color: 'rgba(233, 30, 99, 0.4)', display_order: 8, active: true, image_url: 'https://picsum.photos/seed/community2024/800/400' },
  { id: '9', name: 'Ruta de Hoy', icon: '📍', slug: 'ruta-hoy', route: '/eventos?type=featured', section: 'mercado', color_start: '#FF5252', color_mid: '#FF1493', color_end: '#FF1493', shadow_color: 'rgba(255, 82, 82, 0.4)', display_order: 1, active: true, image_url: 'https://picsum.photos/seed/route2024/800/400' },
  { id: '10', name: 'Proyectos', icon: '🚀', slug: 'proyectos', route: '/marketplace?cat=Producción', section: 'mercado', color_start: '#FF6B9D', color_mid: '#F06292', color_end: '#F06292', shadow_color: 'rgba(255, 107, 157, 0.4)', display_order: 2, active: true, image_url: 'https://picsum.photos/seed/projects2024/800/400' },
  { id: '11', name: 'Clasesenvivo', icon: '🎬', slug: 'clasesenvivo', route: '/live', section: 'mercado', color_start: '#E91E63', color_mid: '#AD1457', color_end: '#AD1457', shadow_color: 'rgba(233, 30, 99, 0.4)', display_order: 3, active: true, image_url: 'https://picsum.photos/seed/live2024/800/400' },
  { id: '12', name: 'Ofertas', icon: '⭐', slug: 'ofertas', route: '/eventos?featured=true', section: 'mercado', color_start: '#D81B60', color_mid: '#C2185B', color_end: '#C2185B', shadow_color: 'rgba(216, 27, 96, 0.4)', display_order: 4, active: true, image_url: 'https://picsum.photos/seed/offers2024/800/400' },
  { id: '13', name: 'Anuncios', icon: '📢', slug: 'anuncios', route: '/chat', section: 'comunidad', color_start: '#FF1493', color_mid: '#FF69B4', color_end: '#FF69B4', shadow_color: 'rgba(255, 20, 147, 0.4)', display_order: 1, active: true, image_url: 'https://picsum.photos/seed/announcements2024/800/400' },
  { id: '14', name: 'Academia', icon: '🎓', slug: 'academia', route: '/marketplace?cat=Clases', section: 'comunidad', color_start: '#F06292', color_mid: '#EC407A', color_end: '#EC407A', shadow_color: 'rgba(240, 98, 146, 0.4)', display_order: 2, active: true, image_url: 'https://picsum.photos/seed/academy2024/800/400' },
  { id: '15', name: 'Comunidad', icon: '👥', slug: 'comunidad-users', route: '/chat', section: 'comunidad', color_start: '#EC407A', color_mid: '#E91E63', color_end: '#E91E63', shadow_color: 'rgba(236, 64, 122, 0.4)', display_order: 3, active: true, image_url: 'https://picsum.photos/seed/communityusers2024/800/400' },
  { id: '16', name: 'Chat', icon: '💬', slug: 'chat', route: '/chat', section: 'comunidad', color_start: '#AD1457', color_mid: '#D81B60', color_end: '#D81B60', shadow_color: 'rgba(173, 20, 87, 0.4)', display_order: 4, active: true, image_url: 'https://picsum.photos/seed/chat2024/800/400' },
];

// ── MODERN SMART SEARCH ────────────────────────────────────────────────
const ModernSearchSection: React.FC<{ navigate: any; categories: any[] }> = ({ navigate, categories }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['eventos', 'artistas', 'localidades']);
  const [showFilters, setShowFilters] = useState(false);
  const availableFilters = ['eventos', 'artistas', 'localidades', 'marketplace'];

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const addFilter = (filter: string) => {
    if (!activeFilters.includes(filter)) {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/explorar?q=${encodeURIComponent(searchQuery)}&filters=${activeFilters.join(',')}`);
    }
  };

  return (
    <section className="mx-4 mt-6 mb-8">
      <div className="bg-gradient-to-br from-pink-50 via-white to-rose-50 rounded-2xl p-6 sm:p-8 shadow-lg border border-pink-100">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display font-black text-2xl sm:text-3xl bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">
            🔍 Busca Tu Vibe Latino
          </h2>
          <p className="text-gray-500 text-sm">Explora eventos, artistas, locales y mucho más</p>
        </div>

        {/* Main Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Busca artistas, eventos, locales..."
              className="w-full px-5 py-3 rounded-xl border-2 border-pink-200 focus:border-brand-orange focus:outline-none text-gray-900 placeholder-gray-400 transition-all"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-orange hover:scale-110 transition-transform"
            >
              ✨
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              showFilters
                ? 'bg-brand-orange text-white'
                : 'bg-white text-gray-900 border-2 border-pink-200 hover:border-brand-orange'
            }`}
          >
            ⚙️ Filtros ({activeFilters.length})
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map(filter => (
            <div
              key={filter}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-brand-orange rounded-full text-sm font-semibold text-gray-900 shadow-sm"
            >
              <span className="capitalize">{filter}</span>
              <button
                onClick={() => removeFilter(filter)}
                className="text-brand-orange hover:text-red-500 transition-colors font-bold"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Filter Selector (Expandable) */}
        {showFilters && (
          <div className="p-4 bg-white rounded-xl border-2 border-pink-100 mb-5">
            <p className="text-xs font-bold text-gray-600 uppercase mb-3">Agregar más filtros:</p>
            <div className="flex flex-wrap gap-2">
              {availableFilters.map(filter => (
                !activeFilters.includes(filter) && (
                  <button
                    key={filter}
                    onClick={() => addFilter(filter)}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-brand-orange hover:text-white text-gray-700 text-sm font-semibold transition-all"
                  >
                    + {filter}
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Quick Categories */}
        <div>
          <p className="text-xs font-bold text-gray-600 uppercase mb-3">O explora por categoría:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.slice(0, 8).map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(cat.route)}
                className="group relative overflow-hidden rounded-lg p-3 text-white text-xs font-bold text-center transition-all hover:scale-105 shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${cat.color_start}, ${cat.color_mid}, ${cat.color_end})`,
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-1">
                  <span className="text-base">{cat.icon}</span>
                  <span className="line-clamp-1">{cat.name}</span>
                </span>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ── DYNAMIC CATEGORIES SECTION ────────────────────────────────────────
const DynamicCategoriesSection: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('https://lpwwdjujxwxdvyoznehp.supabase.co/rest/v1/categories?select=*&order=section.asc,display_order.asc&active=eq.true', {
          headers: {
            'apikey': 'sb_publishable_Kn08qRlITmDXEcMpATB-7Q_GE5MHvvP',
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories from Supabase:', error);
        // Keep using default categories
      }
    };
    fetchCategories();
  }, []);

  const mainCats = categories.filter(c => c.section === 'main').sort((a, b) => a.display_order - b.display_order);
  const mercadoCats = categories.filter(c => c.section === 'mercado').sort((a, b) => a.display_order - b.display_order);
  const comunidadCats = categories.filter(c => c.section === 'comunidad').sort((a, b) => a.display_order - b.display_order);

  const CategoryButton: React.FC<{ cat: any; large?: boolean }> = ({ cat, large = false }) => (
    <button
      onClick={() => navigate(cat.route)}
      className={`relative overflow-hidden rounded-lg group transition-all hover:scale-105 shadow-md ${large ? 'h-24' : 'h-24'}`}
      style={{ minHeight: large ? '100px' : '100px' }}
    >
      {/* Background Image */}
      {cat.image_url && (
        <img
          src={cat.image_url}
          alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      )}

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${cat.color_start}dd 0%, ${cat.color_mid}dd 50%, ${cat.color_end}dd 100%)`,
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
        <span className="text-2xl drop-shadow-lg">{cat.icon}</span>
        <span className="text-white font-bold text-xs text-center line-clamp-2 drop-shadow-lg">{cat.name}</span>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="text-center mb-8 px-4">
        <h2 className="font-display font-black text-2xl sm:text-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent mb-2">
          Baila Now
        </h2>
        <p className="text-gray-500 text-sm max-w-lg mx-auto">
          Todo lo que amas del baile, en un solo lugar
        </p>
      </div>

      {/* Main Categories Grid */}
      <div className="px-2 space-y-3">
        {/* Main Categories - 4 columnas */}
        {mainCats.length > 0 && (
          <>
            {Array.from({ length: Math.ceil(mainCats.length / 4) }).map((_, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {mainCats.slice(rowIdx * 4, rowIdx * 4 + 4).map(cat => (
                  <CategoryButton key={cat.id} cat={cat} large />
                ))}
              </div>
            ))}
          </>
        )}

        {/* MERCADO Section */}
        {mercadoCats.length > 0 && (
          <div className="mt-5">
            <h3 className="font-display font-bold text-sm text-gray-900 mb-2 uppercase tracking-wider px-2">
              <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">🏪 Mercado</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {mercadoCats.map(cat => (
                <CategoryButton key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        )}

        {/* COMUNIDAD Section */}
        {comunidadCats.length > 0 && (
          <div className="mt-4 pb-6">
            <h3 className="font-display font-bold text-sm text-gray-900 mb-2 uppercase tracking-wider px-2">
              <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">💬 Comunidad</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {comunidadCats.map(cat => (
                <CategoryButton key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { heroMedia, heroSliderImages } = useSiteConfigStore();
  const cmsModules = useCMSStore(s => s.modules);
  const cmsCategories = useCMSStore(s => s.categories);
  const enabled = visibleHomeModules(cmsModules);
  const isModuleOn = (type: string) => enabled.some(m => m.type === type);
  const dynamicCats = activeCategories(cmsCategories);
  const { balanceFor, offers, classes, transactions, withdrawals, platformTotals } = usePerformerStore();
  const PERFORMER_ROLES = ['artist', 'dj', 'dancer', 'venue'];
  const isAdmin = !!user && user.role === 'admin';
  const isPerformer = !!user && PERFORMER_ROLES.includes(user.role);
  const isBuyer = !!user && user.role === 'user';
  const adminStats = isAdmin ? platformTotals() : null;
  const totalEscrow = isAdmin ? transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.gross, 0) : 0;
  const pendingWithdrawals = isAdmin ? withdrawals.filter(w => w.status === 'pending') : [];
  const creatorCount = isAdmin ? new Set(transactions.map(t => t.performerId)).size : 0;
  const performerId = isPerformer ? 'a1' : '';
  const myBalance = isPerformer ? balanceFor(performerId) : null;
  const pendingOffersCount = isPerformer ? offers.filter(o => o.performerId === performerId && o.status === 'pending').length : 0;
  const upcomingClassesCount = isPerformer ? classes.filter(c => c.performerId === performerId && c.status === 'scheduled').length : 0;
  const myPendingOrders = isBuyer ? transactions.filter(t => t.clientId === user.id && t.status === 'pending') : [];
  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO — Compact with Video & Slider ── */}
      <section className="mx-4 mt-4 rounded-2xl overflow-hidden bg-black" style={{ minHeight: 280 }}>
        <div className="flex flex-col lg:flex-row h-full">
          {/* Slider - Left side */}
          <div className="w-full lg:w-1/3 flex flex-col justify-center p-4">
            {heroSliderImages.length > 0 && <HeroSlider images={heroSliderImages} />}
          </div>

          {/* Video - Right side */}
          <div className="flex-1 relative min-h-[200px] lg:min-h-[280px] bg-black">
          {heroMedia.type === 'youtube' ? (() => {
            const id = getYouTubeId(heroMedia.url);
            if (!id) return <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">URL de YouTube inválida</div>;
            const params = new URLSearchParams({
              autoplay: heroMedia.autoplay ? '1' : '0',
              mute: heroMedia.muted ? '1' : '0',
              loop: heroMedia.loop ? '1' : '0',
              playlist: heroMedia.loop ? id : '',
              controls: '1',
              modestbranding: '1',
              rel: '0',
            });
            return (
              <iframe
                src={`https://www.youtube.com/embed/${id}?${params.toString()}&playsinline=1`}
                title="Hero video"
                className="w-full h-full absolute inset-0"
                style={{ minHeight: 220 }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            );
          })() : heroMedia.type === 'video' ? (
            <video
              key={heroMedia.url}
              src={heroMedia.url}
              autoPlay={heroMedia.autoplay}
              muted={heroMedia.muted}
              loop={heroMedia.loop}
              playsInline
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={heroMedia.url}
              alt="Encuentra tu Pasión Latina"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </section>

      {/* ── MODERN SMART SEARCH ── */}
      <ModernSearchSection navigate={navigate} categories={DEFAULT_CATEGORIES} />


      {/* ── PANEL SUPERADMIN ── */}
      {isAdmin && adminStats && isModuleOn('admin-panel') && (
        <section className="mx-4 mt-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-5 sm:p-6 text-white shadow-card relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-orange/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-orange flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-brand-orange text-[10px] font-black uppercase tracking-widest">Superadministrador</p>
                  <h2 className="font-display font-black text-xl sm:text-2xl">Visión global de la plataforma</h2>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => navigate('/admin')} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Panel Admin
                </button>
                {pendingWithdrawals.length > 0 && (
                  <button onClick={() => navigate('/admin')} className="bg-yellow-500 text-gray-900 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
                    🔔 {pendingWithdrawals.length} retiro(s) por aprobar
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <DollarSign className="w-4 h-4 text-brand-orange mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Comisión 15%</p>
                <p className="text-xl font-black text-brand-orange">€{adminStats.totalCommission}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Ingresos plataforma</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <TrendingUp className="w-4 h-4 text-green-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Bruto total</p>
                <p className="text-xl font-black">€{adminStats.totalGross}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{adminStats.totalTransactions} tx</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <Clock className="w-4 h-4 text-yellow-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">En escrow</p>
                <p className="text-xl font-black">€{Math.round(totalEscrow)}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Sin confirmar</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <Users className="w-4 h-4 text-purple-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Creators activos</p>
                <p className="text-xl font-black">{creatorCount}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Con transacciones</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <Wallet className="w-4 h-4 text-pink-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Retiros pendientes</p>
                <p className="text-xl font-black">{pendingWithdrawals.length}</p>
                <p className="text-[10px] text-white/50 mt-0.5">€{pendingWithdrawals.reduce((s, w) => s + w.amount, 0)}</p>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── MI PANEL (logged-in user) ── */}
      {isPerformer && myBalance && isModuleOn('creator-panel') && (
        <section className="mx-4 mt-4 bg-gradient-to-r from-brand-orange to-orange-500 rounded-3xl p-5 sm:p-6 text-white shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Mi Panel Creator</p>
              <h2 className="font-display font-black text-xl sm:text-2xl">Hola, {user!.name.split(' ')[0]} 👋</h2>
              <p className="text-white/80 text-xs mt-0.5">Comisión plataforma: {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-brand-orange font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4" /> Abrir Dashboard
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Clock className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">En escrow</p>
              <p className="text-xl font-black">€{myBalance.inEscrow}</p>
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Wallet className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">Disponible</p>
              <p className="text-xl font-black">€{myBalance.available}</p>
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Briefcase className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">Ofertas pendientes</p>
              <p className="text-xl font-black">{pendingOffersCount}</p>
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Star className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">Próximas clases</p>
              <p className="text-xl font-black">{upcomingClassesCount}</p>
            </button>
          </div>
        </section>
      )}

      {isBuyer && myPendingOrders.length > 0 && isModuleOn('buyer-alert') && (
        <section className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Tienes {myPendingOrders.length} pedido(s) por confirmar</p>
              <p className="text-xs text-gray-500">Confirma el servicio para liberar el pago al creador.</p>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-orange text-sm">Ver mis pedidos</button>
        </section>
      )}

      {/* ── RADIO BAR ── */}
      {isModuleOn('radio') && (
      <section className="mx-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RADIO_STATIONS.map((station, i) => (
          <div key={i} className="card-white flex items-center gap-4 p-4 rounded-2xl">
            <img
              src={station.img}
              alt={station.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{station.name}</p>
              <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                {station.sub}
              </p>
            </div>
            <button
              onClick={() => setPlaying(playing === i ? null : i)}
              className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white text-gray-500 flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-all flex-shrink-0"
            >
              {playing === i
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>
        ))}
      </section>
      )}

      {/* ── RUTA DE HOY ── */}
      {isModuleOn('ruta') && (
      <section className="mx-4 mt-6">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-brand-orange rounded-full" />
            <h2 className="font-display font-bold text-base text-gray-900 uppercase tracking-wide">La Ruta de Hoy</h2>
          </div>
          <button onClick={() => navigate('/comunidad')} className="section-link text-xs">Ver más rutas →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {COMMUNITY_POSTS.map(post => (
            <div key={post.id} className="flex-shrink-0 w-60 card-white p-3 rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <Avatar
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user)}&background=F97316&color=fff&size=80`}
                  name={post.user} size="xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold text-xs">{post.user}</p>
                  <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{post.text}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className={`${post.status === 'APROBADO' ? 'tag-green' : 'tag-red'} text-[10px]`}>
                  {post.status}
                </span>
                {isAuthenticated && (
                  <>
                    <button className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors font-semibold">
                      <Check className="w-3 h-3" /> Aprobar
                    </button>
                    <button className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors font-semibold">
                      <X className="w-3 h-3" /> Rechazar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── SEARCH ── */}
      <section className="mx-4 mt-6">
        <SearchBar
          placeholder="Buscar DJs, bailarines, eventos, ciudades..."
          value={search}
          onChange={setSearch}
          onSearch={() => navigate(`/explorar?q=${search}`)}
        />
      </section>

      {/* ── CATEGORÍAS APP STYLE (Baila Now) ── */}
      <DynamicCategoriesSection navigate={navigate} />

      {/* ── LOCALIDADES ── */}
      <section className="mx-4 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-black text-lg text-gray-900">📍 Localidades</h2>
          <button onClick={() => navigate('/venues')} className="text-brand-orange text-sm font-semibold flex items-center gap-1">
            Ver más <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {VENUES.slice(0, 5).map(v => (
            <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
              className="card-white rounded-xl overflow-hidden text-left hover:shadow-card-hover transition-all">
              <img src={v.cover} alt={v.name} className="w-full h-24 object-cover" />
              <div className="p-3">
                <p className="text-gray-900 font-semibold text-xs truncate">{v.name}</p>
                <p className="text-gray-400 text-[10px] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{v.city}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-gray-600 font-medium">{v.rating}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── DONDE SALIR A BAILAR EN LA CIUDAD ── */}
      {isModuleOn('cities') && (
      <section className="mx-4 mt-10">
        <div className="section-head mb-4">
          <div>
            <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide">
              Donde Salir a Bailar en la Ciudad
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Explora las mejores ciudades del mundo latino por su comunidad.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1: 3 cities */}
          {CITIES.slice(0, 3).map(city => (
            <button
              key={city.name}
              onClick={() => navigate(`/venues?city=${city.name}`)}
              className="relative rounded-2xl overflow-hidden group"
              style={{ height: 160 }}
            >
              <img
                src={city.img}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-white font-display font-bold text-base leading-tight">{city.name}</p>
                <p className="text-white/70 text-xs mt-0.5">{city.venues} Localidades • {city.events} Eventos</p>
              </div>
            </button>
          ))}
          {/* Row 2: 2 cities + ver más */}
          {CITIES.slice(3, 5).map(city => (
            <button
              key={city.name}
              onClick={() => navigate(`/venues?city=${city.name}`)}
              className="relative rounded-2xl overflow-hidden group"
              style={{ height: 160 }}
            >
              <img
                src={city.img}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-white font-display font-bold text-base leading-tight">{city.name}</p>
                <p className="text-white/70 text-xs mt-0.5">{city.venues} Localidades • {city.events} Eventos</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => navigate('/venues')}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-orange transition-all group"
            style={{ height: 160 }}
          >
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 group-hover:bg-brand-orange/20 flex items-center justify-center mb-2 transition-all">
              <ArrowRight className="w-5 h-5 text-brand-orange" />
            </div>
            <p className="text-brand-orange text-xs font-bold text-center px-2 uppercase tracking-wide">Ver Más Ciudades</p>
          </button>
        </div>
      </section>
      )}

      {/* ── ARTISTAS Y BAILARINES ── */}
      {isModuleOn('artists') && (
      <section className="mx-4 mt-10">
        <div className="section-head mb-4">
          <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide">
            Artistas y Bailarines
          </h2>
          <button onClick={() => navigate('/artistas')} className="text-brand-orange text-sm font-bold hover:underline flex items-center gap-1">
            Ver Todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {ARTISTS.slice(0, 6).map(artist => (
            <ArtistCard key={artist.id} artist={artist} onClick={() => navigate(`/artistas/${artist.id}`)} />
          ))}
        </div>
      </section>
      )}

      {/* ── PRÓXIMOS EVENTOS (CTA module) ── */}
      {isModuleOn('cta') && (
      <section className="mx-4 mt-10 mb-12">
        <div className="section-head mb-4">
          <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide">
            Próximos Eventos
          </h2>
          <button onClick={() => navigate('/eventos')} className="text-brand-orange text-sm font-bold hover:underline flex items-center gap-1">
            Ver Todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {EVENTS.slice(0, 6).map(event => (
            <EventCard key={event.id} event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
          ))}
        </div>
      </section>
      )}
    </div>
  );
};

// ── ARTIST CARD ─────────────────────────────────────────────────────────────
const ArtistCard: React.FC<{ artist: typeof ARTISTS[0]; onClick: () => void }> = ({ artist, onClick }) => (
  <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group rounded-2xl">
    <div className="relative overflow-hidden" style={{ height: 200 }}>
      <img
        src={artist.cover}
        alt={artist.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {artist.isPremium && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
          DESTACADO
        </span>
      )}
    </div>
    <div className="p-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-brand-orange text-xs font-bold uppercase tracking-wide">{artist.genre[0]}</p>
        <h3 className="font-display font-bold text-gray-900 text-sm mt-0.5 truncate">{artist.name}</h3>
        <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 flex-shrink-0" /> {artist.city}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Star className="w-3.5 h-3.5 fill-brand-orange text-brand-orange" />
          <span className="text-gray-700 text-xs font-semibold">{artist.rating}</span>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        className="flex-shrink-0 border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-brand-orange hover:text-brand-orange transition-all whitespace-nowrap"
      >
        Ver Perfil
      </button>
    </div>
  </div>
);

// ── EVENT CARD ──────────────────────────────────────────────────────────────
const EventCard: React.FC<{ event: typeof EVENTS[0]; onClick: () => void }> = ({ event, onClick }) => {
  const d = new Date(event.date);
  const day = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' }).toUpperCase();

  return (
    <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group rounded-2xl">
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        <img
          src={event.cover}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">{day}</span>
        </div>
        {event.isFeatured && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
            DESTACADO
          </span>
        )}
      </div>
      <div className="p-4">
        <span className="tag-orange text-[10px] mb-2 inline-block">{event.category[0] || 'Evento'}</span>
        <h3 className="font-display font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{event.title}</h3>
        <p className="text-gray-400 text-xs flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" /> {event.venueName}, {event.city}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-gray-700 text-sm font-semibold">Desde €{event.price}</p>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="btn-orange text-xs px-3 py-1.5"
          >
            {event.price === 0 ? 'GRATIS' : 'ENTRADAS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
