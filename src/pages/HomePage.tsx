import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronRight, MapPin, Star, Check, X, ArrowRight, LayoutDashboard, Wallet, Briefcase, Clock, Shield, DollarSign, Users, TrendingUp, Radio, ListMusic, Plus, Volume2, SkipForward, SkipBack, Youtube, Instagram } from 'lucide-react';
import { ARTISTS, EVENTS, VENUES } from '../data/mockData';
import { useAuthStore, useSiteConfigStore, getYouTubeId, usePerformerStore, useSponsorsStore, PLATFORM_COMMISSION_RATE, type HeroSliderImage, type HomeCategory } from '../store/appStore';
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

// ── SPONSORS ─────────────────────────────────────────────────────────────
const SPONSORS = [
  {
    id: 'sp1',
    name: 'Madrid Bachata',
    tagline: 'El congreso #1 de bachata en Madrid',
    logo: 'https://ui-avatars.com/api/?name=MB&background=E11D48&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#E11D48',
    link: '/venues?city=Madrid',
    badge: '🏆 Patrocinador',
  },
  {
    id: 'sp2',
    name: 'Azúcar Disco',
    tagline: 'La noche latina más caliente de Valencia',
    logo: 'https://ui-avatars.com/api/?name=AD&background=D97706&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#D97706',
    link: '/venues/v6',
    badge: '⭐ Destacado',
  },
  {
    id: 'sp3',
    name: 'El Son Madrid',
    tagline: 'Salsa & Bachata en el corazón de Madrid',
    logo: 'https://ui-avatars.com/api/?name=ES&background=7C3AED&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#7C3AED',
    link: '/venues/v8',
    badge: '🎵 Club Oficial',
  },
  {
    id: 'sp4',
    name: 'La Topa Tolondra',
    tagline: 'El templo de la salsa caleña desde los 70',
    logo: 'https://ui-avatars.com/api/?name=LT&background=059669&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#059669',
    link: '/venues/v28',
    badge: '💃 Leyenda Caleña',
  },
  {
    id: 'sp5',
    name: 'Le Balajo Paris',
    tagline: 'La sala más histórica de París desde 1936',
    logo: 'https://ui-avatars.com/api/?name=LB&background=EC4899&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#EC4899',
    link: '/venues/v16',
    badge: '🗼 París',
  },
  {
    id: 'sp6',
    name: 'Café Cantante',
    tagline: 'La timba cubana más auténtica de La Habana',
    logo: 'https://ui-avatars.com/api/?name=CC&background=0891B2&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#0891B2',
    link: '/venues/v34',
    badge: '🎺 La Habana',
  },
  {
    id: 'sp7',
    name: 'SOB\'s New York',
    tagline: 'Sounds of Brazil — leyenda latina del West Village',
    logo: 'https://ui-avatars.com/api/?name=SB&background=1E40AF&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#1E40AF',
    link: '/venues/v40',
    badge: '🗽 New York',
  },
  {
    id: 'sp8',
    name: 'Jet Set Club',
    tagline: 'La discoteca más famosa de República Dominicana',
    logo: 'https://ui-avatars.com/api/?name=JS&background=B91C1C&color=fff&size=120&bold=true&font-size=0.45&rounded=true',
    color: '#B91C1C',
    link: '/venues/v21',
    badge: '🌴 Santo Domingo',
  },
];

