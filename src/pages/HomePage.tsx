import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronRight, MapPin, Star, Check, X, ArrowRight, LayoutDashboard, Wallet, Briefcase, Clock, Shield, DollarSign, Users, TrendingUp, Radio, ListMusic, Plus, Volume2, SkipForward, SkipBack } from 'lucide-react';
import { ARTISTS, EVENTS, VENUES } from '../data/mockData';
import { useAuthStore, useSiteConfigStore, getYouTubeId, usePerformerStore, PLATFORM_COMMISSION_RATE, type HeroSliderImage, type HomeCategory } from '../store/appStore';
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
  { id: 1, user: 'Elena García', fullText: 'Primera vez en Madrid, busca un local donde bailar bachata esta noche. ¡Alguien que me recomiende el mejor lugar!', location: 'Madrid', category: 'localidades', status: 'APROBADO', time: 'Hace 15 min' },
  { id: 2, user: 'Miguel Ángel', fullText: '¿Alguien para practicar ruedas de casino? Tengo nivel intermedio y busco pareja para entrenamiento en Barcelona.', location: 'Barcelona', category: 'bailarines', status: 'APROBADO', time: 'Hace 32 min' },
  { id: 3, user: 'Sofía Tomás', fullText: 'Tengo 2 entradas extra para el concierto de Grupo Mania en Medellín. ¡Rápido, se agotan en minutos!', location: 'Medellín', category: 'eventos', status: 'APROBADO', time: 'Hace 48 min' },
  { id: 4, user: 'Daniel Cruz', fullText: '¿Cuál es la mejor discoteca latina abierta ahora en Valencia? Queremos bailar sábado por la noche.', location: 'Valencia', category: 'localidades', status: 'APROBADO', time: 'Hace 1 hora' },
  { id: 5, user: 'María Vargas', fullText: 'Buscamos grupo para ir a Tropical House Nightclub. ¡Somos 4 personas de Cali! Quien quiera unirse?', location: 'Cali', category: 'eventos', status: 'APROBADO', time: 'Hace 2 horas' },
  { id: 6, user: 'Pedro Koss', fullText: 'Mensaje de spam: compra criptomo aqui...', location: 'Online', category: 'comunidad', status: 'RECHAZAR', time: 'Hace 2 horas' },
  { id: 7, user: 'Carlos Mendez', fullText: 'El viernes voy a Madrid, ¿donde puedo salir a bailar? Prefiero salsa y ambiente latino auténtico.', location: 'Madrid', category: 'artistas', status: 'APROBADO', time: 'Hace 3 horas' },
  { id: 8, user: 'Laura Silva', fullText: 'Busco pareja para ir a la social de salsa de este jueves. ¡Nivel intermedio! Quien esté interesado?', location: 'Barcelona', category: 'bailarines', status: 'APROBADO', time: 'Hace 3 horas' },
  { id: 9, user: 'David Rojas', fullText: '¿Algún evento de Kizomba esta semana? Quiero aprender con alguien experimentado en Valencia.', location: 'Valencia', category: 'eventos', status: 'APROBADO', time: 'Hace 4 horas' },
];

// ── CITIES ────────────────────────────────────────────────────────────────
const CITIES = [
  { name: 'Madrid',    venues: 12, events: 8,  img: 'https://picsum.photos/seed/madrid2024/800/400',    monument: '🏛️', landmark: 'Puerta de Alcalá' },
  { name: 'Barcelona', venues: 8,  events: 5,  img: 'https://picsum.photos/seed/barcelona2024/800/400', monument: '⛪', landmark: 'Sagrada Familia' },
  { name: 'Valencia',  venues: 5,  events: 3,  img: 'https://picsum.photos/seed/valencia2024/800/400',  monument: '🏟️', landmark: 'Ciudad de las Artes' },
  { name: 'Medellín',  venues: 6,  events: 4,  img: 'https://picsum.photos/seed/medellin2024/800/400',  monument: '🌺', landmark: 'Plaza Botero' },
  { name: 'Cali',      venues: 9,  events: 6,  img: 'https://picsum.photos/seed/cali2024/800/400',      monument: '💃', landmark: 'Capital de la Salsa' },
];

