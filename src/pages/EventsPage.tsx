import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapPin, Clock, Users, Calendar, Star, MessageSquare,
  Bell, Heart, Share2, CheckCircle, Music2,
  Globe, Headphones, Video, Ticket, Play, ChevronRight, Loader2,
  Award, Radio,
} from 'lucide-react';
import EventAdminPanel from '../components/EventAdminPanel';
import DemoBadge from '../components/DemoBadge';
import ClaimProfileButton from '../components/ClaimProfileButton';
import { isClaimed, UNCLAIMED_TOAST } from '../lib/ownership';
import { EVENTS, ARTISTS, VENUES } from '../data/mockData';
import type { Artist, Event as EventType } from '../data/mockData';
import { Badge, StarRating, EmptyState, Button, Avatar } from '../components/ui';
import { FilterFacet, ActiveFilterBar, FilterPanel } from '../components/SmartFilters';
import { useAuthStore, useUIStore, getYouTubeId, useSiteConfigStore } from '../store/appStore';
import BookingModal from '../components/BookingModal';
import EventTicketModal from '../components/EventTicketModal';
import { VenueSectionsSelector } from '../components/VenueSections';
import { useTicketStore } from '../store/ticketStore';
import LiveFab from '../components/LiveFab';
import { supabase } from '../lib/supabase';
import { usePageMeta } from '../hooks/usePageMeta';

const cleanCity = (s: string | null | undefined) => (s || '').split(/[,\-\/(]/)[0].trim();

function mapDbEvent(e: any): EventType {
  return {
    id:          e.id,
    title:       e.title || 'Evento',
    description: e.description || '',
    venueId:     e.venue_id || '',
    venueName:   e.venue_name || '',
    city:        cleanCity(e.city),
    date:        e.date || e.event_date || '',
    time:        e.time || e.start_time || '20:00',
    endTime:     e.end_time || '23:00',
    cover:       e.cover || e.image_url || e.image || '',
    category:    Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []),
    price:       Number(e.price) || 0,
    currency:    e.currency || 'EUR',
    capacity:    Number(e.capacity) || 0,
    attending:   Number(e.attending) || 0,
    isOnline:    !!e.is_online,
    isFeatured:  !!e.is_featured,
    isPremium:   !!e.is_premium,
    artists:     Array.isArray(e.artists) ? e.artists : [],
    lat:         Number(e.lat) || 0,
    lng:         Number(e.lng) || 0,
  };
}

const CATEGORIES = ['Todos', 'Salsa', 'Salsa Cubana', 'Salsa Colombiana (Caleña)', 'Bachata', 'Bachata Dominicana', 'Bachata Moderna', 'Bachata Sensual', 'Bachata Urbana', 'Cha-cha-chá', 'Cumbia', 'Reparto Cubano', 'Festival', 'Masterclass', 'Online', 'Reggaeton', 'Timba'];
const BASE_CITIES = ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Paris'];

// ── Event featured videos (mock) ──
const EVENT_VIDEOS: Record<string, { url: string; title: string }> = {
  e1: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Marley y Leo Bailando Bachata Sensual En Madrid' },
  e2: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Masterclass Bachata Sensual — Preview' },
  e3: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Festival Latino BCN 2025 — Aftermovie' },
  e5: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Noche de Timba — La Clave Paris' },
  e6: { url: 'https://www.youtube.com/watch?v=kBRWBfKVkkw', title: 'Bachata & Reggaeton Open Air Sevilla' },
};

// ── Event gallery (mock) ──
const eventGallery = (eventId: string) =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `${eventId}-g${i}`,
    url: `https://picsum.photos/seed/${eventId}gal${i}/600/400`,
    title: `Foto ${i + 1}`,
    isVideo: i === 0 || i === 3,
  }));

/* ══════════════════════════════════════════════════════════════════════════
   ROUTER WRAPPER — prevents React #300
   ══════════════════════════════════════════════════════════════════════════ */
const EventsPage: React.FC = () => {
  usePageMeta({
    title: 'Eventos latinos',
    description: 'Festivales, socials, masterclasses y noches latinas. Encuentra los mejores eventos de salsa, bachata, kizomba y reggaetón cerca de ti.',
  });
  const { id } = useParams<{ id: string }>();
  if (id) return <EventDetail eventId={id} />;
  return <EventsList />;
};

