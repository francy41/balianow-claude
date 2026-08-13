import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '../lib/supabase';
import { fixText } from '../lib/text';
import ArtistAdminPanel from '../components/ArtistAdminPanel';
import ClassPackageBookingModal from '../components/ClassPackageBookingModal';
import ClaimProfileButton from '../components/ClaimProfileButton';
import { isClaimed, UNCLAIMED_TOAST } from '../lib/ownership';
import {
  MapPin, Users, CheckCircle, Instagram, Youtube, Facebook, Music2,
  Calendar, MessageSquare, Share2, Heart, Play, Eye, Globe, Clock,
  Star, Sparkles, Send, Video, Bell, Headphones, Award, Image as ImageIcon,
  ChevronRight, Lock, Crown, Phone
} from 'lucide-react';
import { SOCIAL_NETWORK_URLS, EVENTS, ARTISTS } from '../data/mockData';
import type { Artist, MediaItem, OfferPackage } from '../data/mockData';
import { useAuthStore, useUIStore, useCartStore, getYouTubeId, useSiteConfigStore } from '../store/appStore';
import { Avatar, Modal, Button } from '../components/ui';
import BookingModal from '../components/BookingModal';
import VenueReservationModal from '../components/VenueReservationModal';
import CallBookingModal from '../components/CallBookingModal';
import ExclusiveContentTab from '../components/ExclusiveContentTab';
import PaymentGateway from '../components/payment/PaymentGateway';

type TabId = 'about' | 'live' | 'exclusive' | 'gallery' | 'offers' | 'reviews' | 'availability';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'about',        label: 'Sobre mí',      icon: <Sparkles className="w-4 h-4" /> },
  { id: 'live',         label: 'Clases online', icon: <Video className="w-4 h-4" /> },
  { id: 'exclusive',    label: 'Exclusivo',     icon: <Crown className="w-4 h-4" /> },
  { id: 'gallery',      label: 'Galería',       icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'offers',       label: 'Servicios',     icon: <Award className="w-4 h-4" /> },
  { id: 'reviews',      label: 'Reseñas',       icon: <Star className="w-4 h-4" /> },
  { id: 'availability', label: 'Disponibilidad', icon: <Calendar className="w-4 h-4" /> },
];

// Mapea cada pestaña del perfil a su módulo global (controlado desde Admin → Categorías).
const TAB_MODULE: Record<TabId, string> = {
  about:        'about',
  live:         'live',
  exclusive:    'exclusive',
  gallery:      'gallery',
  offers:       'offers',
  reviews:      'reviews',
  availability: 'calendar',
};

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const FAKE_REVIEWS = [
  { id: 1, user: 'María Pérez',    rating: 5, date: '2026-04-10', text: 'Una noche inolvidable. Profesional, puntual y un repertorio espectacular. Volveremos a contratar sin duda.', helpful: 14 },
  { id: 2, user: 'Carlos Sánchez', rating: 5, date: '2026-03-22', text: 'Hizo bailar a todos los invitados. Buena comunicación previa y respondió a todas nuestras peticiones.', helpful: 9 },
  { id: 3, user: 'Lucía Ferreira', rating: 4, date: '2026-03-15', text: 'Muy buen ambiente. El sonido podría haber sido algo más fuerte pero técnicamente todo perfecto.', helpful: 3 },
  { id: 4, user: 'Diego Martín',   rating: 5, date: '2026-02-28', text: 'El mejor DJ que hemos contratado. Lectura de público brutal.', helpful: 7 },
];

