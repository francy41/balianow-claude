import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import MapErrorBoundary from '../components/MapErrorBoundary';
import { Play, Pause, ChevronRight, MapPin, Star, Check, X, ArrowRight, LayoutDashboard, Wallet, Briefcase, Clock, Shield, DollarSign, Users, TrendingUp, Radio, ListMusic, Plus, Volume2, SkipForward, SkipBack, Youtube, Instagram, Download, Smartphone, Video, DoorOpen, Tv, Search, Calendar, Ticket, Loader2, Route as RouteIcon, Heart, Building2, GraduationCap, Grid3x3 } from 'lucide-react';
import { ARTISTS, EVENTS } from '../data/mockData';
import { TOP_DANCE_CITIES } from '../data/topDanceCities';
import { useAuthStore, useSiteConfigStore, getYouTubeId, usePerformerStore, useSponsorsStore, PLATFORM_COMMISSION_RATE, DEFAULT_HOME_TV, type HomeCategory } from '../store/appStore';
import { useCMSStore, visibleHomeModules, activeCategories } from '../store/cmsStore';
import { Avatar, StarRating, SearchBar, AppImage } from '../components/ui';
import { supabase } from '../lib/supabase';
import { fixText } from '../lib/text';
import NewsletterForm from '../components/NewsletterForm';
import HomeFabStack from '../components/HomeFabStack';
import RadioWidgetModal from '../components/RadioWidgetModal';
import TvPreviewModal from '../components/TvPreviewModal';
import HomeBackground from '../components/HomeBackground';
import DanceFlowPromo from '../components/DanceFlowPromo';
import { usePageMeta } from '../hooks/usePageMeta';
import { useHomeModules } from '../hooks/useHomeModules';
import { useJsonLd, organizationLd, websiteLd } from '../lib/structuredData';

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

// Etiqueta de tipo (subtítulo cuando no hay ciudad)
const FEATURED_TYPE_LABEL: Record<string, string> = {
  venue: 'Local', artist: 'Artista', event: 'Evento', brand: 'Marca',
  profile: 'Perfil', company: 'Empresa', seller: 'Vendedor', package: 'Paquete',
};