// ── SPONSORS SLIDER (compact) ─────────────────────────────────────────────
const SponsorsSlider: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const allSponsors = useSponsorsStore(s => s.sponsors);
  const active = allSponsors.filter(s => s.active);
  const shown = active.slice(0, 5);
  return (
    <section className="mt-3 px-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 rounded-full bg-gradient-to-b from-pink-500 to-fuchsia-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Patrocinadores</span>
        </div>
        <button onClick={() => navigate('/venues')} className="flex items-center gap-0.5 text-[10px] font-bold text-pink-500 hover:text-fuchsia-500 transition-colors">
          Ver todos <ChevronRight className="w-2.5 h-2.5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {shown.map((sp) => (
          <button
            key={sp.id}
            onClick={() => navigate(sp.link)}
            className="flex-shrink-0 flex flex-col items-center gap-1 group"
            style={{ minWidth: 56 }}
          >
            <div
              className="w-10 h-10 rounded-xl overflow-hidden shadow-md group-hover:scale-110 transition-transform duration-200 border border-white/20"
              style={{ boxShadow: `0 2px 10px ${sp.color}35` }}
            >
              <img src={sp.logo} alt={sp.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-500 text-center leading-tight max-w-[54px] line-clamp-1 group-hover:text-pink-500 transition-colors">
              {sp.name}
            </span>
          </button>
        ))}
        {/* Ver todos tile */}
        <button
          onClick={() => navigate('/venues')}
          className="flex-shrink-0 flex flex-col items-center gap-1 group"
          style={{ minWidth: 56 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/10 to-fuchsia-600/10 border border-dashed border-pink-400/50 flex items-center justify-center group-hover:bg-pink-500/20 transition-all duration-200">
            <span className="text-pink-500 text-xs font-black">+{Math.max(0, active.length - 5)}</span>
          </div>
          <span className="text-[9px] font-bold text-pink-500 text-center">Ver todos</span>
        </button>
      </div>
    </section>
  );
};

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
  { name: 'Madrid',           venues: 16, events: 8,  img: 'https://picsum.photos/seed/madrid2024/800/400',         monument: '🏛️', landmark: 'Puerta de Alcalá' },
  { name: 'Cali',             venues: 11, events: 6,  img: 'https://picsum.photos/seed/cali2024/800/400',           monument: '💃', landmark: 'Capital Mundial de la Salsa' },
  { name: 'Buenos Aires',     venues: 10, events: 7,  img: 'https://picsum.photos/seed/buenosaires2024/800/400',    monument: '🥩', landmark: 'La Boca & Tango' },
  { name: 'La Habana',        venues: 8,  events: 5,  img: 'https://picsum.photos/seed/habana2024/800/400',         monument: '🎺', landmark: 'Malecón Habanero' },
  { name: 'Barcelona',        venues: 9,  events: 5,  img: 'https://picsum.photos/seed/barcelona2024/800/400',      monument: '⛪', landmark: 'Sagrada Familia' },
  { name: 'Santo Domingo',    venues: 7,  events: 4,  img: 'https://picsum.photos/seed/santodomingo2024/800/400',   monument: '🌴', landmark: 'Zona Colonial' },
  { name: 'Miami',            venues: 7,  events: 5,  img: 'https://picsum.photos/seed/miami2024/800/400',          monument: '🌅', landmark: 'Calle Ocho – Little Havana' },
  { name: 'Medellín',         venues: 6,  events: 4,  img: 'https://picsum.photos/seed/medellin2024/800/400',       monument: '🌺', landmark: 'Plaza Botero' },
  { name: 'Paris',            venues: 7,  events: 4,  img: 'https://picsum.photos/seed/paris2024/800/400',          monument: '🗼', landmark: 'Torre Eiffel' },
  { name: 'Valencia',         venues: 7,  events: 3,  img: 'https://picsum.photos/seed/valencia2024/800/400',       monument: '🏟️', landmark: 'Ciudad de las Artes' },
  { name: 'New York',         venues: 6,  events: 4,  img: 'https://picsum.photos/seed/newyork2024/800/400',        monument: '🗽', landmark: 'El Barrio – Spanish Harlem' },
  { name: 'Ciudad de México', venues: 6,  events: 4,  img: 'https://picsum.photos/seed/mexicocity2024/800/400',     monument: '🏛️', landmark: 'Teotihuacán' },
  { name: 'London',           venues: 5,  events: 3,  img: 'https://picsum.photos/seed/london2024/800/400',         monument: '🎡', landmark: 'London Eye' },
  { name: 'Bogotá',           venues: 5,  events: 3,  img: 'https://picsum.photos/seed/bogota2024/800/400',         monument: '🏔️', landmark: 'Monserrate' },
  { name: 'Berlin',           venues: 4,  events: 2,  img: 'https://picsum.photos/seed/berlin2024/800/400',         monument: '🐻', landmark: 'Puerta de Brandeburgo' },
  { name: 'Caracas',          venues: 4,  events: 2,  img: 'https://picsum.photos/seed/caracas2024/800/400',        monument: '⛰️', landmark: 'El Ávila' },
  { name: 'Sevilla',          venues: 4,  events: 3,  img: 'https://picsum.photos/seed/sevilla2024/800/400',        monument: '💃', landmark: 'Alcázar de Sevilla' },
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
    <section className="mx-3 sm:mx-4 mt-4 sm:mt-6 mb-6 sm:mb-10">
      <div className="relative">
        {/* Search Container */}
        <div className="relative">
          <div className="bg-gradient-to-r from-pink-500/20 via-fuchsia-500/10 to-purple-500/20 rounded-2xl sm:rounded-3xl p-[2px] border border-pink-500/30 overflow-hidden">
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-3 flex items-center gap-2">
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
                placeholder="🔍 Artistas, eventos, venues..."
                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium min-w-0"
              />

              {/* Search Button */}
              <button
                onClick={() => handleSearch()}
                className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
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
  const sectionOrder: Record<HomeCategory['section'], number> = {
    main: 0,
    mercado: 1,
    comunidad: 2,
  };
  const visibleCats = [...active].sort((a, b) => {
    const bySection = sectionOrder[a.section] - sectionOrder[b.section];
    return bySection !== 0 ? bySection : a.display_order - b.display_order;
  });

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
      <div className="space-y-6 pb-6">
        {visibleCats.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500" />
                <h3 className="font-display font-bold text-sm sm:text-base text-gray-900 uppercase tracking-wider">
                  ⭐ Principales
                </h3>
              </div>
              <button
                onClick={() => navigate('/explorar')}
                className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors"
              >
                Ver todas →
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {visibleCats.map((cat, idx) => (
                <CategoryButton key={cat.id} cat={cat} index={idx} />
              ))}
            </div>
            <button
              onClick={() => navigate('/explorar')}
              className="w-full mt-4 py-2.5 rounded-xl border border-pink-200 text-pink-500 hover:bg-pink-50 text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              🔍 Ver todas las categorías
            </button>
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
            className="flex flex-col items-center gap-1 group hover:scale-105 transition-transform"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/50 transition-shadow">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-pink-500">{actionLabel}</span>
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
    <section className="mx-3 sm:mx-4 mt-5 sm:mt-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <h2 className="font-display font-black text-base sm:text-lg text-gray-900 dark:text-white">Locales Abiertos Ahora</h2>
        </div>
        <button onClick={() => navigate('/venues?open=true')} className="flex flex-col items-center gap-1 group hover:scale-105 transition-transform">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Ver Todos</span>
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 px-0.5" style={{ scrollbarWidth: 'none' }}>
        {openVenues.slice(0, 6).map(v => (
          <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
            className="flex-shrink-0 w-40 sm:w-44 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-emerald-500/10 transition-all hover:-translate-y-1 border border-gray-100 dark:border-gray-800 group">
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
  <section className="mx-3 sm:mx-4 mt-5 sm:mt-8">
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <h2 className="font-display font-black text-base sm:text-lg text-gray-900 dark:text-white">En Directo Ahora</h2>
      </div>
      <button onClick={() => navigate('/live')} className="flex flex-col items-center gap-1 group hover:scale-105 transition-transform">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Ver Todos</span>
      </button>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-3 px-0.5" style={{ scrollbarWidth: 'none' }}>
      {LIVE_STREAMS.map(s => (
        <button key={s.id} onClick={() => navigate(`/live/${s.id}`)}
          className="flex-shrink-0 w-32 sm:w-36 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group relative border-2 border-red-500/30 hover:border-red-500">
          <img src={s.img} alt={s.name} className="w-full h-44 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
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
  const isAdmin = !!user && (user.role === 'admin' || user.role === 'superadmin');
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

      {/* ── RADIOS · PLAYLISTS · REDES SOCIALES ── */}
      {isModuleOn('radio') && (
      <section className="mx-4 mt-4 space-y-2">
        {/* Fila 1: Radio + Playlist (cabeceras compactas, se expanden al tocar) */}
        <div className="grid grid-cols-2 gap-2">
          {/* RADIOS */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button onClick={() => setRadiosOpen(v => !v)}
              className="w-full bg-gradient-to-r from-gray-900 to-gray-800 px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-pink-400" />
                <span className="text-white font-bold text-[11px]">Radios</span>
                <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
              </div>
              <Plus className={`w-3 h-3 text-white/60 transition-transform duration-300 ${radiosOpen ? 'rotate-45' : ''}`} />
            </button>
            {radiosOpen && (
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {RADIO_STATIONS.map((station, i) => (
                  <button key={station.id} onClick={() => setPlaying(playing === i ? null : i)}
                    className={`w-full flex items-center gap-2 p-2 hover:bg-pink-50/50 dark:hover:bg-pink-900/10 transition-all text-left ${playing === i ? 'bg-pink-50 dark:bg-pink-900/20 border-l-2 border-pink-500' : ''}`}>
                    <img src={station.img} alt={station.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0 bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-[10px] truncate">{station.name}</p>
                      <p className="text-gray-400 text-[8px]">{station.genre}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${playing === i ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {playing === i ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PLAYLISTS */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button onClick={() => setPlaylistsOpen(v => !v)}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ListMusic className="w-3 h-3 text-white" />
                <span className="text-white font-bold text-[11px]">Playlists</span>
              </div>
              <Plus className={`w-3 h-3 text-white/60 transition-transform duration-300 ${playlistsOpen ? 'rotate-45' : ''}`} />
            </button>
            {playlistsOpen && (
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {PLAYLISTS.map((pl, idx) => (
                  <button key={pl.id} onClick={() => setPlaying(playing === 100 + idx ? null : 100 + idx)}
                    className={`w-full flex items-center gap-2 p-2 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all text-left ${playing === 100 + idx ? 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-500' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${pl.color} flex items-center justify-center flex-shrink-0`}>
                      <ListMusic className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-[10px] truncate">{pl.name}</p>
                      <p className="text-gray-400 text-[8px]">{pl.tracks} tracks</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${playing === 100 + idx ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {playing === 100 + idx ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fila 2: Redes sociales del proyecto */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Síguenos</span>
          <div className="flex items-center gap-2">
            {/* YouTube */}
            <a href="https://youtube.com/@bailanow" target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110 shadow-sm shadow-red-500/30">
              <Youtube className="w-3.5 h-3.5 text-white" />
            </a>
            {/* Instagram */}
            <a href="https://instagram.com/bailanow" target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 flex items-center justify-center transition-all hover:scale-110 shadow-sm shadow-pink-500/30">
              <Instagram className="w-3.5 h-3.5 text-white" />
            </a>
            {/* TikTok */}
            <a href="https://tiktok.com/@bailanow" target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-gray-900 hover:bg-black flex items-center justify-center transition-all hover:scale-110 shadow-sm">
              <svg className="w-3.5 h-3.5 text-white fill-white" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
              </svg>
            </a>
            {/* Facebook */}
            <a href="https://facebook.com/bailanow" target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all hover:scale-110 shadow-sm shadow-blue-500/30">
              <svg className="w-3.5 h-3.5 text-white fill-white" viewBox="0 0 24 24">
                <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>
      )}

      {/* ── RUTA DE HOY — siempre visible, debajo de radio/playlist ── */}
      {isModuleOn('ruta') && (
      <section className="mx-4 mt-2">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-orange to-pink-500 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <span className="text-white font-black text-xs tracking-wide">Ruta de Hoy</span>
              <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">En vivo</span>
            </div>
            <button onClick={() => navigate('/comunidad')} className="flex items-center gap-0.5 text-white/80 hover:text-white text-[10px] font-bold transition-colors">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {/* Posts en horizontal scroll */}
          <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {COMMUNITY_POSTS.filter(p => p.status === 'APROBADO').slice(0, 5).map((post, idx, arr) => (
              <button
                key={post.id}
                onClick={() => navigate(`/comunidad?post=${post.id}`)}
                className={`flex-shrink-0 flex items-start gap-2 p-3 hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-all text-left ${idx < arr.length - 1 ? 'border-r border-gray-100 dark:border-gray-800' : ''}`}
                style={{ minWidth: 170, maxWidth: 180 }}
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user)}&background=F97316&color=fff&size=60&bold=true&rounded=true`}
                  alt={post.user}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-[10px] truncate">{post.user}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-[9px] line-clamp-2 leading-snug mt-0.5">{post.fullText}</p>
                  <p className="text-[8px] text-brand-orange font-bold mt-1">📍 {post.location}</p>
                </div>
              </button>
            ))}
          </div>
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
      <section className="mx-3 sm:mx-4 mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-pink-900 to-gray-900 relative h-[200px] sm:h-[260px] lg:h-[380px]">
        <div className="absolute inset-0">
          <HeroSliderFullHeight images={
            heroSliderImages.length > 0 ? heroSliderImages : [
              { id: '1', url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=1400&h=500&fit=crop&q=80', alt: 'BailaNow - Todo lo que amas del baile latino' },
              { id: '2', url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1400&h=500&fit=crop&q=80', alt: 'BailaNow - Encuentra todo el mundo del baile en tus manos' },
            ]
          } />
        </div>
      </section>

      {/* ── SPONSORS SLIDER ── */}
      <SponsorsSlider navigate={navigate} />

      {/* ── ULTRAMODERN SMART SEARCH ── */}
      <UltraModernSearchSection navigate={navigate} categories={DEFAULT_CATEGORIES} />

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
        actionLabel="Ver Todas"
        onAction={() => navigate('/venues')}
        onSearch={(q) => navigate(`/venues?city=${encodeURIComponent(q)}`)}
      >
        {(searchQ) => {
          const filtered = searchQ
            ? CITIES.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()))
            : CITIES.slice(0, 9);
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

      {/* ── FOOTER LEGAL ── */}
      <footer className="mt-10 mx-4 mb-4 pb-2 border-t border-gray-200 dark:border-gray-800 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm text-gray-900 dark:text-white">Baila</span>
            <span className="font-display font-black text-sm bg-gradient-to-r from-pink-500 to-fuchsia-600 bg-clip-text text-transparent">Now</span>
            <span className="text-gray-400 text-xs ml-1">© 2025</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <a href="/legal/terminos" className="hover:text-pink-500 transition-colors">Términos</a>
            <a href="/legal/privacidad" className="hover:text-pink-500 transition-colors">Privacidad</a>
            <a href="/legal/cookies" className="hover:text-pink-500 transition-colors">Cookies</a>
            <a href="mailto:hola@bailanow.com" className="hover:text-pink-500 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
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
