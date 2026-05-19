import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Users, CheckCircle, Instagram, Youtube, Facebook, Music2,
  Calendar, MessageSquare, Share2, Heart, Play, Eye, Globe, Clock,
  Star, Sparkles, Send, Video, Bell, Headphones, Award, Image as ImageIcon,
  ChevronRight, Lock
} from 'lucide-react';
import { ARTISTS, LIVE_STREAMS, SOCIAL_NETWORK_URLS } from '../data/mockData';
import type { Artist, MediaItem, OfferPackage } from '../data/mockData';
import { useAuthStore, useUIStore, getYouTubeId } from '../store/appStore';
import { Avatar, Modal, Button } from '../components/ui';
import BookingModal from '../components/BookingModal';

type TabId = 'about' | 'live' | 'gallery' | 'offers' | 'reviews' | 'availability';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'about',        label: 'Sobre mí',      icon: <Sparkles className="w-4 h-4" /> },
  { id: 'live',         label: 'Live',          icon: <Video className="w-4 h-4" /> },
  { id: 'gallery',      label: 'Galería',       icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'offers',       label: 'Servicios',     icon: <Award className="w-4 h-4" /> },
  { id: 'reviews',      label: 'Reseñas',       icon: <Star className="w-4 h-4" /> },
  { id: 'availability', label: 'Disponibilidad', icon: <Calendar className="w-4 h-4" /> },
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const FAKE_REVIEWS = [
  { id: 1, user: 'María Pérez',    rating: 5, date: '2026-04-10', text: 'Una noche inolvidable. Profesional, puntual y un repertorio espectacular. Volveremos a contratar sin duda.', helpful: 14 },
  { id: 2, user: 'Carlos Sánchez', rating: 5, date: '2026-03-22', text: 'Hizo bailar a todos los invitados. Buena comunicación previa y respondió a todas nuestras peticiones.', helpful: 9 },
  { id: 3, user: 'Lucía Ferreira', rating: 4, date: '2026-03-15', text: 'Muy buen ambiente. El sonido podría haber sido algo más fuerte pero técnicamente todo perfecto.', helpful: 3 },
  { id: 4, user: 'Diego Martín',   rating: 5, date: '2026-02-28', text: 'El mejor DJ que hemos contratado. Lectura de público brutal.', helpful: 7 },
];

const ArtistProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { addToast } = useUIStore();

  const artist = ARTISTS.find(a => a.id === id) || ARTISTS[0];
  const currentStream = artist.currentStreamId
    ? LIVE_STREAMS.find(s => s.id === artist.currentStreamId)
    : null;

  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showCustomOffer, setShowCustomOffer] = useState(false);
  const [customOfferTitle, setCustomOfferTitle] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPreset, setBookingPreset] = useState<{ concept: string; price: number }>({ concept: '', price: 0 });
  const openBooking = (concept: string, price: number) => {
    setBookingPreset({ concept, price });
    setBookingOpen(true);
  };
  const [customOfferPrice, setCustomOfferPrice] = useState('');
  const [customOfferDesc, setCustomOfferDesc] = useState('');

  const handleChat = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    navigate('/chat');
    addToast({ message: `Chat iniciado con ${artist.name}`, type: 'success' });
  };

  const handleBookPackage = (pkg: OfferPackage) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    openBooking(`${pkg.name} (${pkg.tier})`, pkg.price);
  };

  const handleSendCustomOffer = () => {
    if (!customOfferTitle || !customOfferPrice) {
      addToast({ message: 'Completa título y precio', type: 'error' });
      return;
    }
    setShowCustomOffer(false);
    setCustomOfferTitle(''); setCustomOfferPrice(''); setCustomOfferDesc('');
    addToast({ message: '✅ Oferta enviada por chat interno', type: 'success' });
    navigate('/chat');
  };

  const handleShare = () => {
    addToast({ message: 'Enlace del perfil copiado', type: 'success' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ── HERO BANNER ── */}
      <section className="relative h-72 sm:h-96 overflow-hidden">
        <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-800 text-sm px-3 py-1.5 rounded-xl font-semibold transition-colors backdrop-blur-md">
          ← Volver
        </button>

        {/* Live badge */}
        {artist.isLive && currentStream && (
          <button onClick={() => navigate('/live')}
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-lg animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            EN VIVO · {currentStream.viewers.toLocaleString()} viendo
          </button>
        )}

        {/* Hero info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto flex items-end gap-4 flex-wrap">
            <Avatar src={artist.avatar} name={artist.name} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {artist.tags.slice(0, 2).map(t => (
                  <span key={t} className="bg-brand-orange/90 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">{t}</span>
                ))}
                {artist.isPremium && (
                  <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">⭐ Premium</span>
                )}
              </div>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white leading-tight flex items-center gap-2 flex-wrap">
                {artist.name}
                {artist.isVerified && <CheckCircle className="w-6 h-6 text-blue-400 fill-blue-400" />}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-white/80 text-sm flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {artist.city}, {artist.country}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {artist.followers.toLocaleString()} seguidores</span>
                <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {artist.rating} ({artist.reviews})</span>
                {artist.responseTime && (
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Responde {artist.responseTime}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACTION BAR (NO contact info, only internal chat & booking) ── */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={handleChat}
            className="btn-orange text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <MessageSquare className="w-4 h-4" /> Chat interno
          </button>
          <button onClick={() => openBooking(`Servicio con ${artist.name}`, artist.packages?.[0]?.price || 150)}
            className="btn-outline text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <Award className="w-4 h-4" /> Reservar
          </button>
          {currentStream && (
            <button onClick={() => navigate('/live')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2 px-4 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
              <Video className="w-4 h-4" /> Ver Live
            </button>
          )}
          <button onClick={() => {
            setFollowing(f => !f);
            addToast({ message: following ? 'Dejaste de seguir' : '¡Ahora sigues a ' + artist.name + '!', type: 'success' });
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
          <button onClick={handleShare}
            className="text-sm font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
            <Share2 className="w-4 h-4" />
          </button>

          {/* Internal-chat-only notice */}
          <div className="hidden lg:flex ml-auto items-center gap-1.5 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
            <Lock className="w-3 h-3" /> Comunicación 100% por chat interno
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-gray-50" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ── TAB CONTENT ── */}
        {activeTab === 'about' && <AboutTab artist={artist} />}
        {activeTab === 'live' && <LiveTab artist={artist} currentStream={currentStream} onChat={handleChat} />}
        {activeTab === 'gallery' && <GalleryTab artist={artist} onSelect={setSelectedMedia} />}
        {activeTab === 'offers' && (
          <OffersTab artist={artist} onBook={handleBookPackage} onCustom={() => setShowCustomOffer(true)} />
        )}
        {activeTab === 'reviews' && <ReviewsTab artist={artist} />}
        {activeTab === 'availability' && <AvailabilityTab artist={artist} onChat={handleChat} />}
      </div>

      {/* ── Media viewer modal ── */}
      <Modal isOpen={!!selectedMedia} onClose={() => setSelectedMedia(null)} title={selectedMedia?.title || 'Media'}>
        {selectedMedia && (
          <div className="space-y-3">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <img src={selectedMedia.url} alt={selectedMedia.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-900">{selectedMedia.title}</span>
              {selectedMedia.views !== undefined && (
                <span className="text-gray-400 flex items-center gap-1"><Eye className="w-4 h-4" /> {selectedMedia.views.toLocaleString()}</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Custom Offer Modal (Fiverr-style) ── */}
      <Modal isOpen={showCustomOffer} onClose={() => setShowCustomOffer(false)} title="📨 Enviar oferta personalizada">
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">
            Negocia directamente con {artist.name} por chat interno. La plataforma protege tu pago con sistema escrow (15% comisión).
          </p>
          <div>
            <label className="text-gray-600 text-xs font-bold uppercase tracking-wide block mb-1">Título de la oferta</label>
            <input value={customOfferTitle} onChange={e => setCustomOfferTitle(e.target.value)}
              placeholder="Ej: DJ Set 3h para mi boda"
              className="input-field text-sm" />
          </div>
          <div>
            <label className="text-gray-600 text-xs font-bold uppercase tracking-wide block mb-1">Precio propuesto (€)</label>
            <input value={customOfferPrice} onChange={e => setCustomOfferPrice(e.target.value)}
              type="number" min={0} placeholder="500"
              className="input-field text-sm" />
          </div>
          <div>
            <label className="text-gray-600 text-xs font-bold uppercase tracking-wide block mb-1">Detalles</label>
            <textarea value={customOfferDesc} onChange={e => setCustomOfferDesc(e.target.value)}
              rows={4} placeholder="Cuéntale al artista qué necesitas, fecha, ubicación..."
              className="input-field text-sm" />
          </div>
          <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 text-xs text-gray-600">
            <p className="flex items-start gap-2"><Lock className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
              Tu pago queda retenido en escrow hasta confirmar la entrega del servicio. Comisión plataforma: 15%.
            </p>
          </div>
          <Button variant="orange" className="w-full" onClick={handleSendCustomOffer}>
            <Send className="w-4 h-4" /> Enviar oferta por chat
          </Button>
        </div>
      </Modal>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerId={artist.id}
        providerName={artist.name}
        source="booking"
        defaultConcept={bookingPreset.concept}
        defaultPrice={bookingPreset.price}
        helperText={`Reservando con ${artist.name}. Comunicación 100% por chat interno.`}
      />
    </div>
  );
};

// ── ABOUT TAB ───────────────────────────────────────────────────────────────
const AboutTab: React.FC<{ artist: Artist }> = ({ artist }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2 space-y-4">
      <div className="card-white rounded-2xl p-5">
        <h3 className="font-display font-bold text-gray-900 mb-3">Biografía</h3>
        <p className="text-gray-600 leading-relaxed">{artist.bio}</p>
      </div>

      {artist.performanceStyle && (
        <div className="card-white rounded-2xl p-5">
          <h3 className="font-display font-bold text-gray-900 mb-3">🎭 Estilo</h3>
          <p className="text-gray-600">{artist.performanceStyle}</p>
        </div>
      )}

      <div className="card-white rounded-2xl p-5">
        <h3 className="font-display font-bold text-gray-900 mb-3">Géneros y especialidades</h3>
        <div className="flex flex-wrap gap-2">
          {artist.genre.map(g => (
            <span key={g} className="bg-pink-50 text-brand-orange border border-pink-100 text-sm font-semibold px-3 py-1 rounded-full">{g}</span>
          ))}
          {artist.tags.map(t => (
            <span key={t} className="bg-gray-50 text-gray-600 border border-gray-100 text-sm px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {artist.languages && artist.languages.length > 0 && (
        <div className="card-white rounded-2xl p-5">
          <h3 className="font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-orange" /> Idiomas
          </h3>
          <div className="flex flex-wrap gap-2">
            {artist.languages.map(l => (
              <span key={l} className="bg-gray-50 text-gray-700 text-sm font-medium px-3 py-1 rounded-lg">{l}</span>
            ))}
          </div>
        </div>
      )}

      <FeaturedVideoCard artist={artist} />
    </div>

    {/* Sidebar */}
    <div className="space-y-4">
      <SocialLinksCard artist={artist} />
      <StatsCard artist={artist} />
    </div>
  </div>
);

// ── SOCIAL LINKS (icon grid) ────────────────────────────────────────────────
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

const SOCIAL_COLORS: Record<string, string> = {
  instagram:  'from-purple-500 to-pink-500',
  youtube:    'from-red-500 to-red-600',
  facebook:   'from-blue-500 to-blue-700',
  spotify:    'from-green-500 to-green-600',
  soundcloud: 'from-pink-500 to-pink-600',
  tiktok:     'from-gray-900 to-pink-500',
  twitch:     'from-purple-600 to-purple-800',
};

// ── FEATURED VIDEO CARD ────────────────────────────────────────────────────
const FeaturedVideoCard: React.FC<{ artist: Artist }> = ({ artist }) => {
  if (!artist.featuredVideo) return null;
  const ytId = getYouTubeId(artist.featuredVideo);
  return (
    <div className="card-white rounded-2xl overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-gray-900 flex items-center gap-2">
          🎬 Vídeo destacado
        </h3>
        {ytId && (
          <a href={artist.featuredVideo} target="_blank" rel="noreferrer"
            className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1">
            Ver en YouTube ↗
          </a>
        )}
      </div>
      <div className="bg-black aspect-video">
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
            title={artist.featuredVideoTitle || artist.name}
            className="w-full h-full"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={artist.featuredVideo} controls className="w-full h-full object-cover" />
        )}
      </div>
      {artist.featuredVideoTitle && (
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{artist.featuredVideoTitle}</p>
        </div>
      )}
    </div>
  );
};

const formatFollowers = (n?: number) => {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.0', '')}K`;
  return n.toLocaleString();
};

const SocialLinksCard: React.FC<{ artist: Artist }> = ({ artist }) => {
  const entries = Object.entries(artist.social).filter(([, v]) => !!v);
  if (entries.length === 0) return null;
  const followers = artist.socialFollowers || {};
  const totalFollowers = Object.values(followers).reduce((s, v) => s + (v || 0), 0);
  return (
    <div className="card-white rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-gray-900">🌐 Redes sociales</h3>
        {totalFollowers > 0 && (
          <span className="text-[10px] text-gray-400">Total <span className="font-black text-brand-orange">{formatFollowers(totalFollowers)}</span></span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {entries.map(([key, handle]) => {
          const f = followers[key as keyof typeof followers];
          return (
            <a key={key}
              href={`${SOCIAL_NETWORK_URLS[key as keyof typeof SOCIAL_NETWORK_URLS] || '#'}${handle}`}
              target="_blank" rel="noreferrer"
              className={`bg-gradient-to-br ${SOCIAL_COLORS[key] || 'from-gray-400 to-gray-600'} text-white aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 hover:scale-105 transition-transform p-2`}>
              <SocialIcon kind={key} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{key}</span>
              {f && <span className="text-[11px] font-black mt-0.5">{formatFollowers(f)}</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
};

const StatsCard: React.FC<{ artist: Artist }> = ({ artist }) => (
  <div className="card-white rounded-2xl p-5">
    <h3 className="font-display font-bold text-gray-900 mb-3">📊 Estadísticas</h3>
    <div className="space-y-3">
      <StatRow label="Bookings completados" value={artist.completedBookings.toLocaleString()} />
      <StatRow label="Reseñas" value={artist.reviews.toLocaleString()} />
      <StatRow label="Streams en vivo" value={(artist.totalStreams || 0).toLocaleString()} />
      <StatRow label="Horas streaming" value={`${(artist.totalStreamHours || 0).toLocaleString()}h`} />
      <StatRow label="Desde" value={`€${artist.priceFrom}`} highlight />
    </div>
  </div>
);

const StatRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={`font-bold ${highlight ? 'text-brand-orange' : 'text-gray-900'}`}>{value}</span>
  </div>
);

// ── LIVE TAB ────────────────────────────────────────────────────────────────
const LiveTab: React.FC<{ artist: Artist; currentStream: any; onChat: () => void }> = ({ artist, currentStream, onChat }) => {
  const navigate = useNavigate();
  if (currentStream) {
    return (
      <div className="space-y-4">
        <div className="card-white rounded-2xl overflow-hidden">
          <div className="relative aspect-video bg-black">
            <img src={currentStream.thumbnail} alt={currentStream.title} className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest">EN VIVO AHORA</span>
            </div>
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold">{currentStream.viewers.toLocaleString()}</span>
            </div>
            <button onClick={() => navigate('/live')}
              className="absolute inset-0 flex items-center justify-center group">
              <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                <Play className="w-10 h-10 fill-red-600 text-red-600 ml-1" />
              </div>
            </button>
          </div>
          <div className="p-5">
            <h3 className="font-display font-bold text-gray-900 text-xl mb-1">{currentStream.title}</h3>
            {currentStream.description && (
              <p className="text-gray-500 text-sm mb-4">{currentStream.description}</p>
            )}
            <button onClick={() => navigate('/live')}
              className="btn-orange w-full flex items-center justify-center gap-2">
              <Video className="w-4 h-4" /> Entrar al directo
            </button>
          </div>
        </div>

        <ScheduledStreamsList artist={artist} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-white rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
          <Radio className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-700 font-bold text-lg mb-1">No está en directo ahora mismo</p>
        <p className="text-gray-400 text-sm mb-4">Sigue a {artist.name} para recibir notificaciones cuando emita</p>
        <button onClick={onChat} className="btn-outline text-sm py-2 px-4">
          <MessageSquare className="w-4 h-4" /> Solicitar stream privado
        </button>
      </div>
      <ScheduledStreamsList artist={artist} />
    </div>
  );
};

const Radio = Bell;

const ScheduledStreamsList: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { addToast } = useUIStore();
  if (!artist.scheduledStreams?.length) return null;
  return (
    <div className="card-white rounded-2xl p-5">
      <h3 className="font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-orange" /> Próximos streams programados
      </h3>
      <div className="space-y-2">
        {artist.scheduledStreams.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <img src={s.thumbnail} alt={s.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{s.title}</p>
              <p className="text-gray-400 text-xs">
                {new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })} · {s.time}
              </p>
              <span className="text-[10px] font-bold uppercase bg-pink-50 text-brand-orange px-1.5 py-0.5 rounded mt-1 inline-block">{s.category}</span>
            </div>
            <button onClick={() => addToast({ message: '🔔 Recordatorio activado', type: 'success' })}
              className="flex items-center gap-1 bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors">
              <Bell className="w-3 h-3" /> Recordar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── GALLERY TAB ─────────────────────────────────────────────────────────────
const GalleryTab: React.FC<{ artist: Artist; onSelect: (m: MediaItem) => void }> = ({ artist, onSelect }) => {
  const gallery = artist.gallery || [];
  if (gallery.length === 0) {
    return (
      <div className="card-white rounded-2xl p-10 text-center">
        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-semibold">No hay contenido todavía</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {gallery.map(m => (
        <button key={m.id} onClick={() => onSelect(m)}
          className="card-white rounded-2xl overflow-hidden text-left group hover:shadow-lg transition-all">
          <div className="relative aspect-square overflow-hidden">
            <img src={m.thumbnail} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {m.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 fill-brand-orange text-brand-orange ml-0.5" />
                </div>
              </div>
            )}
            {m.type === 'mix' && (
              <div className="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">MIX</div>
            )}
            {m.duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{m.duration}</div>
            )}
          </div>
          <div className="p-2">
            <p className="text-xs font-bold text-gray-900 truncate">{m.title}</p>
            {m.views !== undefined && (
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Eye className="w-3 h-3" /> {m.views.toLocaleString()}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

// ── OFFERS TAB ──────────────────────────────────────────────────────────────
const OffersTab: React.FC<{ artist: Artist; onBook: (p: OfferPackage) => void; onCustom: () => void }> = ({ artist, onBook, onCustom }) => {
  const packages = artist.packages || [];
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-50 to-pink-50 rounded-2xl p-4 sm:p-5 border border-pink-100">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-brand-orange flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900 text-sm">Solo comunicación por chat interno</p>
            <p className="text-gray-600 text-xs mt-0.5">
              No hay contacto externo. Todas las ofertas, negociaciones y pagos pasan por el sistema protegido de la plataforma (escrow, 15% comisión).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {packages.map((pkg, i) => {
          const isPopular = pkg.tier === 'standard';
          return (
            <div key={pkg.id}
              className={`card-white rounded-2xl p-5 relative ${isPopular ? 'ring-2 ring-brand-orange shadow-lg' : ''}`}>
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  ⭐ Más popular
                </span>
              )}
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {pkg.tier === 'basic' ? 'BÁSICO' : pkg.tier === 'standard' ? 'ESTÁNDAR' : 'PREMIUM'}
              </p>
              <h3 className="font-display font-black text-gray-900 text-lg leading-tight mb-1">{pkg.name}</h3>
              <p className="text-gray-500 text-xs mb-4">{pkg.description}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-black text-brand-orange">€{pkg.price}</span>
                <span className="text-gray-400 text-xs mb-1">EUR</span>
              </div>
              <p className="text-gray-400 text-xs flex items-center gap-1 mb-4">
                <Clock className="w-3 h-3" /> Entrega en {pkg.deliveryDays} día{pkg.deliveryDays > 1 ? 's' : ''}
              </p>
              <ul className="space-y-2 text-xs mb-5">
                {pkg.includes.map(it => (
                  <li key={it} className="flex items-start gap-1.5 text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{it}</span>
                  </li>
                ))}
                <li className="flex items-start gap-1.5 text-gray-500">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{pkg.revisions === -1 ? 'Revisiones ilimitadas' : `${pkg.revisions} revisión${pkg.revisions > 1 ? 'es' : ''}`}</span>
                </li>
              </ul>
              <button onClick={() => onBook(pkg)}
                className={`w-full font-bold text-sm py-2.5 rounded-lg transition-all ${
                  isPopular ? 'bg-brand-orange text-white hover:bg-pink-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                Solicitar por chat
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold text-gray-900">¿Necesitas algo personalizado?</p>
          <p className="text-gray-500 text-sm">Envía una oferta a medida con tu fecha, ubicación y presupuesto.</p>
        </div>
        <button onClick={onCustom} className="btn-outline text-sm whitespace-nowrap">
          <Send className="w-4 h-4" /> Oferta personalizada
        </button>
      </div>
    </div>
  );
};

// ── REVIEWS TAB ─────────────────────────────────────────────────────────────
const ReviewsTab: React.FC<{ artist: Artist }> = ({ artist }) => {
  const breakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: FAKE_REVIEWS.filter(r => r.rating === stars).length + (stars === 5 ? artist.reviews - FAKE_REVIEWS.length : 0),
  }));
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card-white rounded-2xl p-5">
        <p className="text-5xl font-black text-gray-900 leading-none">{artist.rating}</p>
        <div className="flex items-center gap-0.5 my-2">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className={`w-5 h-5 ${i <= Math.round(artist.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
          ))}
        </div>
        <p className="text-gray-400 text-sm">{artist.reviews} reseñas en total</p>
        <div className="mt-4 space-y-2">
          {breakdown.map(b => (
            <div key={b.stars} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 w-3">{b.stars}</span>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400" style={{ width: `${total ? (b.count / total) * 100 : 0}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 w-8 text-right">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-3">
        {FAKE_REVIEWS.map(r => (
          <div key={r.id} className="card-white rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Avatar src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.user)}&background=7C3AED&color=fff&size=80`} name={r.user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <p className="font-bold text-gray-900 text-sm">{r.user}</p>
                  <p className="text-gray-400 text-xs">{new Date(r.date).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-gray-600 text-sm mt-2">{r.text}</p>
                <button className="text-gray-400 hover:text-brand-orange text-xs font-semibold mt-2">
                  👍 Útil ({r.helpful})
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── AVAILABILITY TAB ────────────────────────────────────────────────────────
const AvailabilityTab: React.FC<{ artist: Artist; onChat: () => void }> = ({ artist, onChat }) => {
  const availableDays = artist.availability;
  return (
    <div className="space-y-4">
      <div className="card-white rounded-2xl p-5">
        <h3 className="font-display font-bold text-gray-900 mb-1">📅 Días habituales disponibles</h3>
        <p className="text-gray-500 text-sm mb-4">Selecciona un día para iniciar la conversación de reserva</p>
        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map(d => {
            const fullDay = { Lun: 'Lunes', Mar: 'Martes', Mié: 'Miércoles', Jue: 'Jueves', Vie: 'Viernes', Sáb: 'Sábado', Dom: 'Domingo' }[d];
            const available = availableDays.includes(fullDay || '');
            return (
              <button key={d} onClick={() => available && onChat()}
                disabled={!available}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                  available
                    ? 'bg-brand-orange text-white hover:bg-pink-600 cursor-pointer'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}>
                <span className="text-[10px] uppercase opacity-80">{d}</span>
                <span className="text-base mt-0.5">{available ? '✓' : '×'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-white rounded-2xl p-5">
        <h3 className="font-display font-bold text-gray-900 mb-2">¿No ves tu fecha?</h3>
        <p className="text-gray-500 text-sm mb-3">
          La disponibilidad puede variar según la temporada. Envía un mensaje por chat interno para confirmar fechas concretas.
        </p>
        <button onClick={onChat} className="btn-orange flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4" /> Consultar fecha por chat
        </button>
      </div>
    </div>
  );
};

export default ArtistProfilePage;