// ── LO MÁS DESTACADO (slider de tarjetas grandes: imagen + nombre + ciudad/tipo) ──
const FeaturedSlider: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const allSponsors = useSponsorsStore(s => s.sponsors);
  // "Lo más destacado" = items activos cuyo placement sea featured o both (default both)
  const active = allSponsors.filter(s => s.active && (s.placement ?? 'both') !== 'footer');
  if (active.length === 0) return null;
  const duplicated = [...active, ...active, ...active];

  return (
    <section className="mt-3 px-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 rounded-full bg-brand-orange" />
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">🔥 Lo más destacado</span>
        </div>
        <button onClick={() => navigate('/destacados')} className="flex items-center gap-0.5 text-[10px] font-bold text-pink-500 hover:text-fuchsia-500 transition-colors">
          Ver todos <ChevronRight className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Marquee con máscara de degradado a los lados */}
      <div className="relative overflow-hidden" style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)',
      }}>
        <div className="flex gap-3 animate-marquee-left" style={{ width: 'max-content' }}>
          {duplicated.map((sp, i) => (
            <button
              key={`${sp.id}-${i}`}
              onClick={() => navigate(sp.link)}
              className="flex-shrink-0 group text-center"
              style={{ width: 104 }}
            >
              <div
                className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all duration-200 border-2 border-white dark:border-gray-800"
                style={{ boxShadow: `0 3px 14px ${sp.color}40` }}
              >
                <img src={sp.logo} alt={sp.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <p className="mt-1.5 text-xs font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 group-hover:text-pink-500 transition-colors">
                {sp.name}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight line-clamp-1">
                {sp.city || FEATURED_TYPE_LABEL[sp.type] || ''}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── PATROCINADORES (strip pequeño para el pie de página) ──────────────
const SponsorsFooterStrip: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const allSponsors = useSponsorsStore(s => s.sponsors);
  // Pie = sponsors/empresas/marcas con placement footer o both
  const sponsors = allSponsors.filter(s =>
    s.active && (s.placement ?? 'both') !== 'featured' &&
    ['brand', 'company'].includes(s.type)
  );
  if (sponsors.length === 0) return null;
  const duplicated = [...sponsors, ...sponsors, ...sponsors];

  return (
    <section className="mt-8 mx-4">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-1 h-3 rounded-full bg-gray-800" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Nuestros Patrocinadores</span>
      </div>
      <div className="relative overflow-hidden" style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
      }}>
        <div className="flex gap-4 animate-marquee-left" style={{ width: 'max-content' }}>
          {duplicated.map((sp, i) => (
            <button key={`${sp.id}-${i}`} onClick={() => navigate(sp.link)}
              className="flex-shrink-0 flex flex-col items-center gap-1 group" style={{ minWidth: 64 }}>
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md group-hover:scale-110 transition-transform duration-200 border border-white/20"
                style={{ boxShadow: `0 2px 10px ${sp.color}35` }}>
                <img src={sp.logo} alt={sp.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <span className="text-[9px] font-semibold text-gray-500 text-center leading-tight max-w-[60px] line-clamp-1 group-hover:text-pink-500 transition-colors">
                {sp.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── COMMUNITY POSTS (Ruta de Hoy) ────────────────────────────────────────
const COMMUNITY_POSTS = [
  { id: 1, user: 'Carlos Méndez', fullText: 'El viernes voy a Madrid, ¿dónde puedo salir a bailar? Prefiero salsa y ambiente latino auténtico.', location: 'Madrid', category: 'localidades', status: 'APROBADO', time: 'Hace 15 min' },
  { id: 2, user: 'Daniel Cruz', fullText: '¿Cuál es la mejor discoteca latina abierta ahora en Valencia? Queremos bailar el sábado por la noche.', location: 'Valencia', category: 'localidades', status: 'APROBADO', time: 'Hace 1 hora' },
  { id: 3, user: 'Laura Silva', fullText: 'Busco pareja para ir a la social de salsa de este jueves. ¡Nivel intermedio! ¿Quién se apunta?', location: 'Barcelona', category: 'bailarines', status: 'APROBADO', time: 'Hace 2 horas' },
  { id: 4, user: 'Andrés Molina', fullText: '¿Dónde hay social de bachata dominicana los domingos en Sevilla? Busco buen ambiente.', location: 'Sevilla', category: 'localidades', status: 'APROBADO', time: 'Hace 3 horas' },
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
  { id: 'p1', name: 'Bachata Sensual', tracks: 24, duration: '1h 32m', img: 'https://picsum.photos/seed/playlist-bachata/120/120', color: 'bg-pink-500' },
  { id: 'p2', name: 'Salsa Pa Bailar', tracks: 30, duration: '2h 05m', img: 'https://picsum.photos/seed/playlist-salsa/120/120', color: 'bg-orange-500' },
  { id: 'p3', name: 'Latin Club Hits', tracks: 18, duration: '1h 10m', img: 'https://picsum.photos/seed/playlist-club/120/120', color: 'bg-purple-500' },
  { id: 'p4', name: 'Kizomba Chill', tracks: 20, duration: '1h 25m', img: 'https://picsum.photos/seed/playlist-kizomba/120/120', color: 'bg-indigo-500' },
  { id: 'p5', name: 'Reggaeton Party', tracks: 22, duration: '1h 18m', img: 'https://picsum.photos/seed/playlist-reggaeton/120/120', color: 'bg-yellow-500' },
];

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
                className="flex-shrink-0 px-4 py-2 bg-brand-orange text-white rounded-xl font-bold text-sm transition-all active:scale-95"
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
                        <p className="text-gray-500 text-xs">{city.monument} {city.landmark}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {filteredCategories.length === 0 && filteredCities.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-ink-tertiary text-sm">No encontramos categorías ni ciudades que coincidan</p>
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
            <h2 className="font-display font-black text-2xl sm:text-3xl bg-brand-orange bg-clip-text text-transparent mb-1">
              ❤️ Planes Para Bailar
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
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

// ── DYNAMIC CATEGORIES SECTION ────────────────────────────────────────
// Tintes rotativos para los chips de categoría — dan variedad tipo escaparate
// (Glovo/Fever) manteniendo la identidad BailaNow. Clases literales para el JIT.
const CHIP_TINTS = [
  'from-rose-500/20 to-pink-500/10 ring-rose-400/40 group-hover:shadow-rose-500/25',
  'from-orange-500/20 to-amber-500/10 ring-orange-400/40 group-hover:shadow-orange-500/25',
  'from-violet-500/20 to-fuchsia-500/10 ring-violet-400/40 group-hover:shadow-violet-500/25',
  'from-cyan-500/20 to-blue-500/10 ring-cyan-400/40 group-hover:shadow-cyan-500/25',
  'from-emerald-500/20 to-teal-500/10 ring-emerald-400/40 group-hover:shadow-emerald-500/25',
  'from-amber-500/20 to-yellow-500/10 ring-amber-400/40 group-hover:shadow-amber-500/25',
];

// Un pin distinto (color + alarma parpadeante) por categoría, para el mapa de "Planes de baile"
// del Home — mismos colores que las insignias de las tarjetas, para que se reconozcan a simple vista.
const discoverPin = (ringClass: string, gradClass: string) => L.divIcon({
  className: '',
  html: `<div class="relative w-4 h-4"><span class="animate-ping absolute inline-flex h-full w-full rounded-full ${ringClass} opacity-80"></span><span class="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-br ${gradClass} ring-2 ring-white shadow-lg"></span></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});
const DISCOVER_PIN_ICON: Record<'plan' | 'venue' | 'evento' | 'vivo', L.DivIcon> = {
  plan:   discoverPin('bg-pink-300', 'from-pink-500 to-fuchsia-600'),
  venue:  discoverPin('bg-emerald-300', 'from-emerald-500 to-emerald-700'),
  evento: discoverPin('bg-violet-300', 'from-violet-500 to-purple-700'),
  vivo:   discoverPin('bg-orange-300', 'from-orange-500 to-red-600'),
};

// ── PLANES DE BAILE (Home) — mapa real, 4 métricas reales, pestañas funcionales y
// tarjetas con fotos reales (locales/eventos/directos ya tienen foto propia en la BD;
// los "planes" no, así que esos usan degradado+icono en vez de una foto inventada). ──
interface HomeRutaStop { name: string; address?: string; lat: number; lng: number; venue_id?: string; }
interface HomeRuta { id: string; title: string; city: string; date: string | null; time: string | null; stops: HomeRutaStop[]; }

type DiscoverKind = 'plan' | 'venue' | 'local' | 'pareja' | 'evento' | 'vivo';
interface DiscoverItem {
  id: string; kind: DiscoverKind; title: string; city: string; meta: string;
  cover: string | null; rating: number; route: string; lat?: number; lng?: number;
  crowdCount?: number; crowdAvatars?: (string | null)[]; isToday?: boolean;
}

const DISCOVER_TABS: { key: DiscoverKind | 'todos'; label: string; icon: React.FC<any> }[] = [
  { key: 'todos', label: 'Todos', icon: Grid3x3 },
  { key: 'plan', label: 'Planes de baile', icon: RouteIcon },
  { key: 'venue', label: 'Abiertos ahora', icon: Building2 },
  { key: 'local', label: 'Locales', icon: MapPin },
  { key: 'pareja', label: 'Pareja de baile', icon: Heart },
  { key: 'evento', label: 'Eventos', icon: GraduationCap },
  { key: 'vivo', label: 'Eventos en vivo', icon: Calendar },
];
const DISCOVER_ORDER: DiscoverKind[] = ['plan', 'venue', 'local', 'vivo', 'evento', 'pareja'];
const DISCOVER_TAB_ROUTE: Record<DiscoverKind | 'todos', string> = {
  todos: '/rutas', plan: '/rutas', venue: '/venues', local: '/venues', pareja: '/parejas', evento: '/eventos', vivo: '/live',
};

const DISCOVER_BADGE: Record<DiscoverKind, { label: string; className: string; cta: string }> = {
  plan:   { label: 'PLAN',          className: 'bg-pink-600',    cta: 'border-pink-400 text-pink-300' },
  venue:  { label: 'ABIERTO AHORA', className: 'bg-emerald-600', cta: 'border-emerald-400 text-emerald-300' },
  local:  { label: 'LOCAL',         className: 'bg-cyan-600',    cta: 'border-cyan-400 text-cyan-300' },
  pareja: { label: 'PAREJA',        className: 'bg-fuchsia-600', cta: 'border-fuchsia-400 text-fuchsia-300' },
  evento: { label: 'EVENTO',        className: 'bg-violet-600',  cta: 'border-violet-400 text-violet-300' },
  vivo:   { label: 'EN VIVO',       className: 'bg-red-600',     cta: 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-transparent' },
};

// Punto de alarma parpadeante por categoría en las pestañas — mismos colores que el mapa y las tarjetas.
const DISCOVER_TAB_DOT: Partial<Record<DiscoverKind | 'todos', { ring: string; grad: string }>> = {
  plan:   { ring: 'bg-pink-400',    grad: 'from-pink-500 to-fuchsia-600' },
  venue:  { ring: 'bg-emerald-400', grad: 'from-emerald-500 to-emerald-700' },
  local:  { ring: 'bg-cyan-400',    grad: 'from-cyan-500 to-blue-600' },
  pareja: { ring: 'bg-fuchsia-400', grad: 'from-fuchsia-500 to-purple-700' },
  evento: { ring: 'bg-violet-400',  grad: 'from-violet-500 to-purple-700' },
  vivo:   { ring: 'bg-orange-400',  grad: 'from-orange-500 to-red-600' },
};

// Centro aproximado de las ciudades del baile latino más comunes en la app — se usa SOLO como
// respaldo cuando un evento/directo/plan real tiene ciudad pero no lat/lng propios guardados en
// la BD (muchos registros aún no las tienen). Nunca sustituye una coordenada real ya guardada.
const CITY_CENTER: Record<string, [number, number]> = {
  // España
  'madrid': [40.4168, -3.7038], 'barcelona': [41.3851, 2.1734], 'valencia': [39.4699, -0.3763],
  'sevilla': [37.3891, -5.9845], 'bilbao': [43.2630, -2.9350], 'málaga': [36.7213, -4.4214],
  'malaga': [36.7213, -4.4214], 'zaragoza': [41.6488, -0.8891], 'murcia': [37.9922, -1.1307],
  'palma de mallorca': [39.5696, 2.6502], 'palma': [39.5696, 2.6502],
  'las palmas de gran canaria': [28.1235, -15.4363], 'las palmas': [28.1235, -15.4363],
  'alicante': [38.3452, -0.4810], 'granada': [37.1773, -3.5986], 'san sebastián': [43.3183, -1.9812],
  'gijón': [43.5322, -5.6611], 'vigo': [42.2406, -8.7207], 'santa cruz de tenerife': [28.4636, -16.2518],
  'córdoba': [37.8882, -4.7794], 'valladolid': [41.6523, -4.7245], 'marbella': [36.5099, -4.8863],
  'ibiza': [38.9067, 1.4206],
  // México y Centroamérica
  'ciudad de méxico': [19.4326, -99.1332], 'cdmx': [19.4326, -99.1332], 'méxico df': [19.4326, -99.1332],
  'guadalajara': [20.6597, -103.3496], 'monterrey': [25.6866, -100.3161], 'cancún': [21.1619, -86.8515],
  'puebla': [19.0414, -98.2063], 'tijuana': [32.5149, -117.0382], 'mérida': [20.9674, -89.5926],
  'playa del carmen': [20.6296, -87.0739], 'guatemala': [14.6349, -90.5069], 'tegucigalpa': [14.0723, -87.1921],
  'san salvador': [13.6929, -89.2182], 'managua': [12.1364, -86.2514], 'san josé': [9.9281, -84.0907],
  'ciudad de panamá': [8.9824, -79.5199], 'panamá': [8.9824, -79.5199], 'panama': [8.9824, -79.5199],
  // Caribe
  'la habana': [23.1136, -82.3666], 'santiago de cuba': [20.0247, -75.8219],
  'santo domingo': [18.4861, -69.9312], 'santiago de los caballeros': [19.4517, -70.6970],
  'san juan': [18.4655, -66.1057], 'kingston': [17.9712, -76.7936], 'puerto españa': [10.6549, -61.5019],
  'willemstad': [12.1091, -68.9316],
  // Sudamérica
  'bogotá': [4.7110, -74.0721], 'bogota': [4.7110, -74.0721], 'medellín': [6.2442, -75.5812],
  'medellin': [6.2442, -75.5812], 'cali': [3.4516, -76.5320], 'barranquilla': [10.9639, -74.7964],
  'cartagena': [10.3910, -75.4794], 'bucaramanga': [7.1193, -73.1227],
  'buenos aires': [-34.6037, -58.3816], 'córdoba (argentina)': [-31.4201, -64.1888],
  'rosario': [-32.9442, -60.6505], 'mendoza': [-32.8895, -68.8458],
  'santiago': [-33.4489, -70.6693], 'santiago de chile': [-33.4489, -70.6693],
  'valparaíso': [-33.0472, -71.6127], 'concepción': [-36.8201, -73.0444],
  'lima': [-12.0464, -77.0428], 'arequipa': [-16.4090, -71.5375], 'cusco': [-13.5320, -71.9675],
  'montevideo': [-34.9011, -56.1645], 'punta del este': [-34.9670, -54.9500],
  'caracas': [10.4806, -66.9036], 'maracaibo': [10.6427, -71.6125], 'valencia (venezuela)': [10.1621, -68.0077],
  'quito': [-0.1807, -78.4678], 'guayaquil': [-2.1894, -79.8890],
  'la paz': [-16.5000, -68.1500], 'santa cruz de la sierra': [-17.7833, -63.1821],
  'asunción': [-25.2637, -57.5759],
  'são paulo': [-23.5505, -46.6333], 'rio de janeiro': [-22.9068, -43.1729], 'río de janeiro': [-22.9068, -43.1729],
  'recife': [-8.0476, -34.8770], 'salvador de bahía': [-12.9777, -38.5016],
  // Estados Unidos
  'miami': [25.7617, -80.1918], 'nueva york': [40.7128, -74.0060], 'new york': [40.7128, -74.0060],
  'los ángeles': [34.0522, -118.2437], 'chicago': [41.8781, -87.6298], 'houston': [29.7604, -95.3698],
  'orlando': [28.5383, -81.3792], 'las vegas': [36.1699, -115.1398], 'san francisco': [37.7749, -122.4194],
  'boston': [42.3601, -71.0589], 'washington d.c.': [38.9072, -77.0369], 'dallas': [32.7767, -96.7970],
  'atlanta': [33.7490, -84.3880], 'san antonio': [29.4241, -98.4936],
  // Europa occidental
  'lisboa': [38.7223, -9.1393], 'lisbon': [38.7223, -9.1393], 'oporto': [41.1579, -8.6291],
  'roma': [41.9028, 12.4964], 'milán': [45.4642, 9.1900], 'parís': [48.8566, 2.3522],
  'londres': [51.5074, -0.1278], 'berlín': [52.5200, 13.4050], 'múnich': [48.1351, 11.5820],
  'ámsterdam': [52.3676, 4.9041], 'bruselas': [50.8503, 4.3517], 'zúrich': [47.3769, 8.5417],
  'viena': [48.2082, 16.3738], 'ginebra': [46.2044, 6.1432], 'estocolmo': [59.3293, 18.0686],
  'copenhague': [55.6761, 12.5683], 'oslo': [59.9139, 10.7522], 'dublín': [53.3498, -6.2603],
  // Europa del Este
  'varsovia': [52.2297, 21.0122], 'cracovia': [50.0647, 19.9450], 'praga': [50.0755, 14.4378],
  'budapest': [47.4979, 19.0402], 'bucarest': [44.4268, 26.1025], 'kiev': [50.4501, 30.5234],
  'moscú': [55.7558, 37.6173], 'san petersburgo': [59.9311, 30.3609], 'sofía': [42.6977, 23.3219],
  'belgrado': [44.7866, 20.4489], 'zagreb': [45.8150, 15.9819],
  // Asia y Oceanía
  'tokio': [35.6762, 139.6503], 'seúl': [37.5665, 126.9780], 'shanghái': [31.2304, 121.4737],
  'pekín': [39.9042, 116.4074], 'singapur': [1.3521, 103.8198], 'bangkok': [13.7563, 100.5018],
  'manila': [14.5995, 120.9842], 'hong kong': [22.3193, 114.1694], 'dubái': [25.2048, 55.2708],
  'tel aviv': [32.0853, 34.7818], 'sídney': [-33.8688, 151.2093], 'melbourne': [-37.8136, 144.9631],
};
const cityCenter = (city?: string) => city ? CITY_CENTER[city.trim().toLowerCase()] : undefined;

// Encuadra automáticamente TODOS los pines reales en la vista — sin esto, si dos elementos
// reales están en ciudades lejanas (p.ej. Madrid y La Habana), el centro medio + zoom fijo
// puede dejar casi todos los pines fuera de la vista visible.
const FitDiscoverPins: React.FC<{ pins: { lat: number; lng: number }[] }> = ({ pins }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 12);
      else if (pins.length > 1) map.fitBounds(pins.map(p => [p.lat, p.lng]) as any, { padding: [28, 28], maxZoom: 11 });
    }, 150);
    return () => clearTimeout(t);
  }, [pins, map]);
  return null;
};

const PlanesDeBaileHomeSection: React.FC<{ navigate: any; cityFilter?: string; onCityChange: (city: string) => void }> = ({ navigate, cityFilter, onCityChange }) => {
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [stats, setStats] = useState({ abiertos: 0, pareja: 0, vivo: 0, rating: 0, plan: 0, evento: 0, local: 0 });
  const [tab, setTab] = useState<DiscoverKind | 'todos'>('todos');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const toMin = (s: string) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
      const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();

      const [rutasRes, rutasCountRes, venuesRes, parejaRes, parejaCountRes, eventoRes, eventoCountRes, vivoCountRes, vivoRes] = await Promise.all([
        supabase.from('rutas').select('*').eq('status', 'open').or(`end_date.is.null,end_date.gte.${today}`).order('created_at', { ascending: false }).limit(4),
        supabase.from('rutas').select('id', { count: 'exact', head: true }).eq('status', 'open').or(`end_date.is.null,end_date.gte.${today}`),
        supabase.from('venues').select('id,name,city,cover,image_url,rating,open_time,close_time,is_open,lat,lng').is('deleted_at', null),
        supabase.from('partner_profiles').select('user_id,name,avatar,city,level,styles').eq('active', true).limit(8),
        supabase.from('partner_profiles').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('events').select('id,title,city,date,cover,image_url,lat,lng').is('deleted_at', null).gte('date', today).order('date', { ascending: true }).limit(8),
        supabase.from('events').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('date', today),
        supabase.from('live_sessions').select('id', { count: 'exact', head: true }).eq('status', 'live'),
        supabase.from('live_sessions').select('id,title,category,viewers_count,city,cover_url,lat,lng').eq('status', 'live').limit(8),
      ]);
      if (cancelled) return;

      const plansRaw = (rutasRes.data || []).map((r: any) => ({ ...r, stops: Array.isArray(r.stops) ? r.stops : [] }));
      const planIds = plansRaw.map((r: any) => r.id);
      let crowdByPlan: Record<string, { count: number; avatars: (string | null)[] }> = {};
      if (planIds.length) {
        const { data: mem } = await supabase.from('ruta_members').select('ruta_id, user_id').in('ruta_id', planIds);
        const rows = mem || [];
        const { data: profs } = rows.length
          ? await supabase.from('profiles').select('id, avatar_url').in('id', [...new Set(rows.map((m: any) => m.user_id))])
          : { data: [] as any[] };
        if (cancelled) return;
        const avatarOf = new Map((profs || []).map((p: any) => [p.id, p.avatar_url]));
        for (const m of rows as any[]) {
          const g = crowdByPlan[m.ruta_id] || (crowdByPlan[m.ruta_id] = { count: 0, avatars: [] });
          g.count++;
          if (g.avatars.length < 3) g.avatars.push(avatarOf.get(m.user_id) || null);
        }
      }

      const allVenues = venuesRes.data || [];
      const isOpenNow = (v: any) => {
        if (v.is_open === true) return true;
        if (v.open_time && v.close_time) {
          const o = toMin(v.open_time), c = toMin(v.close_time);
          return c > o ? (cur >= o && cur <= c) : (cur >= o || cur <= c);
        }
        return false;
      };
      const openVenues = allVenues.filter(isOpenNow);
      const ratedVenues = allVenues.filter((v: any) => Number(v.rating) > 0);
      const avgRating = ratedVenues.length ? ratedVenues.reduce((s: number, v: any) => s + Number(v.rating), 0) / ratedVenues.length : 0;

      // Coordenada real si existe; si no, el centro de su ciudad real (nunca una ubicación inventada).
      // Cuando cae por ciudad, se aplica un pequeño desplazamiento determinista (según su id) para
      // que dos registros reales de la misma ciudad no queden exactamente uno encima del otro.
      const jitter = (id: string) => {
        let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
        return { dLat: ((h % 200) - 100) / 8000, dLng: (((h >> 8) % 200) - 100) / 8000 };
      };
      const withCoords = (lat: any, lng: any, city: string | undefined, id: string) => {
        const la = Number(lat), ln = Number(lng);
        if (Number.isFinite(la) && Number.isFinite(ln) && la !== 0 && ln !== 0) return { lat: la, lng: ln };
        const c = cityCenter(city);
        if (!c) return {};
        const { dLat, dLng } = jitter(id);
        return { lat: c[0] + dLat, lng: c[1] + dLng };
      };

      const planItems: DiscoverItem[] = plansRaw.slice(0, 4).map((r: any) => ({
        id: `plan-${r.id}`, kind: 'plan', title: r.title, city: r.city,
        meta: r.time ? `${r.date === today ? 'Hoy' : r.date} · ${r.time}` : (r.date || ''),
        cover: null, rating: 0, route: '/rutas',
        crowdCount: crowdByPlan[r.id]?.count || 0, crowdAvatars: crowdByPlan[r.id]?.avatars || [],
        isToday: r.date === today,
        ...withCoords(r.stops[0]?.lat, r.stops[0]?.lng, r.city, `plan-${r.id}`),
      }));
      const venueItems: DiscoverItem[] = openVenues.slice(0, 6).map((v: any) => ({
        id: `venue-${v.id}`, kind: 'venue', title: v.name, city: v.city || '',
        meta: v.close_time ? `Abierto hasta ${String(v.close_time).slice(0, 5)}` : 'Abierto ahora',
        cover: v.cover || v.image_url || null, rating: Number(v.rating) || 0, route: `/venues/${v.id}`,
        ...withCoords(v.lat, v.lng, v.city, `venue-${v.id}`),
      }));
      // "Locales" = directorio completo (abiertos o no), a diferencia de "Abiertos ahora".
      const localItems: DiscoverItem[] = allVenues.slice(0, 6).map((v: any) => ({
        id: `local-${v.id}`, kind: 'local', title: v.name, city: v.city || '',
        meta: isOpenNow(v) ? 'Abierto ahora' : 'Cerrado ahora',
        cover: v.cover || v.image_url || null, rating: Number(v.rating) || 0, route: `/venues/${v.id}`,
      }));
      const parejaItems: DiscoverItem[] = (parejaRes.data || []).slice(0, 6).map((p: any) => ({
        id: `pareja-${p.user_id}`, kind: 'pareja', title: p.name || 'Bailarín/a', city: p.city || '',
        meta: [p.level, Array.isArray(p.styles) ? p.styles.slice(0, 2).join(', ') : ''].filter(Boolean).join(' · '),
        cover: p.avatar || null, rating: 0, route: '/parejas',
      }));
      const eventoItems: DiscoverItem[] = (eventoRes.data || []).slice(0, 6).map((e: any) => ({
        id: `evento-${e.id}`, kind: 'evento', title: e.title, city: e.city || '',
        meta: e.date === today ? 'Hoy' : e.date,
        cover: e.cover || e.image_url || null, rating: 0, route: `/eventos/${e.id}`,
        ...withCoords(e.lat, e.lng, e.city, `evento-${e.id}`),
      }));
      const vivoItems: DiscoverItem[] = (vivoRes.data || []).slice(0, 6).map((s: any) => ({
        id: `vivo-${s.id}`, kind: 'vivo', title: s.title, city: s.city || '',
        meta: s.viewers_count > 0 ? `${s.viewers_count} viendo ahora` : 'En directo ahora',
        cover: s.cover_url || null, rating: 0, route: `/live/session/${s.id}`,
        ...withCoords(s.lat, s.lng, s.city, `vivo-${s.id}`),
      }));

      setItems([...planItems, ...venueItems, ...localItems, ...parejaItems, ...eventoItems, ...vivoItems]);
      // Totales reales (no el nº de tarjetas cargadas) — el mismo número que se ve en las
      // cabeceras se usa también en el contador de cada pestaña, para que nunca se contradigan.
      setStats({
        abiertos: openVenues.length,
        pareja: parejaCountRes.count || 0,
        vivo: vivoCountRes.count || 0,
        rating: avgRating,
        plan: rutasCountRes.count || 0,
        evento: eventoCountRes.count || 0,
        local: allVenues.length,
      });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loaded && items.length === 0) return null;

  // Ciudad elegida en el súper buscador de arriba — filtra las tarjetas y el mapa de esta sección.
  const scoped = cityFilter?.trim()
    ? items.filter(it => it.city.toLowerCase().includes(cityFilter.trim().toLowerCase()))
    : items;

  // "Todos" = un único ejemplo real por categoría (nunca varias tarjetas del mismo tipo seguidas).
  const shown = tab === 'todos'
    ? DISCOVER_ORDER.map(k => scoped.find(it => it.kind === k)).filter((it): it is DiscoverItem => !!it)
    : scoped.filter(it => it.kind === tab).slice(0, 8);

  // El mapa siempre muestra las 4 categorías con ubicación real (Planes/Abiertos/Eventos/En directo),
  // cada una con su propio color y alarma parpadeante — independiente de la pestaña activa.
  const MAPPABLE: DiscoverKind[] = ['plan', 'venue', 'evento', 'vivo'];
  const pins = scoped.filter((it): it is DiscoverItem & { lat: number; lng: number; kind: 'plan' | 'venue' | 'evento' | 'vivo' } =>
    MAPPABLE.includes(it.kind) && it.lat !== undefined && it.lng !== undefined);
  const mapCenter: [number, number] = pins.length
    ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length]
    : [40.4168, -3.7038];

  // Actividad real ahora mismo (no "alertas" ficticias): abiertos + directos + planes de hoy.
  const activityNow = stats.abiertos + stats.vivo + shown.filter(it => it.kind === 'plan' && it.isToday).length;

  return (
    <section className="mx-3 sm:mx-4 mt-8">
      <div className="relative overflow-hidden rounded-3xl min-h-[80px] sm:min-h-[240px]">
        {/* Mapa real de fondo — Planes/Abiertos ahora/Eventos/En directo a la vez, cada uno con su color y alarma */}
        <div className="absolute inset-0">
          {pins.length > 0 ? (
            <MapErrorBoundary fallback={<div className="absolute inset-0 bg-gradient-to-br from-[#EC4899] via-[#BE185D] to-[#831843]" />}>
              <MapContainer center={mapCenter} zoom={pins.length > 1 ? 6 : 12} style={{ width: '100%', height: '100%' }}
                attributionControl={false} zoomControl={false} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <FitDiscoverPins pins={pins} />
                {pins.map(p => (
                  <Marker key={p.id} position={[p.lat, p.lng]} icon={DISCOVER_PIN_ICON[p.kind]}
                    eventHandlers={{ click: () => navigate(p.route) }} />
                ))}
              </MapContainer>
            </MapErrorBoundary>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#EC4899] via-[#BE185D] to-[#831843]" />
          )}
        </div>
        {/* Degradados rosa oscuro para que el texto siempre se lea sobre el mapa */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#831843] via-[#831843]/70 to-[#831843]/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#831843]/85 via-transparent to-transparent pointer-events-none" />

        <div className="relative p-2.5 sm:p-5 flex items-start justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap min-h-[80px] sm:min-h-[240px]">
          <div className="min-w-0 pointer-events-none">
            <h2 className="font-display font-black text-sm sm:text-xl text-white flex items-center gap-1.5 sm:gap-2">
              <RouteIcon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-pink-300" /> Planes de baile
            </h2>
            <p className="hidden sm:block text-pink-200/80 text-xs mt-0.5">Descubre experiencias de baile cerca de ti, en tiempo real.</p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1.5 sm:mt-2.5 pointer-events-auto">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/15 border border-white/25 shadow-md shadow-black/10 rounded-lg px-1.5 sm:px-2.5 py-0.5 sm:py-1">
                <span className="text-white font-extrabold text-[10px] sm:text-xs">{stats.abiertos}</span>
                <span className="text-pink-200/70 text-[8px] sm:text-[9px]">abiertos</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/15 border border-white/25 shadow-md shadow-black/10 rounded-lg px-1.5 sm:px-2.5 py-0.5 sm:py-1">
                <span className="text-white font-extrabold text-[10px] sm:text-xs">{stats.pareja}</span>
                <span className="text-pink-200/70 text-[8px] sm:text-[9px]">pareja</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/15 border border-white/25 shadow-md shadow-black/10 rounded-lg px-1.5 sm:px-2.5 py-0.5 sm:py-1">
                <span className="text-white font-extrabold text-[10px] sm:text-xs">{stats.vivo}</span>
                <span className="text-pink-200/70 text-[8px] sm:text-[9px]">en vivo</span>
              </div>
              {stats.rating > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-white/15 border border-white/25 shadow-md shadow-black/10 rounded-lg px-2.5 py-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-white font-extrabold text-xs">{stats.rating.toFixed(1)}</span>
                  <span className="text-pink-200/70 text-[9px]">valoración media</span>
                </div>
              )}
            </div>
          </div>

          {/* Actividad ahora (real: abiertos + directos + planes de hoy) — no es un sistema de alertas inventado.
              En móvil: pastilla compacta clicable de una línea. En escritorio: tarjeta completa. */}
          <button onClick={() => navigate(DISCOVER_TAB_ROUTE[tab])}
            className="flex-shrink-0 flex sm:hidden items-center gap-1.5 bg-gradient-to-br from-pink-600 to-fuchsia-800 rounded-full pl-1.5 pr-2.5 py-1 shadow-lg shadow-pink-950/50">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <RouteIcon className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="text-white text-[10px] font-extrabold whitespace-nowrap">{activityNow} activos</span>
          </button>
          <div className="hidden sm:block flex-shrink-0 w-[230px] bg-gradient-to-br from-pink-600 to-fuchsia-800 rounded-2xl p-3 shadow-xl shadow-pink-950/50">
            <div className="flex items-center gap-2.5">
              <span className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <RouteIcon className="w-4 h-4 text-white" />
                {activityNow > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-pink-600 text-[10px] font-black flex items-center justify-center">{activityNow}</span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-white font-extrabold text-xs">Actividad ahora</p>
                <p className="text-white/80 text-[10px] mt-0.5 leading-tight">{activityNow > 0 ? `${activityNow} cosas pasando cerca de ti` : 'Sé el primero en crear un plan'}</p>
              </div>
            </div>
            <button onClick={() => navigate(DISCOVER_TAB_ROUTE[tab])}
              className="w-full mt-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-lg py-1.5 text-white text-[11px] font-extrabold transition-colors">
              Ver todos
            </button>
          </div>
        </div>

        {/* Leyenda del mapa — qué representa cada color de pin (Planes/Abiertos/Eventos/En directo) */}
        {pins.length > 0 && (
          <div className="relative flex flex-wrap gap-x-2.5 gap-y-1 px-3 sm:px-5 pb-2 sm:pb-3">
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600" /></span> Planes</span>
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700" /></span> Abiertos ahora</span>
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-700" /></span> Eventos</span>
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600" /></span> En directo</span>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#EC4899] via-[#BE185D] to-[#831843] px-4 sm:px-5 pb-4 sm:pb-5 -mt-3">
        {/* Súper buscador — justo donde termina el mapa, dentro del mismo panel, para que se lea
            como una sola pieza con "Planes de baile" en vez de un elemento suelto encima. */}
        <div className="pt-4">
          <SuperSearchBar cityValue={cityFilter || ''} onCitySelect={onCityChange} />
        </div>

        {/* Pestañas de filtro — funcionales, sobre datos reales ya cargados; también controlan el mapa de arriba.
            En móvil: cuadrícula de 2 columnas (2 líneas) para que quepan enteras sin scroll horizontal.
            En escritorio: fila con scroll, como antes. Cada pestaña lleva el mismo punto de alarma
            parpadeante y color que su pin en el mapa, para reconocer la categoría de un vistazo. */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 pt-3 sm:overflow-x-auto sm:pb-1" style={{ scrollbarWidth: 'none' }}>
          {DISCOVER_TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const trueCounts: Record<DiscoverKind, number> = { plan: stats.plan, venue: stats.abiertos, local: stats.local, pareja: stats.pareja, evento: stats.evento, vivo: stats.vivo };
            const count = t.key === 'todos' ? items.length : trueCounts[t.key];
            if (t.key !== 'todos' && count === 0) return null;
            const dot = DISCOVER_TAB_DOT[t.key];
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`sm:flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                  isActive ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-900/40' : 'bg-white/15 text-pink-100 border border-white/25 shadow-md shadow-black/10 hover:bg-white/20'
                }`}>
                {dot && (
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot.ring} opacity-75`} />
                    <span className={`relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br ${dot.grad}`} />
                  </span>
                )}
                <Icon className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{t.label}</span>
                <span className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-white/25' : 'bg-white/10'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {cityFilter?.trim() && shown.length === 0 && (
          <div className="text-center py-6">
            <p className="text-pink-200/70 text-xs">Aún no hay nada real publicado en «{cityFilter}» — sé el primero en crear un plan.</p>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <button onClick={() => navigate('/rutas')}
                className="inline-flex items-center gap-1.5 bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl shadow-lg shadow-pink-900/40">
                <Plus className="w-3.5 h-3.5" /> Crear un plan en {cityFilter}
              </button>
              <a href="mailto:hola@bailanow.com?subject=Quiero%20BailaNow%20en%20mi%20ciudad"
                className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 shadow-md shadow-black/10 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl hover:bg-white/25 transition-colors">
                Contacta con nosotros
              </a>
            </div>
          </div>
        )}

        {/* Tarjetas — fotos reales para locales/eventos/directos; degradado+icono para planes (sin foto propia) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3">
          {shown.map(it => {
            const badge = DISCOVER_BADGE[it.kind];
            return (
              <button key={it.id} onClick={() => navigate(it.route)}
                className="text-left rounded-2xl overflow-hidden bg-white/12 border border-white/25 shadow-lg shadow-black/15 hover:border-pink-200/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-24 bg-gradient-to-br from-pink-700 to-fuchsia-900 overflow-hidden">
                  {it.cover ? (
                    <img src={it.cover} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center"><RouteIcon className="w-8 h-8 text-white/25" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className={`absolute top-2 left-2 inline-flex items-center gap-1 ${badge.className} text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full`}>
                    {(it.kind === 'vivo' || it.isToday) && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                      </span>
                    )}
                    {badge.label}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-white font-bold text-[13px] leading-tight truncate">{it.title}</p>
                  <p className="text-pink-200/70 text-[11px] mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {it.city}{it.meta ? ` · ${it.meta}` : ''}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    {it.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                        <Star className="w-3 h-3 fill-amber-400" /> {it.rating.toFixed(1)}
                      </span>
                    ) : it.kind === 'plan' && it.crowdCount ? (
                      <span className="flex items-center">
                        <span className="flex">
                          {(it.crowdAvatars || []).map((a, ai) => (
                            <span key={ai} className="-mr-2 last:mr-0 ring-2 ring-[#1B0E29] rounded-full">
                              <Avatar src={a || ''} name="?" size="xs" />
                            </span>
                          ))}
                        </span>
                        <span className="text-[10px] font-bold text-pink-200/80 ml-2.5">{it.crowdCount} {it.crowdCount === 1 ? 'va' : 'van'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-pink-200/60">{it.kind === 'plan' ? 'Sé el primero' : 'Ver más'}</span>
                    )}
                    <span className={`text-[10px] font-black border rounded-full px-2 py-0.5 ${badge.cta}`}>Ver</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── SÚPER BUSCADOR del Home — ciudad (autocompletar sobre TOP_DANCE_CITIES real) o mi ubicación
// (geolocalización real del navegador, nunca inventada). Vinculado a "Planes de baile": elegir
// una ciudad filtra las tarjetas y el mapa de esa sección, justo debajo. ──
const SuperSearchBar: React.FC<{ cityValue: string; onCitySelect: (city: string) => void }> = ({ cityValue, onCitySelect }) => {
  const [query, setQuery] = useState(cityValue);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [showList, setShowList] = useState(false);

  useEffect(() => { setQuery(cityValue); }, [cityValue]);

  const filtered = (query.trim()
    ? TOP_DANCE_CITIES.filter(c => c.toLowerCase().includes(query.trim().toLowerCase()))
    : TOP_DANCE_CITIES
  ).slice(0, 8);

  const pick = (city: string) => { setQuery(city); setShowList(false); onCitySelect(city); };

  const submit = () => {
    const match = TOP_DANCE_CITIES.find(c => c.toLowerCase() === query.trim().toLowerCase()) || filtered[0];
    if (match) { pick(match); return; }
    if (query.trim()) window.dispatchEvent(new CustomEvent('bn:open-search', { detail: { query: query.trim() } }));
    setShowList(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocError('Tu navegador no soporta geolocalización'); return; }
    setLocating(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let best: string | null = null; let bestDist = Infinity;
        for (const [name, [lat, lng]] of Object.entries(CITY_CENTER)) {
          const d = Math.hypot(lat - latitude, lng - longitude);
          if (d < bestDist) { bestDist = d; best = name; }
        }
        setLocating(false);
        if (best) pick(TOP_DANCE_CITIES.find(c => c.toLowerCase() === best) || best);
      },
      () => { setLocating(false); setLocError('No se pudo acceder a tu ubicación'); },
      { timeout: 8000 }
    );
  };

  return (
    <div className="relative">
      <div className="relative bg-white/15 border border-white/25 rounded-2xl shadow-xl shadow-black/20 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3">
        <Search className="w-5 h-5 text-pink-300 flex-shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowList(true); }}
          onFocus={() => setShowList(true)}
          onBlur={() => setTimeout(() => setShowList(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setShowList(false); }}
          placeholder="¿En qué ciudad quieres bailar hoy?"
          className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder-pink-200/50 text-sm sm:text-base font-bold"
        />
        {query && (
          <button onClick={() => { setQuery(''); onCitySelect(''); }} className="flex-shrink-0 text-pink-200/60 hover:text-white"><X className="w-4 h-4" /></button>
        )}
        <button onClick={useMyLocation} disabled={locating}
          className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-2 rounded-xl disabled:opacity-60 shadow shadow-pink-900/40">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          <span className="hidden sm:inline">Usar mi ubicación</span>
        </button>
      </div>
      {locError && <p className="text-red-300 text-[11px] mt-1 px-1">{locError}</p>}
      {showList && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-20 max-h-64 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <button onMouseDown={submit} className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-600 dark:text-gray-300">
              Buscar "{query}" en toda la plataforma →
            </button>
          ) : filtered.map(c => (
            <button key={c} onMouseDown={() => pick(c)} className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" /> {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  // 12 por fila; se muestran 2 filas (24) y el resto tras "Ver más categorías".
  const [showAll, setShowAll] = React.useState(false);
  const LIMIT = 12;
  const shown = showAll ? visibleCats : visibleCats.slice(0, LIMIT);
  const rest = visibleCats.length - LIMIT;

  const CategoryButton: React.FC<{ cat: HomeCategory; index: number }> = ({ cat, index }) => {
    const tint = CHIP_TINTS[index % CHIP_TINTS.length];
    return (
      <button
        onClick={() => navigate(cat.route)}
        className="group relative bg-white dark:bg-gray-800/70 rounded-2xl p-3 flex flex-col items-center justify-start gap-2 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent active:scale-95 transition-all duration-300"
      >
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${tint} ring-1 flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
          <span className="text-2xl sm:text-[26px] leading-none">{cat.icon}</span>
        </div>
        <span className="text-gray-700 dark:text-gray-200 text-[11px] sm:text-xs font-bold leading-tight text-center line-clamp-2 group-hover:text-brand-orange transition-colors">{cat.name}</span>
      </button>
    );
  };

  return (
    <section className="mt-4 px-2 sm:px-4">
      {/* Main Categories Grid */}
      <div className="space-y-6 pb-6">
        {visibleCats.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-orange to-pink-500" />
                <h3 className="font-display font-black text-sm sm:text-base text-gray-900 dark:text-white uppercase tracking-wider">
                  Principales
                </h3>
              </div>
              <button
                onClick={() => navigate('/explorar')}
                className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors"
              >
                Ver todas →
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {shown.map((cat, idx) => (
                <CategoryButton key={cat.id} cat={cat} index={idx} />
              ))}
            </div>
            {rest > 0 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="w-full mt-4 py-2.5 rounded-xl border border-pink-200 text-pink-500 hover:bg-pink-50 text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                {showAll ? '▲ Ver menos categorías' : `🔍 Ver más categorías (${rest})`}
              </button>
            )}
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
  title, subtitle, gradient, actionLabel, onAction, className = '', children
}) => {
  return (
    <section className={`mx-4 mt-10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className={`font-display font-black text-xl sm:text-2xl tracking-tight ${
          gradient ? 'bg-brand-orange bg-clip-text text-transparent' : 'text-gray-900 dark:text-white'
        }`}>
          {title}
        </h2>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex flex-col items-center gap-1 group hover:scale-105 transition-transform"
          >
            <div className="w-9 h-9 rounded-full bg-brand-orange flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/50 transition-shadow">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-pink-500">{actionLabel}</span>
          </button>
        )}
      </div>
      {subtitle && <p className="text-gray-400 text-xs sm:text-sm mb-3 mt-1">{subtitle}</p>}

      {/* Content — el buscador global (arriba) es el único punto de búsqueda */}
      {children('')}
    </section>
  );
};

// ── HScroll: fila horizontal con flechas estilo Netflix (desktop) ──
const HScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * Math.min(600, (ref.current.clientWidth || 400) * 0.85), behavior: 'smooth' });
  return (
    <div className="relative group/hs">
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-3 px-0.5" style={{ scrollbarWidth: 'none' }}>
        {children}
      </div>
      <button onClick={() => go(-1)} aria-label="Anterior"
        className="hidden lg:grid place-items-center absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-gray-900/95 shadow-xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white text-xl leading-none opacity-0 group-hover/hs:opacity-100 hover:bg-pink-500 hover:text-white transition z-10">‹</button>
      <button onClick={() => go(1)} aria-label="Siguiente"
        className="hidden lg:grid place-items-center absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-gray-900/95 shadow-xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white text-xl leading-none opacity-0 group-hover/hs:opacity-100 hover:bg-pink-500 hover:text-white transition z-10">›</button>
    </div>
  );
};

// ── OPEN VENUES NOW SECTION (Supabase) ──────────────
const OpenVenuesNowSection: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [dbVenues, setDbVenues] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('venues').select('*').is('deleted_at', null);
        if (cancelled) return;
        setDbVenues(data || []);
      } catch (e) { console.warn('[home] venues', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  const isOpenNow = (v: any): boolean => {
    if (v.is_open === true || v.isOpen === true) return true;
    if (v.open_time && v.close_time) {
      const toMin = (s: string) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
      const o = toMin(v.open_time), c = toMin(v.close_time);
      const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
      return c > o ? (cur >= o && cur <= c) : (cur >= o || cur <= c);
    }
    return false;
  };

  const allVenues: any[] = dbVenues.map((v: any) => ({
    id: v.id, name: v.name, city: v.city || '',
    cover: v.cover || v.image_url || v.avatar || '',
    rating: Number(v.rating) || 0,
    isOpen: isOpenNow(v), isPremium: !!v.is_premium,
    openHours: v.open_hours || (v.open_time && v.close_time ? `${String(v.open_time).slice(0,5)}–${String(v.close_time).slice(0,5)}` : '24/7'),
  }));

  const openVenues = allVenues.filter(v => v.isOpen).sort((a: any, b: any) => {
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
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Ver Todos</span>
        </button>
      </div>
      <HScroll>
        {openVenues.slice(0, 6).map(v => (
          <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
            className="flex-shrink-0 w-56 sm:w-60 bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 transition-all hover:-translate-y-1.5 group text-left">
            <div className="relative h-32">
              <AppImage src={v.cover} alt={v.name} fallback="landscape" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
              <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Abierto
              </div>
              <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 grid place-items-center text-white text-base leading-none group-hover:bg-pink-500 transition">♡</span>
              {v.isPremium && (
                <div className="absolute bottom-2.5 right-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">👑 PRO</div>
              )}
            </div>
            <div className="p-3.5">
              <p className="text-white font-black text-sm truncate">{v.name}</p>
              <p className="text-white/50 text-[11px] mt-0.5 capitalize truncate">{v.type || 'Local'}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                {v.rating > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1 text-amber-400 font-bold"><Star className="w-3.5 h-3.5 fill-amber-400" />{v.rating}</span>
                    <span className="text-white/30">·</span>
                  </>
                )}
                <span className="text-white/60 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.city}</span>
              </div>
            </div>
          </button>
        ))}
      </HScroll>
    </section>
  );
};

// ── LIVE NOW HOME SECTION (datos reales de live_sessions) ────────
interface LiveCard { id: string; title: string; category: string | null; viewers: number; city: string | null; cover: string | null }

const LiveNowHomeSection: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [lives, setLives] = useState<LiveCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('live_sessions')
        .select('id, title, category, viewers_count, city, cover_url, status')
        .eq('status', 'live')
        .order('viewers_count', { ascending: false })
        .limit(12);
      if (cancelled) return;
      setLives((data || []).map((s: any) => ({
        id: s.id, title: s.title, category: s.category,
        viewers: s.viewers_count || 0, city: s.city, cover: s.cover_url,
      })));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Si no hay directos reales, no mostramos la sección (nada de streams falsos)
  if (loaded && lives.length === 0) return null;

  return (
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
          <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Ver Todos</span>
        </button>
      </div>
      <HScroll>
        {lives.map(s => (
          <button key={s.id} onClick={() => navigate(`/live/session/${s.id}`)}
            className="flex-shrink-0 w-32 sm:w-36 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group relative border-2 border-red-500/30 hover:border-red-500">
            <AppImage src={s.cover || ''} alt={s.title} fallback="portrait" className="w-full h-44 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-lg animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
            </div>
            {s.viewers > 0 && (
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                👁 {s.viewers}
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white font-bold text-xs truncate">{s.title}</p>
              {s.category && <p className="text-white/70 text-[10px] capitalize">{s.category}</p>}
              {s.city && <p className="text-white/50 text-[9px] flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{s.city}</p>}
            </div>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-red-500/50 group-hover:ring-2 group-hover:ring-red-500 transition-all" />
          </button>
        ))}
      </HScroll>
    </section>
  );
};

// ── FEATURED TRIPLE ROW (Eventos destacados · Artistas recomendados · BailaNow TV) ──
const FeaturedTripleRow: React.FC<{ navigate: any }> = ({ navigate }) => {
  const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const day = (d: string) => (d || '').split('-')[2] || '--';
  const month = (d: string) => MONTHS[(Number((d || '').split('-')[1]) || 1) - 1] || '';

  // Datos reales de la BD
  const [dbEvents, setDbEvents] = React.useState<any[]>([]);
  const [dbArtists, setDbArtists] = React.useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    supabase.from('events').select('*').is('deleted_at', null).limit(8).then(({ data }) => { if (!cancelled && Array.isArray(data)) setDbEvents(data); });
    supabase.from('artists').select('*').limit(8).then(({ data }) => { if (!cancelled && Array.isArray(data)) setDbArtists(data); });
    return () => { cancelled = true; };
  }, []);

  const events = dbEvents
    .map((e: any) => ({ id: e.id, title: fixText(e.title || e.name || 'Evento'), date: e.date || e.event_date || '', venueName: fixText(e.venue_name || ''), city: fixText(e.city || ''), cover: e.cover || e.image_url || '' }))
    .slice(0, 6);

  const artists = dbArtists
    .map((a: any) => ({ id: a.id, name: fixText(a.name || 'Artista'), avatar: a.avatar || a.cover || '', genre: Array.isArray(a.genre) ? a.genre : (a.genre ? [a.genre] : []) }))
    .slice(0, 6);

  // Tarjetas de BailaNow TV — editables desde Admin → Home destacados (site_config global)
  const tvCards = useSiteConfigStore(s => s.homeTvCards);
  const tv = (tvCards && tvCards.length ? tvCards : DEFAULT_HOME_TV).slice(0, 4);

  const ColHeader = ({ title, onAll }: { title: string; onAll: () => void }) => (
    <div className="flex items-center justify-between mb-3 px-1">
      <h3 className="font-display font-black text-base text-gray-900 dark:text-white">{title}</h3>
      <button onClick={onAll} className="text-pink-600 dark:text-pink-400 text-[11px] font-bold hover:underline">Ver todos →</button>
    </div>
  );

  return (
    <section className="mx-3 sm:mx-4 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Col 1: Eventos destacados */}
        <div>
          <ColHeader title="🎫 Eventos destacados" onAll={() => navigate('/eventos')} />
          <div className="grid grid-cols-2 gap-2.5">
            {events.map(e => (
              <button key={e.id} onClick={() => navigate(`/eventos/${e.id}`)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-fuchsia-900/60 via-purple-900/40 to-gray-900 text-left group shadow-sm border border-gray-100 dark:border-gray-800 hover:-translate-y-0.5 hover:shadow-md transition-all">
                {(e as any).cover && <img src={(e as any).cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute top-2 left-2 bg-white/90 text-gray-900 rounded-lg px-1.5 py-0.5 text-center leading-none">
                  <div className="font-black text-sm">{day(e.date)}</div>
                  <div className="text-[8px] font-bold text-pink-600">{month(e.date)}</div>
                </div>
                <span className="absolute top-2 right-2 bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">Entradas</span>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-bold text-xs leading-tight truncate">{e.title}</p>
                  <p className="text-white/70 text-[9px] truncate flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5" />{e.venueName || e.city}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Col 2: Artistas recomendados */}
        <div>
          <ColHeader title="🎧 Artistas recomendados" onAll={() => navigate('/artistas')} />
          <div className="grid grid-cols-2 gap-2.5">
            {artists.map(a => (
              <button key={a.id} onClick={() => navigate(`/artistas/${a.id}`)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-pink-900/60 via-rose-900/40 to-gray-900 text-left group shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                {a.avatar && <img src={a.avatar} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-bold text-xs leading-tight truncate">{a.name}</p>
                  <p className="text-white/70 text-[9px] truncate">{a.genre.slice(0, 2).join(' · ')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Col 3: BailaNow TV */}
        <div>
          <ColHeader title="📺 BailaNow TV" onAll={() => navigate('/tv')} />
          <div className="grid grid-cols-2 gap-3">
            {tv.map((c, i) => {
              return (
              <button key={i} onClick={() => navigate(c.link || '/tv')}
                className="relative rounded-2xl overflow-hidden h-40 group text-left bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-gray-950">
                {c.image ? (
                  <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-80 transition-all duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/15" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                {c.tag && <span className="absolute top-2.5 left-2.5 bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{c.tag}</span>}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-black text-sm leading-tight">{c.title}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{c.subtitle}</p>
                </div>
              </button>
            );})}
          </div>
          <button onClick={() => navigate('/tv')}
            className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-sm font-black flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-500/30 transition-all">
            <Play className="w-4 h-4" fill="currentColor" /> Ver TV
          </button>

          {/* Accesos rápidos para rellenar la columna (más corta que Eventos/Artistas) */}
          <p className="mt-5 mb-2 px-1 text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Explora más</p>
          <div className="space-y-2.5">
            <button onClick={() => navigate('/cerca')}
              className="w-full flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-left hover:shadow-lg transition-all">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">📍</span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm leading-tight">Cerca de ti</p>
                <p className="text-white/80 text-[11px]">Descubre la escena de tu ciudad</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-80" />
            </button>
            <button onClick={() => navigate('/clases')}
              className="w-full flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-left hover:shadow-lg transition-all">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">🎓</span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm leading-tight">Clases online</p>
                <p className="text-white/80 text-[11px]">Aprende con los mejores</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-80" />
            </button>
            <button onClick={() => navigate('/subscripciones')}
              className="w-full flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-left hover:shadow-lg transition-all">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">👑</span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm leading-tight">Hazte Premium</p>
                <p className="text-white/80 text-[11px]">Baila sin límites</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-80" />
            </button>
            <button onClick={() => navigate('/promocionate')}
              className="w-full flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-left hover:shadow-lg transition-all">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">📢</span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm leading-tight">Promociona tu evento</p>
                <p className="text-white/80 text-[11px]">Llega a más bailarines</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-80" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

// ── MÁS PARA TI (6 accesos destacados, estilo premium) ──
const MoreForYou: React.FC<{ navigate: any }> = ({ navigate }) => {
  // Data-driven: lee de `home_modules` (Supabase) con fallback a la semilla local.
  // "planes"/"parejas" se filtran siempre: ya viven en la sección "Planes de baile" de arriba,
  // sin importar si las filas siguen publicadas en la BD.
  const modules = useHomeModules('mas-para-ti').filter(m => m.slug !== 'planes' && m.slug !== 'parejas');
  return (
    <section className="mx-3 sm:mx-4 mt-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-orange to-pink-500" />
          <h2 className="font-display font-black text-xl text-gray-900 dark:text-white">Más para ti</h2>
        </div>
        <button onClick={() => navigate('/explorar')}
          className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors">
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Tarjetas de icono + degradado (sin fotos) — mismo lenguaje visual que el cintillo de arriba */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {modules.map(m => (
          <button key={m.id} onClick={() => navigate(m.route)}
            className={`group relative overflow-hidden rounded-3xl h-40 sm:h-44 text-left shadow-lg hover:shadow-2xl ${m.glow} hover:-translate-y-1.5 transition-all duration-300`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient}`} />
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            {m.badge && (
              <span className="absolute top-3 right-3 bg-white text-pink-600 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shadow">{m.badge}</span>
            )}
            <div className="relative h-full flex flex-col justify-between p-4">
              <span className={`w-11 h-11 rounded-2xl ${m.iconBg} text-white grid place-items-center text-xl shadow-lg ring-2 ring-white/20`}>{m.icon}</span>
              <div>
                <p className="text-white font-display font-black text-sm sm:text-base leading-tight">{m.title}</p>
                <p className="text-white/75 text-[11px] mt-1 leading-snug line-clamp-2">{m.subtitle}</p>
              </div>
            </div>
            <span className="absolute bottom-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 grid place-items-center text-white group-hover:bg-white group-hover:text-gray-900 group-hover:scale-110 transition-all">
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

// ── BAILANOW TV (estilo Netflix: scroll horizontal + etiquetas) ──
const BailaNowTVRow: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [shows, setShows] = useState<{ id: string; title: string; meta: string; tag: string; tagColor: string; img: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from('tv_titles').select('id,title,type,level,style,cover_url,featured')
      .eq('status', 'published').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => {
        if (cancelled) return;
        setShows((data || []).map((t: any) => ({
          id: t.id, title: fixText(t.title || 'Vídeo'),
          meta: [t.type, t.level].filter(Boolean).join(' · ') || t.style || '',
          tag: t.featured ? 'Destacado' : 'Nuevo', tagColor: t.featured ? 'bg-emerald-500' : 'bg-pink-500',
          img: t.cover_url || '',
        })));
        setLoaded(true);
      }, () => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  // Sin contenido real todavía: nada de cursos ficticios (ya se corrigió esa clase de bug).
  if (loaded && shows.length === 0) return null;

  return (
    <section className="mx-3 sm:mx-4 mt-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-display font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">📺 BailaNow TV</h2>
        <button onClick={() => navigate('/tv')} className="text-pink-600 dark:text-pink-400 text-xs font-bold hover:underline">Ver todo →</button>
      </div>
      <HScroll>
        {shows.map(s => (
          <button key={s.id} onClick={() => navigate(`/tv/${s.id}`)}
            className="flex-shrink-0 w-64 relative rounded-2xl overflow-hidden h-40 group text-left bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-gray-950 shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-1 transition-all">
            {s.img ? (
              <img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />
            ) : (
              <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/15" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
            <span className={`absolute top-2.5 left-2.5 ${s.tagColor} text-white text-[9px] font-black px-2 py-0.5 rounded-full`}>{s.tag}</span>
            <span className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center text-white opacity-0 group-hover:opacity-100 transition"><Play className="w-4 h-4" fill="currentColor" /></span>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white font-black text-sm leading-tight">{s.title}</p>
              {s.meta && <p className="text-white/60 text-[10px] mt-0.5 capitalize">{s.meta}</p>}
            </div>
          </button>
        ))}
      </HScroll>
    </section>
  );
};

// ── SECCIONES DE DESCUBRIMIENTO (Fase 4) ──
const DiscoverySections: React.FC<{ navigate: any }> = ({ navigate }) => {
  const trends = ['Salsa', 'Bachata', 'Kizomba', 'Reggaetón', 'Merengue', 'Cumbia', 'Timba', 'Afrobeat'];

  const [dbClases, setDbClases] = React.useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    supabase.from('class_offerings').select('id,title,level,duration_minutes,cover_image').eq('status', 'active').limit(6)
      .then(({ data }) => { if (!cancelled) setDbClases(data || []); }, () => {});
    return () => { cancelled = true; };
  }, []);
  // Sin fallback a mock: si no hay clases reales publicadas, la sección se oculta.
  const clases = dbClases.map((c: any) => ({
    id: c.id, title: fixText(c.title || 'Clase'),
    meta: [c.level, c.duration_minutes ? `${c.duration_minutes} min` : ''].filter(Boolean).join(' · '),
    img: c.cover_image || '',
  }));

  // "Profesores Destacados" enlaza a perfiles reales -> nunca usar IDs mock (llevaban a 404).
  const [dbTeachers, setDbTeachers] = React.useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    supabase.from('artists').select('id,name,avatar,cover,genre,type,rating').in('type', ['instructor', 'dancer']).limit(8)
      .then(({ data }) => { if (!cancelled && Array.isArray(data) && data.length) setDbTeachers(data); }, () => {});
    return () => { cancelled = true; };
  }, []);
  // Sin fallback a mock: enlaza a perfiles reales, así que si no hay datos
  // reales la sección se oculta en vez de llevar a un perfil que no existe.
  const teachers = dbTeachers.map((a: any) => ({ id: a.id, name: fixText(a.name || 'Artista'), avatar: a.avatar || a.cover || '', genre: Array.isArray(a.genre) ? a.genre : (a.genre ? [a.genre] : []), rating: Number(a.rating) || 0 }));

  const Header = ({ icon, title, onAll }: { icon: string; title: string; onAll: () => void }) => (
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="font-display font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">{icon} {title}</h2>
      <button onClick={onAll} className="text-pink-600 dark:text-pink-400 text-xs font-bold hover:underline">Ver todo →</button>
    </div>
  );

  return (
    <>
      {/* Tendencias */}
      <section className="mx-3 sm:mx-4 mt-8">
        <Header icon="📈" title="Tendencias" onAll={() => navigate('/explorar')} />
        <div className="flex flex-wrap gap-2">
          {trends.map((t, i) => (
            <button key={t} onClick={() => navigate(`/artistas?q=${encodeURIComponent(t)}`)}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3.5 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md hover:border-pink-300 hover:text-pink-600 transition-all">
              <span className="text-pink-500 font-black">#{i + 1}</span> {t}
            </button>
          ))}
        </div>
      </section>

      {/* Clases Populares */}
      {clases.length > 0 && (
      <section className="mx-3 sm:mx-4 mt-8">
        <Header icon="🎓" title="Clases Populares" onAll={() => navigate('/clases')} />
        <HScroll>
          {clases.map(c => (
            <button key={c.id} onClick={() => navigate('/clases')}
              className="flex-shrink-0 w-52 relative rounded-2xl overflow-hidden h-32 group text-left bg-gradient-to-br from-pink-600/30 via-fuchsia-700/20 to-gray-900 shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-1 transition-all">
              {c.img ? (
                <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-white/15" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
              <span className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center text-white opacity-0 group-hover:opacity-100 transition"><Play className="w-4 h-4" fill="currentColor" /></span>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-black text-sm leading-tight">{c.title}</p>
                {c.meta && <p className="text-white/60 text-[10px] mt-0.5">{c.meta}</p>}
              </div>
            </button>
          ))}
        </HScroll>
      </section>
      )}

      {/* Profesores Destacados */}
      {teachers.length > 0 && (
      <section className="mx-3 sm:mx-4 mt-8">
        <Header icon="⭐" title="Profesores Destacados" onAll={() => navigate('/artistas')} />
        <HScroll>
          {teachers.map(t => (
            <button key={t.id} onClick={() => navigate(`/artistas/${t.id}`)}
              className="flex-shrink-0 w-40 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-center flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden grid place-items-center bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white font-black text-xl">
                  <span>{t.name?.[0] || '?'}</span>
                  <img src={t.avatar} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" title="Disponible" />
              </div>
              <p className="font-black text-gray-900 dark:text-white text-sm mt-2 truncate max-w-full">{t.name}</p>
              <p className="text-gray-400 text-[11px] truncate max-w-full">{t.genre.slice(0, 2).join(' · ')}</p>
              <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-bold"><Star className="w-3.5 h-3.5 fill-amber-500" />{t.rating}</div>
              <span className="mt-2 text-[11px] font-bold text-pink-600 dark:text-pink-400">Ver perfil →</span>
            </button>
          ))}
        </HScroll>
      </section>
      )}

      {/* Trabajos para Bailarines (CTA) */}
      <section className="mx-3 sm:mx-4 mt-8">
        <button onClick={() => navigate('/promocionate')}
          className="relative w-full overflow-hidden rounded-3xl p-6 sm:p-8 text-left text-white bg-gradient-to-br from-gray-900 via-purple-950 to-black hover:shadow-2xl hover:shadow-pink-500/20 transition-all">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-pink-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-white/15 rounded-full px-2.5 py-1">🎤 Trabajos para bailarines</span>
              <h2 className="font-display font-black text-xl sm:text-3xl mt-2 leading-tight max-w-lg">¿Buscas trabajo como bailarín/a o profesor/a?</h2>
              <p className="text-white/70 text-sm mt-1.5 max-w-md">Encuentra shows, clases, castings y colaboraciones. Publica tu perfil y recibe ofertas.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-white text-gray-900 font-bold rounded-xl px-5 py-3 text-sm flex-shrink-0">Ver oportunidades →</span>
          </div>
        </button>
      </section>
    </>
  );
};

const HomePage: React.FC = () => {
  usePageMeta({
    title: 'Inicio',
    description: 'BailaNow: el ecosistema latino #1. Contrata DJs, artistas y bailarines. Descubre eventos, festivales y venues. Marketplace y livestreams 100% latino.',
  });
  useJsonLd(organizationLd(), websiteLd());
  const navigate = useNavigate();
  const [homeCity, setHomeCity] = useState('');
  const { isAuthenticated, user } = useAuthStore();
  const { heroMedia } = useSiteConfigStore();
  const heroYtId = heroMedia.type === 'youtube' ? getYouTubeId(heroMedia.url) : null;
  const heroHasVideoFile = heroMedia.type === 'video' && !!heroMedia.url;
  const cmsModules = useCMSStore(s => s.modules);
  const cmsCategories = useCMSStore(s => s.categories);
  const enabled = visibleHomeModules(cmsModules);
  const isModuleOn = (type: string) => enabled.some(m => m.type === type);
  const dynamicCats = activeCategories(cmsCategories);
  const { balanceFor, offers, classes, transactions, withdrawals, platformTotals } = usePerformerStore();
  const PERFORMER_ROLES = ['artist', 'musician', 'band', 'dj', 'dancer', 'animador', 'venue', 'instructor', 'business', 'promoter'];
  const isAdmin = !!user && (user.role === 'admin' || user.role === 'superadmin');
  const isPerformer = !!user && PERFORMER_ROLES.includes(user.role);
  const isBuyer = !!user && user.role === 'user';
  const adminStats = isAdmin ? platformTotals() : null;

  // "Artistas y Bailarines" enlaza a perfiles reales -> nunca IDs mock (404).
  const [dbHomeArtists, setDbHomeArtists] = React.useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    supabase.from('artists').select('id,name,avatar,cover,genre,city,type,rating').limit(12)
      .then(({ data }) => { if (!cancelled && Array.isArray(data)) setDbHomeArtists(data); }, () => {});
    return () => { cancelled = true; };
  }, []);
  const homeArtists = dbHomeArtists.map((a: any) => ({
    id: a.id, name: fixText(a.name || 'Artista'), cover: a.cover || a.avatar || '', avatar: a.avatar || a.cover || '',
    genre: Array.isArray(a.genre) ? a.genre : (a.genre ? [a.genre] : []), city: fixText(a.city || ''), country: '',
    type: a.type || 'artist', rating: Number(a.rating) || 0, reviews: 0, followers: 0, priceFrom: 0, currency: 'EUR',
    bio: '', isVerified: false, isPremium: false, isLive: false,
  }) as unknown as typeof ARTISTS[0]);

  // "Próximos Eventos" enlaza a eventos reales -> nunca IDs mock (404).
  const [dbHomeEvents, setDbHomeEvents] = React.useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    supabase.from('events').select('*').is('deleted_at', null).order('date', { ascending: true }).limit(12)
      .then(({ data }) => { if (!cancelled && Array.isArray(data)) setDbHomeEvents(data); }, () => {});
    return () => { cancelled = true; };
  }, []);
  const homeEvents = dbHomeEvents.map((e: any) => ({
    id: e.id, title: fixText(e.title || 'Evento'), date: e.date || e.event_date || '',
    venueName: fixText(e.venue_name || ''), city: fixText(e.city || ''), cover: e.cover || e.image_url || e.image || '',
    category: Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []),
    price: Number(e.price) || 0, isFeatured: !!e.is_featured,
  }) as unknown as typeof EVENTS[0]);
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
  const [radioWidgetOpen, setRadioWidgetOpen] = useState(false);
  const [tvWidgetOpen, setTvWidgetOpen] = useState(false);

  // ── Radio: carga desde Supabase; fallback a radio-browser API ──
  const [radioStations, setRadioStations] = useState(RADIO_STATIONS);
  const [radioStatus, setRadioStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Ruta de Hoy: posts de comunidad desde Supabase (fallback a ejemplos) ──
  const [communityPosts, setCommunityPosts] = useState(COMMUNITY_POSTS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('id, user_name, full_text, location, category, status, created_at')
          .eq('status', 'APROBADO')
          .order('created_at', { ascending: false })
          .limit(30);
        if (!error && data && data.length > 0 && !cancelled) {
          setCommunityPosts(data.map((p: any) => ({
            id: p.id,
            user: p.user_name,
            fullText: p.full_text,
            location: p.location || '',
            category: p.category || 'comunidad',
            status: p.status,
            time: '',
          })));
        }
      } catch { /* mantiene ejemplos de reserva */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Intentar cargar emisoras propias desde Supabase
      try {
        const { data, error } = await supabase
          .from('radio_stations')
          .select('id, name, genre, stream_url, img_url, bitrate, status')
          .eq('status', 'active')
          .order('sort_order');
        if (!error && data && data.length > 0 && !cancelled) {
          setRadioStations(data.map((s: any) => ({
            id:        s.id,
            name:      s.name,
            sub:       s.bitrate || 'En directo',
            genre:     s.genre,
            img:       s.img_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=EC4899&color=fff&size=120&bold=true`,
            streamUrl: s.stream_url,
          })));
          return;
        }
      } catch { /* fallback a API pública */ }

      // 2. Fallback: radio-browser.info
      const tags = ['bachata', 'salsa', 'reggaeton', 'kizomba', 'merengue'];
      const clean = (n: string) => n.trim().replace(/\s+/g, ' ').slice(0, 38);
      try {
        const results = await Promise.all(tags.map(async t => {
          try {
            const r = await fetch(`https://de1.api.radio-browser.info/json/stations/bytag/${t}?hidebroken=true&order=clickcount&reverse=true&limit=4`);
            if (!r.ok) return [];
            const d = await r.json();
            return (d || []).filter((s: any) => s.url_resolved && s.name).map((s: any) => ({ ...s, _genre: t }));
          } catch { return []; }
        }));
        const seen = new Set<string>();
        const mapped = results.flat()
          .filter((s: any) => { const k = s.name.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
          .slice(0, 14)
          .map((s: any, i: number) => ({
            id: s.stationuuid || `rb-${i}`,
            name: clean(s.name),
            sub: s.bitrate ? `${s.bitrate} kbps` : 'En directo',
            genre: s._genre.charAt(0).toUpperCase() + s._genre.slice(1),
            img: s.favicon || `https://ui-avatars.com/api/?name=${encodeURIComponent(clean(s.name))}&background=EC4899&color=fff&size=120&bold=true`,
            streamUrl: s.url_resolved,
          }));
        if (!cancelled && mapped.length) setRadioStations(mapped);
      } catch { if (!cancelled) setRadioStatus('error'); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sincroniza el <audio> con la emisora seleccionada
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing !== null && playing < 100 && radioStations[playing]?.streamUrl) {
      const url = radioStations[playing].streamUrl;
      if (a.src !== url) a.src = url;
      setRadioStatus('loading');
      a.play().then(() => setRadioStatus('idle')).catch(() => setRadioStatus('error'));
    } else {
      a.pause();
    }
  }, [playing, radioStations]);

  return (
    <div className="relative isolate min-h-screen bg-white/40 dark:bg-transparent dark:text-gray-100 transition-colors duration-300">

      {/* Fondo flotante decorativo en toda la home */}
      <HomeBackground />

      {/* ── HERO: TV con el vídeo real visible sin pulsar, Radio con emisoras reales clicables ── */}
      <section className="mx-3 sm:mx-4 mt-3 sm:mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* TV: se ve el contenido en directo, no hace falta pulsar para verlo */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-950 flex flex-col">
          <div className="relative w-full h-24 sm:h-32 lg:h-52 bg-black">
            {heroYtId ? (
              <iframe
                src={`https://www.youtube.com/embed/${heroYtId}?autoplay=1&mute=1&loop=1&playlist=${heroYtId}&controls=0&modestbranding=1&rel=0`}
                title="BailaNow TV" allow="autoplay; encrypted-media" className="w-full h-full pointer-events-none" style={{ border: 0 }} />
            ) : heroHasVideoFile ? (
              <video src={heroMedia.url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tv className="w-9 h-9 sm:w-11 sm:h-11 text-white/25" />
              </div>
            )}
            <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> EN VIVO
            </span>
          </div>
          <button onClick={() => setTvWidgetOpen(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 sm:py-2 lg:py-3.5 text-white font-display font-black text-xs sm:text-base lg:text-lg hover:bg-white/10 transition-colors">
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" /> BailaNow TV
          </button>
        </div>

        {/* Radio: emisoras reales visibles, cada una se pulsa para escucharla directamente */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-bl from-orange-600 via-pink-600 to-fuchsia-800 flex flex-col justify-center p-2 sm:p-3 lg:p-5">
          <p className="text-white font-display font-black text-xs sm:text-base lg:text-lg flex items-center gap-1.5 mb-1.5 lg:mb-3">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" /> Radio Online
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3">
            {radioStations.slice(0, 4).map((s, i) => {
              const isPlaying = playing === i;
              return (
                <button key={s.id} onClick={() => setPlaying(p => p === i ? null : i)}
                  className={`flex items-center gap-1.5 rounded-lg sm:rounded-xl px-1.5 sm:px-2 lg:px-3 py-1.5 lg:py-2.5 text-left transition-colors ${isPlaying ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15'}`}>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
                    <img src={s.img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                  </span>
                  <span className="min-w-0 flex-1 text-white text-[9px] sm:text-[11px] lg:text-sm font-bold truncate">{s.name}</span>
                  {isPlaying
                    ? (radioStatus === 'loading' ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white flex-shrink-0 animate-spin" /> : <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white flex-shrink-0" />)
                    : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {radioStations.length > 4 && (
            <button onClick={() => setRadioWidgetOpen(true)} className="text-white/70 hover:text-white text-[10px] sm:text-xs lg:text-sm font-bold text-center mt-1.5 lg:mt-3">
              Ver todas las emisoras →
            </button>
          )}
        </div>
      </section>

      {/* ── Título de marca, justo bajo el hero ── */}
      <div className="text-center mt-6 px-4">
        <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white mb-1">
          💃 <span className="text-pink-600">Baila</span> Now
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm max-w-lg mx-auto">
          Todo lo que amas del baile, en un solo lugar
        </p>
      </div>

      {/* ── PLANES DE BAILE (con el súper buscador integrado dentro) — módulo "Planes Para Bailar" (Admin → Constructor Home) ── */}
      {isModuleOn('ruta') && (
        <PlanesDeBaileHomeSection navigate={navigate} cityFilter={homeCity} onCityChange={setHomeCity} />
      )}

      {/* ── SPONSORS SLIDER ── */}
      <FeaturedSlider navigate={navigate} />

      {/* ── CATEGORÍAS ── */}
      <DynamicCategoriesSection navigate={navigate} />

      {/* ── MÁS PARA TI (justo bajo el escaparate, segun brief) ── */}
      <MoreForYou navigate={navigate} />

      {/* Elemento de audio real para la radio en vivo */}
      <audio ref={audioRef} className="hidden" preload="none" />

      {/* ── PERSISTENT MINI PLAYER (when playing) ── */}
      {playing !== null && playing < 100 && radioStations[playing] && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-pink-500/20 px-4 py-2 flex items-center gap-3 backdrop-blur-xl shadow-2xl">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
            <img src={radioStations[playing].img} alt="" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xs truncate">{radioStations[playing]?.name}</p>
            <p className="text-white/50 text-[10px] flex items-center gap-1">
              {radioStatus === 'loading'
                ? <>conectando…</>
                : radioStatus === 'error'
                ? <span className="text-red-400">emisora no disponible</span>
                : <><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> En directo</>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPlaying(null)}
              className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/30">
              <Pause className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setPlaying(null)} className="p-1 text-white/30 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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
        <section className="mx-4 mt-4 bg-brand-orange rounded-3xl p-5 sm:p-6 text-white shadow-card">
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

      {/* ── LOCALES ABIERTOS AHORA ── */}
      <OpenVenuesNowSection navigate={navigate} />

      {/* ── FILA 3 COLUMNAS: Eventos destacados · Artistas recomendados · BailaNow TV ── */}
      <FeaturedTripleRow navigate={navigate} />

      {/* ── SECCIONES DE DESCUBRIMIENTO (Tendencias, Clases, Profesores, Trabajos) ── */}
      <DiscoverySections navigate={navigate} />

      {/* ── DONDE BAILAR EN LA CIUDAD ── */}
      {isModuleOn('cities') && (
      <HomeSectionWithSearch
        title="🌍 Explorar por ciudad"
        subtitle="Descubre la escena latina en cada ciudad del mundo"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {filtered.map(city => (
                <button
                  key={city.name}
                  onClick={() => navigate(`/venues?city=${city.name}`)}
                  className="relative rounded-3xl overflow-hidden group shadow-lg hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-1 transition-all duration-500 h-52 sm:h-56"
                >
                  <img src={city.img} alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-pink-500/40 transition-all duration-300" />
                  <div className="absolute top-3 left-3 w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                    {city.monument}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <p className="text-white font-display font-black text-xl sm:text-2xl leading-tight drop-shadow-lg">{city.name}</p>
                    <p className="text-white/70 text-[11px] font-medium">{city.landmark}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">🏠 {city.venues} locales</span>
                      <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">🎟 {city.events} eventos</span>
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
      {isModuleOn('artists') && homeArtists.length > 0 && (
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
            ? homeArtists.filter(a => a.name.toLowerCase().includes(searchQ.toLowerCase()) || a.genre.some((g: string) => g.toLowerCase().includes(searchQ.toLowerCase())) || a.city.toLowerCase().includes(searchQ.toLowerCase()))
            : homeArtists;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.slice(0, 6).map(artist => (
                <ArtistCard key={artist.id} artist={artist} onClick={() => navigate(`/artistas/${artist.id}`)} />
              ))}
              {searchQ && filtered.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-ink-tertiary text-sm">No encontramos artistas para "{searchQ}"</p>
                </div>
              )}
            </div>
          );
        }}
      </HomeSectionWithSearch>
      )}

      {/* ── PRÓXIMOS EVENTOS ── */}
      {isModuleOn('cta') && homeEvents.length > 0 && (
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
            ? homeEvents.filter(e => e.title.toLowerCase().includes(searchQ.toLowerCase()) || e.city.toLowerCase().includes(searchQ.toLowerCase()) || e.category.some(c => c.toLowerCase().includes(searchQ.toLowerCase())))
            : homeEvents;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.slice(0, 6).map(event => (
                <EventCard key={event.id} event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
              ))}
              {searchQ && filtered.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-ink-tertiary text-sm">No encontramos eventos para "{searchQ}"</p>
                </div>
              )}
            </div>
          );
        }}
      </HomeSectionWithSearch>
      )}

      {/* ── PATROCINADORES (pie de página) ── */}
      <SponsorsFooterStrip navigate={navigate} />

      {/* ── NEWSLETTER (al final, debajo de patrocinadores) ── */}
      <section className="mx-3 sm:mx-4 mt-6">
        <NewsletterForm variant="banner" />
      </section>

      {/* ── FOOTER LEGAL ── */}
      <footer className="mt-10 mx-4 mb-4 pb-2 border-t border-gray-200 dark:border-gray-800 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm text-gray-900 dark:text-white">Baila</span>
            <span className="font-display font-black text-sm bg-brand-orange bg-clip-text text-transparent">Now</span>
            <span className="text-gray-400 text-xs ml-1">© 2025</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <a href="/legal/terminos" className="hover:text-pink-500 transition-colors">Términos</a>
            <a href="/legal/privacidad" className="hover:text-pink-500 transition-colors">Privacidad</a>
            <a href="/legal/cookies" className="hover:text-pink-500 transition-colors">Cookies</a>
            <button onClick={() => window.dispatchEvent(new Event('bn:open-cookie-settings'))} className="hover:text-pink-500 transition-colors">Gestionar cookies</button>
            <a href="/legal/aviso" className="hover:text-pink-500 transition-colors">Aviso Legal</a>
            <a href="/legal/reembolsos" className="hover:text-pink-500 transition-colors">Reembolsos</a>
            <a href="/legal/vendedores" className="hover:text-pink-500 transition-colors">Vendedores</a>
            <a href="/legal/conducta" className="hover:text-pink-500 transition-colors">Conducta</a>
            <a href="mailto:hola@bailanow.com" className="hover:text-pink-500 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

      {/* Botones flotantes del home (FAB stack) */}
      <HomeFabStack />

      {/* Widgets flotantes de los banners del slider (Radio/TV sin salir del home) */}
      <RadioWidgetModal open={radioWidgetOpen} onClose={() => setRadioWidgetOpen(false)} />
      <TvPreviewModal open={tvWidgetOpen} onClose={() => setTvWidgetOpen(false)} />
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
