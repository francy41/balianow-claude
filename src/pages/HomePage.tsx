import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import MapErrorBoundary from '../components/MapErrorBoundary';
import { Play, Pause, ChevronRight, MapPin, Star, Check, X, ArrowRight, LayoutDashboard, Wallet, Briefcase, Clock, Shield, DollarSign, Users, TrendingUp, Radio, ListMusic, Plus, Volume2, SkipForward, SkipBack, Youtube, Instagram, Download, Smartphone, Video, DoorOpen, Tv, Search, Calendar, Ticket, Loader2, Route as RouteIcon, Heart, Building2, GraduationCap, Music2, Handshake } from 'lucide-react';
import { ARTISTS, EVENTS } from '../data/mockData';
import { TOP_DANCE_CITIES } from '../data/topDanceCities';
import { distanceKm, pointFor, type LatLng } from '../lib/geo';
import { useAuthStore, useSiteConfigStore, getYouTubeId, usePerformerStore, useSponsorsStore, PLATFORM_COMMISSION_RATE, type HomeCategory } from '../store/appStore';
import { useCMSStore, visibleHomeModules, activeCategories } from '../store/cmsStore';
import { Avatar, StarRating, SearchBar, AppImage, Skeleton } from '../components/ui';
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
import { isAdmin as isAdminUser } from '../lib/permissions';

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

// Accesos rápidos del hero. Todas las rutas existen ya en App.tsx: /rutas,
// /eventos, /parejas y /clases — no se inventa ningún destino.
// Vídeo del hero. Va en una constante y no incrustado en el JSX para que se
// vea de un vistazo qué se está cargando y se pueda cambiar en un sitio.
const HERO_VIDEO = 'https://assets.cdn.filesafe.space/7Q3BuQ8WwUJ79DqqX78C/media/6a8f6b7c14ad347ccb716fdf.mp4';