// ── CATEGORIES ────────────────────────────────────────────────────────────
const CATEGORY_CARDS = [
  {
    name: 'Conciertos y Música en Vivo',
    img: 'https://picsum.photos/seed/concert2024/800/500',
    to: '/eventos?cat=conciertos',
    btnColor: 'bg-pink-600',
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
  { id: 'r1', name: 'Bachata FM', sub: 'En directo 24/7', genre: 'Bachata', img: 'https://picsum.photos/seed/bachata-radio/120/120', streamUrl: 'https://stream.bachata.fm/live' },
  { id: 'r2', name: 'Salsa Caliente', sub: 'En directo 24/7', genre: 'Salsa', img: 'https://picsum.photos/seed/salsa-radio/120/120', streamUrl: 'https://stream.salsa.fm/live' },
  { id: 'r3', name: 'Reggaeton Mix', sub: 'En directo 24/7', genre: 'Reggaeton', img: 'https://picsum.photos/seed/reggaeton-radio/120/120', streamUrl: 'https://stream.reggaeton.fm/live' },
  { id: 'r4', name: 'Kizomba Vibes', sub: 'En directo 24/7', genre: 'Kizomba', img: 'https://picsum.photos/seed/kizomba-radio/120/120', streamUrl: 'https://stream.kizomba.fm/live' },
  { id: 'r5', name: 'Merengue Classic', sub: 'En directo 24/7', genre: 'Merengue', img: 'https://picsum.photos/seed/merengue-radio/120/120', streamUrl: 'https://stream.merengue.fm/live' },
];

const PLAYLISTS = [
  { id: 'p1', name: 'Bachata Sensual', tracks: 24, duration: '1h 32m', img: 'https://picsum.photos/seed/playlist-bachata/120/120', color: 'from-pink-500 to-rose-600' },
  { id: 'p2', name: 'Salsa Pa Bailar', tracks: 30, duration: '2h 05m', img: 'https://picsum.photos/seed/playlist-salsa/120/120', color: 'from-orange-500 to-red-500' },
  { id: 'p3', name: 'Latin Club Hits', tracks: 18, duration: '1h 10m', img: 'https://picsum.photos/seed/playlist-club/120/120', color: 'from-purple-500 to-fuchsia-600' },
  { id: 'p4', name: 'Kizomba Chill', tracks: 20, duration: '1h 25m', img: 'https://picsum.photos/seed/playlist-kizomba/120/120', color: 'from-indigo-500 to-purple-600' },
  { id: 'p5', name: 'Reggaeton Party', tracks: 22, duration: '1h 18m', img: 'https://picsum.photos/seed/playlist-reggaeton/120/120', color: 'from-yellow-500 to-orange-500' },
];

// ── HERO SLIDER (Small) ──────────────────────────────────────────────────────────
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
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-pink-500 w-4' : 'bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

// ── HERO SLIDER (Full Height) ────────────────────────────────────────────────
const HeroSliderFullHeight: React.FC<{ images: HeroSliderImage[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % images.length), 5000);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  const goToPrev = () => setCurrent(p => (p - 1 + images.length) % images.length);
  const goToNext = () => setCurrent(p => (p + 1) % images.length);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="flex transition-transform duration-1000 ease-in-out h-full"
        style={{ width: `${images.length * 100}%`, transform: `translateX(-${(current * 100) / images.length}%)` }}
      >
        {images.map(img => (
          <img key={img.id} src={img.url} alt={img.alt}
            className="h-full object-cover flex-shrink-0"
            style={{ width: `${100 / images.length}%` }}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm"
      >
        <ChevronRight className="w-5 h-5 rotate-180" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all backdrop-blur-sm rounded-full ${
              i === current
                ? 'bg-pink-500 w-8 h-2'
                : 'bg-white/40 hover:bg-white/60 w-2 h-2'
            }`}
          />
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  );
};

// ── DYNAMIC CATEGORIES SECTION (reads from store, managed by superadmin) ──
// Category interface with images — kept for search autocomplete compatibility
interface CategoryWithImage extends HomeCategory {
  image_url?: string;
  slug?: string;
  color_start?: string; color_mid?: string; color_end?: string; shadow_color?: string;
}

// Thin shim so the search autocomplete (which types against CategoryWithImage[]) still compiles
const DEFAULT_CATEGORIES: CategoryWithImage[] = [];

// ── ULTRAMODERN SMART SEARCH with AUTOCOMPLETE ────────────────────────────────────────────────
const UltraModernSearchSection: React.FC<{ navigate: any; categories: any[] }> = ({ navigate, categories }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Filter categories and cities based on search input
  const filteredCategories = searchQuery.trim() === ''
    ? []
    : categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const filteredCities = searchQuery.trim() === ''
    ? []
    : CITIES.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const totalSuggestions = 1 + filteredCategories.length + filteredCities.length; // 1 para "buscar"

  const handleSearch = (query: string = searchQuery) => {
    if (query.trim()) {
      setShowSuggestions(false);
      navigate(`/explorar?q=${encodeURIComponent(query)}`);
    }
  };

  const handleCategoryClick = (cat: any) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(cat.route);
  };

  const handleCityClick = (city: any) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/venues?city=${encodeURIComponent(city.name)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalSuggestions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalSuggestions) % totalSuggestions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === 0) {
        handleSearch();
      } else if (selectedIndex > 0 && selectedIndex <= filteredCategories.length) {
        handleCategoryClick(filteredCategories[selectedIndex - 1]);
      } else if (selectedIndex > filteredCategories.length) {
        handleCityClick(filteredCities[selectedIndex - filteredCategories.length - 1]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <section className="mx-4 mt-6 mb-10">
      <div className="relative">
        {/* Search Container */}
        <div className="relative">
          <div className="bg-gradient-to-r from-pink-500/20 via-fuchsia-500/10 to-purple-500/20 backdrop-blur-lg rounded-3xl p-1 shadow-2xl border border-pink-500/30 shadow-pink-500/10">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl px-5 sm:px-6 py-4 flex items-center gap-3 group">
              {/* Icon */}
              <div className="text-2xl">🔍</div>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Descubre artistas, eventos, venues..."
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm font-medium"
              />

              {/* Search Button */}
              <button
                onClick={() => handleSearch()}
                className="px-5 sm:px-6 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white rounded-full font-bold text-sm hover:shadow-lg hover:shadow-pink-500/30 hover:scale-105 transition-all"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && searchQuery.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-500/20 z-50 max-h-[500px] overflow-y-auto">
              {/* Search Results Option */}
              <button
                onClick={() => handleSearch()}
                className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-all ${
                  selectedIndex === 0
                    ? 'bg-pink-500/10 border-l-4 border-pink-500'
                    : 'hover:bg-pink-50 border-l-4 border-transparent'
                }`}
              >
                <span className="text-lg">🔎</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">Buscar "{searchQuery}"</p>
                  <p className="text-gray-500 text-xs">Busca en toda la plataforma</p>
                </div>
              </button>

              {filteredCategories.length > 0 && (
                <>
                  <div className="px-6 py-2 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">🎉 Categorías</p>
                  </div>
                  {filteredCategories.map((cat, idx) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat)}
                      className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-all border-l-4 ${
                        selectedIndex === idx + 1
                          ? 'bg-brand-orange/10 border-brand-orange'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{cat.name}</p>
                        <p className="text-gray-500 text-xs capitalize">{cat.section}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {filteredCities.length > 0 && (
                <>
                  <div className="px-6 py-2 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">📍 Ciudades</p>
                  </div>
                  {filteredCities.map((city, idx) => (
                    <button
                      key={city.name}
                      onClick={() => handleCityClick(city)}
                      className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-all border-l-4 ${
                        selectedIndex === filteredCategories.length + idx + 1
                          ? 'bg-brand-orange/10 border-brand-orange'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <span className="text-lg">📍</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{city.name}</p>
                        <p className="text-gray-500 text-xs">{city.venues} locales • {city.events} eventos</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {filteredCategories.length === 0 && filteredCities.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500 text-sm">No encontramos categorías ni ciudades que coincidan</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

// ── RUTA DE HOY SLIDER SECTION ────────────────────────────────────────
const RutaDeHoySlider: React.FC<{ navigate: any; posts: any[] }> = ({ navigate, posts }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 320;
      const newPosition = direction === 'left'
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;
      containerRef.current.scrollLeft = newPosition;
      setScrollPosition(newPosition);
    }
  };

  return (
    <section className="mx-4 mt-8 mb-10">
      <div className="bg-gradient-to-r from-pink-50 via-white to-amber-50 rounded-3xl p-6 sm:p-8 border border-brand-orange/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl bg-gradient-to-r from-brand-orange to-pink-600 bg-clip-text text-transparent mb-1">
              🔥 Ruta de Hoy
            </h2>
            <p className="text-gray-500 text-sm">Lo que está pasando ahora mismo en tu comunidad</p>
          </div>
          <button
            onClick={() => navigate('/comunidad')}
            className="px-4 py-2 bg-brand-orange hover:bg-pink-600 text-white rounded-full font-bold text-sm hover:shadow-lg transition-all hover:scale-105"
          >
            Ver más →
          </button>
        </div>

        {/* Slider Container */}
        <div className="relative">
          <div
            ref={containerRef}
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none' }}
          >
            {posts.slice(0, 5).map((post, idx) => (
              <div
                key={post.id}
                className="flex-shrink-0 w-72 bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all hover:scale-105 border border-gray-200 cursor-pointer"
                onClick={() => navigate(`/comunidad?post=${post.id}`)}
              >
                {/* Header con Avatar */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user)}&background=EC4899&color=fff&size=120&bold=true&rounded=true`}
                    alt={post.user}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-brand-orange"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{post.user}</p>
                    <p className="text-gray-500 text-xs">{post.time}</p>
                  </div>
                </div>

                {/* Post Text */}
                <p className="text-gray-700 text-sm line-clamp-3 mb-3 leading-relaxed">
                  {post.fullText}
                </p>

                {/* Location & Category */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                    📍 {post.location}
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-semibold capitalize">
                    {post.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 rounded-full bg-gradient-to-r from-brand-orange to-pink-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-10 h-10 rounded-full bg-gradient-to-r from-brand-orange to-pink-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

// ── DYNAMIC CATEGORIES SECTION ────────────────────────────────────────
const DynamicCategoriesSection: React.FC<{ navigate: any }> = ({ navigate }) => {
  const { homeCategories } = useSiteConfigStore();
  const active = homeCategories.filter(c => c.active);
  const mainCats    = active.filter(c => c.section === 'main').sort((a, b) => a.display_order - b.display_order);
  const mercadoCats = active.filter(c => c.section === 'mercado').sort((a, b) => a.display_order - b.display_order);
  const comunidadCats = active.filter(c => c.section === 'comunidad').sort((a, b) => a.display_order - b.display_order);

  const CategoryButton: React.FC<{ cat: HomeCategory; index: number }> = ({ cat }) => {
    return (
      <button
        onClick={() => navigate(cat.route)}
        className="group bg-white dark:bg-gray-800/80 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 h-[88px] sm:h-24 border border-pink-200/60 dark:border-pink-500/20 shadow-sm hover:shadow-lg hover:shadow-pink-500/10 hover:border-pink-400 transition-all duration-300 hover:-translate-y-1"
      >
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors duration-300">
          <span className="text-xl sm:text-2xl">{cat.icon}</span>
        </div>
        <span className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs font-semibold leading-tight text-center line-clamp-2 group-hover:text-pink-600 transition-colors">{cat.name}</span>
      </button>
    );
  };

  return (
    <section className="mt-4 px-2 sm:px-4">
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white mb-1">
          💃 <span className="text-pink-600">Baila</span> Now
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm max-w-lg mx-auto">
          Todo lo que amas del baile, en un solo lugar
        </p>
      </div>

      {/* Main Categories Grid */}
      <div className="space-y-6">
        {/* Main Categories - 4 columnas */}
        {mainCats.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500" />
              <h3 className="font-display font-bold text-sm sm:text-base text-gray-900 uppercase tracking-wider">
                ⭐ Principales
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {mainCats.map((cat, idx) => (
                <CategoryButton key={cat.id} cat={cat} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* MERCADO Section */}
        {mercadoCats.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500" />
              <h3 className="font-display font-bold text-sm sm:text-base text-gray-900 uppercase tracking-wider">
                🏪 Mercado
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {mercadoCats.map((cat, idx) => (
                <CategoryButton key={cat.id} cat={cat} index={mainCats.length + idx} />
              ))}
            </div>
          </div>
        )}

        {/* COMUNIDAD Section */}
        {comunidadCats.length > 0 && (
          <div className="pb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500" />
              <h3 className="font-display font-bold text-sm sm:text-base text-gray-900 uppercase tracking-wider">
                💬 Comunidad
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {comunidadCats.map((cat, idx) => (
                <CategoryButton key={cat.id} cat={cat} index={mainCats.length + mercadoCats.length + idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ── REUSABLE SECTION WITH SEARCH BAR ────────────────────────────────
interface HomeSectionProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  gradient?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onSearch?: (q: string) => void;
  className?: string;
  children: (searchQuery: string) => React.ReactNode;
}

const HomeSectionWithSearch: React.FC<HomeSectionProps> = ({
  title, subtitle, searchPlaceholder, gradient, actionLabel, onAction, onSearch, className = '', children
}) => {
  const [q, setQ] = useState('');

  return (
    <section className={`mx-4 mt-10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className={`font-display font-black text-lg uppercase tracking-wide ${
          gradient ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 bg-clip-text text-transparent' : 'text-gray-900 dark:text-white'
        }`}>
          {title}
        </h2>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="group flex items-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md shadow-pink-500/25 hover:scale-105 transition-all"
          >
            <span>{actionLabel}</span>
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </button>
        )}
      </div>
      {subtitle && <p className="text-gray-400 text-xs sm:text-sm mb-3">{subtitle}</p>}

      {/* Mini search bar */}
      {searchPlaceholder && (
        <div className="relative mb-4">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:border-pink-400 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all">
            <span className="text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && q.trim() && onSearch) onSearch(q); }}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-200 text-xs sm:text-sm placeholder-gray-400"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {children(q.toLowerCase())}
    </section>
  );
};

// ── OPEN VENUES NOW SECTION ────────────────────────────────────────
const OpenVenuesNowSection: React.FC<{ navigate: any }> = ({ navigate }) => {
  const openVenues = VENUES.filter(v => v.isOpen).sort((a, b) => {
    if (a.isPremium && !b.isPremium) return -1;
    if (!a.isPremium && b.isPremium) return 1;
    return b.rating - a.rating;
  });

  if (openVenues.length === 0) return null;

  return (
    <section className="mx-4 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <h2 className="font-display font-black text-lg text-gray-900">Locales Abiertos Ahora</h2>
        </div>
        <button onClick={() => navigate('/venues?open=true')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Ver Todos
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {openVenues.slice(0, 6).map(v => (
          <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
            className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-emerald-500/10 transition-all hover:-translate-y-1 border border-gray-100 group">
            <div className="relative">
              <img src={v.cover} alt={v.name} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                ABIERTO
              </div>
              {v.isPremium && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1.5 py-0.5 rounded">PRO</div>
              )}
            </div>
            <div className="p-3">
              <p className="text-gray-900 font-bold text-xs truncate">{v.name}</p>
              <p className="text-gray-400 text-[10px] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{v.city}
              </p>
              <p className="text-emerald-600 text-[10px] font-semibold mt-1">{v.openHours}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-600 font-medium">{v.rating}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

// ── LIVE NOW HOME SECTION ────────────────────────────────────────
const LIVE_STREAMS = [
  { id: 'l1', name: 'DJ Mambo King', type: 'DJ Set', viewers: 342, city: 'Madrid', img: 'https://picsum.photos/seed/live-dj1/400/600', isLive: true },
  { id: 'l2', name: 'La Reina del Ritmo', type: 'Bachata Show', viewers: 189, city: 'Barcelona', img: 'https://picsum.photos/seed/live-dancer1/400/600', isLive: true },
  { id: 'l3', name: 'Orquesta Tropical', type: 'Concierto', viewers: 567, city: 'Valencia', img: 'https://picsum.photos/seed/live-band1/400/600', isLive: true },
  { id: 'l4', name: 'Salsa Night Madrid', type: 'Club Live', viewers: 891, city: 'Madrid', img: 'https://picsum.photos/seed/live-club1/400/600', isLive: true },
];

const LiveNowHomeSection: React.FC<{ navigate: any }> = ({ navigate }) => (
  <section className="mx-4 mt-8">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <h2 className="font-display font-black text-lg text-gray-900">En Directo Ahora</h2>
      </div>
      <button onClick={() => navigate('/live')}
        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg shadow-red-500/30 transition-all hover:scale-105">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        LIVE
      </button>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {LIVE_STREAMS.map(s => (
        <button key={s.id} onClick={() => navigate(`/live/${s.id}`)}
          className="flex-shrink-0 w-36 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group relative border-2 border-red-500/30 hover:border-red-500">
          <img src={s.img} alt={s.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {/* LIVE badge */}
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-lg animate-pulse">
            <span className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
          </div>
          {/* Viewers */}
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
            👁 {s.viewers}
          </div>
          {/* Bottom info */}
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-white font-bold text-xs truncate">{s.name}</p>
            <p className="text-white/70 text-[10px]">{s.type}</p>
            <p className="text-white/50 text-[9px] flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-2.5 h-2.5" />{s.city}
            </p>
          </div>
          {/* Glow border */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-red-500/50 group-hover:ring-2 group-hover:ring-red-500 transition-all" />
        </button>
      ))}
    </div>
  </section>
);

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
  const [radiosOpen, setRadiosOpen] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] dark:text-gray-100 transition-colors duration-300">

      {/* ── RADIOS & PLAYLISTS (collapsed headers, expand on +) ── */}
      {isModuleOn('radio') && (
      <section className="mx-4 mt-4 grid grid-cols-2 gap-3">
        {/* RADIOS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setRadiosOpen(v => !v)}
            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 px-3 py-2.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-white font-bold text-xs">Radios</span>
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            </div>
            <Plus className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${radiosOpen ? 'rotate-45' : ''}`} />
          </button>
          {radiosOpen && (
            <div className="divide-y divide-gray-50 max-h-[220px] overflow-y-auto animate-[fadeIn_0.2s_ease]" style={{ scrollbarWidth: 'thin' }}>
              {RADIO_STATIONS.map((station, i) => (
                <button
                  key={station.id}
                  onClick={() => setPlaying(playing === i ? null : i)}
                  className={`w-full flex items-center gap-2.5 p-2.5 hover:bg-pink-50/50 transition-all text-left ${playing === i ? 'bg-pink-50 border-l-2 border-pink-500' : ''}`}
                >
                  <img src={station.img} alt={station.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-gray-200" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-[11px] truncate">{station.name}</p>
                    <p className="text-gray-400 text-[9px] flex items-center gap-1">
                      {playing === i && <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />}
                      {station.genre}
                    </p>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    playing === i ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                    {playing === i
                      ? <Pause className="w-3 h-3" />
                      : <Play className="w-3 h-3 ml-0.5" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PLAYLISTS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setPlaylistsOpen(v => !v)}
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3 py-2.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ListMusic className="w-3.5 h-3.5 text-white" />
              <span className="text-white font-bold text-xs">Playlists</span>
            </div>
            <Plus className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${playlistsOpen ? 'rotate-45' : ''}`} />
          </button>
          {playlistsOpen && (
            <div className="divide-y divide-gray-50 max-h-[220px] overflow-y-auto animate-[fadeIn_0.2s_ease]" style={{ scrollbarWidth: 'thin' }}>
              {PLAYLISTS.map((pl, idx) => (
                <button
                  key={pl.id}
                  onClick={() => setPlaying(playing === 100 + idx ? null : 100 + idx)}
                  className={`w-full flex items-center gap-2.5 p-2.5 hover:bg-purple-50/50 transition-all text-left ${
                    playing === 100 + idx ? 'bg-purple-50 border-l-2 border-purple-500' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${pl.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <ListMusic className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-[11px] truncate">{pl.name}</p>
                    <p className="text-gray-400 text-[9px]">{pl.tracks} tracks · {pl.duration}</p>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    playing === 100 + idx ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                    {playing === 100 + idx
                      ? <Pause className="w-3 h-3" />
                      : <Play className="w-3 h-3 ml-0.5" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ── PERSISTENT MINI PLAYER (when playing) ── */}
      {playing !== null && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-pink-500/20 px-4 py-2 flex items-center gap-3 backdrop-blur-xl shadow-2xl">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
            {playing < 100 && RADIO_STATIONS[playing] && (
              <img src={RADIO_STATIONS[playing].img} alt="" className="w-full h-full object-cover" />
            )}
            {playing >= 100 && PLAYLISTS[playing - 100] && (
              <div className={`w-full h-full bg-gradient-to-br ${PLAYLISTS[playing - 100].color} flex items-center justify-center`}>
                <ListMusic className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xs truncate">
              {playing < 100 ? RADIO_STATIONS[playing]?.name : PLAYLISTS[playing - 100]?.name}
            </p>
            <p className="text-white/50 text-[10px] flex items-center gap-1">
              {playing < 100 ? (
                <><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> En directo</>
              ) : (
                <>{PLAYLISTS[playing - 100]?.tracks} tracks</>
              )}
            </p>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-white/50 hover:text-white transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPlaying(null)}
              className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/30"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-white/50 hover:text-white transition-colors">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          <button className="p-1.5 text-white/50 hover:text-white transition-colors hidden sm:block">
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPlaying(null)}
            className="p-1 text-white/30 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── HERO BANNER — clean slider, no text overlay ── */}
      <section className="mx-4 mt-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-black relative h-[140px] sm:h-[220px] lg:h-[350px]">
        <div className="absolute inset-0">
          {heroSliderImages.length > 0 && (
            <div className="h-full">
              <HeroSliderFullHeight images={heroSliderImages} />
            </div>
          )}
        </div>
      </section>

      {/* ── ULTRAMODERN SMART SEARCH ── */}
      <UltraModernSearchSection navigate={navigate} categories={DEFAULT_CATEGORIES} />

      {/* ── RUTA DE HOY SLIDER ── */}
      {isModuleOn('ruta') && (
        <RutaDeHoySlider navigate={navigate} posts={COMMUNITY_POSTS} />
      )}

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
        <section className="mx-4 mt-4 bg-gradient-to-r from-brand-orange to-pink-500 rounded-3xl p-5 sm:p-6 text-white shadow-card">
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

      {/* ── CATEGORÍAS APP STYLE (Baila Now) ── */}
      <DynamicCategoriesSection navigate={navigate} />

      {/* ── LOCALES ABIERTOS AHORA ── */}
      <OpenVenuesNowSection navigate={navigate} />

      {/* ── EN DIRECTO AHORA ── */}
      <LiveNowHomeSection navigate={navigate} />

      {/* ── DONDE BAILAR EN LA CIUDAD ── */}
      {isModuleOn('cities') && (
      <HomeSectionWithSearch
        title="💃 Donde Bailar en la Ciudad"
        subtitle="Encuentra los mejores locales y eventos en tu ciudad"
        searchPlaceholder="Buscar ciudad, local, zona..."
        gradient
        onSearch={(q) => navigate(`/venues?city=${encodeURIComponent(q)}`)}
      >
        {(searchQ) => {
          const filtered = searchQ
            ? CITIES.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()))
            : CITIES;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(city => (
                <button
                  key={city.name}
                  onClick={() => navigate(`/venues?city=${city.name}`)}
                  className="relative rounded-2xl overflow-hidden group shadow-lg hover:shadow-xl hover:shadow-pink-500/20 transition-all duration-500"
                  style={{ height: 180 }}
                >
                  <img src={city.img} alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-pink-500/50 transition-all duration-300" />
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                    {city.monument}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    📍 Explorar
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-left">
                    <p className="text-white font-display font-bold text-base sm:text-lg leading-tight drop-shadow-lg">{city.name}</p>
                    <p className="text-white/70 text-[10px] font-medium mt-0.5">{city.landmark}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-pink-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{city.venues} venues</span>
                      <span className="bg-fuchsia-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{city.events} eventos</span>
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => navigate('/venues')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-300 hover:border-pink-500 hover:bg-pink-50 transition-all group"
                style={{ height: 180 }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-all shadow-lg shadow-pink-500/30">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <p className="text-pink-600 text-xs font-bold text-center px-2 uppercase tracking-wide">Ver Todas</p>
              </button>
            </div>
          );
        }}
      </HomeSectionWithSearch>
      )}

      {/* ── ARTISTAS Y BAILARINES ── */}
      {isModuleOn('artists') && (
      <HomeSectionWithSearch
        title="🎧 Artistas y Bailarines"
        subtitle="DJs, cantantes, bailarines y mas talento latino"
        searchPlaceholder="Buscar artista, DJ, bailarin, genero..."
        gradient
        actionLabel="Ver Todos"
        onAction={() => navigate('/artistas')}
        onSearch={(q) => navigate(`/artistas?q=${encodeURIComponent(q)}`)}
      >
        {(searchQ) => {
          const filtered = searchQ
            ? ARTISTS.filter(a => a.name.toLowerCase().includes(searchQ.toLowerCase()) || a.genre.some(g => g.toLowerCase().includes(searchQ.toLowerCase())) || a.city.toLowerCase().includes(searchQ.toLowerCase()))
            : ARTISTS;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.slice(0, 6).map(artist => (
                <ArtistCard key={artist.id} artist={artist} onClick={() => navigate(`/artistas/${artist.id}`)} />
              ))}
              {searchQ && filtered.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-gray-400 text-sm">No encontramos artistas para "{searchQ}"</p>
                </div>
              )}
            </div>
          );
        }}
      </HomeSectionWithSearch>
      )}

      {/* ── PRÓXIMOS EVENTOS ── */}
      {isModuleOn('cta') && (
      <HomeSectionWithSearch
        title="🎉 Proximos Eventos"
        subtitle="Conciertos, festivales, sociales y mas"
        searchPlaceholder="Buscar evento, ciudad, tipo..."
        actionLabel="Ver Todos"
        onAction={() => navigate('/eventos')}
        onSearch={(q) => navigate(`/eventos?q=${encodeURIComponent(q)}`)}
        className="mb-12"
      >
        {(searchQ) => {
          const filtered = searchQ
            ? EVENTS.filter(e => e.title.toLowerCase().includes(searchQ.toLowerCase()) || e.city.toLowerCase().includes(searchQ.toLowerCase()) || e.category.some(c => c.toLowerCase().includes(searchQ.toLowerCase())))
            : EVENTS;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.slice(0, 6).map(event => (
                <EventCard key={event.id} event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
              ))}
              {searchQ && filtered.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-gray-400 text-sm">No encontramos eventos para "{searchQ}"</p>
                </div>
              )}
            </div>
          );
        }}
      </HomeSectionWithSearch>
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