// ── Mapea una row de artists (DB) al shape Artist (mock) ──────────
function mapDbArtist(a: any): Artist {
  return {
    id:         a.id,
    name:       fixText(a.name),
    type:       a.type || 'artist',
    genre:      Array.isArray(a.genre) ? a.genre : (a.genre ? [a.genre] : []),
    avatar:     a.avatar || '',
    cover:      a.cover || a.avatar || '',
    city:       a.city || '',
    country:    a.country || '',
    rating:     Number(a.rating) || 4.5,
    reviews:    Number(a.reviews) || 0,
    followers:  Number(a.followers) || 0,
    priceFrom:  Number(a.price_from) || 0,
    bio:        fixText(a.bio || ''),
    tags:       Array.isArray(a.tags) ? a.tags : [],
    isVerified: !!a.is_verified,
    isPremium:  !!a.is_premium,
    isLive:     !!a.is_live,
    social:     a.social || {},
    languages:  Array.isArray(a.languages) ? a.languages : ['Español'],
    gallery:    Array.isArray(a.gallery) ? a.gallery : [],
    packages:   Array.isArray(a.packages) ? a.packages : [],
    classPackages: Array.isArray(a.class_packages) ? a.class_packages : [],
    userId:     a.user_id || '',
    offers:     Array.isArray(a.offers) ? a.offers : [],
    availability: Array.isArray(a.availability) ? a.availability : [],
    featuredVideo: a.featured_video || '',
    featuredVideoTitle: a.featured_video_title || '',
    currency:     a.currency || 'EUR',
    completedBookings: Number(a.completed_bookings) || 0,
  } as unknown as Artist;
}

// ── Mapea un perfil (profiles) al shape Artist para reusar el render ──
function mapProfileToArtist(p: any): Artist {
  return {
    id:         p.id,
    name:       fixText(p.full_name || p.email || 'Usuario'),
    type:       (p.role === 'dj' || p.role === 'dancer' || p.role === 'singer' || p.role === 'band' || p.role === 'instructor') ? p.role : 'artist',
    genre:      Array.isArray(p.styles) ? p.styles : [],
    avatar:     p.avatar_url || '',
    cover:      p.cover_photo || p.avatar_url || '',
    city:       p.city || p.location || '',
    country:    p.country || '',
    rating:     0,
    reviews:    0,
    followers:  0,
    priceFrom:  0,
    bio:        fixText(p.bio || ''),
    tags:       Array.isArray(p.tags) ? p.tags : [],
    isVerified: !!p.verified,
    isPremium:  false,
    isLive:     !!p.is_live,
    social:     {
      instagram: p.instagram_url, tiktok: p.tiktok_url, youtube: p.youtube_url,
      facebook: p.facebook_url, website: p.website_url, spotify: p.spotify_url,
      soundcloud: p.soundcloud_url, twitch: p.twitch_url,
    },
    languages:  ['Español'],
    gallery:    [],
    offers:     [],
    classPackages: Array.isArray(p.class_packages) ? p.class_packages : [],
    userId:     p.id || '',
    availability: [],
    currency:   'EUR',
    completedBookings: 0,
    featuredVideo: p.featured_video || p.youtube_url || '',
    featuredVideoTitle: p.featured_video_title || '',
    location:   fixText(p.location || ''),
    lat:        p.lat ?? null,
    lng:        p.lng ?? null,
    role:       p.role || '',
  } as unknown as Artist;
}

const ArtistProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wantEdit = searchParams.get('edit') === '1';
  const { isAuthenticated, user } = useAuthStore();
  const { addToast } = useUIStore();

  const [dbArtist, setDbArtist] = useState<Artist | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Carga desde BD: primero tabla artists, luego profiles (para usuarios con perfil propio)
  useEffect(() => {
    if (!id) { setLoadingDb(false); setNotFound(true); return; }
    let cancelled = false;
    setLoadingDb(true);
    const safety = setTimeout(() => { if (!cancelled) { setLoadingDb(false); } }, 8000);
    (async () => {
      try {
        const { data: art } = await supabase.from('artists').select('*').eq('id', id).maybeSingle();
        if (cancelled) return;
        if (art) { setDbArtist(mapDbArtist(art)); setLoadingDb(false); return; }
        const { data: prof } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', id).maybeSingle();
        if (cancelled) return;
        if (prof) { setDbArtist(mapProfileToArtist(prof)); setLoadingDb(false); return; }
        const mock = ARTISTS.find(a => a.id === id);
        if (mock) { setDbArtist({ ...mock, userId: '' } as any); setLoadingDb(false); return; }
        setNotFound(true); setLoadingDb(false);
      } catch (e) {
        console.warn('[artist-profile] load', e);
        if (!cancelled) {
          const mock = ARTISTS.find(a => a.id === id);
          if (mock) { setDbArtist({ ...mock, userId: '' } as any); } else { setNotFound(true); }
          setLoadingDb(false);
        }
      }
    })();
    return () => { cancelled = true; clearTimeout(safety); };
  }, [id]);

  // ⚠ TODOS los hooks DEBEN ir antes de cualquier return condicional (rules of hooks)
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const { profileModules } = useSiteConfigStore();
  const isModuleOn = (modId: string) => profileModules.find(m => m.id === modId)?.enabled !== false;
  const visibleTabs = TABS.filter(t => isModuleOn(TAB_MODULE[t.id]));

  // Si la pestaña activa queda oculta por un módulo desactivado, salta a la primera visible
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [profileModules]); // eslint-disable-line react-hooks/exhaustive-deps
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showCustomOffer, setShowCustomOffer] = useState(false);
  const [customOfferTitle, setCustomOfferTitle] = useState('');
  const { addItem, clearCart } = useCartStore();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [classBookingOpen, setClassBookingOpen] = useState(false);
  const [venueResOpen, setVenueResOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bookingPreset, setBookingPreset] = useState<{ concept: string; price: number }>({ concept: '', price: 0 });
  const [customOfferPrice, setCustomOfferPrice] = useState('');
  const [customOfferDesc, setCustomOfferDesc] = useState('');

  // Returns condicionales DESPUES de todos los hooks
  if (loadingDb) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !dbArtist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-6xl">🔍</p>
        <h2 className="font-display font-black text-xl text-gray-900 dark:text-white">Artista no encontrado</h2>
        <p className="text-sm text-gray-500">El perfil que buscas ya no existe o fue eliminado.</p>
        <button onClick={() => navigate('/artistas')} className="bg-brand-orange text-white font-bold px-6 py-3 rounded-xl">
          Ver todos los artistas
        </button>
        {wantEdit && id && <ArtistAdminPanel id={id} autoOpen onSaved={() => window.location.reload()} />}
      </div>
    );
  }

  const artist = dbArtist!;
  const currentStream = null; // live streams se cargan de live_sessions, no de mock
  const isVenue = ['venue', 'business'].includes(String((artist as any).role || '').toLowerCase());

  // Eventos para la tira animada del hero (consulta ligera propia, independiente de ServiceCards).
  const [heroEvents, setHeroEvents] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase.from('events').select('id,title,date,event_date,artists,owner_id,user_id,venue_id,venue_name')
      .then(({ data }) => {
        if (cancelled || !data) return;
        const filtered = data.filter((e: any) =>
          (Array.isArray(e.artists) && e.artists.includes(artist.id)) ||
          e.owner_id === artist.id || e.user_id === artist.id ||
          String(e.venue_id || '') === String(artist.id) ||
          (!!e.venue_name && !!artist.name && e.venue_name === artist.name));
        setHeroEvents(filtered);
      }, () => {});
    return () => { cancelled = true; };
  }, [artist.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const claimed = isClaimed((artist as any).userId);

  const guardSale = (): boolean => {
    if (!claimed) { addToast({ message: UNCLAIMED_TOAST, type: 'warning' }); return false; }
    return true;
  };

  const openBooking = (concept: string, price: number) => {
    if (!guardSale()) return;
    setBookingPreset({ concept, price });
    setBookingOpen(true);
  };

  const handleChat = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    navigate('/chat');
    addToast({ message: `Chat iniciado con ${artist.name}`, type: 'success' });
  };

  const handleBookPackage = (pkg: OfferPackage) => {
    if (!guardSale()) return;
    if (!isAuthenticated) { navigate('/auth'); return; }
    clearCart();
    addItem({
      serviceId: `${artist.id}-${pkg.tier}`,
      sellerId: artist.id,
      sellerName: artist.name,
      sellerAvatar: artist.avatar,
      title: `${pkg.name} (${pkg.tier})`,
      price: pkg.price,
      extras: [],
      currency: 'EUR',
    });
    setCheckoutOpen(true);
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

  const handleShare = async () => {
    const url = window.location.href;
    if ((navigator as any).share) { try { await (navigator as any).share({ title: `${artist.name} · BailaNow`, text: `Mira a ${artist.name} en BailaNow`, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); addToast({ message: '✅ Enlace copiado — compártelo donde quieras', type: 'success' }); } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ── HERO BANNER ── */}
      <section className="relative h-80 sm:h-[26rem] overflow-hidden">
        <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover kenburns" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/55 to-transparent" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-800 text-sm px-3 py-1.5 rounded-xl font-semibold transition-colors backdrop-blur-md">
          ← Volver
        </button>

        {/* Live badge */}
        {artist.isLive && (
          <button onClick={() => navigate('/live')}
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-lg animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            EN VIVO
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

      {/* ── TIRA DE PRÓXIMOS EVENTOS (animada) ── */}
      {(() => {
        const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const mapped = heroEvents.slice(0, 6).map(e => ({
          id: e.id, day: (e.date || e.event_date || '').split('-')[2] || '--',
          month: MONTHS[(Number((e.date || e.event_date || '').split('-')[1]) || 1) - 1] || '', title: e.title || 'Evento',
        }));
        const examples = [
          { id: 'ex1', day: '21', month: 'JUN', title: 'Bachata Sensual — Barcelona' },
          { id: 'ex2', day: '28', month: 'JUN', title: 'Festival Latino' },
        ];
        const strip = mapped.length ? mapped : examples;
        const chips = [...strip, ...strip];
        return (
          <div className="bg-gray-900 dark:bg-black overflow-hidden border-b border-white/5">
            <div className="flex items-center gap-2 py-2.5 whitespace-nowrap animate-marquee-left-slow">
              {chips.map((ev, i) => (
                <button key={`${ev.id}-${i}`} onClick={() => setActiveTab('about')}
                  className="flex-shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-full pl-1 pr-3 py-1 mx-1.5 transition-colors">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-brand-orange to-pink-600 text-white flex flex-col items-center justify-center leading-none">
                    <span className="font-black text-[10px]">{ev.day}</span>
                  </span>
                  <span className="text-white/90 text-xs font-semibold">{ev.title}</span>
                  <span className="text-white/40 text-[10px]">{ev.month}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── ACTION BAR (NO contact info, only internal chat & booking) ── */}
      <div className="sticky top-14 z-30 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={handleChat}
            className="btn-orange text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <MessageSquare className="w-4 h-4" /> Chat interno
          </button>
          <button onClick={() => isVenue ? setVenueResOpen(true) : openBooking(`Servicio con ${artist.name}`, artist.packages?.[0]?.price || 150)}
            className="btn-outline text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <Award className="w-4 h-4" /> Reservar
          </button>
          <button onClick={() => setCallOpen(true)}
            className="text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
            <Phone className="w-4 h-4" /> Reservar llamada
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
            className="text-sm font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white hover:opacity-90 transition-all shadow shadow-pink-500/30">
            <Share2 className="w-4 h-4" /> Compartir
          </button>

          {/* Internal-chat-only notice */}
          <div className="hidden lg:flex ml-auto items-center gap-1.5 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
            <Lock className="w-3 h-3" /> Comunicación 100% por chat interno
          </div>
        </div>

        {/* Aviso perfil no reclamado */}
        {!claimed && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              Perfil aún no reclamado — las reservas estarán disponibles cuando el dueño lo verifique.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-gray-50" style={{ scrollbarWidth: 'none' }}>
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div key={activeTab} className="max-w-5xl mx-auto px-4 py-6 animate-fade-up">
        {/* ── TAB CONTENT ── */}
        {activeTab === 'about' && <AboutTab artist={artist} />}
        {activeTab === 'live' && <LiveTab artist={artist} currentStream={currentStream} onChat={handleChat} />}
        {activeTab === 'exclusive' && <ExclusiveContentTab artist={artist} />}
        {activeTab === 'gallery' && <GalleryTab artist={artist} onSelect={setSelectedMedia} />}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {isModuleOn('classes') && (artist as any).classPackages?.length > 0 && (
              <div className="card-white rounded-2xl p-5 border-2 border-pink-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2"><Video className="w-5 h-5 text-pink-500" /> Clases online en directo</h3>
                  <button onClick={() => { if (!guardSale()) return; setClassBookingOpen(true); }} className="btn-orange text-sm py-2 px-4">Reservar clase</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(artist as any).classPackages.map((p: any) => (
                    <button key={p.id} onClick={() => { if (!guardSale()) return; setClassBookingOpen(true); }} className="text-left p-4 rounded-xl border border-gray-100 hover:border-pink-300 hover:shadow-sm transition-all">
                      <p className="text-[10px] font-black uppercase text-gray-400">{p.capacity === 1 ? 'Privada' : p.capacity === 2 ? 'Dúo' : `Grupo ${p.capacity}`}</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{p.name}</p>
                      <p className="text-pink-600 font-black text-lg mt-1">€{p.price}</p>
                      <p className="text-[11px] text-gray-400">{p.duration_minutes}min · hasta {p.capacity} pers.</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <OffersTab artist={artist} onBook={handleBookPackage} onCustom={() => setShowCustomOffer(true)} />
          </div>
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
              <span className="font-bold text-gray-900 dark:text-white">{selectedMedia.title}</span>
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

      <VenueReservationModal
        open={venueResOpen}
        onClose={() => setVenueResOpen(false)}
        venueId={artist.id}
        venueName={artist.name}
      />
      <CallBookingModal open={callOpen} onClose={() => setCallOpen(false)} />

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

      <PaymentGateway open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />

      {classBookingOpen && (
        <ClassPackageBookingModal
          artist={{ id: artist.id, name: artist.name, userId: (artist as any).userId, avatar: artist.avatar, classPackages: (artist as any).classPackages }}
          onClose={() => setClassBookingOpen(false)}
        />
      )}

      <ArtistAdminPanel id={id} ownerUserId={(artist as any).userId} autoOpen={wantEdit} onSaved={() => window.location.reload()} />

      {/* Reclamar perfil — solo visible si no tiene dueño */}
      <div className="fixed z-[60] bottom-24 right-4 sm:bottom-8 sm:right-8">
        <ClaimProfileButton
          targetTable="artists"
          targetId={id!}
          targetName={artist.name}
          hasOwner={!!(artist as any).userId}
        />
      </div>
    </div>
  );
};

// ── ABOUT TAB ───────────────────────────────────────────────────────────────
const AboutTab: React.FC<{ artist: Artist }> = ({ artist }) => (
  <div className="space-y-4">
    {/* Métricas pro (sustituye la vieja tarjeta de Estadísticas) */}
    <HighlightsBar artist={artist} />

    {/* Módulo principal (subido y prominente): Vídeo · Próximos eventos · Cursos */}
    <ServiceCards artist={artist} />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="card-white rounded-2xl p-5">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Biografía</h3>
          <p className="text-gray-600 leading-relaxed">{artist.bio}</p>
        </div>

        {artist.performanceStyle && (
          <div className="card-white rounded-2xl p-5">
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">🎭 Estilo</h3>
            <p className="text-gray-600">{artist.performanceStyle}</p>
          </div>
        )}

        <div className="card-white rounded-2xl p-5">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">Géneros y especialidades</h3>
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
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-orange" /> Idiomas
            </h3>
            <div className="flex flex-wrap gap-2">
              {artist.languages.map(l => (
                <span key={l} className="bg-gray-50 text-gray-700 text-sm font-medium px-3 py-1 rounded-lg">{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <SocialLinksCard artist={artist} />
      </div>
    </div>

    {/* Ubicación tipo mapa */}
    <LocationCard artist={artist} />

    {/* Llamada a la acción */}
    <ContactCTA artist={artist} />
  </div>
);

// ── HIGHLIGHTS BAR (métricas pro, sustituye Estadísticas) ─────────────────────
const HighlightsBar: React.FC<{ artist: Artist }> = ({ artist }) => {
  const langs = (artist.languages && artist.languages.length ? artist.languages : ['Español']);
  const items = [
    { icon: <Star className="w-5 h-5 fill-amber-400 text-amber-400" />, value: `${artist.rating || 0}`, sub: `${(artist.reviews || 0).toLocaleString()} reseñas` },
    { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, value: `${(artist.completedBookings || 0).toLocaleString()}`, sub: 'reservas completadas' },
    { icon: <Globe className="w-5 h-5 text-blue-500" />, value: `${langs.length}`, sub: langs.slice(0, 2).join(', ') },
    { icon: <Clock className="w-5 h-5 text-pink-500" />, value: 'Rápida', sub: 'suele responder pronto' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it, i) => (
        <div key={i} className="card-white rounded-2xl p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{it.icon}</span>
          <div className="min-w-0">
            <p className="font-display font-black text-gray-900 dark:text-white text-lg leading-none">{it.value}</p>
            <p className="text-gray-400 text-[11px] truncate mt-0.5">{it.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── SERVICE CARDS (Vídeo · Próximos eventos · Cursos) ─────────────────────────
const ServiceCards: React.FC<{ artist: Artist }> = ({ artist }) => {
  const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const day = (d: string) => (d || '').split('-')[2] || '--';
  const month = (d: string) => MONTHS[(Number((d || '').split('-')[1]) || 1) - 1] || '';
  const ytId = artist.featuredVideo ? getYouTubeId(artist.featuredVideo) : '';

  // Próximos eventos: eventos REALES de la BD donde el artista está en el lineup;
  // si no hay ninguno, cae a los ejemplos (mock) que lo referencien.
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase.from('events').select('id,title,date,event_date,venue_name,city,artists,owner_id,user_id,venue_id')
      .then(({ data }) => { if (!cancelled) setDbEvents(data || []); }, () => {});
    return () => { cancelled = true; };
  }, [artist.id]);
  const realEv = dbEvents
    // Eventos donde el artista está en el lineup, O eventos propios del local/perfil
    // (por dueño o por nombre del venue) — así los locales ven sus eventos.
    .filter(e =>
      (Array.isArray(e.artists) && e.artists.includes(artist.id)) ||
      e.owner_id === artist.id || e.user_id === artist.id ||
      String(e.venue_id || '') === String(artist.id) ||
      (!!e.venue_name && !!artist.name && e.venue_name === artist.name)
    )
    .map(e => ({ id: e.id, title: e.title || 'Evento', date: e.date || e.event_date || '', venueName: e.venue_name || '', city: e.city || '' }));
  const mockEv = EVENTS
    .filter(e => Array.isArray((e as any).artists) && (e as any).artists.includes(artist.id))
    .map(e => ({ id: e.id, title: e.title, date: e.date, venueName: (e as any).venueName || '', city: e.city }));
  const events = (realEv.length ? realEv : mockEv)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 3);
  const courses = (((artist as any).classPackages || []).length
    ? (artist as any).classPackages
    : ((artist as any).packages || [])).slice(0, 3);
  // Los locales no tienen cursos: se oculta esa tarjeta y la rejilla se ajusta.
  const isVenue = ['venue', 'business'].includes(String((artist as any).role || '').toLowerCase());
  return (
    <div className={`grid grid-cols-1 ${isVenue ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
      {/* 1) Vídeo */}
      <div className="card-white rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 pb-2 flex items-center justify-between">
          <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">🎬 Vídeo</h3>
          {ytId && <a href={artist.featuredVideo} target="_blank" rel="noreferrer" className="text-[10px] text-red-500 font-bold hover:underline">YouTube ↗</a>}
        </div>
        <div className="bg-black aspect-video">
          {ytId ? (
            <iframe src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`} title={artist.featuredVideoTitle || artist.name} className="w-full h-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
          ) : artist.featuredVideo ? (
            <video src={artist.featuredVideo} controls className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-xs gap-1"><Video className="w-6 h-6" /> Sin vídeo aún</div>
          )}
        </div>
      </div>

      {/* 2) Próximos eventos */}
      <div className="card-white rounded-2xl p-4 flex flex-col">
        <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">📅 Próximos eventos</h3>
        {events.length > 0 ? (
          <div className="space-y-2.5">
            {events.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-900 text-white flex flex-col items-center justify-center leading-none">
                  <span className="font-black text-sm">{day(e.date)}</span>
                  <span className="text-[8px] font-bold text-pink-400">{month(e.date)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{e.title}</p>
                  <p className="text-gray-400 text-[10px] truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{e.venueName || e.city}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-1 py-6"><Calendar className="w-6 h-6" /> Sin eventos próximos</div>
        )}
      </div>

      {/* 3) Cursos — no aplica a locales */}
      {!isVenue && (
      <div className="card-white rounded-2xl p-4 flex flex-col">
        <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">🎓 Cursos</h3>
        {courses.length > 0 ? (
          <div className="space-y-2.5">
            {courses.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100">
                {c.image && <img src={c.image} alt={c.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" loading="lazy" />}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{c.name}</p>
                  <p className="text-gray-400 text-[10px]">{c.duration_minutes ? `${c.duration_minutes} min` : 'Curso'}{c.capacity ? ` · hasta ${c.capacity} pers.` : ''}</p>
                </div>
                {c.price != null && <span className="flex-shrink-0 text-pink-600 font-black text-sm">€{c.price}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-1 py-6"><Award className="w-6 h-6" /> Sin cursos publicados</div>
        )}
      </div>
      )}
    </div>
  );
};

// ── LOCATION CARD (tipo mapa) ─────────────────────────────────────────────────
const LocationCard: React.FC<{ artist: Artist }> = ({ artist }) => {
  const a = artist as any;
  const address = a.location || [artist.city, artist.country].filter(Boolean).join(', ');
  const hasCoords = a.lat != null && a.lng != null && !(a.lat === 0 && a.lng === 0);
  const query = hasCoords ? `${a.lat},${a.lng}` : (address || 'España');
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <div className="card-white rounded-2xl overflow-hidden">
      <div className="relative h-52 bg-gray-100 dark:bg-gray-800">
        <iframe title="Mapa de ubicación" src={embedUrl} className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ubicación</p>
          <p className="font-bold text-gray-900 dark:text-white text-sm flex items-start gap-1">
            <MapPin className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
            <span className="break-words">{address || 'España'}</span>
          </p>
        </div>
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-orange text-sm py-2 px-4 flex items-center gap-1.5 flex-shrink-0">Ver en el mapa →</a>
      </div>
    </div>
  );
};

// ── CONTACT CTA ───────────────────────────────────────────────────────────────
const ContactCTA: React.FC<{ artist: Artist }> = ({ artist }) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
    <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/15 rounded-full blur-3xl pointer-events-none" />
    <div className="relative">
      <h3 className="font-display font-black text-lg sm:text-2xl leading-tight">¿Quieres trabajar con {artist.name}?</h3>
      <p className="text-white/85 text-sm mt-1">Reserva o escríbele por chat interno. Pago protegido con escrow.</p>
    </div>
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="relative bg-white text-pink-600 font-black rounded-full px-6 py-3 hover:scale-105 transition flex-shrink-0">
      Reservar ahora ↑
    </button>
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
  instagram:  'bg-purple-500',
  youtube:    'bg-red-500',
  facebook:   'bg-blue-500',
  spotify:    'bg-green-500',
  soundcloud: 'bg-pink-500',
  tiktok:     'bg-gray-900',
  twitch:     'bg-purple-600',
};

// ── FEATURED VIDEO CARD ────────────────────────────────────────────────────
const FeaturedVideoCard: React.FC<{ artist: Artist }> = ({ artist }) => {
  if (!artist.featuredVideo) return null;
  const ytId = getYouTubeId(artist.featuredVideo);
  return (
    <div className="card-white rounded-2xl overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{artist.featuredVideoTitle}</p>
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
        <h3 className="font-display font-bold text-gray-900 dark:text-white">🌐 Redes sociales</h3>
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
              className={`bg-gradient-to-br ${SOCIAL_COLORS[key] || 'bg-gray-400'} text-white aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 hover:scale-105 transition-transform p-2`}>
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
    <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">📊 Estadísticas</h3>
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
            <h3 className="font-display font-bold text-gray-900 dark:text-white text-xl mb-1">{currentStream.title}</h3>
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
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-orange" /> Próximos streams programados
      </h3>
      <div className="space-y-2">
        {artist.scheduledStreams.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <img src={s.thumbnail} alt={s.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm">{s.title}</p>
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
  const HS = [320, 240, 400, 260, 340, 220, 380];
  const items: MediaItem[] = gallery.length ? gallery : Array.from({ length: 9 }, (_, i) => ({
    id: `ex${i}`, type: 'photo',
    thumbnail: `https://picsum.photos/seed/${artist.id}g${i}/500/${HS[i % HS.length]}`,
    url: `https://picsum.photos/seed/${artist.id}g${i}/1000/1200`,
    title: 'Foto',
  } as MediaItem));
  return (
    <>
      {gallery.length === 0 && <p className="text-xs text-gray-400 mb-3">Ejemplos — aún no hay fotos publicadas.</p>}
      <div className="columns-2 sm:columns-3 gap-3">
        {items.map(m => (
          <button key={m.id} onClick={() => onSelect(m)}
            className="mb-3 w-full block overflow-hidden rounded-2xl group relative break-inside-avoid">
            <img src={m.thumbnail} alt={m.title} loading="lazy" className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
            {m.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center"><Play className="w-5 h-5 fill-brand-orange text-brand-orange ml-0.5" /></div>
              </div>
            )}
            {m.duration && <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{m.duration}</div>}
          </button>
        ))}
      </div>
    </>
  );
};

// ── OFFERS TAB ──────────────────────────────────────────────────────────────
const OffersTab: React.FC<{ artist: Artist; onBook: (p: OfferPackage) => void; onCustom: () => void }> = ({ artist, onBook, onCustom }) => {
  const packages = artist.packages || [];
  return (
    <div className="space-y-6">
      <div className="bg-brand-orange rounded-2xl p-4 sm:p-5 border border-pink-100">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-brand-orange flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Solo comunicación por chat interno</p>
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
              <h3 className="font-display font-black text-gray-900 dark:text-white text-lg leading-tight mb-1">{pkg.name}</h3>
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

      <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold text-gray-900 dark:text-white">¿Necesitas algo personalizado?</p>
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
        <p className="text-5xl font-black text-gray-900 dark:text-white leading-none">{artist.rating}</p>
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
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{r.user}</p>
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
const WEEK_SHORT: Record<string, string> = {
  Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue',
  Viernes: 'Vie', Sábado: 'Sáb', Domingo: 'Dom',
};
const WEEK_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function normalizeSlots(raw: any[]): { day: string; from: string; to: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item =>
    typeof item === 'string'
      ? { day: item, from: '', to: '' }
      : { day: item.day || '', from: item.from || '', to: item.to || '' }
  ).filter(s => s.day);
}

const AvailabilityTab: React.FC<{ artist: Artist; onChat: () => void }> = ({ artist, onChat }) => {
  const slots = normalizeSlots(artist.availability as any[]);
  const slotMap = Object.fromEntries(slots.map(s => [s.day, s]));

  return (
    <div className="space-y-4">
      <div className="card-white rounded-2xl p-5">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-1">📅 Disponibilidad semanal</h3>
        <p className="text-gray-500 text-sm mb-4">Días y horas habituales — confirma por chat para fechas concretas</p>

        <div className="space-y-2">
          {WEEK_ORDER.map(day => {
            const slot = slotMap[day];
            const available = !!slot;
            return (
              <div key={day}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${available ? 'border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100' : 'border-gray-100 bg-gray-50 opacity-40'}`}
                onClick={() => available && onChat()}
              >
                <span className={`text-sm font-bold ${available ? 'text-gray-900' : 'text-gray-400'}`}>
                  <span className="inline-block w-6 text-gray-400 text-xs">{WEEK_SHORT[day]}</span>
                  {day}
                </span>
                {available ? (
                  slot.from && slot.to
                    ? <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full">{slot.from} – {slot.to}</span>
                    : <span className="text-xs font-bold text-orange-500">✓ Disponible</span>
                ) : (
                  <span className="text-xs text-gray-300">No disponible</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-white rounded-2xl p-5">
        <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">¿No ves tu fecha?</h3>
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