const HERO_ACTIONS: { label: string; to: string; icon: React.FC<any>; primary?: boolean }[] = [
  { label: 'Bailar esta noche', to: '/rutas',   icon: RouteIcon, primary: true },
  { label: 'Eventos',           to: '/eventos', icon: Calendar },
  { label: 'Pareja de baile',   to: '/parejas', icon: Heart },
  { label: 'Clases',            to: '/clases',  icon: GraduationCap },
];

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
        <button onClick={() => navigate('/destacados')} className="flex items-center gap-0.5 text-[10px] font-bold text-brand hover:text-brand-orange-dark transition-colors">
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
              <p className="mt-1.5 text-xs font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 group-hover:text-brand transition-colors">
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
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nuestros Patrocinadores</span>
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
              <span className="text-[9px] font-semibold text-gray-500 text-center leading-tight max-w-[60px] line-clamp-1 group-hover:text-brand transition-colors">
                {sp.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── COMMUNITY POSTS ──────────────────────────────────────────────────────
// Solo el tipo: los posts salen de la tabla community_posts. Antes había aquí
// 4 ejemplos inventados como estado inicial; al pasar a renderizarse habrían
// sido datos falsos en pantalla, así que se eliminan.
interface CommunityPost {
  id: string | number;
  user: string;
  fullText: string;
  location: string;
  category: string;
  status: string;
  time: string;
}

// Cuenta locales y eventos reales por ciudad. Antes estos numeros estaban
// escritos a mano en el array CITIES ("Madrid: 16 locales, 8 eventos") y no
// tenian ninguna relacion con la base de datos.
function useCityCounts() {
  const [counts, setCounts] = useState<Record<string, { venues: number; events: number }>>({});
  useEffect(() => {
    let cancelled = false;
    const norm = (c: string | null) => (c || '').split(/[,\-\/(]/)[0].trim().toLowerCase();
    Promise.all([
      supabase.from('venues').select('city').is('deleted_at', null),
      supabase.from('events').select('city').is('deleted_at', null),
    ]).then(([v, e]) => {
      if (cancelled) return;
      const acc: Record<string, { venues: number; events: number }> = {};
      (v.data || []).forEach((r: any) => {
        const k = norm(r.city); if (!k) return;
        acc[k] = acc[k] || { venues: 0, events: 0 }; acc[k].venues++;
      });
      (e.data || []).forEach((r: any) => {
        const k = norm(r.city); if (!k) return;
        acc[k] = acc[k] || { venues: 0, events: 0 }; acc[k].events++;
      });
      setCounts(acc);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return counts;
}

// ── CITIES ────────────────────────────────────────────────────────────────
// Catálogo de ciudades destacadas: nombre, foto y referencia cultural.
// Los contadores de locales/eventos NO viven aquí — se calculan de la BD
// con useCityCounts(); antes eran números inventados a mano.
const CITIES = [
  { name: 'Madrid',           img: 'https://picsum.photos/seed/madrid2024/800/400',         monument: '🏛️', landmark: 'Puerta de Alcalá' },
  { name: 'Cali',             img: 'https://picsum.photos/seed/cali2024/800/400',           monument: '💃', landmark: 'Capital Mundial de la Salsa' },
  { name: 'Buenos Aires',     img: 'https://picsum.photos/seed/buenosaires2024/800/400',    monument: '🥩', landmark: 'La Boca & Tango' },
  { name: 'La Habana',        img: 'https://picsum.photos/seed/habana2024/800/400',         monument: '🎺', landmark: 'Malecón Habanero' },
  { name: 'Barcelona',        img: 'https://picsum.photos/seed/barcelona2024/800/400',      monument: '⛪', landmark: 'Sagrada Familia' },
  { name: 'Santo Domingo',    img: 'https://picsum.photos/seed/santodomingo2024/800/400',   monument: '🌴', landmark: 'Zona Colonial' },
  { name: 'Miami',            img: 'https://picsum.photos/seed/miami2024/800/400',          monument: '🌅', landmark: 'Calle Ocho – Little Havana' },
  { name: 'Medellín',         img: 'https://picsum.photos/seed/medellin2024/800/400',       monument: '🌺', landmark: 'Plaza Botero' },
  { name: 'Paris',            img: 'https://picsum.photos/seed/paris2024/800/400',          monument: '🗼', landmark: 'Torre Eiffel' },
  { name: 'Valencia',         img: 'https://picsum.photos/seed/valencia2024/800/400',       monument: '🏟️', landmark: 'Ciudad de las Artes' },
  { name: 'New York',         img: 'https://picsum.photos/seed/newyork2024/800/400',        monument: '🗽', landmark: 'El Barrio – Spanish Harlem' },
  { name: 'Ciudad de México', img: 'https://picsum.photos/seed/mexicocity2024/800/400',     monument: '🏛️', landmark: 'Teotihuacán' },
  { name: 'London',           img: 'https://picsum.photos/seed/london2024/800/400',         monument: '🎡', landmark: 'London Eye' },
  { name: 'Bogotá',           img: 'https://picsum.photos/seed/bogota2024/800/400',         monument: '🏔️', landmark: 'Monserrate' },
  { name: 'Berlin',           img: 'https://picsum.photos/seed/berlin2024/800/400',         monument: '🐻', landmark: 'Puerta de Brandeburgo' },
  { name: 'Caracas',          img: 'https://picsum.photos/seed/caracas2024/800/400',        monument: '⛰️', landmark: 'El Ávila' },
  { name: 'Sevilla',          img: 'https://picsum.photos/seed/sevilla2024/800/400',        monument: '💃', landmark: 'Alcázar de Sevilla' },
];

// ── CATEGORIES ────────────────────────────────────────────────────────────
const CATEGORY_CARDS = [
  {
    name: 'Conciertos y Música en Vivo',
    img: 'https://picsum.photos/seed/concert2024/800/500',
    to: '/eventos?cat=conciertos',
    btnColor: 'bg-brand',
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
    btnColor: 'bg-brand',
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
  { id: 'p1', name: 'Bachata Sensual', tracks: 24, duration: '1h 32m', img: 'https://picsum.photos/seed/playlist-bachata/120/120', color: 'bg-brand' },
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
          <div className="bg-gradient-to-r from-brand/20 via-brand-secondary/10 to-brand/20 rounded-2xl sm:rounded-3xl p-[2px] border border-brand/30 overflow-hidden">
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
            <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-brand/20 z-50 max-h-[500px] overflow-y-auto">
              {/* Search Results Option */}
              <button
                onClick={() => handleSearch()}
                className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-all ${
                  selectedIndex === 0
                    ? 'bg-brand/10 border-l-4 border-brand'
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
      <div className="card-float bg-gradient-to-r from-pink-50 via-white to-amber-50 rounded-3xl p-6 sm:p-8">
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
            className="px-4 py-2 bg-brand-orange hover:bg-brand text-white rounded-full font-bold text-sm hover:shadow-lg transition-all hover:scale-105"
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
                className="card-float tile-2 bg-white rounded-2xl p-3 transition-all cursor-pointer"
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

// Un pin distinto (color + alarma parpadeante) por categoría, para el mapa de "Planes de baile"
// del Home — mismos colores que las insignias de las tarjetas, para que se reconozcan a simple vista.
const discoverPin = (ringClass: string, gradClass: string) => L.divIcon({
  className: '',
  html: `<div class="relative w-4 h-4"><span class="animate-ping absolute inline-flex h-full w-full rounded-full ${ringClass} opacity-80"></span><span class="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-br ${gradClass} ring-2 ring-white shadow-lg"></span></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});
const DISCOVER_PIN_ICON: Record<'plan' | 'venue' | 'evento' | 'vivo', L.DivIcon> = {
  plan:   discoverPin('bg-pink-300', 'from-brand to-brand-secondary'),
  venue:  discoverPin('bg-rose-300', 'from-rose-500 to-pink-700'),
  evento: discoverPin('bg-rose-300', 'from-rose-500 to-fuchsia-700'),
  vivo:   discoverPin('bg-red-300', 'from-red-500 to-rose-700'),
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

// `desc` solo en "Planes de baile": es el módulo principal y merece la explicación.
// En el resto el nombre ya se entiende solo y la descripción no aportaba.
const DISCOVER_TABS: { key: DiscoverKind; label: string; desc?: string; icon: React.FC<any> }[] = [
  { key: 'plan',   label: 'Planes de baile', desc: 'Salidas en grupo para bailar', icon: RouteIcon },
  { key: 'venue',  label: 'Abiertos ahora',  icon: Building2 },
  { key: 'local',  label: 'Locales',         icon: MapPin },
  { key: 'pareja', label: 'Pareja de baile', icon: Heart },
  { key: 'evento', label: 'Eventos',         icon: GraduationCap },
  { key: 'vivo',   label: 'Eventos en vivo', icon: Calendar },
];
const DISCOVER_TAB_ROUTE: Record<DiscoverKind, string> = {
  plan: '/rutas', venue: '/venues', local: '/venues', pareja: '/parejas', evento: '/eventos', vivo: '/live',
};

// Punto de alarma parpadeante por categoría en las pestañas — mismos colores que el mapa y las tarjetas.
const DISCOVER_TAB_DOT: Partial<Record<DiscoverKind, { ring: string; grad: string }>> = {
  plan:   { ring: 'bg-pink-400',    grad: 'from-brand to-brand-secondary' },
  venue:  { ring: 'bg-rose-400',    grad: 'from-rose-500 to-pink-700' },
  local:  { ring: 'bg-fuchsia-400', grad: 'from-brand-secondary to-brand' },
  pareja: { ring: 'bg-fuchsia-400', grad: 'from-brand-secondary to-pink-700' },
  evento: { ring: 'bg-rose-400',    grad: 'from-rose-500 to-fuchsia-700' },
  vivo:   { ring: 'bg-red-400',     grad: 'from-red-500 to-rose-700' },
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
  // Ubicación del usuario para calcular distancias reales. No se pide permiso
  // aquí: solo se lee si YA fue concedido (p. ej. desde el buscador), para no
  // lanzar un diálogo del navegador nada más entrar en el Home.
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [planFilter, setPlanFilter] = useState<'todos' | 'abierto' | 'pronto' | 'hoy' | 'manana'>('todos');
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [stats, setStats] = useState({ abiertos: 0, pareja: 0, vivo: 0, rating: 0, plan: 0, evento: 0, local: 0 });

  // Lee la ubicación SOLO si el permiso ya está concedido — así la distancia
  // aparece para quien ya la dio, y a nadie le salta un diálogo al entrar.
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then(res => {
        if (cancelled || res.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          pos => { if (!cancelled) setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
          () => {},
          { maximumAge: 300000, timeout: 8000 },
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Distancia real al usuario; null si no hay ubicación o el item no tiene coordenadas.
  const distOf = (it: DiscoverItem): number | null => {
    if (!userPos) return null;
    const p = pointFor(it);
    return p ? distanceKm(userPos, p) : null;
  };
  const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

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
        supabase.from('partner_profiles').select('user_id', { count: 'exact', head: true }).eq('active', true),
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

  // El mapa siempre muestra las 4 categorías con ubicación real (Planes/Abiertos/Eventos/En directo),
  // cada una con su propio color y alarma parpadeante — independiente de la pestaña activa.
  const MAPPABLE: DiscoverKind[] = ['plan', 'venue', 'evento', 'vivo'];
  const pins = scoped.filter((it): it is DiscoverItem & { lat: number; lng: number; kind: 'plan' | 'venue' | 'evento' | 'vivo' } =>
    MAPPABLE.includes(it.kind) && it.lat !== undefined && it.lng !== undefined);
  const mapCenter: [number, number] = pins.length
    ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length]
    : [40.4168, -3.7038];

  // Actividad real ahora mismo (no "alertas" ficticias): abiertos + directos + planes de hoy.
  const activityNow = stats.abiertos + stats.vivo + items.filter(it => it.kind === 'plan' && it.isToday).length;

  return (
    <section className="mx-3 sm:mx-4 mt-8">
      {/* Banner del módulo — tarjeta horizontal con icono grande, como en la referencia */}
      <button onClick={() => navigate('/rutas')}
        className="card-float w-full flex items-center gap-4 p-3.5 sm:p-4 rounded-3xl bg-surface-elevated text-left mb-3 hover:bg-surface transition-colors">
        <span className="relative w-14 h-14 rounded-2xl bg-accent/10 grid place-items-center flex-shrink-0">
          <RouteIcon className="w-7 h-7 text-accent" />
          {stats.plan > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent ring-2 ring-surface-elevated" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-display font-black text-lg text-ink-primary leading-tight">Planes de baile</span>
          <span className="block text-[13px] text-ink-tertiary leading-tight mt-0.5">Salidas en grupo para bailar</span>
        </span>
        <span className="inline-flex items-center gap-1.5 bg-accent text-white text-[13px] font-black px-4 py-2.5 rounded-full flex-shrink-0">
          Ver todos <ArrowRight className="w-4 h-4" />
        </span>
      </button>

      {/* Súper buscador de ciudad — filtra el mapa y los contadores de abajo */}
      <div className="mb-3">
        <SuperSearchBar cityValue={cityFilter || ''} onCitySelect={onCityChange} />
      </div>

      {/* Fila de métricas — todas se calculan con consultas reales ya cargadas
          (count exact sobre venues abiertos, live_sessions, eventos y planes).
          Antes iban apretadas dentro del panel del mapa; aquí se leen mejor. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
        {[
          { icon: Building2,      label: 'Abiertos ahora',  sub: 'Locales con las puertas abiertas', val: stats.abiertos },
          { icon: Heart,          label: 'Buscando pareja', sub: 'Personas activas',                 val: stats.pareja },
          { icon: Calendar,       label: 'Eventos en vivo', sub: 'Ahora mismo',                      val: stats.vivo },
          { icon: GraduationCap,  label: 'Eventos',         sub: 'Próximos',                         val: stats.evento },
        ].filter(m => m.val > 0).map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card-float bg-surface-elevated rounded-2xl p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-accent/10 grid place-items-center flex-shrink-0">
                <Icon className="w-5 h-5 text-accent" />
              </span>
              <span className="min-w-0">
                <span className="block font-display font-black text-xl text-ink-primary leading-none">{m.val}</span>
                <span className="block text-[11px] font-bold text-ink-secondary leading-tight mt-0.5 truncate">{m.label}</span>
                <span className="hidden sm:block text-[10px] text-ink-tertiary leading-tight truncate">{m.sub}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="card-float relative overflow-hidden rounded-3xl min-h-[80px] sm:min-h-[130px]">
        {/* Mapa real de fondo — Planes/Abiertos ahora/Eventos/En directo a la vez, cada uno con su color y alarma */}
        <div className="absolute inset-0">
          {pins.length > 0 ? (
            <MapErrorBoundary fallback={<div className="absolute inset-0 bg-gradient-to-br from-[#EC4899] via-[#BE185D] to-brand-deep" />}>
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
            <div className="absolute inset-0 bg-gradient-to-br from-[#EC4899] via-[#BE185D] to-brand-deep" />
          )}
        </div>
        {/* Degradados rosa oscuro para que el texto siempre se lea sobre el mapa */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-deep via-brand-deep/70 to-brand-deep/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/85 via-transparent to-transparent pointer-events-none" />

        <div className="relative p-2.5 sm:p-4 flex items-start justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap min-h-[80px] sm:min-h-[130px]">
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
          <button onClick={() => navigate('/rutas')}
            className="flex-shrink-0 flex sm:hidden items-center gap-1.5 bg-gradient-to-br from-brand to-fuchsia-800 rounded-full pl-1.5 pr-2.5 py-1 shadow-lg shadow-pink-950/50">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <RouteIcon className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="text-white text-[10px] font-extrabold whitespace-nowrap">{activityNow} activos</span>
          </button>
          <div className="hidden sm:block flex-shrink-0 w-[230px] bg-gradient-to-br from-brand to-fuchsia-800 rounded-2xl p-3 shadow-xl shadow-pink-950/50">
            <div className="flex items-center gap-2.5">
              <span className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <RouteIcon className="w-4 h-4 text-white" />
                {activityNow > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-brand text-[10px] font-black flex items-center justify-center">{activityNow}</span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-white font-extrabold text-xs">Actividad ahora</p>
                <p className="text-white/80 text-[10px] mt-0.5 leading-tight">{activityNow > 0 ? `${activityNow} cosas pasando cerca de ti` : 'Sé el primero en crear un plan'}</p>
              </div>
            </div>
            <button onClick={() => navigate('/rutas')}
              className="w-full mt-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-lg py-1.5 text-white text-[11px] font-extrabold transition-colors">
              Ver todos
            </button>
          </div>
        </div>

        {/* Leyenda del mapa — qué representa cada color de pin (Planes/Abiertos/Eventos/En directo) */}
        {pins.length > 0 && (
          <div className="relative flex flex-wrap gap-x-2.5 gap-y-1 px-3 sm:px-5 pb-2 sm:pb-3">
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-brand to-brand-secondary" /></span> Planes</span>
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-rose-500 to-pink-700" /></span> Abiertos ahora</span>
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-700" /></span> Eventos</span>
            <span className="flex items-center gap-1 text-white text-[9px] font-bold"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gradient-to-br from-red-500 to-rose-700" /></span> En directo</span>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#EC4899] via-[#BE185D] to-brand-deep px-4 sm:px-5 pt-1 pb-4 sm:pb-5 -mt-3">
        {/* Menú de categorías — cada una abre su página completa.
            "Planes de baile" ocupa la fila entera (es el módulo principal y lleva descripción);
            el resto va en cuadrícula de 2 columnas. Cada entrada conserva el punto de alarma
            parpadeante con el color de su pin en el mapa, para reconocerla de un vistazo. */}
        {(() => {
          const trueCounts: Record<DiscoverKind, number> = { plan: stats.plan, venue: stats.abiertos, local: stats.local, pareja: stats.pareja, evento: stats.evento, vivo: stats.vivo };
          const visibles = DISCOVER_TABS.filter(t => trueCounts[t.key] > 0);
          const principal = visibles.find(t => t.key === 'plan');
          const resto = visibles.filter(t => t.key !== 'plan');

          const Pildora = ({ t, full }: { t: typeof DISCOVER_TABS[number]; full: boolean }) => {
            const Icon = t.icon;
            const dot = DISCOVER_TAB_DOT[t.key];
            return (
              <button onClick={() => navigate(DISCOVER_TAB_ROUTE[t.key])}
                className={`card-float w-full flex items-center bg-white text-gray-800 hover:bg-gray-50 transition-all text-left rounded-2xl ${full ? 'gap-3 pl-2 pr-3 py-2' : 'gap-2 pl-1.5 pr-2 py-1.5'}`}>
                {/* Icono en círculo, como ancla visual de la categoría */}
                <span className={`relative rounded-full grid place-items-center flex-shrink-0 bg-brand/10 ${full ? 'w-10 h-10' : 'w-8 h-8'}`}>
                  <Icon className={`text-brand ${full ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  {dot && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot.ring} opacity-75`} />
                      <span className={`relative inline-flex w-2.5 h-2.5 rounded-full bg-gradient-to-br ${dot.grad} ring-2 ring-white`} />
                    </span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block font-extrabold leading-tight ${full ? 'text-sm' : 'text-[11px] line-clamp-2'}`}>{t.label}</span>
                  {t.desc && <span className="block text-[11px] font-medium text-gray-500 leading-tight mt-0.5">{t.desc}</span>}
                </span>
                <span className={`font-black rounded-full flex-shrink-0 bg-brand/10 text-brand ${full ? 'text-xs px-2.5 py-1' : 'text-[10px] px-1.5 py-0.5'}`}>{trueCounts[t.key]}</span>
                {full && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </button>
            );
          };

          return (
            <div className="pt-3 pb-1 space-y-2">
              {principal && <Pildora t={principal} full />}
              {resto.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {resto.map(t => <Pildora key={t.key} t={t} full={false} />)}
                </div>
              )}
            </div>
          );
        })()}

        {/* Filtros y tarjetas de planes — todo derivado de datos reales ya cargados.
            Cada filtro se calcula de `isToday`/`meta`/`kind`; no hay estados inventados. */}
        {scoped.length > 0 && (() => {
          const PLAN_FILTERS: { key: typeof planFilter; label: string }[] = [
            { key: 'todos',   label: 'Todos' },
            { key: 'abierto', label: 'Abierto ahora' },
            { key: 'pronto',  label: 'En directo' },
            { key: 'hoy',     label: 'Hoy' },
            { key: 'manana',  label: 'Próximos' },
          ];
          const matches = (it: DiscoverItem) => {
            if (planFilter === 'abierto') return it.kind === 'venue';
            if (planFilter === 'pronto')  return it.kind === 'vivo';
            if (planFilter === 'hoy')     return !!it.isToday;
            if (planFilter === 'manana')  return it.kind === 'evento' || (it.kind === 'plan' && !it.isToday);
            return true;
          };
          const visibles = scoped.filter(matches);
          // Insignia de estado, siempre derivada del tipo/fecha reales del item.
          const badgeOf = (it: DiscoverItem) => {
            if (it.kind === 'vivo')  return { label: 'EN VIVO',       cls: 'bg-red-500' };
            if (it.kind === 'venue') return { label: 'ABIERTO AHORA', cls: 'bg-emerald-500' };
            if (it.kind === 'evento')return { label: 'EVENTO',        cls: 'bg-violet-500' };
            if (it.kind === 'pareja')return { label: 'PAREJA',        cls: 'bg-fuchsia-500' };
            if (it.isToday)          return { label: 'HOY',           cls: 'bg-amber-500' };
            return { label: 'PLAN', cls: 'bg-accent' };
          };
          return (
            <div className="pt-1 pb-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
                {PLAN_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setPlanFilter(f.key)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                      planFilter === f.key
                        ? 'bg-white text-accent border-white'
                        : 'bg-white/15 text-white border-white/30 hover:bg-white/25'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {visibles.length === 0 ? (
                <p className="text-pink-100/80 text-xs py-4">No hay nada en esta categoría ahora mismo.</p>
              ) : (
                <HScroll>
                  {visibles.slice(0, 12).map(it => {
                    const b = badgeOf(it);
                    const d = distOf(it);
                    return (
                      <button key={it.id} onClick={() => navigate(it.route)} className={`${visibles.length <= 3 ? 'tile-wide' : 'tile-2'} text-left group`}>
                        <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
                          {it.cover ? (
                            <img src={it.cover} alt="" loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <RouteIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/25" />
                          )}
                          <span className={`absolute top-2 left-2 ${b.cls} text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full`}>{b.label}</span>
                          {d !== null && (
                            <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded">{fmtDist(d)}</span>
                          )}
                          {it.rating > 0 && (
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{it.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-white font-black text-[13px] uppercase leading-tight truncate">{it.title}</p>
                        <p className="text-white/70 text-[11px] leading-tight truncate">
                          {[it.city, it.meta].filter(Boolean).join(' · ')}
                        </p>
                        {!!it.crowdCount && (
                          <p className="text-white/60 text-[10px] mt-0.5">{it.crowdCount} {it.crowdCount === 1 ? 'persona' : 'personas'}</p>
                        )}
                      </button>
                    );
                  })}
                  <SeeAllTile onClick={() => navigate('/rutas')} className={`${visibles.length <= 3 ? 'tile-wide' : 'tile-2'} tile-cover`} />
                </HScroll>
              )}
            </div>
          );
        })()}

        {cityFilter?.trim() && scoped.length === 0 && (
          <div className="text-center py-6">
            <p className="text-pink-200/70 text-xs">Aún no hay nada real publicado en «{cityFilter}» — sé el primero en crear un plan.</p>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <button onClick={() => navigate('/rutas')}
                className="inline-flex items-center gap-1.5 bg-gradient-to-br from-brand to-fuchsia-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl shadow-lg shadow-brand-deep/40">
                <Plus className="w-3.5 h-3.5" /> Crear un plan en {cityFilter}
              </button>
              <a href="mailto:hola@bailanow.com?subject=Quiero%20BailaNow%20en%20mi%20ciudad"
                className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 shadow-md shadow-black/10 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl hover:bg-white/25 transition-colors">
                Contacta con nosotros
              </a>
            </div>
          </div>
        )}

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
      <div className="card-float relative bg-white rounded-2xl flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3">
        <Search className="w-5 h-5 text-brand flex-shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowList(true); }}
          onFocus={() => setShowList(true)}
          onBlur={() => setTimeout(() => setShowList(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setShowList(false); }}
          placeholder="¿En qué ciudad quieres bailar hoy?"
          className="flex-1 min-w-0 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm sm:text-base font-bold"
        />
        {query && (
          <button onClick={() => { setQuery(''); onCitySelect(''); }} className="flex-shrink-0 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        )}
        <button onClick={useMyLocation} disabled={locating}
          className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-br from-brand to-brand-secondary text-white text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-2 rounded-xl disabled:opacity-60 shadow shadow-brand-deep/40">
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
            <button key={c} onMouseDown={() => pick(c)} className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 dark:hover:bg-brand-deep/20 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
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

  // Se muestran 9 (3 filas de 3) y el resto queda tras "Ver todas".
  const VISIBLES = 9;

  // Mismo formato que las píldoras compactas del menú de "Planes de baile":
  // misma forma, color, tamaño e icono en círculo rosa.
  const CategoryButton: React.FC<{ cat: HomeCategory }> = ({ cat }) => (
    <button
      onClick={() => navigate(cat.route)}
      className="card-float w-full flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-2xl bg-white text-gray-800 hover:bg-gray-50 transition-all text-left active:scale-95"
    >
      <span className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0 bg-brand/10 text-base leading-none">{cat.icon}</span>
      <span className="flex-1 min-w-0 text-[11px] font-extrabold leading-tight line-clamp-2">{cat.name}</span>
    </button>
  );

  return (
    <section className="mt-4 px-2 sm:px-4">
      {/* Main Categories Grid */}
      <div className="space-y-6 pb-6">
        {visibleCats.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-brand" />
                <h3 className="font-display font-black text-sm sm:text-base text-gray-900 dark:text-white uppercase tracking-wider">
                  Principales
                </h3>
              </div>
            </div>
            {/* Cuadrícula de 3 x 3; el resto de categorías se ven en "Ver todas" */}
            <div className="grid grid-cols-3 gap-2">
              {visibleCats.slice(0, VISIBLES).map(cat => (
                <CategoryButton key={cat.id} cat={cat} />
              ))}
            </div>
            {visibleCats.length > VISIBLES && (
              <button
                onClick={() => navigate('/explorar')}
                className="card-float w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white text-brand hover:bg-gray-50 transition-all text-[11px] font-black uppercase tracking-widest"
              >
                Ver todas <ArrowRight className="w-4 h-4" />
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
        <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex flex-col items-center gap-1 group hover:scale-105 transition-transform flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-brand">{actionLabel}</span>
          </button>
        )}
      </div>
      {subtitle && <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-3 mt-1">{subtitle}</p>}

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
        className="hidden lg:grid place-items-center absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-gray-900/95 shadow-xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white text-xl leading-none opacity-0 group-hover/hs:opacity-100 hover:bg-brand hover:text-white transition z-10">‹</button>
      <button onClick={() => go(1)} aria-label="Siguiente"
        className="hidden lg:grid place-items-center absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-gray-900/95 shadow-xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white text-xl leading-none opacity-0 group-hover/hs:opacity-100 hover:bg-brand hover:text-white transition z-10">›</button>
    </div>
  );
};

// ── "VER TODAS" — cierre de cada fila horizontal del Home ──
// Va como último elemento del HScroll, con la altura que le pase cada sección.
const SeeAllTile: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`card-float rounded-2xl bg-white dark:bg-gray-900 flex flex-col items-center justify-center gap-1.5 px-1 py-3 text-brand ${className}`}
  >
    <span className="w-11 h-11 rounded-full bg-brand grid place-items-center flex-shrink-0">
      <ArrowRight className="w-5 h-5 text-white" />
    </span>
    <span className="text-[11px] font-black uppercase tracking-widest text-center leading-tight">Ver<br />más</span>
  </button>
);

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
          <button key={s.id} onClick={() => navigate(`/live/session/${s.id}`)} className={`${lives.length <= 3 ? 'tile-wide' : 'tile-2'} text-left group`}>
            <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
              <AppImage src={s.cover || ''} alt={s.title} fallback="portrait" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-lg animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
              </span>
              {s.viewers > 0 && (
                <span className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">👁 {s.viewers}</span>
              )}
            </div>
            <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{s.title}</p>
            <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate capitalize">{[s.category, s.city].filter(Boolean).join(' · ')}</p>
          </button>
        ))}
        <SeeAllTile onClick={() => navigate('/live')} className={`${lives.length <= 3 ? 'tile-wide' : 'tile-2'} tile-cover`} />
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

  const ColHeader = ({ title, onAll }: { title: string; onAll: () => void }) => (
    <div className="flex items-center justify-between mb-3 px-1">
      <h3 className="font-display font-black text-base text-gray-900 dark:text-white">{title}</h3>
      <button onClick={onAll} className="text-brand hover:text-brand-orange-dark text-[11px] font-bold hover:underline">Ver todos →</button>
    </div>
  );

  return (
    <section className="mx-3 sm:mx-4 mt-6">
      <div className="space-y-6">

        {/* Col 1: Eventos destacados */}
        <div>
          <ColHeader title="🎫 Eventos destacados" onAll={() => navigate('/eventos')} />
          <HScroll>
            {events.map(e => (
              <button key={e.id} onClick={() => navigate(`/eventos/${e.id}`)} className="tile-2 text-left group">
                <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
                  {(e as any).cover && <img src={(e as any).cover} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />}
                  <span className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[11px] font-black text-center py-1 rounded-md">{day(e.date)} {month(e.date)}</span>
                </div>
                <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{e.title}</p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{e.venueName || e.city}</p>
              </button>
            ))}
            <SeeAllTile onClick={() => navigate('/eventos')} className="tile-2 tile-cover" />
          </HScroll>
        </div>

        {/* Col 2: Artistas recomendados */}
        <div>
          <ColHeader title="🎧 Artistas recomendados" onAll={() => navigate('/artistas')} />
          <HScroll>
            {artists.map(a => (
              <button key={a.id} onClick={() => navigate(`/artistas/${a.id}`)} className="tile-2 text-left group">
                <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
                  {a.avatar && <img src={a.avatar} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />}
                </div>
                <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{a.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{a.genre.slice(0, 2).join(' · ')}</p>
              </button>
            ))}
            <SeeAllTile onClick={() => navigate('/artistas')} className="tile-2 tile-cover" />
          </HScroll>
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
          <span className="w-1.5 h-5 rounded-full bg-brand" />
          <h2 className="font-display font-black text-xl text-gray-900 dark:text-white">Más para ti</h2>
        </div>
        <button onClick={() => navigate('/explorar')}
          className="text-xs font-bold text-brand hover:text-brand-orange-dark flex items-center gap-1 transition-colors">
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Tarjetas de icono + degradado (sin fotos) — mismo lenguaje visual que el cintillo de arriba */}
      <HScroll>
        {modules.map(m => (
          <button key={m.id} onClick={() => navigate(m.route)}
            className="card-float group tile-2 relative overflow-hidden rounded-3xl text-left">
            <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient}`} />
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            {m.badge && (
              <span className="absolute top-3 right-3 bg-white text-brand text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shadow">{m.badge}</span>
            )}
            <div className="relative h-full flex flex-col justify-between p-3">
              <span className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${m.iconBg} text-white grid place-items-center text-lg sm:text-xl shadow-lg ring-2 ring-white/20 flex-shrink-0`}>{m.icon}</span>
              <div>
                <p className="text-white font-display font-black text-sm leading-tight line-clamp-2">{m.title}</p>
                <p className="text-white/75 text-[11px] mt-1 leading-snug line-clamp-2">{m.subtitle}</p>
              </div>
            </div>
            <span className="grid absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white/15 place-items-center text-white group-hover:bg-white group-hover:text-gray-900 transition-all">
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        ))}
        <SeeAllTile onClick={() => navigate('/explorar')} className="tile-2 tile-cover" />
      </HScroll>
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
          tag: t.featured ? 'Destacado' : 'Nuevo', tagColor: t.featured ? 'bg-emerald-500' : 'bg-brand',
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
        <button onClick={() => navigate('/tv')} className="text-brand hover:text-brand-orange-dark text-xs font-bold hover:underline">Ver todo →</button>
      </div>
      <HScroll>
        {shows.map(s => (
          <button key={s.id} onClick={() => navigate(`/tv/${s.id}`)} className={`${shows.length <= 3 ? 'tile-wide' : 'tile-2'} text-left group`}>
            <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
              {s.img ? (
                <img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />
              ) : (
                <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/25" />
              )}
              <span className={`absolute top-2 left-2 ${s.tagColor} text-white text-[9px] font-black px-2 py-0.5 rounded-full`}>{s.tag}</span>
              <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/25">
                <span className="w-11 h-11 rounded-full bg-white/90 grid place-items-center text-brand"><Play className="w-5 h-5" fill="currentColor" /></span>
              </span>
            </div>
            <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{s.title}</p>
            {s.meta && <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate capitalize">{s.meta}</p>}
          </button>
        ))}
        <SeeAllTile onClick={() => navigate('/tv')} className="tile-2 tile-cover" />
      </HScroll>
    </section>
  );
};

// ── ONDAS DE EMISIÓN ────────────────────────────────────────────────────────
// Se pintan POR ENCIMA de la ilustración (dibujada o subida) y por debajo del
// texto, para que la tarjeta se lea como una señal en directo. El trazado tiene
// periodo 360 y mide 1440 de ancho: al desplazar la mitad (720 = dos periodos
// exactos) el bucle cierra sin costura.
const WAVE_PATH = 'M0,60 C60,30 120,30 180,60 C240,90 300,90 360,60 C420,30 480,30 540,60 '
  + 'C600,90 660,90 720,60 C780,30 840,30 900,60 C960,90 1020,90 1080,60 '
  + 'C1140,30 1200,30 1260,60 C1320,90 1380,90 1440,60 L1440,120 L0,120 Z';

const WAVE_LAYERS = [
  { fill: '#ffffff', opacity: 0.13, duration: '13s', height: '58%', bottom: '-6%' },
  { fill: '#FF3D9A', opacity: 0.36, duration: '9s',  height: '48%', bottom: '-2%' },
  { fill: '#ffffff', opacity: 0.20, duration: '6.5s', height: '36%', bottom: '0%' },
];

const LiveWaves: React.FC = () => (
  <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {WAVE_LAYERS.map((w, i) => (
      <svg key={i} viewBox="0 0 1440 120" preserveAspectRatio="none"
        className="wave-drift absolute left-0 w-[200%]"
        style={{ animationDuration: w.duration, height: w.height, bottom: w.bottom, opacity: w.opacity }}>
        <path d={WAVE_PATH} fill={w.fill} />
      </svg>
    ))}
  </span>
);

// ── TARJETA DE BAILANOW TV ──────────────────────────────────────────────────
// Identidad de canal: fondo de pantalla encendida (glow radial + líneas de
// barrido + haz de luz), logotipo "TV" como chapa y play como elemento héroe.
// Todo es CSS, sin imágenes: pesa nada y no depende de que haya contenido.
// Pareja bailando, dibujada a mano en SVG: silueta en vuelta de bachata, con
// las manos unidas en alto y la falda abierta por el giro. Sin imágenes, así
// que escala sin pixelarse y no añade ni una petición de red.
const DanceCoupleSilhouette: React.FC<{ className?: string }> = ({ className }) => {
  const uid = React.useId().replace(/:/g, '');
  const ink = `tvInk-${uid}`;
  const spot = `tvSpot-${uid}`;
  return (
    <svg viewBox="0 0 240 300" className={className} aria-hidden focusable="false">
      <defs>
        {/* Iluminada desde arriba: brilla en la cabeza y se apaga hacia los pies */}
        <linearGradient id={ink} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.96" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.82" />
          <stop offset="88%" stopColor="#fff" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.34" />
        </linearGradient>
        <radialGradient id={spot} cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="62%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Foco de escenario detrás de la pareja */}
      <ellipse cx="126" cy="140" rx="116" ry="132" fill={`url(#${spot})`} />
      {/* Sombra en el suelo, para que no floten */}
      <ellipse cx="120" cy="276" rx="92" ry="9" fill="#fff" opacity="0.12" />

      <g fill={`url(#${ink})`}>
        {/* ── ÉL: un solo contorno — cabeza, cuello, torso, brazos y piernas ── */}
        <path d="M66 30.5
          C73.5 30.5 78.5 36.5 78.5 44 C78.5 50.5 75.5 55.5 71 58 L71 71
          C79.5 73 85 77.5 88 85
          C96 76.5 104 67.5 111 58.5 C116 52.5 120 48 123 44
          L131.5 49.5 C128 54.5 123.5 60.5 118 67.5
          C110.5 76.5 102 86.5 94 94.5 C89 99.5 86.5 102 86 105
          C85 113 82 122 79 130
          C82 138 85.5 146 86.5 154
          L92 205 L99 257
          C104.5 261 112 265.5 117 267.5 C120.5 269 120 273.5 116 273.5
          L93 273.5 C89 273.5 87 270.5 87 266.5
          L81.5 205.5 L67 160.5 L60 160.5
          L48 204 C46 214 47 226 51 236 C54 244 51.5 252 46 253
          C41 254 37.5 250 37 245 C36 234 37 220 40 208
          L42 154 C43 146 46 138 49 130
          C46.5 122 45 113 44.5 105
          C43 113.5 41 124 40 135 C39.3 142 39 147.5 39 151.5
          C39 155.5 35 157.5 31 156.5 C27 155.5 25 152 25.5 148
          C26.5 136.5 28 124 30.5 113 C32.5 103.5 35 95.5 38.5 89.5
          C41.5 79.5 47.5 74 57 71.5 L57 58
          C52.5 55.5 49.5 50.5 49.5 44 C49.5 36.5 55 30.5 66 30.5 Z" />

        {/* ── ELLA ── melena suelta, que cae por detrás con el giro */}
        <path d="M179 39
          C190 36.5 199.5 43 201 53.5
          C202.5 63 198.5 71.5 191.5 75
          C193 66 191.5 56 186.5 48
          C184.5 44.5 182 41.5 179 39 Z" />
        {/* cabeza, cuello, torso y los dos brazos, de una pieza */}
        <path d="M174 36.5
          C181.5 36.5 186.5 42.5 186.5 50 C186.5 56 184 60.5 180 63 L180 74
          C188 76 194 81 197 88.5
          C205.5 90.5 214 95.5 220 101.5 C223 104.5 226 106.5 228.5 107.5
          C232 109 231 115 227 114.5 C221.5 114 214 109 206 104
          C198 99 192 97 187 100
          L185.5 126 L163 126 L161.5 100
          C157 88.5 153 74 151.5 60.5 C151 54.5 151 50 151.5 46.5
          L141 44 C140 49 140 54.5 141 61.5
          C143 76 147 89.5 152 97.5
          C156 92.5 160.5 88.5 165.5 86.5 L168 74 L168 63
          C164 60.5 161.5 56 161.5 50 C161.5 42.5 166.5 36.5 174 36.5 Z" />

        {/* Manos unidas: el eje del giro */}
        <path d="M132 40 C137 37.5 143.5 39.5 145 44.5 C146.5 49.5 143 54 137.5 54
          C132 54 128.5 50 129 45.5 C129.3 43 130.5 41 132 40 Z" />

        {/* Falda abierta por la fuerza del giro, con vuelo asimétrico */}
        <path d="M162 122
          C155 149 145 176 131 197 C123 209 117.5 216.5 120 221.5
          C133 230 152 234.5 170 234 C189 233.5 207 228 216.5 221
          C221 217.5 221 211.5 217 204.5 C204 179 194 149 190 122 Z" />

        {/* Sus piernas: una apoyada, la otra en punta por el giro */}
        <path d="M163 224 L177 224 L173 258 C172.5 263 170 266.5 166 267.5
          L150.5 271.5 C147 272.5 145 269 147.5 266.5 L160 255 Z" />
        <path d="M182 226 L194 226 C196 238 200 250 206 259
          C209 263 206.5 267 202.5 265.5 L190.5 261 C187 259.5 185 256 185 252 Z" />
      </g>

      {/* Pliegues de la falda: dan volumen sin ensuciar la silueta */}
      <g fill="none" stroke="#fff" strokeOpacity="0.13" strokeWidth="2.5" strokeLinecap="round">
        <path d="M170 132 C166 160 160 186 151 208" />
        <path d="M183 132 C186 160 192 186 200 206" />
      </g>
    </svg>
  );
};

const TvPromoCard: React.FC<{ navigate: any; onOpenTv: () => void; compact?: boolean }> = ({ navigate, onOpenTv, compact }) => {
  // Ilustración editable desde Admin → Home · BailaNow TV. Si no hay imagen
  // subida, se dibuja la pareja: la tarjeta nunca se queda coja.
  const hero = useSiteConfigStore(s => s.homeTvHero);
  const heroFull = useSiteConfigStore(s => s.homeTvHeroFull);
  // La maqueta subida ya trae título y botón: se usa a sangre y la tarjeta deja
  // de pintar los suyos, para que no salgan duplicados. Toda ella abre la TV.
  if (hero && heroFull) return (
    <button onClick={onOpenTv} aria-label="BailaNow TV — ver ahora"
      className={`card-float group relative block w-full overflow-hidden rounded-2xl bg-[#1A0210]
        ${compact ? 'min-h-[210px]' : 'min-h-[236px]'}`}>
      <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover
        transition-transform duration-700 group-hover:scale-[1.03]" />
      <LiveWaves />
    </button>
  );
  return (
  <div className={`card-float group relative isolate flex flex-col overflow-hidden rounded-2xl bg-[#1A0210]
    ${compact ? 'p-4 min-h-[210px]' : 'p-5 min-h-[236px]'}`}>
    {/* Fondo: foco rosa desde la esquina superior derecha */}
    <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(125%_105%_at_100%_0%,#FF3D9A_0%,#E5127D_26%,#8E0A48_55%,#2C0219_80%,#14010C_100%)]" />
    {/* Líneas de barrido finísimas, guiño a una pantalla encendida */}
    <span aria-hidden className="absolute inset-0 -z-10 opacity-[0.18] mix-blend-overlay
      bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,.9)_0px,rgba(255,255,255,.9)_1px,transparent_1px,transparent_4px)]" />
    {/* Haz de luz que cruza en bucle */}
    <span aria-hidden className="tv-sweep pointer-events-none absolute inset-y-[-30%] -z-10 w-1/3
      bg-gradient-to-r from-transparent via-white/25 to-transparent blur-[6px]" />
    {/* Viñeta inferior para que el texto siempre tenga contraste */}
    <span aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/55 to-transparent" />

    {/* La ilustración: imagen subida por el admin, o la pareja dibujada.
        En ambos casos se apoya a la derecha y se funde hacia el texto. */}
    {hero ? (
      <>
      <img src={hero} alt="" loading="lazy"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 34%)',
          maskImage: 'linear-gradient(to right, transparent 0%, #000 34%)',
        }}
        className="pointer-events-none absolute -z-10 inset-y-0 right-0 h-full w-[58%] object-cover scale-[1.14]
          [object-position:56%_50%] transition-transform duration-700 group-hover:scale-[1.19] origin-right"
        onError={ev => { ev.currentTarget.style.display = 'none'; }} />
    {/* Velo superior: las maquetas subidas suelen traer su propio "Ver más"
        incrustado en la esquina. Esto lo tapa y da fondo al cintillo. */}
    <span aria-hidden className="pointer-events-none absolute -z-10 inset-x-0 top-0 h-[44%]
      bg-gradient-to-b from-black/95 via-black/60 to-transparent" />
      </>
    ) : (
      <DanceCoupleSilhouette
        className={`pointer-events-none absolute -z-10 bottom-0 w-auto transition-transform duration-700 group-hover:scale-[1.04]
          origin-bottom-right ${compact ? '-right-3 h-[168px]' : '-right-2 h-[196px]'}`} />
    )}

    {/* Ondas por encima de la ilustración: la señal en directo */}
    <LiveWaves />

    {/* Cintillo de canal */}
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
        <span className="relative flex w-1.5 h-1.5">
          <span className="tv-halo absolute inset-0 rounded-full bg-white/80" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
        </span>
        Canal BailaNow
      </span>
      <button onClick={() => navigate('/tv')}
        className="text-white/70 text-[11px] font-bold hover:text-white transition-colors">Ver más →</button>
    </div>

    {/* Logotipo: la chapa "TV" da identidad de marca sin necesitar imagen */}
    <div className={`flex items-center gap-2 ${compact ? 'mt-2.5' : 'mt-3'}`}>
      <h3 className={`font-display font-black text-white leading-none ${compact ? 'text-xl' : 'text-2xl'}`}>BailaNow</h3>
      <span className={`grid place-items-center rounded-md bg-white font-display font-black leading-none text-brand shadow-lg shadow-black/25
        ${compact ? 'px-1.5 py-1 text-[15px]' : 'px-2 py-1.5 text-lg'}`}>TV</span>
    </div>

    <p className={`text-white/75 leading-snug ${compact ? 'mt-1.5 text-[11px] max-w-[62%]' : 'mt-2 text-[12.5px] max-w-[58%]'}`}>
      Vídeos, entrevistas y lo mejor del mundo del baile
    </p>

    <div className={`mt-auto ${compact ? 'pt-4' : 'pt-5'}`}>
      <button onClick={onOpenTv}
        className={`relative inline-flex items-center gap-2 rounded-full bg-white pr-4 py-1.5 pl-1.5 font-black text-brand
          shadow-lg shadow-black/25 transition-transform hover:scale-[1.03] active:scale-95
          ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
        <span className={`grid place-items-center rounded-full bg-brand text-white ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
          <Play className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="currentColor" />
        </span>
        Ver ahora
      </button>
    </div>
  </div>
  );
};

// ── TARJETA DE RADIO ────────────────────────────────────────────────────────
// Hermana de la de TV: mismo lenguaje (chapa de marca, foco, CTA de play) pero
// con motivo propio — vinilo girando, ondas de emisión y ecualizador — y el
// foco entrando por la izquierda, para que juntas hagan pareja simétrica.
const RadioPromoCard: React.FC<{ onOpenRadio: () => void; navigate: any; compact?: boolean }> = ({ onOpenRadio, navigate, compact }) => {
  const hero = useSiteConfigStore(s => s.homeRadioHero);
  const heroFull = useSiteConfigStore(s => s.homeRadioHeroFull);
  const [station, setStation] = useState<{ name: string; genre: string | null; bitrate: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('radio_stations').select('name,genre,bitrate')
      .eq('status', 'active').order('sort_order', { ascending: true }).limit(1)
      .then(({ data }) => { if (!cancelled && data && data[0]) setStation(data[0] as any); }, () => {});
    return () => { cancelled = true; };
  }, []);

  // Solo se pinta lo que existe de verdad en `radio_stations`.
  const meta = [station?.genre && fixText(station.genre), station?.bitrate].filter(Boolean).join(' · ');

  if (hero && heroFull) return (
    <button onClick={onOpenRadio} aria-label="BailaNow FM — escuchar en directo"
      className={`card-float group relative block w-full overflow-hidden rounded-2xl bg-[#12010C]
        ${compact ? 'min-h-[210px]' : 'min-h-[236px]'}`}>
      <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover
        transition-transform duration-700 group-hover:scale-[1.03]" />
      <LiveWaves />
    </button>
  );

  return (
    <div className={`card-float group relative isolate flex flex-col overflow-hidden rounded-2xl bg-[#12010C]
      ${compact ? 'p-4 min-h-[210px]' : 'p-5 min-h-[236px]'}`}>
      {/* Foco desde la izquierda: espejo del de la tarjeta de TV */}
      <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_105%_at_0%_0%,#FF3D9A_0%,#D4106F_24%,#7A0A4C_52%,#2A0521_80%,#12010C_100%)]" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/55 to-transparent" />

      {/* Ilustración: imagen del admin, o el vinilo dibujado */}
      {hero ? (
        <>
        <img src={hero} alt="" loading="lazy"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 34%)',
            maskImage: 'linear-gradient(to right, transparent 0%, #000 34%)',
          }}
          className="pointer-events-none absolute -z-10 inset-y-0 right-0 h-full w-[58%] object-cover scale-[1.14]
            [object-position:56%_50%] transition-transform duration-700 group-hover:scale-[1.19] origin-right"
          onError={ev => { ev.currentTarget.style.display = 'none'; }} />
        {/* Velo superior: las maquetas subidas suelen traer su propio "Ver más"
            incrustado en la esquina. Esto lo tapa y da fondo al cintillo. */}
        <span aria-hidden className="pointer-events-none absolute -z-10 inset-x-0 top-0 h-[44%]
          bg-gradient-to-b from-black/95 via-black/60 to-transparent" />
        </>
      ) : (
        <span aria-hidden className={`pointer-events-none absolute -z-10 grid place-items-center
          ${compact ? '-right-8 top-1/2 -translate-y-1/2 w-40 h-40' : '-right-8 top-1/2 -translate-y-1/2 w-48 h-48'}`}>
          {/* Ondas de emisión */}
          <span className="radio-ripple absolute inset-0 rounded-full border-2 border-white/25" />
          <span className="radio-ripple absolute inset-0 rounded-full border-2 border-white/20" style={{ animationDelay: '1.6s' }} />
          {/* Vinilo */}
          <span className="radio-spin relative grid place-items-center w-[72%] h-[72%] rounded-full bg-black/45 border border-white/15">
            <span className="absolute inset-[12%] rounded-full border border-white/10" />
            <span className="absolute inset-[26%] rounded-full border border-white/10" />
            <span className="absolute inset-[40%] rounded-full border border-white/10" />
            <span className="w-[18%] h-[18%] rounded-full bg-white/85" />
            <span className="absolute w-[6%] h-[6%] rounded-full bg-[#12010C]" />
          </span>
        </span>
      )}

      {/* Ondas por encima de la ilustración: la señal en directo */}
      <LiveWaves />

      {/* Cintillo: en directo de verdad — la emisora está activa en la BD */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
          <span className="relative flex w-1.5 h-1.5">
            <span className="tv-halo absolute inset-0 rounded-full bg-white/80" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
          </span>
          En directo
        </span>
        <button onClick={() => navigate('/radio')}
          className="text-white/70 text-[11px] font-bold hover:text-white transition-colors">Ver más →</button>
      </div>

      <div className={`flex items-center gap-2 ${compact ? 'mt-2.5' : 'mt-3'}`}>
        <h3 className={`font-display font-black text-white leading-none ${compact ? 'text-xl' : 'text-2xl'}`}>BailaNow</h3>
        <span className={`grid place-items-center rounded-md bg-white font-display font-black leading-none text-brand shadow-lg shadow-black/25
          ${compact ? 'px-1.5 py-1 text-[15px]' : 'px-2 py-1.5 text-lg'}`}>FM</span>
      </div>

      <p className={`text-white/75 leading-snug ${compact ? 'mt-1.5 text-[11px] max-w-[62%]' : 'mt-2 text-[12.5px] max-w-[58%]'}`}>
        {station ? `${fixText(station.name)}${meta ? ` · ${meta}` : ''}` : 'Música latina sonando ahora mismo'}
      </p>

      <div className={`mt-auto flex items-center gap-3 ${compact ? 'pt-4' : 'pt-5'}`}>
        <button onClick={onOpenRadio}
          className={`relative inline-flex items-center gap-2 rounded-full bg-white pr-4 py-1.5 pl-1.5 font-black text-brand
            shadow-lg shadow-black/25 transition-transform hover:scale-[1.03] active:scale-95
            ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
          <span className={`grid place-items-center rounded-full bg-brand text-white ${compact ? 'w-6 h-6' : 'w-7 h-7'}`}>
            <Play className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="currentColor" />
          </span>
          Escuchar
        </button>
        {/* Ecualizador: decorativo, marca que hay señal */}
        <span aria-hidden className="flex items-end gap-[3px] h-5">
          {[0, 0.18, 0.36, 0.1, 0.28].map((d, i) => (
            <span key={i} className="radio-bar w-[3px] h-full rounded-full bg-white/55" style={{ animationDelay: `${d}s` }} />
          ))}
        </span>
      </div>
    </div>
  );
};

// ── TV + RADIO para móvil y tablet ──────────────────────────────────────────
// El raíl derecho es `hidden xl:flex`, así que por debajo de 1280px la TV y la
// radio se quedaban sin ningún acceso desde el Home. Esta tira los devuelve y
// se oculta en xl para no duplicar lo que ya muestra el raíl.
const TvRadioStrip: React.FC<{ navigate: any; onOpenTv: () => void; onOpenRadio: () => void }> = ({ navigate, onOpenTv, onOpenRadio }) => (
  <section className="xl:hidden mx-3 sm:mx-4 mt-8">
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className="w-1.5 h-5 rounded-full bg-brand" />
      <h2 className="font-display font-black text-lg text-ink-primary">En directo</h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TvPromoCard navigate={navigate} onOpenTv={onOpenTv} />
      <RadioPromoCard navigate={navigate} onOpenRadio={onOpenRadio} />
    </div>
  </section>
);

// ── SECCIONES DE DESCUBRIMIENTO (Fase 4) ──
const DiscoverySections: React.FC<{ navigate: any }> = ({ navigate }) => {

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
      <button onClick={onAll} className="text-brand hover:text-brand-orange-dark text-xs font-bold hover:underline">Ver todo →</button>
    </div>
  );

  return (
    <>
      {/* Clases Populares */}
      {clases.length > 0 && (
      <section className="mx-3 sm:mx-4 mt-8">
        <Header icon="🎓" title="Clases Populares" onAll={() => navigate('/clases')} />
        <HScroll>
          {clases.map(c => (
            <button key={c.id} onClick={() => navigate('/clases')} className={`${clases.length <= 3 ? 'tile-wide' : 'tile-2'} text-left group`}>
              <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
                {c.img ? (
                  <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-white/25" />
                )}
                <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/25">
                  <span className="w-11 h-11 rounded-full bg-white/90 grid place-items-center text-brand"><Play className="w-5 h-5" fill="currentColor" /></span>
                </span>
              </div>
              <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{c.title}</p>
              {c.meta && <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{c.meta}</p>}
            </button>
          ))}
          <SeeAllTile onClick={() => navigate('/clases')} className="tile-2 tile-cover" />
        </HScroll>
      </section>
      )}

      {/* Profesores Destacados */}
      {teachers.length > 0 && (
      <section className="mx-3 sm:mx-4 mt-8">
        <Header icon="⭐" title="Profesores Destacados" onAll={() => navigate('/artistas')} />
        <HScroll>
          {teachers.map(t => (
            <button key={t.id} onClick={() => navigate(`/artistas/${t.id}`)} className="tile-2 text-left group">
              <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand to-brand-secondary grid place-items-center">
                <span className="text-white font-black text-3xl">{t.name?.[0] || '?'}</span>
                <img src={t.avatar} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Disponible" />
                {t.rating > 0 && (
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{t.rating}
                  </span>
                )}
              </div>
              <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{t.name}</p>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{t.genre.slice(0, 2).join(' · ')}</p>
            </button>
          ))}
          <SeeAllTile onClick={() => navigate('/artistas')} className="tile-2 tile-cover" />
        </HScroll>
      </section>
      )}

      {/* Trabajos para Bailarines (CTA) */}
      <section className="mx-3 sm:mx-4 mt-8">
        <button onClick={() => navigate('/promocionate')}
          className="card-float relative w-full overflow-hidden rounded-3xl p-6 sm:p-8 text-left text-white bg-gradient-to-br from-gray-900 via-brand-deep to-black">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand/30 rounded-full blur-3xl pointer-events-none" />
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
  // Portada del hero: la primera imagen del slider que gestiona el admin
  // (Admin → Diseño). Es contenido configurable real, no una foto inventada.
  const cityCounts = useCityCounts();
  const heroSliderImages = useSiteConfigStore(s => s.heroSliderImages);
  const heroImage = heroSliderImages?.[0]?.url || '';

  // Métricas del hero — conteos reales del catálogo, no cifras de marketing.
  // Si una está a 0 no se pinta, para no enseñar un contador vacío.
  const [catalogCounts, setCatalogCounts] = useState({ venues: 0, events: 0, artists: 0, cities: 0, clases: 0 });
  useEffect(() => {
    let cancelled = false;
    const head = { count: 'exact' as const, head: true };
    Promise.all([
      supabase.from('venues').select('*', head).is('deleted_at', null),
      supabase.from('events').select('*', head).is('deleted_at', null),
      supabase.from('artists').select('*', head),
      supabase.from('cities').select('*', head),
      supabase.from('class_offerings').select('*', head).eq('status', 'active'),
    ]).then(([v, e, a, c, cl]) => {
      if (cancelled) return;
      setCatalogCounts({
        venues: v.count || 0, events: e.count || 0, artists: a.count || 0,
        cities: c.count || 0, clases: cl.count || 0,
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const heroStats: { label: string; val: number; icon: React.FC<any> }[] = [
    { label: 'Locales',   val: catalogCounts.venues,  icon: Building2 },
    { label: 'Eventos',   val: catalogCounts.events,  icon: Calendar },
    { label: 'Artistas',  val: catalogCounts.artists, icon: Music2 },
    { label: 'Ciudades',  val: catalogCounts.cities,  icon: MapPin },
    { label: 'Clases',    val: catalogCounts.clases,  icon: GraduationCap },
  ];
  const heroHasVideoFile = heroMedia.type === 'video' && !!heroMedia.url;
  const cmsModules = useCMSStore(s => s.modules);
  const cmsCategories = useCMSStore(s => s.categories);
  const enabled = visibleHomeModules(cmsModules);
  const isModuleOn = (type: string) => enabled.some(m => m.type === type);
  const dynamicCats = activeCategories(cmsCategories);
  const { balanceFor, offers, classes, transactions, withdrawals, platformTotals } = usePerformerStore();
  const PERFORMER_ROLES = ['artist', 'musician', 'band', 'dj', 'dancer', 'animador', 'venue', 'instructor', 'business', 'promoter'];
  const isAdmin = isAdminUser(user);
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
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

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
      } catch { /* sin conexión: la sección no se pinta, en vez de enseñar ejemplos falsos */ }
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
    <div className="relative isolate min-h-screen dark:bg-transparent dark:text-gray-100 transition-colors duration-300">

      {/* Fondo flotante decorativo en toda la home */}
      <HomeBackground />

      {/* Dos columnas en pantallas anchas: contenido + raíl derecho.
          Por debajo de xl el raíl se oculta y el contenido ocupa todo. */}
      <div className="xl:flex xl:gap-4 xl:items-start xl:pr-4">
      <div className="min-w-0 flex-1">

      {/* ── HERO PRINCIPAL — panel claro, mensaje a la izquierda y foto a la derecha.
             Las métricas viven dentro del propio hero, como en la referencia. ── */}
      <section className="mx-3 sm:mx-4 mt-4">
        <div className="card-float relative overflow-hidden rounded-3xl bg-surface-elevated">
          <div className="relative flex items-stretch">
            <div className="relative z-10 p-5 sm:p-8 flex-1 min-w-0">
              <p className="font-display font-black text-sm sm:text-base tracking-tight">
                <span className="text-brand">VIVE.</span> <span className="text-ink-primary">CONECTA.</span> <span className="text-brand">BAILA.</span>
              </p>
              <h1 className="font-display font-black text-2xl sm:text-4xl text-ink-primary leading-[1.1] mt-1">
                Todo el baile latino,<br />
                <span className="text-brand">en un solo lugar</span>
              </h1>

              {/* Métricas reales del catálogo — se ocultan solas si están a 0 */}
              <div className="flex flex-wrap gap-x-5 gap-y-3 mt-5">
                {heroStats.filter(m => m.val > 0).map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-accent/10 grid place-items-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-accent" />
                      </span>
                      <span>
                        <span className="block font-display font-black text-base text-ink-primary leading-none">{m.val}</span>
                        <span className="block text-[10px] text-ink-tertiary leading-tight mt-0.5">{m.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                {HERO_ACTIONS.map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.to} onClick={() => navigate(a.to)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-extrabold transition-all ${
                        a.primary
                          ? 'bg-accent text-white hover:bg-brand-pink-dark shadow-elevation-2'
                          : 'bg-surface-elevated text-ink-primary border border-hairline/15 hover:border-accent/40 shadow-elevation-1'
                      }`}>
                      <Icon className="w-4 h-4" /> {a.label}
                    </button>
                  );
                })}
              </div>

              {/* En móvil no hay columna derecha: el vídeo va debajo del texto,
                  a lo ancho y con proporción fija para que la página no salte. */}
              <div className="md:hidden relative w-full mt-5 rounded-2xl overflow-hidden aspect-[16/10] bg-brand-deep">
                {heroImage && (
                  <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                )}
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={HERO_VIDEO}
                  poster={heroImage || undefined}
                  autoPlay muted loop playsInline preload="metadata"
                  aria-hidden
                  onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Vídeo a la derecha. En escritorio va dentro de la fila, con el
                mismo difuminado que tenía la foto para que no haya corte duro.
                La foto queda debajo como cartel: se ve mientras el vídeo carga
                y es lo que queda si el vídeo falla o el navegador no lo permite. */}
            <div className="hidden md:block relative w-[42%] flex-shrink-0">
              {heroImage && (
                <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={HERO_VIDEO}
                poster={heroImage || undefined}
                autoPlay muted loop playsInline preload="metadata"
                aria-hidden
                onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-elevated via-surface-elevated/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── TV + RADIO (solo por debajo de xl: en xl ya viven en el raíl) —
             van pegados al hero para igualar la jerarquía del escritorio, donde
             encabezan el raíl. ── */}
      <TvRadioStrip navigate={navigate} onOpenTv={() => setTvWidgetOpen(true)} onOpenRadio={() => setRadioWidgetOpen(true)} />

      {/* ── LOCALES — el inventario con más volumen (139). En un marketplace lo
             primero que ve el usuario tras el hero es el catálogo, no una funcionalidad. ── */}
      <VenuesHomeRow navigate={navigate} />

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
            <HScroll>
              {filtered.slice(0, 12).map(event => (
                <div key={event.id} className="tile-2">
                  <EventCard event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
                </div>
              ))}
              {filtered.length > 0 && <SeeAllTile onClick={() => navigate('/eventos')} className="tile-2 tile-cover" />}
              {searchQ && filtered.length === 0 && (
                <div className="w-full text-center py-8">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-white/80 text-sm">No encontramos eventos para "{searchQ}"</p>
                </div>
              )}
            </HScroll>
          );
        }}
      </HomeSectionWithSearch>
      )}

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

      {/* ── COMUNIDAD — 102 posts reales que se cargaban y no se pintaban nunca ── */}
      {communityPosts.length > 0 && (
        <section className="mx-3 sm:mx-4 mt-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display font-black text-lg text-ink-primary flex items-center gap-2">💬 La comunidad pregunta</h2>
            <button onClick={() => navigate('/comunidad')} className="text-brand hover:text-brand-orange-dark text-xs font-bold hover:underline">Ver todo →</button>
          </div>
          <HScroll>
            {communityPosts.slice(0, 10).map(post => (
              <button key={post.id} onClick={() => navigate(`/comunidad?post=${post.id}`)}
                className="card-float tile-2 bg-surface-elevated rounded-2xl p-3.5 text-left flex flex-col gap-2 hover:bg-surface transition-colors">
                <span className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-accent/10 grid place-items-center text-accent font-black text-xs flex-shrink-0">
                    {(post.user || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold text-ink-primary truncate">{fixText(post.user || '')}</span>
                    {post.location && <span className="block text-[10px] text-ink-tertiary truncate">📍 {fixText(post.location)}</span>}
                  </span>
                </span>
                <span className="text-[12px] text-ink-secondary leading-snug line-clamp-4 flex-1">{fixText(post.fullText || '')}</span>
                <span className="text-[10px] font-black uppercase tracking-wide text-accent">Responder →</span>
              </button>
            ))}
            <SeeAllTile onClick={() => navigate('/comunidad')} className="tile-2" />
          </HScroll>
        </section>
      )}

      {/* ── PARTNER DE CIUDAD + módulos que no se enlazaban desde el Home ── */}
      <PartnerCitySection navigate={navigate} />

      {/* Elemento de audio real para la radio en vivo */}
      <audio ref={audioRef} className="hidden" preload="none" />

      {/* ── PERSISTENT MINI PLAYER (when playing) ── */}
      {playing !== null && playing < 100 && radioStations[playing] && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-brand/20 px-4 py-2 flex items-center gap-3 backdrop-blur-xl shadow-2xl">
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
              className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand transition-all shadow-lg shadow-brand/30">
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
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-brand-secondary/20 rounded-full blur-3xl" />
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
                <Users className="w-4 h-4 text-fuchsia-400 mb-1" />
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

      {/* ── FILA 3 COLUMNAS: Eventos destacados · Artistas recomendados · BailaNow TV ── */}
      <FeaturedTripleRow navigate={navigate} />

      {/* ── SECCIONES DE DESCUBRIMIENTO (Clases, Profesores, Trabajos) ── */}
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
          // Solo ciudades con contenido real, ordenadas por volumen. Antes se
          // mostraban las 9 primeras del array fijo, tuvieran datos o no.
          const norm = (c: string) => c.split(/[,\-\/(]/)[0].trim().toLowerCase();
          const withData = CITIES
            .map(c => ({ ...c, real: cityCounts[norm(c.name)] || { venues: 0, events: 0 } }))
            .filter(c => c.real.venues + c.real.events > 0)
            .sort((a, b) => (b.real.venues + b.real.events) - (a.real.venues + a.real.events));
          const filtered = searchQ
            ? withData.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()))
            : withData.slice(0, 12);
          return (
            <HScroll>
              {filtered.map(city => (
                <button key={city.name} onClick={() => navigate(`/venues?city=${city.name}`)} className="tile-2 text-left group">
                  <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
                    <img src={city.img} alt={city.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm grid place-items-center text-lg">{city.monument}</span>
                    <span className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black text-center py-1 rounded-md">
                      {[
                        city.real.venues > 0 ? `${city.real.venues} ${city.real.venues === 1 ? 'local' : 'locales'}` : '',
                        city.real.events > 0 ? `${city.real.events} ${city.real.events === 1 ? 'evento' : 'eventos'}` : '',
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{city.name}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{city.landmark}</p>
                </button>
              ))}
              <SeeAllTile onClick={() => navigate('/venues')} className="tile-2 tile-cover" />
            </HScroll>
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
            <HScroll>
              {filtered.slice(0, 12).map(artist => (
                <div key={artist.id} className="tile-2">
                  <ArtistCard artist={artist} onClick={() => navigate(`/artistas/${artist.id}`)} />
                </div>
              ))}
              {filtered.length > 0 && <SeeAllTile onClick={() => navigate('/artistas')} className="tile-2 tile-cover" />}
              {searchQ && filtered.length === 0 && (
                <div className="w-full text-center py-8">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-white/80 text-sm">No encontramos artistas para "{searchQ}"</p>
                </div>
              )}
            </HScroll>
          );
        }}
      </HomeSectionWithSearch>
      )}

      {/* ── PATROCINADORES (pie de página) ── */}
      <SponsorsFooterStrip navigate={navigate} />

      </div>{/* /columna de contenido */}

      <div className="xl:sticky xl:top-16">
        <HomeSideRail navigate={navigate} onOpenTv={() => setTvWidgetOpen(true)} onOpenRadio={() => setRadioWidgetOpen(true)} />
      </div>
      </div>{/* /layout de 2 columnas */}

      {/* ── NEWSLETTER (al final, debajo de patrocinadores) ── */}
      <section className="mx-3 sm:mx-4 mt-6">
        <NewsletterForm variant="banner" />
      </section>

      {/* ── FOOTER LEGAL ── */}
      <footer className="mt-10 mx-4 mb-4 pb-2 border-t border-gray-200 dark:border-gray-800 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm text-gray-900 dark:text-white">Baila</span>
            <span className="font-display font-black text-sm text-brand">Now</span>
            <span className="text-gray-400 text-xs ml-1">© 2025</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <a href="/legal/terminos" className="hover:text-brand transition-colors">Términos</a>
            <a href="/legal/privacidad" className="hover:text-brand transition-colors">Privacidad</a>
            <a href="/legal/cookies" className="hover:text-brand transition-colors">Cookies</a>
            <button onClick={() => window.dispatchEvent(new Event('bn:open-cookie-settings'))} className="hover:text-brand transition-colors">Gestionar cookies</button>
            <a href="/legal/aviso" className="hover:text-brand transition-colors">Aviso Legal</a>
            <a href="/legal/reembolsos" className="hover:text-brand transition-colors">Reembolsos</a>
            <a href="/legal/vendedores" className="hover:text-brand transition-colors">Vendedores</a>
            <a href="/legal/conducta" className="hover:text-brand transition-colors">Conducta</a>
            <a href="mailto:hola@bailanow.com" className="hover:text-brand transition-colors">Contacto</a>
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

// ── LOCALES (venues) — el mayor inventario de la plataforma (139 filas) y no
// tenía sección propia en el Home: solo salía como pestaña dentro de Planes de
// baile. En un marketplace el inventario manda, así que sube al principio. ──
const VenuesHomeRow: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from('venues')
      .select('id,name,city,cover,image_url,avatar,rating,reviews,type,is_premium')
      .is('deleted_at', null)
      .order('is_premium', { ascending: false })
      .order('rating', { ascending: false })
      .limit(12)
      .then(({ data }) => { if (!cancelled) { setRows(data || []); setLoading(false); } },
            () => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && rows.length === 0) return null;

  return (
    <section className="mx-3 sm:mx-4 mt-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-display font-black text-lg text-ink-primary flex items-center gap-2">🏠 Locales para bailar</h2>
        <button onClick={() => navigate('/venues')} className="text-brand hover:text-brand-orange-dark text-xs font-bold hover:underline">Ver todos →</button>
      </div>
      {loading ? (
        <div className="flex gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="tile-2"><Skeleton className="tile-cover rounded-2xl" /></div>)}</div>
      ) : (
        <HScroll>
          {rows.map(v => (
            <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)} className="tile-2 text-left group">
              <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
                <AppImage src={v.cover || v.image_url || v.avatar || ''} alt={v.name} fallback="landscape"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {v.is_premium && (
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">👑 PRO</span>
                )}
                {Number(v.rating) > 0 && (
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{Number(v.rating).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-ink-primary font-black text-[13px] uppercase leading-tight truncate">{fixText(v.name)}</p>
              <p className="text-ink-tertiary text-[11px] leading-tight truncate capitalize">
                {[fixText(v.city || ''), v.type].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}
          <SeeAllTile onClick={() => navigate('/venues')} className="tile-2 tile-cover" />
        </HScroll>
      )}
    </section>
  );
};

// ── PARTNER DE CIUDAD + MÓDULOS SIN ENLAZAR ──
// La funcionalidad de partner existe entera (/partner/aplicar, panel, políticas)
// pero no se enlazaba desde ninguna parte del Home: de ahí 0 solicitudes.
// Lo mismo con Retos, DanceFlow, Marketplace, Comunidad y el Mapa.
const PARTNER_LINKS: { label: string; desc: string; to: string; icon: string }[] = [
  { label: 'Comunidad',   desc: 'Ofertas, demandas y anuncios', to: '/comunidad',   icon: '💬' },
  { label: 'Marketplace', desc: 'Servicios para bailarines',    to: '/marketplace', icon: '🛍️' },
  { label: 'Retos',       desc: 'Compite y sube en el ranking', to: '/retos',       icon: '🏆' },
  { label: 'DanceFlow IA',desc: 'Entrena con tu cámara',        to: '/danceflow',   icon: '🤖' },
];

// ── FONDO DEL BANNER DE PARTNERS ────────────────────────────────────────────
// Mundo de puntos, chinchetas con halo y arcos que las unen. Todo SVG: ni una
// imagen, escala sin pixelarse y no añade peticiones de red.
const WorldMapBackdrop: React.FC = () => {
  const puntos = React.useMemo(() => {
    // Rejilla de puntos recortada con una silueta muy libre de los continentes.
    // Determinista: mismas coordenadas en cada render, sin Math.random.
    const masas: [number, number, number, number][] = [
      [46, 26, 108, 60], [58, 86, 88, 74],      // América
      [176, 22, 96, 44], [186, 66, 74, 88],     // Europa y África
      [286, 26, 150, 76], [352, 104, 56, 34],   // Asia y Oceanía
    ];
    const out: { x: number; y: number; o: number }[] = [];
    for (const [mx, my, mw, mh] of masas) {
      for (let x = mx; x < mx + mw; x += 7) {
        for (let y = my; y < my + mh; y += 7) {
          // Borde irregular a partir de una función periódica, no aleatoria
          const borde = Math.sin(x * 0.09) * 6 + Math.cos(y * 0.11) * 5;
          if (x > mx + 4 + borde && x < mx + mw - 4 - borde && y > my + 3 && y < my + mh - 3) {
            out.push({ x, y, o: 0.10 + ((x + y) % 5) * 0.035 });
          }
        }
      }
    }
    return out;
  }, []);

  const pines: { x: number; y: number; r: number }[] = [
    { x: 96, y: 62, r: 1 }, { x: 214, y: 96, r: 1.55 },
    { x: 268, y: 118, r: 0.85 }, { x: 330, y: 104, r: 1.15 }, { x: 392, y: 88, r: 1 },
  ];

  return (
    <svg aria-hidden viewBox="0 0 460 200" preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 w-full h-full">
      <g fill="#FF3D9A">
        {puntos.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.15" opacity={p.o} />)}
      </g>
      {/* Arcos entre chinchetas */}
      <g fill="none" stroke="#FF3D9A" strokeOpacity="0.5" strokeWidth="0.9">
        <path d="M96 62 Q160 34 214 96" />
        <path d="M214 96 Q250 62 330 104" />
        <path d="M214 96 Q244 132 268 118" />
        <path d="M330 104 Q364 68 392 88" />
      </g>
      {pines.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.r})`}>
          <ellipse cx="0" cy="7" rx="9" ry="3" fill="#FF3D9A" opacity="0.18" />
          <ellipse cx="0" cy="7" rx="5" ry="1.7" fill="#FF3D9A" opacity="0.3" />
          <path d="M0 7 C-5 0 -6.5 -4 -4.4 -7.2 C-2.3 -10.4 2.3 -10.4 4.4 -7.2 C6.5 -4 5 0 0 7 Z" fill="#FF3D9A" />
          <circle cx="0" cy="-6" r="2.1" fill="#0E0418" />
        </g>
      ))}
    </svg>
  );
};

// ── CIFRAS DEL PROGRAMA DE PARTNERS ─────────────────────────────────────────
// Todas salen de consultas reales. Las que dan cero no se pintan: en un banner
// de captación, un contador inflado es una afirmación falsa sobre el negocio.
const PartnerStatsBar: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [stats, setStats] = useState<{ partners: number; ciudades: number; eventos: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pt, ev, vn] = await Promise.all([
        supabase.from('partners').select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('events').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('venues').select('city').is('deleted_at', null).limit(2000),
      ]);
      if (cancelled) return;
      const ciudades = new Set(
        (vn.data || []).map((v: any) => String(v.city || '').trim().toLowerCase()).filter(Boolean)
      ).size;
      setStats({ partners: pt.count || 0, eventos: ev.count || 0, ciudades });
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const items = [
    { icon: Users,    valor: stats?.partners, label: 'Partners activos' },
    { icon: MapPin,   valor: stats?.ciudades, label: 'Ciudades' },
    { icon: Calendar, valor: stats?.eventos,  label: 'Eventos publicados' },
  ].filter(i => (i.valor ?? 0) > 0);

  return (
    <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4 rounded-2xl
      border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-3">
          <i.icon className="w-6 h-6 text-brand flex-shrink-0" />
          <span className="min-w-0">
            <span className="block font-display font-black text-xl sm:text-2xl leading-none">
              {i.valor!.toLocaleString('es-ES')}
            </span>
            <span className="block text-white/55 text-[12px] leading-tight">{i.label}</span>
          </span>
        </div>
      ))}
      {/* Esto no es un dato: es la propuesta. Va siempre. */}
      <button onClick={() => navigate('/partner/aplicar')} className="flex items-center gap-3 text-left">
        <TrendingUp className="w-6 h-6 text-brand flex-shrink-0" />
        <span className="min-w-0">
          <span className="block font-bold text-[14px] leading-tight">Gana comisiones</span>
          <span className="block text-white/55 text-[12px] leading-tight">por cada reserva</span>
        </span>
      </button>
    </div>
  );
};

const PartnerCitySection: React.FC<{ navigate: any }> = ({ navigate }) => {
  const hero = useSiteConfigStore(s => s.homePartnerHero);
  const heroFull = useSiteConfigStore(s => s.homePartnerHeroFull);
  return (
  <section className="mx-3 sm:mx-4 mt-8">
    {/* Banner del programa de partners. Si hay una maqueta subida desde el
        admin que ya trae título y botón, se usa a sangre y no se pinta el
        texto propio, para que no salga duplicado. */}
    {hero && heroFull ? (
      <button onClick={() => navigate('/partner/aplicar')}
        aria-label="Sé el partner de BailaNow en tu ciudad — quiero ser partner"
        className="card-float group relative block w-full overflow-hidden rounded-3xl bg-brand-deep">
        <img src={hero} alt="" className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]"
          onError={ev => { ev.currentTarget.style.display = 'none'; }} />
      </button>
    ) : (
    <div className="card-float relative overflow-hidden rounded-3xl bg-[#0E0418] text-white ring-1 ring-brand/50">
      {/* Fondo: mundo de puntos con chinchetas y arcos, dibujado en SVG */}
      <WorldMapBackdrop />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0E0418] via-[#0E0418]/85 to-transparent" />

      <div className="relative p-5 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/70 px-3.5 py-1.5
          text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-white/90">
          <Handshake className="w-4 h-4 text-brand" /> Programa de partners
        </span>

        <h2 className="font-display font-black text-3xl sm:text-5xl mt-4 leading-[1.05] max-w-[16ch]">
          Sé el partner de<br />
          <span className="text-white">Baila</span><span className="text-brand">Now</span><br />
          en tu ciudad
        </h2>

        <p className="text-white/70 mt-4 text-sm sm:text-base leading-relaxed max-w-[38ch] text-balance">
          Represéntanos en tu zona, gestiona locales y eventos, y gana comisiones por cada reserva.
        </p>

        <button onClick={() => navigate('/partner/aplicar')}
          className="mt-6 inline-flex items-center gap-3 rounded-full px-7 py-3.5 font-black text-white
            bg-gradient-to-r from-brand to-brand-secondary shadow-lg shadow-brand/30
            transition-transform hover:scale-[1.03] active:scale-95">
          Quiero ser partner <ArrowRight className="w-5 h-5" />
        </button>

        <PartnerStatsBar navigate={navigate} />
      </div>
    </div>
    )}

    {/* Accesos a los módulos que ya existían pero no se veían desde el Home */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-3">
      {PARTNER_LINKS.map(l => (
        <button key={l.to} onClick={() => navigate(l.to)}
          className="card-float bg-surface-elevated rounded-2xl p-3 flex items-center gap-3 text-left hover:bg-surface transition-colors">
          <span className="w-10 h-10 rounded-xl bg-accent/10 grid place-items-center text-lg flex-shrink-0">{l.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-ink-primary leading-tight truncate">{l.label}</span>
            <span className="block text-[11px] text-ink-tertiary leading-tight truncate">{l.desc}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-ink-tertiary flex-shrink-0" />
        </button>
      ))}
    </div>
  </section>
  );
};

// ── RAÍL DERECHO (solo escritorio) — accesos al mapa real y a BailaNow TV.
// No incluye el panel de "Alertas activas" de la referencia: hoy no existe un
// sistema de alertas configurable en la BD, y no se pinta lo que no hay. ──
const HomeSideRail: React.FC<{ navigate: any; onOpenTv: () => void; onOpenRadio: () => void }> = ({ navigate, onOpenTv, onOpenRadio }) => {
  const [near, setNear] = useState<any[]>([]);

  // Locales reales, ordenados por valoración. Si el usuario ya concedió la
  // ubicación se muestra la distancia; si no, la ciudad.
  const [pos, setPos] = useState<LatLng | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.from('venues')
      .select('id,name,city,lat,lng,cover,image_url,avatar,open_time,close_time,is_open')
      .is('deleted_at', null).order('rating', { ascending: false }).limit(6)
      .then(({ data }) => { if (!cancelled) setNear(data || []); }, () => {});
    if (navigator.geolocation && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(r => {
          if (cancelled || r.state !== 'granted') return;
          navigator.geolocation.getCurrentPosition(
            g => { if (!cancelled) setPos({ lat: g.coords.latitude, lng: g.coords.longitude }); },
            () => {}, { maximumAge: 300000, timeout: 8000 });
        }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, []);

  const openNow = (v: any) => {
    if (v.is_open === true) return true;
    if (!v.open_time || !v.close_time) return false;
    const toMin = (x: string) => { const [h, m] = String(x).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const o = toMin(v.open_time), c = toMin(v.close_time);
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    return c > o ? (cur >= o && cur <= c) : (cur >= o || cur <= c);
  };
  const distOf = (v: any) => {
    if (!pos) return null;
    const pt = pointFor(v);
    return pt ? distanceKm(pos, pt) : null;
  };

  return (
  <aside className="hidden xl:flex xl:flex-col gap-4 w-[300px] flex-shrink-0">
    {/* BailaNow TV */}
    <TvPromoCard navigate={navigate} onOpenTv={onOpenTv} compact />

    {/* Radio — sale del sitio de honor del hero a un widget compacto */}
    <RadioPromoCard navigate={navigate} onOpenRadio={onOpenRadio} compact />

    {/* Cerca de ti — mapa compacto + lista de locales reales */}
    {near.length > 0 && (
      <div className="card-float bg-surface-elevated rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <h3 className="font-display font-black text-sm text-ink-primary">Cerca de ti</h3>
          <button onClick={() => navigate('/cerca')} className="text-accent text-[11px] font-bold hover:underline">Ver mapa →</button>
        </div>
        <div className="px-2 pb-2 space-y-1">
          {near.slice(0, 4).map(v => {
            const d = distOf(v);
            const abierto = openNow(v);
            return (
              <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface transition-colors text-left">
                <span className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-brand-deep">
                  <AppImage src={v.cover || v.image_url || v.avatar || ''} alt={v.name} fallback="square" className="w-full h-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-ink-primary truncate">{fixText(v.name)}</span>
                  <span className="block text-[10px] text-ink-tertiary truncate">
                    {d !== null ? (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`) : fixText(v.city || '')}
                  </span>
                </span>
                {abierto && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">ABIERTO</span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => navigate('/venues')} className="w-full text-accent text-[11px] font-black py-2.5 border-t border-hairline/10 hover:bg-surface transition-colors">
          Ver más lugares →
        </button>
      </div>
    )}
  </aside>
  );
};

// ── ARTIST CARD ─────────────────────────────────────────────────────────────
const ArtistCard: React.FC<{ artist: typeof ARTISTS[0]; onClick: () => void }> = ({ artist, onClick }) => (
  <div onClick={onClick} className="cursor-pointer group text-left">
    <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
      <img src={artist.cover} alt={artist.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      {artist.isPremium && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wide">DESTACADO</span>
      )}
      {artist.rating > 0 && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{artist.rating}
        </span>
      )}
    </div>
    <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{artist.name}</p>
    <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{artist.city}</p>
  </div>
);

// ── EVENT CARD ──────────────────────────────────────────────────────────────
const EventCard: React.FC<{ event: typeof EVENTS[0]; onClick: () => void }> = ({ event, onClick }) => {
  const d = new Date(event.date);
  const day = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' }).toUpperCase();

  return (
    <div onClick={onClick} className="cursor-pointer group text-left">
      <div className="card-float tile-cover relative rounded-2xl overflow-hidden bg-brand-deep">
        <img src={event.cover} alt={event.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {event.isFeatured && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">DESTACADO</span>
        )}
        <span className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[11px] font-black text-center py-1 rounded-md">
          {day} {event.price === 0 ? '· GRATIS' : `· €${event.price}`}
        </span>
      </div>
      <p className="mt-2 text-gray-900 dark:text-white font-black text-[13px] uppercase leading-tight truncate">{event.title}</p>
      <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-tight truncate">{event.venueName || event.city}</p>
    </div>
  );
};

export default HomePage;