/* ══════════════════════════════════════════════════════════════════════════
   LIST VIEW — 4-column grid like Venues
   ══════════════════════════════════════════════════════════════════════════ */
const EventsList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string[]>(catParam ? [catParam] : ['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [dbEvents, setDbEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      try {
        const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
        if (cancelled) return;
        setDbEvents((data || []).map(mapDbEvent));
      } catch (e) { console.warn('[events] load', e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // Solo usar mock si no hay datos reales en BD
  const allEvents = useMemo(() => {
    return dbEvents.length > 0 ? dbEvents : EVENTS;
  }, [dbEvents]);

  // Ciudades dinámicas: base + las que realmente tienen eventos (ordenadas por nº de eventos)
  const CITIES = useMemo(() => {
    const counts = new Map<string, number>();
    allEvents.forEach(e => {
      const c = (e.city || '').trim();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    });
    const fromData = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const merged = [...BASE_CITIES.filter(c => counts.has(c)), ...fromData.filter(c => !BASE_CITIES.includes(c))];
    return ['Todas', ...Array.from(new Set(merged)).filter(c => c !== 'Online'), 'Online'];
  }, [allEvents]);

  const filtered = useMemo(() => {
    return allEvents.filter(e => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat.includes('Todos') || e.category.some(c => selectedCat.includes(c));
      const matchCity = selectedCity.includes('Todas')
        || selectedCity.includes(e.city)
        || (selectedCity.includes('Online') && e.isOnline);
      const matchOnline = !onlyOnline || e.isOnline;
      return matchSearch && matchCat && matchCity && matchOnline;
    });
  }, [allEvents, search, selectedCat, selectedCity, onlyOnline]);

  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedCat.filter(c => c !== 'Todos').map(c => ({ label: c, onRemove: () => setSelectedCat(prev => { const n = prev.filter(x => x !== c && x !== 'Todos'); return n.length ? n : ['Todos']; }) })),
    ...selectedCity.filter(c => c !== 'Todas').map(c => ({ label: `📍 ${c}`, onRemove: () => setSelectedCity(prev => { const n = prev.filter(x => x !== c && x !== 'Todas'); return n.length ? n : ['Todas']; }) })),
  ];
  if (onlyOnline) activeChips.push({ label: '🌐 Online', onRemove: () => setOnlyOnline(false) });
  const clearAll = () => { setSelectedCat(['Todos']); setSelectedCity(['Todas']); setOnlyOnline(false); setSearch(''); };

  const handleBuyTicket = (event: typeof EVENTS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }
    addToast({ message: `Procesando ticket para: ${event.title}`, type: 'success' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-950 to-black p-6 sm:p-8 text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-pink-300">🎉 Eventos</span>
            <h1 className="font-display font-black text-3xl sm:text-4xl mt-1.5 leading-tight">Eventos latinos</h1>
            <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-xl">Conciertos, festivales, sociales y fiestas cerca de ti</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 mb-2">
          <FilterPanel activeCount={activeChips.length} resultCount={filtered.length} onClear={clearAll}>
            <FilterFacet label="Categoría" icon={<span>🎵</span>} options={CATEGORIES} selected={selectedCat} onChange={setSelectedCat} collapsible limit={8} />
            <FilterFacet label="Ciudad" icon={<span>📍</span>} options={CITIES} selected={selectedCity} onChange={setSelectedCity} collapsible limit={8} />
            <div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Opciones</span>
              <div className="flex gap-2 flex-wrap mt-2">
                <button
                  onClick={() => setOnlyOnline(!onlyOnline)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyOnline ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  🌐 Solo Online
                </button>
              </div>
            </div>
          </FilterPanel>
          <div className="flex-1 min-w-0 overflow-x-auto">
            {!loading && (
              <ActiveFilterBar chips={activeChips} count={filtered.length} total={allEvents.length} noun="eventos" onClearAll={clearAll} />
            )}
          </div>
        </div>

        <div className="mt-6">
          {filtered.length === 0 ? (
            <EmptyState icon="🎉" title="No hay eventos" description="Prueba con otros filtros o ciudades"
              action={<button onClick={() => { setSearch(''); setSelectedCat(['Todos']); setSelectedCity(['Todas']); }} className="btn-outline text-sm">Limpiar filtros</button>} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-up">
              {filtered.map(event => (
                <EventCard key={event.id} event={event}
                  onClick={() => navigate(`/eventos/${event.id}`)}
                  onBuy={(e) => handleBuyTicket(event, e)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   CARD — vertical style matching Venues
   ══════════════════════════════════════════════════════════════════════════ */
const EventCard: React.FC<{
  event: typeof EVENTS[0];
  onClick: () => void;
  onBuy: (e: React.MouseEvent) => void;
}> = ({ event, onClick, onBuy }) => {
  const dateObj = new Date(event.date);
  const day = dateObj.toLocaleDateString('es-ES', { day: '2-digit' });
  const month = dateObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
  const pct = Math.round((event.attending / event.capacity) * 100);
  const linkedArtists = ARTISTS.filter(a => event.artists.includes(a.id));

  return (
    <div onClick={onClick} className="group bg-white rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-pink-500/10 hover:-translate-y-1 transition-all duration-300 border border-gray-100">
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img src={event.cover} alt={event.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <DemoBadge ownerId={(event as any).userId} className="absolute top-3 left-3 z-10" />
        <div className="absolute top-3 right-3 bg-gray-900 rounded-xl px-2.5 py-1.5 flex flex-col items-center shadow-lg">
          <span className="text-white font-black text-lg leading-none">{day}</span>
          <span className="text-pink-400 text-[10px] font-bold">{month}</span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {event.isFeatured && <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow">⭐ Destacado</span>}
          {event.isOnline && <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-1 rounded-full">🌐 Online</span>}
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-white text-[10px] font-medium">{pct}%</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-gray-900 font-black line-clamp-2 text-sm">{event.title}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
          <MapPin className="w-3 h-3" /> {event.isOnline ? 'Online' : event.city}
          <span className="mx-1">·</span>
          <Clock className="w-3 h-3" /> {event.time}
        </div>
        {/* Linked artist avatars */}
        {linkedArtists.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <div className="flex -space-x-2">
              {linkedArtists.slice(0, 3).map(a => (
                <img key={a.id} src={a.avatar} alt={a.name} title={a.name}
                  className="w-6 h-6 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 ml-1">
              {linkedArtists.length <= 2
                ? linkedArtists.map(a => a.name).join(', ')
                : `${linkedArtists[0].name} +${linkedArtists.length - 1}`}
            </span>
          </div>
        )}
        <div className="flex gap-1 flex-wrap mt-2">
          {event.category.slice(0, 2).map(c => (
            <span key={c} className="text-[10px] bg-pink-50 text-brand-orange px-2 py-0.5 rounded-full font-medium">{c}</span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-brand-orange font-bold text-lg">€{event.price}</span>
          <button
            onClick={onBuy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              pct >= 100 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-orange text-white hover:bg-brand-orange-dark hover:scale-105'
            }`}
            disabled={pct >= 100}
          >
            {pct >= 100 ? 'Agotado' : '🎫 Comprar'}
          </button>
        </div>
        {!(event as any).userId && (
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            <ClaimProfileButton targetTable="events" targetId={String(event.id)} targetName={event.title} fullWidth />
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   DETAIL VIEW — Premium artist-profile style
   ══════════════════════════════════════════════════════════════════════════ */
const EVENT_TABS_PHYSICAL = [
  { id: 'info'      as const, label: 'Info',          icon: '📍' },
  { id: 'sections'  as const, label: 'Localidades',   icon: '🎫' },
  { id: 'artists'   as const, label: 'Artistas',      icon: '🎶' },
  { id: 'sponsors'  as const, label: 'Sponsors',      icon: '🏆' },
  { id: 'gallery'   as const, label: 'Galería',       icon: '📸', module: 'gallery' },
  { id: 'reviews'   as const, label: 'Reseñas',       icon: '⭐', module: 'reviews' },
];

// Normaliza una fila real de `events` (BD) al shape que espera el render.
function normalizeEvent(r: any) {
  return {
    id: r.id, title: r.title || '', description: r.description || '',
    date: r.date || '', time: r.time || '', endTime: r.end_time || '',
    city: r.city || '', cover: r.cover || r.image_url || '',
    price: Number(r.price) || 0, capacity: Number(r.capacity) || 0,
    attending: Number(r.attending) || 0,
    category: Array.isArray(r.category) ? r.category : (r.category ? [r.category] : (r.type ? [r.type] : [])),
    artists: Array.isArray(r.artists) ? r.artists : [],
    lineup: Array.isArray(r.lineup) ? r.lineup : [],
    sponsors: Array.isArray(r.sponsors) ? r.sponsors : [],
    live_url: r.live_url || '',
    live_title: r.live_title || '',
    is_live: !!r.is_live,
    isOnline: !!r.is_online, isFeatured: !!r.is_featured, isPremium: !!r.is_premium,
    venueId: r.venue_id || '', venueName: r.venue_name || '',
    lat: r.lat, lng: r.lng,
    userId: r.user_id || r.owner_id || '',
  };
}

const EventDetail: React.FC<{ eventId: string }> = ({ eventId }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const { getSectionsByEvent } = useTicketStore();
  const [event, setEvent] = useState<any>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'sections' | 'artists' | 'sponsors' | 'gallery' | 'reviews'>('info');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);

  const loadEvent = () => {
    supabase.from('events').select('*').eq('id', eventId).maybeSingle().then(({ data }) => {
      setEvent(data ? normalizeEvent(data) : null);
      setLoadingEvent(false);
    });
  };

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Módulos globales (Admin → Categorías): gatean pestañas gallery/reviews
  const profileModules = useSiteConfigStore(s => s.profileModules);
  const isModuleOn = (modId?: string) => !modId || profileModules.find(m => m.id === modId)?.enabled !== false;
  useEffect(() => {
    if ((activeTab === 'gallery' && !isModuleOn('gallery')) || (activeTab === 'reviews' && !isModuleOn('reviews'))) {
      setActiveTab('info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileModules, activeTab]);

  if (loadingEvent) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;
  if (!event) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl">📅</p>
      <h2 className="font-display font-black text-xl text-gray-900">Evento no encontrado</h2>
      <p className="text-gray-400 text-sm">Este evento ya no existe o fue eliminado.</p>
      <button onClick={() => navigate('/eventos')} className="btn-orange px-6 py-2">Ver eventos</button>
    </div>
  );

  const dateObj = new Date(event.date);
  const pct = event.capacity ? Math.round((event.attending / event.capacity) * 100) : 0;
  const linkedArtists = ARTISTS.filter(a => event.artists.includes(a.id));
  const venue = VENUES.find(v => v.id === event.venueId);
  const video = EVENT_VIDEOS[event.id];

  const claimed = isClaimed(event.userId);

  const handleBuy = () => {
    if (!claimed) { addToast({ message: UNCLAIMED_TOAST, type: 'warning' }); return; }
    if (!isAuthenticated) { navigate('/auth'); return; }
    // Use EventTicketModal for physical events, BookingModal for online/services
    if (!event?.isOnline) {
      setTicketModalOpen(true);
    } else {
      setBookingOpen(true);
    }
  };

  const tabs = (event.isOnline
    ? [
        { id: 'info' as const,     label: 'Información', icon: '📍' },
        { id: 'artists' as const,  label: 'Artistas',    icon: '🎶' },
        { id: 'sponsors' as const, label: 'Sponsors',    icon: '🏆' },
      ]
    : EVENT_TABS_PHYSICAL
  ).filter((t: any) => isModuleOn(t.module));

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ── HERO BANNER ── */}
      <section className="relative h-72 sm:h-[420px] overflow-hidden">
        <img src={event.cover} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-black/20" />

        <button onClick={() => navigate('/eventos')}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-800 text-sm px-3 py-1.5 rounded-xl font-semibold transition-colors backdrop-blur-md z-10">
          ← Volver
        </button>

        {/* Date badge top right */}
        <div className="absolute top-4 right-4 bg-brand-orange rounded-2xl px-4 py-2 flex flex-col items-center shadow-lg z-10">
          <span className="text-white font-black text-2xl leading-none">
            {dateObj.toLocaleDateString('es-ES', { day: '2-digit' })}
          </span>
          <span className="text-white/80 text-xs font-bold uppercase">
            {dateObj.toLocaleDateString('es-ES', { month: 'short' })}
          </span>
        </div>

        {/* Hero info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Category tags */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {event.category.slice(0, 3).map((c: string) => (
                <span key={c} className="bg-brand-orange/90 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">{c}</span>
              ))}
              {event.isPremium && (
                <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">⭐ Premium</span>
              )}
              {event.isOnline && (
                <span className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">🌐 Online</span>
              )}
            </div>

            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-3">
              {event.title}
            </h1>

            <div className="flex items-center gap-4 text-white/80 text-sm flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {event.time} – {event.endTime}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {event.isOnline ? 'Online' : `${event.venueName}, ${event.city}`}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {event.attending.toLocaleString()}/{event.capacity.toLocaleString()}
              </span>
            </div>

            {/* Artist avatars in hero */}
            {linkedArtists.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                <div className="flex -space-x-3">
                  {linkedArtists.slice(0, 5).map(a => (
                    <img key={a.id} src={a.avatar} alt={a.name}
                      className="w-10 h-10 rounded-full border-3 border-white/30 object-cover hover:scale-110 transition-transform cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); navigate(`/artistas/${a.id}`); }}
                      title={a.name}
                    />
                  ))}
                </div>
                <span className="text-white/70 text-sm">
                  {linkedArtists.map(a => a.name).join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── STICKY ACTION BAR ── */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={handleBuy} disabled={!claimed}
            title={!claimed ? 'Perfil no reclamado — venta no disponible' : undefined}
            className="btn-orange text-sm py-2 px-5 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
            <Ticket className="w-4 h-4" /> {claimed ? `Comprar Ticket — €${event.price}` : 'No reclamado'}
          </button>
          <button onClick={() => navigate('/chat')}
            className="btn-outline text-sm py-2 px-4 flex items-center gap-1.5 whitespace-nowrap">
            <MessageSquare className="w-4 h-4" /> Contactar
          </button>
          <button onClick={() => {
            setFollowing(f => !f);
            addToast({ message: following ? 'Dejaste de seguir' : '¡Evento guardado!', type: 'success' });
          }}
            className={`text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${
              following ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <Bell className="w-4 h-4" /> {following ? 'Guardado' : 'Guardar'}
          </button>
          <button onClick={() => setLiked(l => !l)}
            className={`text-sm font-bold py-2 px-3 rounded-lg whitespace-nowrap transition-all ${
              liked ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); addToast({ message: 'Enlace copiado', type: 'success' }); }}
            className="text-sm font-bold py-2 px-3 rounded-lg whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200">
            <Share2 className="w-4 h-4" />
          </button>

          {/* Capacity bar in action bar */}
          <div className="hidden md:flex ml-auto items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-600">{pct}% vendido</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-gray-50" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
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

        {/* ═══ INFO TAB ═══ */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Description */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">Descripción</h3>
                <p className="text-gray-600 leading-relaxed">{event.description}</p>
              </div>

              {/* Event details card */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-4">📋 Detalles del evento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-brand-orange" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Fecha</p>
                      <p className="text-gray-900 font-semibold text-sm">
                        {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Horario</p>
                      <p className="text-gray-900 font-semibold text-sm">{event.time} – {event.endTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Lugar</p>
                      <p className="text-gray-900 font-semibold text-sm">{event.venueName}</p>
                      <p className="text-gray-400 text-xs">{event.city}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Precio</p>
                      <p className="text-gray-900 font-semibold text-sm">€{event.price}</p>
                      <p className="text-gray-400 text-xs">{event.attending}/{event.capacity} asistentes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Artists — compact row */}
              {linkedArtists.length > 0 && (
                <div className="card-white rounded-2xl p-5">
                  <h3 className="font-display font-bold text-gray-900 mb-4">🎤 Artistas & Bailarines confirmados</h3>
                  <div className="space-y-3">
                    {linkedArtists.map(artist => (
                      <div key={artist.id}
                        onClick={() => navigate(`/artistas/${artist.id}`)}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-pink-50 cursor-pointer transition-colors group">
                        <img src={artist.avatar} alt={artist.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand-orange/20 group-hover:ring-brand-orange/50 transition-all" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-sm">{artist.name}</span>
                            {artist.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />}
                            {artist.isPremium && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">PRO</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="capitalize">{artist.type === 'dj' ? 'DJ' : artist.type === 'dancer' ? 'Bailarín/a' : artist.type === 'band' ? 'Banda' : artist.type === 'singer' ? 'Cantante' : 'Instructor/a'}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {artist.rating}</span>
                            <span>·</span>
                            <span>{artist.genre.slice(0, 2).join(', ')}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-orange transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">Categorías & Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.category.map((c: string) => (
                    <span key={c} className="bg-pink-50 text-brand-orange border border-pink-100 text-sm font-semibold px-3 py-1 rounded-full">{c}</span>
                  ))}
                  {event.isOnline && <span className="bg-blue-50 text-blue-600 border border-blue-100 text-sm font-semibold px-3 py-1 rounded-full">Online</span>}
                  {event.isPremium && <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-sm font-semibold px-3 py-1 rounded-full">Premium</span>}
                </div>
              </div>

              {/* YouTube Video */}
              {video && (() => {
                const ytId = getYouTubeId(video.url);
                if (!ytId) return null;
                return (
                  <div className="card-white rounded-2xl overflow-hidden">
                    <div className="p-5 pb-3 flex items-center justify-between">
                      <h3 className="font-display font-bold text-gray-900 flex items-center gap-2">
                        🎬 Vídeo destacado
                      </h3>
                      <a href={video.url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1">
                        Ver en YouTube ↗
                      </a>
                    </div>
                    <div className="bg-black aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
                        title={video.title}
                        className="w-full h-full"
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{video.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{event.title} · YouTube</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Ticket CTA card */}
              <div className="card-white rounded-2xl p-5 border-2 border-brand-orange/20">
                <div className="text-center mb-4">
                  <p className="text-3xl font-black text-brand-orange">€{event.price}</p>
                  <p className="text-gray-400 text-xs mt-1">por persona</p>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Disponibilidad</span>
                    <span className={`font-bold ${pct > 80 ? 'text-red-500' : 'text-green-600'}`}>
                      {pct > 90 ? '¡Últimas plazas!' : pct > 70 ? 'Pocas plazas' : 'Disponible'}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 text-right">{event.attending}/{event.capacity} asistentes</p>
                </div>
                {claimed ? (
                  <Button variant="orange" className="w-full" onClick={handleBuy}>
                    🎫 Comprar Ticket
                  </Button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-xs text-amber-700 font-semibold">
                    🔒 Perfil no reclamado — la venta de entradas estará disponible cuando el organizador verifique el evento.
                  </div>
                )}
              </div>

              {/* Map (physical events only) */}
              {!event.isOnline && event.lat !== 0 && (
                <div className="card-white rounded-2xl p-5">
                  <h3 className="font-display font-bold text-gray-900 mb-3">📍 Ubicación</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <iframe
                      title={`Mapa de ${event.venueName}`}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.lng - 0.015}%2C${event.lat - 0.01}%2C${event.lng + 0.015}%2C${event.lat + 0.01}&layer=mapnik&marker=${event.lat}%2C${event.lng}`}
                      className="w-full h-48 border-0"
                      loading="lazy"
                    />
                  </div>
                  {venue && (
                    <button onClick={() => navigate(`/venues/${venue.id}`)}
                      className="w-full mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-pink-50 cursor-pointer transition-colors group">
                      <img src={venue.avatar} alt={venue.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 text-sm">{venue.name}</p>
                        <p className="text-gray-400 text-xs capitalize">{venue.type} · {venue.city}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                  )}
                </div>
              )}

              {/* Gallery preview */}
              <div className="card-white rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-gray-900">📸 Galería</h3>
                  <button onClick={() => setActiveTab('gallery')} className="text-[10px] text-brand-orange font-bold hover:underline">
                    Ver todo ↗
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {eventGallery(event.id).slice(0, 4).map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
                      <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      {img.isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="card-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-gray-900 mb-3">📊 Estadísticas</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Asistentes confirmados', value: event.attending.toLocaleString() },
                    { label: 'Artistas confirmados', value: linkedArtists.length.toString() },
                    { label: 'Categorías', value: event.category.length.toString() },
                    { label: 'Interesados', value: Math.round(event.attending * 1.8).toLocaleString() },
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

        {/* ═══ SECTIONS / LOCALIDADES TAB ═══ */}
        {activeTab === 'sections' && !event.isOnline && (
          <div className="space-y-4">
            <div className="card-white rounded-2xl p-5">
              <h3 className="font-display font-bold text-gray-900 mb-2">🎫 Selecciona tu localidad</h3>
              <p className="text-gray-400 text-sm">Elige tu zona, selecciona cantidad y compra tus entradas. Reserva temporal de 10 minutos.</p>
            </div>
            <VenueSectionsSelector
              eventId={event.id}
              onSelectSection={(section, qty) => {
                handleBuy();
              }}
            />
          </div>
        )}

        {/* ═══ ARTISTS TAB ═══ */}
        {activeTab === 'artists' && (
          <div className="space-y-6">
            {/* Lineup from DB (new system) */}
            {event.lineup && event.lineup.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-gray-900 mb-3">🎤 Lineup confirmado</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.lineup.map((entry: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => entry.artist_id ? navigate(`/artistas/${entry.artist_id}`) : undefined}
                      className={`flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm ${entry.artist_id ? 'cursor-pointer hover:shadow-md hover:border-brand-orange/30 transition-all' : ''}`}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-purple-100 flex-shrink-0">
                        {entry.avatar
                          ? <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-purple-600 font-black text-lg">{entry.name[0]}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{entry.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{entry.role}</span>
                          {entry.time_slot && <span className="text-xs text-gray-400">⏰ {entry.time_slot}</span>}
                        </div>
                        {entry.genre && <p className="text-xs text-gray-400 mt-0.5">{entry.genre}</p>}
                      </div>
                      {entry.artist_id && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked mock artists (legacy) */}
            {linkedArtists.length > 0 && (
              <div>
                {event.lineup?.length > 0 && <h3 className="font-display font-bold text-gray-900 mb-3">Artistas vinculados</h3>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {linkedArtists.map(artist => (
                    <div key={artist.id}
                      onClick={() => navigate(`/artistas/${artist.id}`)}
                      className="card-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300">
                      <div className="relative h-36 overflow-hidden">
                        <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        {artist.isLive && (
                          <Badge variant="red" className="absolute top-2 left-2 animate-pulse">🔴 EN VIVO</Badge>
                        )}
                        <div className="absolute bottom-3 left-3 flex items-center gap-3">
                          <img src={artist.avatar} alt={artist.name} className="w-14 h-14 rounded-xl border-2 border-white/40 object-cover" />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-bold">{artist.name}</span>
                              {artist.isVerified && <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400" />}
                            </div>
                            <span className="text-white/70 text-xs capitalize">{artist.type === 'dj' ? 'DJ' : artist.type === 'dancer' ? 'Bailarín/a' : artist.type === 'band' ? 'Banda' : artist.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {artist.rating} ({artist.reviews})</span>
                          <span>·</span>
                          <span>{artist.city}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {artist.genre.slice(0, 3).map(g => (
                            <span key={g} className="text-[10px] bg-pink-50 text-brand-orange px-2 py-0.5 rounded-full font-medium">{g}</span>
                          ))}
                        </div>
                        <button className="w-full mt-3 btn-outline text-xs py-2 flex items-center justify-center gap-1.5">
                          Ver perfil <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!event.lineup || event.lineup.length === 0) && linkedArtists.length === 0 && (
              <EmptyState icon="🎤" title="Sin artistas confirmados" description="Los artistas se publicarán pronto" />
            )}
          </div>
        )}

        {/* ═══ SPONSORS TAB ═══ */}
        {activeTab === 'sponsors' && (
          <div className="space-y-4">
            {event.sponsors && event.sponsors.length > 0 ? (
              <>
                <p className="text-gray-400 text-sm">{event.sponsors.length} patrocinadores de este evento</p>
                {/* Platinum / Gold first big */}
                {(['platinum', 'gold'] as const).map(tier => {
                  const list = event.sponsors.filter((s: any) => s.tier === tier);
                  if (list.length === 0) return null;
                  const tierLabel = tier === 'platinum' ? 'Platino' : 'Oro';
                  const tierColor = tier === 'platinum' ? 'bg-purple-100 border-purple-200' : 'bg-yellow-50 border-yellow-200';
                  return (
                    <div key={tier}>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">{tierLabel}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {list.map((s: any, i: number) => (
                          <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border bg-gradient-to-br ${tierColor} hover:shadow-md transition-all`}>
                            {s.logo
                              ? <img src={s.logo} alt={s.name} className="h-12 object-contain" />
                              : <Award className="w-10 h-10 text-gray-300" />}
                            <span className="font-bold text-gray-900 text-sm text-center">{s.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Silver / Bronze smaller */}
                {(['silver', 'bronze'] as const).map(tier => {
                  const list = event.sponsors.filter((s: any) => s.tier === tier);
                  if (list.length === 0) return null;
                  const tierLabel = tier === 'silver' ? 'Plata' : 'Bronce';
                  return (
                    <div key={tier}>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">{tierLabel}</p>
                      <div className="flex flex-wrap gap-3">
                        {list.map((s: any, i: number) => (
                          <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
                            className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:shadow-sm transition-all">
                            {s.logo
                              ? <img src={s.logo} alt={s.name} className="h-8 object-contain" />
                              : <Award className="w-6 h-6 text-gray-300" />}
                            <span className="font-semibold text-gray-700 text-sm">{s.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <EmptyState icon="🏆" title="Sin patrocinadores publicados" description="Contacta con el organizador para información sobre patrocinios" />
            )}
          </div>
        )}

        {/* ═══ GALLERY TAB ═══ */}
        {activeTab === 'gallery' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">Fotos y vídeos del evento</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {eventGallery(event.id).map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer">
                  <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  {img.isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-900 fill-gray-900 ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">{img.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ REVIEWS TAB ═══ */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="card-white rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <p className="font-black text-5xl text-gray-900">4.8</p>
                <div className="flex items-center gap-0.5 mt-1 justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < 5 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-1">{event.attending} asistentes</p>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {[
                  { stars: 5, pct: 72 }, { stars: 4, pct: 18 },
                  { stars: 3, pct: 6 },  { stars: 2, pct: 3 }, { stars: 1, pct: 1 },
                ].map(r => (
                  <div key={r.stars} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-3">{r.stars}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {[
              { name: 'Laura M.', rating: 5, text: 'Increíble noche. Los artistas estuvieron geniales y el ambiente fue espectacular. Sin duda repetiré.', time: 'Hace 3 días', avatar: 'L' },
              { name: 'Pablo S.', rating: 5, text: 'Mejor evento de salsa al que he ido en Madrid. La organización perfecta y el DJ increíble.', time: 'Hace 1 semana', avatar: 'P' },
              { name: 'Sofia K.', rating: 4, text: 'Muy bueno, pero se llenó mucho. Recomiendo llegar temprano. La música excelente.', time: 'Hace 2 semanas', avatar: 'S' },
            ].map((r, i) => (
              <div key={i} className="card-white rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange font-bold">{r.avatar}</div>
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
                <p className="text-gray-600 text-sm leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerId={event.id}
        providerName={event.title}
        source="booking"
        defaultConcept={`Ticket: ${event.title}`}
        defaultPrice={event.price}
        helperText={`${event.isOnline ? 'Online' : event.city} · ${event.time} – ${event.endTime}`}
      />

      <EventTicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
        eventDate={event.date}
        organizerId={event.userId}
        sections={getSectionsByEvent(event.id).map(s => ({
          id: s.id, name: s.name, type: s.type,
          price: s.price, available: s.available, benefits: s.benefits, color: s.color,
        }))}
      />

      {/* ── LIVE STREAM BANNER ── */}
      {event.is_live && event.live_url && (() => {
        const ytId = getYouTubeId(event.live_url);
        const twitch = event.live_url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)?.[1];
        if (!ytId && !twitch) return null;
        return (
          <div className="max-w-5xl mx-auto px-4 pb-6">
            <div className="bg-gray-900 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-black text-lg">{event.live_title || 'EN DIRECTO'}</span>
                <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">LIVE</span>
              </div>
              <div className="aspect-video">
                {ytId && (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=0&modestbranding=1&rel=0`}
                    className="w-full h-full border-0"
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    title="Live stream"
                  />
                )}
                {twitch && !ytId && (
                  <iframe
                    src={`https://player.twitch.tv/?channel=${twitch}&parent=${window.location.hostname}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                    title="Live Twitch"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <LiveFab defaultCategory="event" label="Iniciar Evento Live" />

      <EventAdminPanel eventId={eventId} onSaved={loadEvent} ownerUserId={event?.userId} />
      <div className="fixed z-[60] bottom-24 right-4 sm:bottom-8 sm:right-8">
        <ClaimProfileButton
          targetTable="events"
          targetId={eventId}
          targetName={event?.title || 'Evento'}
          hasOwner={!!event?.userId}
        />
      </div>
    </div>
  );
};

export default EventsPage;
