import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Users, Clock, CheckCircle, Star, MessageSquare, Bell, Heart, Share2, Calendar, Music2, Instagram, Youtube, Facebook, Globe, Headphones, Video, Loader2, Phone } from 'lucide-react';
import EntityAdminPanel from '../components/EntityAdminPanel';
import DemoBadge from '../components/DemoBadge';
import { fixText } from '../lib/text';
import { CardGridSkeleton } from '../components/Skeleton';
import ClaimProfileButton from '../components/ClaimProfileButton';
import { isClaimed, UNCLAIMED_TOAST } from '../lib/ownership';
import type { Venue } from '../data/mockData';
import { Badge, StarRating, EmptyState, Button, Avatar } from '../components/ui';
import { FilterFacet, ActiveFilterBar, FilterPanel } from '../components/SmartFilters';
import { useAuthStore, useUIStore, getYouTubeId, useSiteConfigStore } from '../store/appStore';
import BookingModal from '../components/BookingModal';
import VenueReservationModal from '../components/VenueReservationModal';
import CallBookingModal from '../components/CallBookingModal';
import { supabase } from '../lib/supabase';
import { usePageMeta } from '../hooks/usePageMeta';
import { useCityOrder } from '../lib/cities';

// ── Carga venues reales de Supabase + merge con mock para no romper detalle ──
const cleanCity = (s: string | null | undefined) => (s || '').split(/[,\-\/(]/)[0].trim();

function venueIsOpenNowDb(v: any): boolean {
  if (v.is_open === true) return true;
  if (!v.open_time || !v.close_time) return false;
  const now = new Date();
  const toMin = (s: string) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const o = toMin(v.open_time), c = toMin(v.close_time);
  const cur = now.getHours() * 60 + now.getMinutes();
  return c > o ? (cur >= o && cur <= c) : (cur >= o || cur <= c);
}

function mapDbVenue(v: any): Venue {
  return {
    id:          v.id,
    name:        fixText(v.name),
    type:        (v.type || 'club') as Venue['type'],
    city:        cleanCity(fixText(v.city)),
    address:     v.address || '',
    cover:       v.cover || v.image_url || v.avatar || '',
    avatar:      v.avatar || v.image_url || '',
    rating:      Number(v.rating) || 0,
    reviews:     Number(v.reviews) || 0,
    capacity:    Number(v.capacity) || 0,
    isOpen:      venueIsOpenNowDb(v),
    openHours:   v.open_hours || (v.open_time && v.close_time ? `${String(v.open_time).slice(0,5)}–${String(v.close_time).slice(0,5)}` : ''),
    description: v.description || '',
    isPremium:   !!v.is_premium,
    amenities:   Array.isArray(v.amenities) ? v.amenities : [],
    lat:         Number(v.lat) || 0,
    lng:         Number(v.lng) || 0,
    priceRange:  Number(v.price_range) || 2,
    userId:      v.user_id || v.owner_id || '',
    socials: {
      ...(v.instagram_url  ? { instagram:  v.instagram_url }  : {}),
      ...(v.tiktok_url     ? { tiktok:     v.tiktok_url }     : {}),
      ...(v.youtube_url    ? { youtube:    v.youtube_url }    : {}),
      ...(v.facebook_url   ? { facebook:   v.facebook_url }   : {}),
      ...(v.twitch_url     ? { twitch:     v.twitch_url }     : {}),
      ...(v.spotify_url    ? { spotify:    v.spotify_url }    : {}),
      ...(v.soundcloud_url ? { soundcloud: v.soundcloud_url } : {}),
      ...(v.website_url    ? { website:    v.website_url }    : {}),
    },
  } as Venue;
}

const TYPES = ['Todos', 'Discoteca', 'Club', 'Bar', 'Studio', 'Rooftop', 'Lounge', 'Restaurante'];

const VenuesPage: React.FC = () => {
  usePageMeta({
    title: 'Venues y locales latinos',
    description: 'Encuentra los mejores clubs, bares, estudios y rooftops para bailar salsa, bachata, kizomba y más. Por ciudad y abiertos ahora.',
  });
  const { id } = useParams<{ id: string }>();
  // Si hay :id, delegamos en el detalle (componente separado para que cada uno
  // mantenga su propio set estable de hooks — evita React error #300)
  if (id) return <VenueDetail venueId={id} />;
  return <VenuesList />;
};

const VenuesList: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Permite entrar filtrado por tipo desde una categoría (ej. /venues?type=Discoteca)
  const initialType = (() => {
    const t = params.get('type');
    if (!t) return ['Todos'];
    const match = TYPES.find(x => x.toLowerCase() === t.toLowerCase());
    return match ? [match] : ['Todos'];
  })();
  const [selectedType, setSelectedType] = useState(initialType);
  // Permite entrar filtrado por ciudad desde el selector de la cabecera (ej. /venues?city=Miami)
  const initialCity = (() => {
    const c = params.get('city');
    return c ? [c] : ['Todas'];
  })();
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [dbVenues, setDbVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga real desde Supabase
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      try {
        const { data } = await supabase.from('venues').select('*').is('deleted_at', null);
        if (cancelled) return;
        setDbVenues((data || []).map(mapDbVenue));
      } catch (e) { console.warn('[venues] load', e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // SOLO datos reales de la BD. Nada de mock: eran fantasmas imposibles de
  // borrar (borrabas en admin y seguían saliendo porque estaban hardcodeados).
  const allVenues = dbVenues;
  const cityOrder = useCityOrder();

  // Ciudades dinámicas: base + las que realmente tienen locales (por nº de locales)
  const CITIES = useMemo(() => {
    const counts = new Map<string, number>();
    allVenues.forEach(v => {
      const c = (v.city || '').trim();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    });
    const fromData = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const merged = [...cityOrder.filter(c => counts.has(c)), ...fromData.filter(c => !cityOrder.includes(c))];
    return ['Todas', ...Array.from(new Set(merged))];
  }, [allVenues, cityOrder]);

  // La etiqueta del filtro no siempre coincide con el `type` real de la BD:
  // "Discoteca" no existe como tipo (los clubes son 'club'); "Restaurante" es 'restaurant'.
  const typeAlias = (t: string): string => {
    const x = t.toLowerCase();
    if (x === 'discoteca') return 'club';
    if (x === 'restaurante') return 'restaurant';
    return x;
  };
  const filtered = useMemo(() => {
    return allVenues.filter(v => {
      const matchType = selectedType.includes('Todos') || selectedType.some(t => typeAlias(v.type) === typeAlias(t));
      const matchCity = selectedCity.includes('Todas') || selectedCity.includes(v.city);
      const matchOpen = !onlyOpen || v.isOpen;
      return matchType && matchCity && matchOpen;
    });
  }, [allVenues, selectedType, selectedCity, onlyOpen]);

  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedType.filter(t => t !== 'Todos').map(t => ({ label: t, onRemove: () => setSelectedType(prev => { const n = prev.filter(x => x !== t && x !== 'Todos'); return n.length ? n : ['Todos']; }) })),
    ...selectedCity.filter(c => c !== 'Todas').map(c => ({ label: `📍 ${c}`, onRemove: () => setSelectedCity(prev => { const n = prev.filter(x => x !== c && x !== 'Todas'); return n.length ? n : ['Todas']; }) })),
  ];
  if (onlyOpen) activeChips.push({ label: '🟢 Abiertos', onRemove: () => setOnlyOpen(false) });
  const clearAll = () => { setSelectedType(['Todos']); setSelectedCity(['Todas']); setOnlyOpen(false); };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-950 to-black p-6 sm:p-8 text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-pink-300">🏛️ Locales</span>
            <h1 className="font-display font-black text-3xl sm:text-4xl mt-1.5 leading-tight">Locales y clubs latinos</h1>
            <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-xl">Clubs, estudios y espacios de entretenimiento latino cerca de ti</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <FilterPanel activeCount={activeChips.length} resultCount={filtered.length} onClear={clearAll}>
            <FilterFacet label="Tipo" icon={<span>🏛️</span>} options={TYPES} selected={selectedType} onChange={setSelectedType} />
            <FilterFacet label="Ciudad" icon={<span>📍</span>} options={CITIES} selected={selectedCity} onChange={setSelectedCity} collapsible limit={8} />
            <div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Opciones</span>
              <div className="flex gap-2 flex-wrap mt-2">
                <button
                  onClick={() => setOnlyOpen(!onlyOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyOpen ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500 hover:text-emerald-600'}`}
                >
                  🟢 Solo abiertos ahora
                </button>
              </div>
            </div>
          </FilterPanel>
          <div className="flex-1 min-w-0 overflow-x-auto">
            {!loading && (
              <ActiveFilterBar chips={activeChips} count={filtered.length} total={allVenues.length} noun="venues" onClearAll={clearAll} />
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-500 text-sm font-semibold mb-4">
            {loading ? 'Cargando locales…' : `${filtered.length} ${filtered.length === 1 ? 'local' : 'locales'}`}
          </p>
          {loading && filtered.length === 0 ? (
            <CardGridSkeleton count={8} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="🏛️" title="No hay venues" description="Intenta con otros filtros" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-up">
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
  <div onClick={onClick} className="group bg-surface-elevated rounded-3xl overflow-hidden cursor-pointer shadow-elevation-1 hover:shadow-elevation-3 hover:-translate-y-1 transition-all duration-300 border border-hairline/10">
    <div className="relative h-44 overflow-hidden bg-surface-elevated-2">
      <img src={venue.cover} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

      {/* Estado en tiempo real */}
      <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full shadow ${venue.isOpen ? 'bg-emerald-500 text-white' : 'bg-gray-900/85 text-white'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${venue.isOpen ? 'bg-white animate-pulse' : 'bg-red-400'}`} /> {venue.isOpen ? 'Abierto' : 'Cerrado'}
      </span>

      {/* Favorito */}
      <button onClick={e => e.stopPropagation()} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 grid place-items-center text-white group-hover:bg-pink-500 transition">
        <Heart className="w-4 h-4" />
      </button>

      {/* Tipo + Premium */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
        <span className="bg-white/90 text-gray-700 text-[10px] px-2 py-1 rounded-lg capitalize font-bold">{venue.type}</span>
        {venue.isPremium && <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">👑 PRO</span>}
      </div>

      {/* Ejemplo / demo */}
      <DemoBadge ownerId={venue.userId as string} className="absolute bottom-3 right-3 z-10" />
    </div>
    <div className="p-4">
      <h3 className="text-ink-primary font-black text-base line-clamp-1">{venue.name}</h3>
      <div className="flex items-center gap-1.5 text-ink-tertiary text-xs mt-1">
        <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" /> {venue.city}
        <span className="text-ink-tertiary">·</span>
        <span className="font-bold text-ink-secondary">{'€'.repeat(venue.priceRange)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2.5">
        {venue.rating > 0 ? (
          <span className="inline-flex items-center gap-1 text-amber-500 font-bold text-sm">
            <Star className="w-4 h-4 fill-amber-400" />{venue.rating}
            <span className="text-ink-tertiary font-normal text-xs">({venue.reviews})</span>
          </span>
        ) : <span />}
        <span className="text-ink-tertiary text-[11px] flex items-center gap-1 truncate"><Clock className="w-3 h-3 flex-shrink-0" /> {venue.openHours}</span>
      </div>
      {!venue.userId && (
        <div className="mt-3" onClick={e => e.stopPropagation()}>
          <ClaimProfileButton targetTable="venues" targetId={String(venue.id)} targetName={venue.name} fullWidth />
        </div>
      )}
    </div>
  </div>
);

const SOCIAL_COLORS: Record<string, string> = {
  instagram:  'bg-purple-500',
  youtube:    'bg-red-500',
  facebook:   'bg-blue-500',
  spotify:    'bg-green-500',
  soundcloud: 'bg-pink-500',
  tiktok:     'bg-gray-900',
  twitch:     'bg-purple-600',
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
  { id: 'about' as const,   label: 'Sobre el local', icon: '📍', module: 'about' },
  { id: 'events' as const,  label: 'Eventos',        icon: '📅', module: 'events' },
  { id: 'gallery' as const, label: 'Galería',        icon: '📸', module: 'gallery' },
  { id: 'reviews' as const, label: 'Reseñas',        icon: '⭐', module: 'reviews' },
];

const VenueDetail: React.FC<{ venueId: string }> = ({ venueId }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'gallery' | 'reviews'>('about');
  const profileModules = useSiteConfigStore(s => s.profileModules);
  const isModuleOn = (modId: string) => profileModules.find(m => m.id === modId)?.enabled !== false;
  const visibleVenueTabs = VENUE_TABS.filter(t => isModuleOn(t.module));
  useEffect(() => {
    if (!visibleVenueTabs.some(t => t.id === activeTab)) setActiveTab('about');
  }, [profileModules]); // eslint-disable-line react-hooks/exhaustive-deps
  const [bookingOpen, setBookingOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    const finish = (v: Venue | null) => {
      if (cancelled || done) return; done = true;
      setVenue(v); setLoadingVenue(false);
    };
    // Safety-timeout: si la consulta se cuelga/rechaza, deja de mostrar el spinner (venue no encontrado).
    const timer = setTimeout(() => finish(null), 8000);
    supabase.from('venues').select('*').eq('id', venueId).maybeSingle().then(
      ({ data }) => { clearTimeout(timer); finish(data ? mapDbVenue(data) : null); },
      () => { clearTimeout(timer); finish(null); }
    );
    return () => { cancelled = true; clearTimeout(timer); };
  }, [venueId]);

  // Datos reales enriquecidos: vídeo y redes del dueño (perfil), eventos del local y horarios por día.
  // El local (venues) y la cuenta (profiles) son tablas distintas — "Editar perfil" guarda en
  // profiles, así que si el local no tiene sus propias redes, usamos las de la cuenta del dueño.
  const [ownerVideo, setOwnerVideo] = useState<{ url: string; title: string } | null>(null);
  const [ownerSocials, setOwnerSocials] = useState<Record<string, string>>({});
  const [realEvents, setRealEvents] = useState<any[]>([]);
  const [dayHours, setDayHours] = useState<any[]>([]);
  const [venueReviews, setVenueReviews] = useState<{ id: string; rating: number; comment: string; created_at: string; userName: string; avatar: string }[]>([]);
  useEffect(() => {
    if (!venue) return;
    const ownerId = String(venue.userId || '');
    if (ownerId) {
      supabase.from('profiles')
        .select('youtube_url, featured_video, featured_video_title, instagram_url, tiktok_url, facebook_url, twitch_url, spotify_url, soundcloud_url, website_url')
        .eq('id', ownerId).maybeSingle().then(({ data }) => {
          if (!data) return;
          const url = data.featured_video || data.youtube_url;
          if (url) setOwnerVideo({ url, title: data.featured_video_title || `Vídeo de ${venue.name}` });
          const socials: Record<string, string> = {};
          if (data.instagram_url)  socials.instagram = data.instagram_url;
          if (data.tiktok_url)     socials.tiktok = data.tiktok_url;
          if (data.youtube_url)    socials.youtube = data.youtube_url;
          if (data.facebook_url)   socials.facebook = data.facebook_url;
          if (data.twitch_url)     socials.twitch = data.twitch_url;
          if (data.spotify_url)    socials.spotify = data.spotify_url;
          if (data.soundcloud_url) socials.soundcloud = data.soundcloud_url;
          if (data.website_url)    socials.website = data.website_url;
          setOwnerSocials(socials);
        }, () => {});
    }
    supabase.from('events').select('id,title,date,time,price,venue_id,venue_name,owner_id,user_id,cover,image_url').is('deleted_at', null).then(
      ({ data }) => {
        const list = (data || []).filter((e: any) =>
          String(e.venue_id || '') === String(venue.id) ||
          (!!e.venue_name && e.venue_name === venue.name) ||
          (!!ownerId && (e.owner_id === ownerId || e.user_id === ownerId)));
        setRealEvents(list.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')));
      }, () => {});
    supabase.from('venue_hours').select('*').eq('venue_id', venue.id).then(({ data }) => { if (data) setDayHours(data); }, () => {});
    supabase.from('reviews').select('id,user_id,rating,comment,created_at').eq('target_type', 'venue').eq('target_id', String(venue.id)).order('created_at', { ascending: false }).then(
      async ({ data }) => {
        const rows = data || [];
        if (rows.length === 0) { setVenueReviews([]); return; }
        const ids = [...new Set(rows.map((r: any) => r.user_id))];
        const { data: profs } = await supabase.from('profiles').select('id,full_name,avatar_url').in('id', ids);
        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
        setVenueReviews(rows.map((r: any) => ({
          id: r.id, rating: Number(r.rating) || 0, comment: r.comment || '', created_at: r.created_at,
          userName: profMap.get(r.user_id)?.full_name || 'Usuario', avatar: profMap.get(r.user_id)?.avatar_url || '',
        })));
      }, () => setVenueReviews([])
    );
  }, [venue?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const avgRating = venueReviews.length ? venueReviews.reduce((s, r) => s + r.rating, 0) / venueReviews.length : 0;

  const handleReserve = () => {
    if (!isClaimed(venue?.userId as string)) { addToast({ message: UNCLAIMED_TOAST, type: 'warning' }); return; }
    if (!isAuthenticated) { navigate('/auth'); return; }
    setBookingOpen(true);
  };

  if (loadingVenue) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;
  if (!venue) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl">📍</p>
      <h2 className="font-display font-black text-xl text-gray-900 dark:text-white">Local no encontrado</h2>
      <p className="text-gray-400 text-sm">Este local ya no existe o fue eliminado.</p>
      <button onClick={() => navigate('/venues')} className="btn-orange px-6 py-2">Ver locales</button>
    </div>
  );

  // El propio local tiene prioridad; si no tiene redes propias, usa las de la cuenta del dueño.
  const socials = { ...ownerSocials, ...(venue.socials || {}) };
  const socialHref = (key: string, value: string) => value.startsWith('http') ? value : `https://${key}.com/${value}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-10">
      {/* ── HERO BANNER · portada tipo revista ── */}
      <section className="relative h-80 sm:h-[26rem] overflow-hidden">
        <img src={venue.cover} alt={venue.name} className="w-full h-full object-cover kenburns" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/55 to-transparent" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

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
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Aforo {venue.capacity}</span>
                {venueReviews.length > 0 && (
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {avgRating.toFixed(1)} ({venueReviews.length})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIRA DE PRÓXIMOS EVENTOS (animada) ── */}
      {(() => {
        const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const mapped = realEvents.slice(0, 6).map(e => ({
          id: e.id, day: (e.date || '').split('-')[2] || '--',
          month: MONTHS[(Number((e.date || '').split('-')[1]) || 1) - 1] || '', title: e.title || 'Evento',
        }));
        const examples = [
          { id: 'ex1', day: '21', month: 'JUN', title: 'Noche de Salsa Cubana' },
          { id: 'ex2', day: '28', month: 'JUN', title: 'Bachata Sensual Night' },
          { id: 'ex3', day: '05', month: 'JUL', title: 'Festival Latino Summer' },
        ];
        const strip = mapped.length ? mapped : examples;
        if (strip.length === 0) return null;
        const chips = [...strip, ...strip]; // duplicado para el loop del marquee
        return (
          <div className="bg-gray-900 dark:bg-black overflow-hidden border-b border-white/5">
            <div className="flex items-center gap-2 py-2.5 whitespace-nowrap animate-marquee-left-slow">
              {chips.map((ev, i) => (
                <button key={`${ev.id}-${i}`} onClick={() => setActiveTab('events')}
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

      {/* ── ACTION BAR ── */}
      <div className="sticky top-14 z-30 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => navigate('/chat')}
            className="btn-orange text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <MessageSquare className="w-4 h-4" /> Chat interno
          </button>
          <button onClick={handleReserve} disabled={!isClaimed(venue.userId as string)}
            title={!isClaimed(venue.userId as string) ? 'Perfil no reclamado — reserva no disponible' : undefined}
            className="btn-outline text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
            <Calendar className="w-4 h-4" /> Reservar
          </button>
          <button onClick={() => setCallOpen(true)}
            className="text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
            <Phone className="w-4 h-4" /> Reservar llamada
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
          <button onClick={async () => {
              const url = window.location.href;
              if ((navigator as any).share) { try { await (navigator as any).share({ title: `${venue.name} · BailaNow`, text: `Mira ${venue.name} en BailaNow`, url }); return; } catch {} }
              try { await navigator.clipboard.writeText(url); addToast({ message: '✅ Enlace copiado — compártelo donde quieras', type: 'success' }); } catch {}
            }}
            className="text-sm font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white hover:opacity-90 transition-all shadow shadow-pink-500/30">
            <Share2 className="w-4 h-4" /> Compartir
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-gray-50" style={{ scrollbarWidth: 'none' }}>
          {visibleVenueTabs.map(t => (
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
      <div key={activeTab} className="max-w-5xl mx-auto px-4 py-6 animate-fade-up">

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-4">
              {/* CTA de reservas destacado */}
              <button onClick={handleReserve}
                className="w-full text-left relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-brand-orange to-pink-600 text-white shadow-lg hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-0.5 transition-all group">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-display font-black text-lg leading-tight">🎟️ Reserva tu mesa o entrada</p>
                    <p className="text-white/85 text-sm mt-0.5">Elige tu producto, paga y recibe tu QR de confirmación al instante.</p>
                  </div>
                  <span className="flex-shrink-0 bg-white text-brand-orange font-black rounded-xl px-4 py-2.5 group-hover:scale-105 transition-transform">Reservar →</span>
                </div>
              </button>

              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">Biografía</h3>
                <p className={`text-gray-600 leading-relaxed ${bioExpanded ? '' : 'line-clamp-3'}`}>{venue.description}</p>
                {(venue.description || '').length > 160 && (
                  <button onClick={() => setBioExpanded(v => !v)} className="text-brand-orange text-xs font-bold mt-1.5 hover:underline">
                    {bioExpanded ? 'Leer menos' : 'Leer más'}
                  </button>
                )}
              </div>

              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">🎭 Estilo</h3>
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white">🕐 Horario</h3>
                  <Badge variant={venue.isOpen ? 'green' : 'gray'}>{venue.isOpen ? 'Abierto ahora' : 'Cerrado'}</Badge>
                </div>
                {dayHours.length > 0 ? (
                  <div className="space-y-1.5">
                    {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((dname, d) => {
                      const h = dayHours.find((x: any) => x.day_of_week === d);
                      return (
                        <div key={d} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium">{dname}</span>
                          <span className={h?.is_open ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-400'}>
                            {h?.is_open ? `${String(h.open_time || '').slice(0,5)} – ${String(h.close_time || '').slice(0,5)}` : 'Cerrado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-brand-orange" />
                    <span className="text-gray-600 font-medium">{venue.openHours || '23:00 – 06:00'}</span>
                  </div>
                )}
              </div>

              {/* Featured YouTube Video — del dueño (perfil) */}
              {(() => {
                const vid = ownerVideo;
                if (!vid) return null;
                const ytId = getYouTubeId(vid.url);
                if (!ytId) return null;
                return (
                  <div className="card-white rounded-2xl overflow-hidden">
                    <div className="p-5 pb-3 flex items-center justify-between">
                      <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{vid.title}</p>
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
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">🌐 Redes sociales</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(socials).map(([key, handle]) => (
                    <a key={key}
                      href={socialHref(key, handle)}
                      target="_blank" rel="noreferrer"
                      className={`bg-gradient-to-br ${SOCIAL_COLORS[key] || 'bg-gray-400'} text-white aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 hover:scale-105 transition-transform p-2`}>
                      <SocialIcon kind={key} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{key}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Map (replaces Statistics) */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-3">📍 Ubicación</h3>
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

              {/* Próximos eventos — formato flyer (2x2) */}
              {(() => {
                const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
                const mapped = realEvents.slice(0, 4).map(e => ({
                  id: e.id,
                  day: (e.date || '').split('-')[2] || '--',
                  month: MONTHS[(Number((e.date || '').split('-')[1]) || 1) - 1] || '',
                  title: e.title || 'Evento',
                  cover: e.cover || e.image_url || '',
                }));
                const examples = [
                  { id: 'ex1', day: '21', month: 'JUN', title: 'Noche de Salsa Cubana', cover: '' },
                  { id: 'ex2', day: '28', month: 'JUN', title: 'Bachata Sensual Night', cover: '' },
                  { id: 'ex3', day: '05', month: 'JUL', title: 'Festival Latino Summer', cover: '' },
                  { id: 'ex4', day: '12', month: 'JUL', title: 'Reggaeton Party', cover: '' },
                ];
                const list = mapped.length ? mapped : examples;
                return (
                  <div className="card-white rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-bold text-gray-900 dark:text-white">📅 Próximos eventos</h3>
                      <button onClick={() => setActiveTab('events')} className="text-[11px] font-bold text-pink-500 hover:underline">Ver todos</button>
                    </div>
                    {mapped.length === 0 && <p className="text-[11px] text-gray-400 mb-3">Ejemplos — aún no hay eventos publicados.</p>}
                    <div className="grid grid-cols-2 gap-2.5">
                      {list.map((ev, i) => (
                        <button key={ev.id} onClick={() => ev.id.startsWith('ex') ? setActiveTab('events') : navigate(`/eventos/${ev.id}`)}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden text-left group bg-gradient-to-br from-fuchsia-900 via-purple-900 to-gray-950">
                          {ev.cover && <img src={ev.cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
                          <div className="absolute top-2 left-2 bg-white/95 rounded-lg px-1.5 py-1 text-center leading-none shadow">
                            <div className="font-black text-sm text-gray-900">{ev.day}</div>
                            <div className="text-[8px] font-bold text-pink-600">{ev.month}</div>
                          </div>
                          <p className="absolute bottom-2 left-2 right-2 text-white font-black text-[11px] leading-tight line-clamp-2 drop-shadow">{ev.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'events' && (() => {
          const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
          const mapped = realEvents.map(e => ({
            id: e.id,
            day: (e.date || '').split('-')[2] || '--',
            month: MONTHS[(Number((e.date || '').split('-')[1]) || 1) - 1] || '',
            title: e.title || 'Evento',
            time: e.time ? String(e.time).slice(0, 5) : '',
            price: e.price != null ? Number(e.price) : null,
          }));
          const examples = [
            { id: 'ex1', day: '21', month: 'JUN', title: 'Noche de Salsa Cubana', time: '22:00', price: 20 },
            { id: 'ex2', day: '28', month: 'JUN', title: 'Bachata Sensual Night', time: '21:00', price: 25 },
          ];
          const events = mapped.length ? mapped : examples;
          return (
            <div className="space-y-3">
              {mapped.length === 0 && <p className="text-xs text-gray-400 mb-1">Ejemplos — aún no hay eventos publicados.</p>}
              {events.map(ev => (
                <div key={ev.id} onClick={() => ev.id.startsWith('ex') ? null : navigate(`/eventos/${ev.id}`)}
                  className="card-white rounded-2xl p-4 flex gap-4 hover:shadow-card-hover transition-shadow cursor-pointer">
                  <div className="w-16 flex-shrink-0 bg-gradient-to-br from-brand-orange to-pink-600 rounded-xl flex flex-col items-center justify-center p-2">
                    <span className="text-white font-black text-2xl leading-none">{ev.day}</span>
                    <span className="text-white/80 text-xs font-bold">{ev.month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white font-semibold truncate">{ev.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{venue.name}{ev.time ? ` · ${ev.time}` : ''}</p>
                    {ev.price != null && <p className="text-brand-orange text-sm font-bold mt-2">€{ev.price}</p>}
                  </div>
                  <button className="self-center bg-brand-orange text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-orange-dark transition-colors">🎫 Ver</button>
                </div>
              ))}
            </div>
          );
        })()}

        {activeTab === 'gallery' && (
          <EmptyState icon="📸" title="Aún no hay fotos" description="Este local todavía no ha subido fotos a su galería." />
        )}

        {activeTab === 'reviews' && (
          venueReviews.length === 0 ? (
            <EmptyState icon="⭐" title="Aún no hay reseñas" description="Sé el primero en valorar este local." />
          ) : (
            <div className="space-y-4">
              <div className="card-white rounded-2xl p-5 flex items-center gap-6">
                <div className="text-center">
                  <p className="font-black text-4xl text-gray-900 dark:text-white">{avgRating.toFixed(1)}</p>
                  <StarRating rating={avgRating} count={venueReviews.length} size="md" className="mt-1" />
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map(s => {
                    const count = venueReviews.filter(r => Math.round(r.rating) === s).length;
                    const pct = Math.round((count / venueReviews.length) * 100);
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
              {venueReviews.map(r => (
                <div key={r.id} className="card-white rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar src={r.avatar} name={r.userName} size="sm" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{r.userName}</p>
                      <p className="text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-gray-600 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <VenueReservationModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        venueId={String(venue.id)}
        venueName={venue.name}
      />
      <CallBookingModal open={callOpen} onClose={() => setCallOpen(false)} />

      <EntityAdminPanel kind="venue" id={venueId} ownerUserId={venue?.userId as string} />
      <div className="fixed z-[60] bottom-48 right-4 sm:bottom-8 sm:right-8">
        <ClaimProfileButton
          targetTable="venues"
          targetId={venueId!}
          targetName={venue?.name || 'Local'}
          hasOwner={!!venue?.userId}
        />
      </div>
    </div>
  );
};

export default VenuesPage;
