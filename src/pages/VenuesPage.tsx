import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Users, Clock, CheckCircle, Star, MessageSquare, Bell, Heart, Share2, Calendar, Music2, Instagram, Youtube, Facebook, Globe, Headphones, Video } from 'lucide-react';
import { VENUES } from '../data/mockData';
import type { Venue } from '../data/mockData';
import { Badge, StarRating, SearchBar, FilterChips, EmptyState, Button, Avatar } from '../components/ui';
import { useAuthStore, useUIStore, getYouTubeId } from '../store/appStore';
import BookingModal from '../components/BookingModal';

const TYPES = ['Todos', 'Club', 'Bar', 'Studio', 'Rooftop', 'Lounge', 'Restaurante'];
const CITIES = ['Todas', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Paris', 'London', 'Santo Domingo', 'Buenos Aires', 'Cali', 'Miami', 'La Habana', 'Bogotá', 'Medellín', 'New York', 'Berlin', 'Ciudad de México', 'Caracas'];

const VenuesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Si hay :id, delegamos en el detalle (componente separado para que cada uno
  // mantenga su propio set estable de hooks — evita React error #300)
  if (id) return <VenueDetail venueId={id} />;
  return <VenuesList />;
};

const VenuesList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const filtered = useMemo(() => {
    return VENUES.filter(v => {
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase());
      const matchType = selectedType.includes('Todos') || selectedType.some(t => v.type === t.toLowerCase());
      const matchCity = selectedCity.includes('Todas') || selectedCity.includes(v.city);
      const matchOpen = !onlyOpen || v.isOpen;
      return matchSearch && matchType && matchCity && matchOpen;
    });
  }, [search, selectedType, selectedCity, onlyOpen]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 mb-1">🏛️ Venues</h1>
          <p className="text-gray-400">Clubs, estudios y espacios de entretenimiento latino</p>
        </div>

        <SearchBar placeholder="Buscar venues, ciudades..." value={search} onChange={setSearch} />

        <div className="mt-4 space-y-3">
          <FilterChips options={TYPES} selected={selectedType} onChange={setSelectedType} />
          <FilterChips options={CITIES} selected={selectedCity} onChange={setSelectedCity} />
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyOpen ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500 hover:text-emerald-600'}`}
          >
            🟢 Solo abiertos ahora
          </button>
        </div>

        <div className="mt-6">
          <p className="text-gray-400 text-sm mb-4">{filtered.length} venues</p>
          {filtered.length === 0 ? (
            <EmptyState icon="🏛️" title="No hay venues" description="Intenta con otros filtros" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map(venue => (
                <VenueCard key={venue.id} venue={venue} onClick={() => navigate(`/venues/${venue.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VenueCard: React.FC<{ venue: Venue; onClick: () => void }> = ({ venue, onClick }) => (
  <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300">
    <div className="relative h-44 overflow-hidden">
      <img src={venue.cover} alt={venue.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <Badge variant={venue.isOpen ? 'green' : 'gray'} className="absolute top-2 right-2">
        {venue.isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
      </Badge>
      {venue.isPremium && <Badge variant="orange" className="absolute top-2 left-2">👑 Premium</Badge>}
      <div className="absolute bottom-2 left-2">
        <span className="bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-lg capitalize font-medium">{venue.type}</span>
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-gray-900 font-semibold line-clamp-1">{venue.name}</h3>
      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
        <MapPin className="w-3 h-3" /> {venue.city}
        <span className="mx-1">·</span>
        {'€'.repeat(venue.priceRange)}
      </div>
      <StarRating rating={venue.rating} count={venue.reviews} className="mt-2" />
      <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {venue.openHours}
      </p>
    </div>
  </div>
);

/* ── Venue social data (mock) ── */
const VENUE_SOCIALS: Record<string, Record<string, string>> = {
  v1: { instagram: 'clubtropicana_madrid', facebook: 'ClubTropicanaMadrid', youtube: 'ClubTropicana' },
  v2: { instagram: 'lasalalatina', tiktok: 'lasalalatina', facebook: 'LaSalaLatinaBCN' },
  v3: { instagram: 'studiolatinobcn', youtube: 'StudioLatinoBCN' },
  v4: { instagram: 'rooftop360sevilla', facebook: 'Rooftop360' },
  v5: { instagram: 'parcforum_events', youtube: 'ParcForumEvents', facebook: 'ParcForum' },
  v6: { instagram: 'azucarclubvlc', tiktok: 'azucarclub', facebook: 'AzucarClubValencia' },
  v7: { instagram: 'laclaveparis', youtube: 'LaClaveParis', facebook: 'LaClaveClubParis' },
};

const VENUE_VIDEOS: Record<string, { url: string; title: string }> = {
  v1: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Noche de Bachata — Club Tropicana Madrid' },
  v2: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Salsa Social Night — La Sala Latina BCN' },
  v3: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Workshop Bachata Sensual — Studio Latino' },
  v4: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Sunset Salsa Party — Rooftop 360 Sevilla' },
  v5: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Festival Latino 2026 — Parc del Fòrum' },
  v6: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Reggaeton Night — Azúcar Club Valencia' },
  v7: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Latin Groove Friday — La Clave Paris' },
};

const SOCIAL_COLORS: Record<string, string> = {
  instagram:  'from-purple-500 to-pink-500',
  youtube:    'from-red-500 to-red-600',
  facebook:   'from-blue-500 to-blue-700',
  spotify:    'from-green-500 to-green-600',
  soundcloud: 'from-pink-500 to-pink-600',
  tiktok:     'from-gray-900 to-pink-500',
  twitch:     'from-purple-600 to-purple-800',
};

const SocialIcon: React.FC<{ kind: string }> = ({ kind }) => {
  switch (kind) {
    case 'instagram':  return <Instagram className="w-5 h-5" />;
    case 'youtube':    return <Youtube className="w-5 h-5" />;
    case 'facebook':   return <Facebook className="w-5 h-5" />;
    case 'spotify':    return <Music2 className="w-5 h-5" />;
    case 'soundcloud': return <Headphones className="w-5 h-5" />;
    case 'tiktok':     return <span className="text-base font-black">♪</span>;
    case 'twitch':     return <Video className="w-5 h-5" />;
    default:           return <Globe className="w-5 h-5" />;
  }
};

const VENUE_TABS = [
  { id: 'about' as const,   label: 'Sobre el local', icon: '📍' },
  { id: 'events' as const,  label: 'Eventos',        icon: '📅' },
  { id: 'gallery' as const, label: 'Galería',        icon: '📸' },
  { id: 'reviews' as const, label: 'Reseñas',        icon: '⭐' },
];

const VenueDetail: React.FC<{ venueId: string }> = ({ venueId }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const venue = VENUES.find(v => v.id === venueId) || VENUES[0];
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'gallery' | 'reviews'>('about');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);

  const handleReserve = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    setBookingOpen(true);
  };

  const socials = VENUE_SOCIALS[venue.id] || { instagram: venue.name.toLowerCase().replace(/\s+/g, '') };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ── HERO BANNER (like ArtistProfile) ── */}
      <section className="relative h-72 sm:h-96 overflow-hidden">
        <img src={venue.cover} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        <button onClick={() => navigate('/venues')}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-800 text-sm px-3 py-1.5 rounded-xl font-semibold transition-colors backdrop-blur-md">
          ← Volver
        </button>

        <Badge variant={venue.isOpen ? 'green' : 'gray'} className="absolute top-4 right-4 text-sm">
          {venue.isOpen ? '🟢 Abierto Ahora' : '🔴 Cerrado'}
        </Badge>

        {/* Hero info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto flex items-end gap-4 flex-wrap">
            <img src={venue.avatar} alt={venue.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded capitalize">{venue.type}</span>
                {venue.isPremium && (
                  <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">⭐ Premium</span>
                )}
              </div>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white leading-tight flex items-center gap-2 flex-wrap">
                {venue.name}
                <CheckCircle className="w-6 h-6 text-blue-400 fill-blue-400" />
              </h1>
              <div className="flex items-center gap-3 mt-2 text-white/80 text-sm flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {venue.city}, España</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {(venue.capacity * 12).toLocaleString()} seguidores</span>
                <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {venue.rating} ({venue.reviews})</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Responde ~ 1 hora</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACTION BAR ── */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => navigate('/chat')}
            className="btn-orange text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <MessageSquare className="w-4 h-4" /> Chat interno
          </button>
          <button onClick={handleReserve}
            className="btn-outline text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-4 h-4" /> Reservar
          </button>
          <button onClick={() => {
            setFollowing(f => !f);
            addToast({ message: following ? 'Dejaste de seguir' : `¡Ahora sigues a ${venue.name}!`, type: 'success' });
          }}
            className={`text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${
              following ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <Bell className="w-4 h-4" /> {following ? 'Siguiendo' : 'Seguir'}
          </button>
          <button onClick={() => setLiked(l => !l)}
            className={`text-sm font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${
              liked ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); addToast({ message: 'Enlace copiado', type: 'success' }); }}
            className="text-sm font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-gray-50" style={{ scrollbarWidth: 'none' }}>
          {VENUE_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">Biografía</h3>
                <p className="text-gray-600 leading-relaxed">{venue.description}</p>
              </div>

              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">🎭 Estilo</h3>
                <p className="text-gray-600">
                  {venue.type === 'club' ? 'Ambiente nocturno con DJs en vivo y pista de baile profesional' :
                   venue.type === 'bar' ? 'Espacio acogedor con música en vivo y cocktails tropicales' :
                   venue.type === 'studio' ? 'Estudio profesional con suelo flotante y espejos' :
                   venue.type === 'rooftop' ? 'Terraza al aire libre con vistas panorámicas' :
                   venue.type === 'lounge' ? 'Espacio exclusivo con ambiente premium y VIP' :
                   'Espacio único para eventos latinos y entretenimiento'}
                </p>
              </div>

              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">Servicios & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map(a => (
                    <span key={a} className="bg-pink-50 text-brand-orange border border-pink-100 text-sm font-semibold px-3 py-1 rounded-full">{a}</span>
                  ))}
                  <span className="bg-gray-50 text-gray-600 border border-gray-100 text-sm px-3 py-1 rounded-full">Capacidad: {venue.capacity}</span>
                  <span className="bg-gray-50 text-gray-600 border border-gray-100 text-sm px-3 py-1 rounded-full">{'€'.repeat(venue.priceRange)}</span>
                </div>
              </div>

              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">🕐 Horario</h3>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-brand-orange" />
                  <span className="text-gray-600 font-medium">{venue.openHours}</span>
                  <Badge variant={venue.isOpen ? 'green' : 'gray'}>
                    {venue.isOpen ? 'Abierto' : 'Cerrado'}
                  </Badge>
                </div>
              </div>

              {/* Featured YouTube Video */}
              {(() => {
                const vid = VENUE_VIDEOS[venue.id];
                if (!vid) return null;
                const ytId = getYouTubeId(vid.url);
                if (!ytId) return null;
                return (
                  <div className="card-white rounded-2xl overflow-hidden">
                    <div className="p-5 pb-3 flex items-center justify-between">
                      <h3 className="font-display font-bold text-gray-900 flex items-center gap-2">
                        🎬 Vídeo destacado
                      </h3>
                      <a href={vid.url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1">
                        Ver en YouTube ↗
                      </a>
                    </div>
                    <div className="bg-black aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
                        title={vid.title}
                        className="w-full h-full"
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{vid.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{venue.name} · YouTube</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Social Links */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">🌐 Redes sociales</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(socials).map(([key, handle]) => (
                    <a key={key}
                      href={`https://${key}.com/${handle}`}
                      target="_blank" rel="noreferrer"
                      className={`bg-gradient-to-br ${SOCIAL_COLORS[key] || 'from-gray-400 to-gray-600'} text-white aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 hover:scale-105 transition-transform p-2`}>
                      <SocialIcon kind={key} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{key}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Map (replaces Statistics) */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">📍 Ubicación</h3>
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <iframe
                    title={`Mapa de ${venue.name}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${venue.lng - 0.01}%2C${venue.lat - 0.008}%2C${venue.lng + 0.01}%2C${venue.lat + 0.008}&layer=mapnik&marker=${venue.lat}%2C${venue.lng}`}
                    className="w-full h-48 sm:h-56 border-0"
                    loading="lazy"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {venue.address}, {venue.city}
                </p>
              </div>

              {/* Quick stats */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">📊 Estadísticas</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Eventos realizados', value: (venue.reviews * 3).toString() },
                    { label: 'Reseñas', value: venue.reviews.toString() },
                    { label: 'Capacidad máxima', value: venue.capacity.toLocaleString() },
                    { label: 'Seguidores', value: (venue.capacity * 12).toLocaleString() },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">{row.label}</span>
                      <span className="font-black text-brand-orange">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            {[
              { day: '21', month: 'JUN', title: 'Noche de Salsa Cubana', time: '22:00 – 05:00', price: 20 },
              { day: '28', month: 'JUN', title: 'Bachata Sensual Night', time: '21:00 – 04:00', price: 25 },
              { day: '05', month: 'JUL', title: 'Festival Latino Summer', time: '20:00 – 06:00', price: 35 },
              { day: '12', month: 'JUL', title: 'Reggaeton Party', time: '23:00 – 05:00', price: 15 },
            ].map((ev, i) => (
              <div key={i} className="card-white rounded-2xl p-4 flex gap-4 hover:shadow-card-hover transition-shadow cursor-pointer">
                <div className="w-16 flex-shrink-0 bg-brand-orange rounded-xl flex flex-col items-center justify-center p-2">
                  <span className="text-white font-black text-2xl leading-none">{ev.day}</span>
                  <span className="text-white/80 text-xs font-bold">{ev.month}</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold">{ev.title}</p>
                  <p className="text-gray-400 text-xs mt-1">{venue.name} · {ev.time}</p>
                  <p className="text-brand-orange text-sm font-bold mt-2">€{ev.price}</p>
                </div>
                <button className="self-center bg-brand-orange text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-orange-dark transition-colors">
                  🎫 Comprar
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl group cursor-pointer">
                <img src={`https://picsum.photos/seed/${venue.id}gal${i}/400/400`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="card-white rounded-2xl p-5 flex items-center gap-6">
              <div className="text-center">
                <p className="font-black text-4xl text-gray-900">{venue.rating}</p>
                <StarRating rating={venue.rating} count={venue.reviews} size="md" className="mt-1" />
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(s => {
                  const pct = s === 5 ? 68 : s === 4 ? 22 : s === 3 ? 7 : s === 2 ? 2 : 1;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-3">{s}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {[
              { name: 'María G.', rating: 5, text: 'Increíble ambiente, la mejor pista de salsa de la ciudad. El DJ es espectacular.', time: 'Hace 2 días' },
              { name: 'Carlos R.', rating: 4, text: 'Muy buen local, buena música y cocktails. A veces se llena demasiado los sábados.', time: 'Hace 1 semana' },
              { name: 'Ana P.', rating: 5, text: 'El mejor lugar para bailar bachata. Personal muy amable y precios razonables.', time: 'Hace 2 semanas' },
            ].map((r, i) => (
              <div key={i} className="card-white rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange font-bold">{r.name[0]}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-gray-400 text-xs">{r.time}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerId={venue.id}
        providerName={venue.name}
        source="booking"
        defaultConcept={`Reserva del espacio ${venue.name}`}
        defaultPrice={venue.priceRange * 100}
        helperText={`${venue.type} en ${venue.city} · Capacidad ${venue.capacity}`}
      />
    </div>
  );
};

export default VenuesPage;
