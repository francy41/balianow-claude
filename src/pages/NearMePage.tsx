/**
 * NearMePage — "Cerca de mí"
 * Reemplaza ExplorePage. Detecta ubicación del usuario (o permite escribir ciudad)
 * y muestra venues, eventos, artistas, bailarines y DJs cercanos.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Navigation, Search, Star, Calendar, Music, Users, X, Map, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '../lib/supabase';
import { resolveCityCoords } from '../lib/geo';
import LivePreviewModal, { type LiveSessionLite } from '../components/LivePreviewModal';
import SearchTriggerBar from '../components/SearchTriggerBar';
import { usePageMeta } from '../hooks/usePageMeta';

// Geo distance (Haversine in km)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Default city coords
const CITY_COORDS: Record<string, [number, number]> = {
  'Madrid': [40.4168, -3.7038],     'Barcelona': [41.3851, 2.1734],
  'Valencia': [39.4699, -0.3763],   'Sevilla': [37.3891, -5.9845],
  'Bilbao': [43.2630, -2.9350],     'Málaga': [36.7213, -4.4214],
  'Granada': [37.1773, -3.5986],    'Zaragoza': [41.6488, -0.8891],
  'Paris': [48.8566, 2.3522],       'Londres': [51.5074, -0.1278],
  'Berlín': [52.5200, 13.4050],     'Roma': [41.9028, 12.4964],
  'Miami': [25.7617, -80.1918],     'New York': [40.7128, -74.0060],
  'Cali': [3.4516, -76.5320],       'Bogotá': [4.7110, -74.0721],
  'Medellín': [6.2476, -75.5658],   'La Habana': [23.1136, -82.3666],
  'Santo Domingo': [18.4861, -69.9312], 'Buenos Aires': [-34.6037, -58.3816],
  'Lima': [-12.0464, -77.0428],     'México DF': [19.4326, -99.1332],
};
const POPULAR_CITIES = ['Madrid','Barcelona','Valencia','Sevilla','Paris','Miami','New York','Cali','Medellín','La Habana'];

type Item = {
  id: string;
  type: 'venue' | 'event' | 'artist' | 'dancer' | 'dj' | 'live';
  name: string;
  city: string;
  lat: number;
  lng: number;
  img?: string;
  genre?: string;
  rating?: number;
  date?: string;
  distance?: number;
  isLive?: boolean;
  pricing_mode?: 'free' | 'paid' | 'reservation' | 'donation';
  price?: number;
  liveData?: LiveSessionLite;
  isOpenNow?: boolean;
  openHoursText?: string;
};

// ── Calcula si un venue está abierto ahora ──────────────────────
// Acepta is_open (flag manual), open_time/close_time (HH:MM:SS) + operating_days (array)
const WEEKDAYS_ES = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
function venueIsOpenNow(v: any): boolean {
  if (v.is_open === true) return true;
  if (v.is_open === false) return false;
  if (!v.open_time || !v.close_time) return false;
  const now = new Date();
  const today = WEEKDAYS_ES[now.getDay()];
  const days = Array.isArray(v.operating_days) ? v.operating_days.map((d: string) => String(d).toLowerCase()) : [];
  if (days.length > 0 && !days.includes(today) && !days.includes(today.replace('miercoles','miércoles')) && !days.includes(today.replace('sabado','sábado'))) {
    return false;
  }
  const toMin = (s: string) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const o = toMin(v.open_time), c = toMin(v.close_time);
  const cur = now.getHours() * 60 + now.getMinutes();
  // Soporta horarios que cruzan medianoche (ej. 23:00 → 06:00)
  return c > o ? (cur >= o && cur <= c) : (cur >= o || cur <= c);
}

const NearMePage: React.FC = () => {
  usePageMeta({
    title: 'Cerca de mí',
    description: 'Descubre venues, eventos, artistas y lives latinos cerca de tu ubicación. Filtra por categoría y radio.',
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [city, setCity]         = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [search, setSearch]     = useState('');
  const [items, setItems]       = useState<Item[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [radius, setRadius]     = useState<50 | 100 | 500 | 5000>(500);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'open' | 'venues' | 'events' | 'artists' | 'dancers' | 'djs'>('all');
  const [livePreview, setLivePreview] = useState<LiveSessionLite | null>(null);

  // Initialize position from URL param > localStorage > GPS > picker
  useEffect(() => {
    const urlCity = searchParams.get('city');
    if (urlCity && CITY_COORDS[urlCity]) {
      setCity(urlCity);
      setPosition(CITY_COORDS[urlCity]);
      localStorage.setItem('bailanow-near-city', urlCity);
      return;
    }
    const saved = localStorage.getItem('bailanow-near-city');
    if (saved && CITY_COORDS[saved]) {
      setCity(saved);
      setPosition(CITY_COORDS[saved]);
      return;
    }
    // Sin ciudad guardada: defaultear a Madrid pero NO bloquear con modal
    // (el modal automatico es UX terrible para primer-time visitors)
    const defaultCity = 'Madrid';
    setCity(defaultCity);
    setPosition(CITY_COORDS[defaultCity]);
    // Intentar GPS silenciosamente en background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setCity('');
          setGpsError('');
        },
        err => {
          const msg = err.code === 1 ? 'Permiso de ubicación denegado'
                    : err.code === 2 ? 'GPS no disponible'
                    : err.code === 3 ? 'Tiempo agotado' : '';
          if (msg) setGpsError(msg);
          // NO auto-abrir modal — el user puede pulsar "Tu ubicación" cuando quiera
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 600000 }
      );
    }
  }, [searchParams]);

  // Load items from Supabase + fallbacks
  useEffect(() => {
    let cancelled = false;
    // Red de seguridad: en cualquier caso quitamos el spinner a los 8s
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

    const load = async () => {
      const combined: Item[] = [];

      // Helper: trata lat/lng=0 o NaN como "no hay coords"
      const coordsOrCity = (row: any): { lat: number; lng: number } | null => {
        const lat = Number(row.lat), lng = Number(row.lng);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) return { lat, lng };
        return resolveCityCoords(row.city || row.location);
      };

      // Venues
      try {
        const { data } = await supabase.from('venues').select('*');
        data?.forEach((v: any) => {
          const c = coordsOrCity(v);
          if (!c) return;
          combined.push({
            id: v.id, type: 'venue', name: v.name, city: v.city || '',
            lat: c.lat, lng: c.lng,
            img: v.image_url || v.cover || v.avatar,
            genre: Array.isArray(v.style) ? v.style.join(', ') : v.style,
            rating: Number(v.rating) || 4.5,
            isOpenNow: venueIsOpenNow(v),
            openHoursText: v.open_hours || (v.open_time && v.close_time ? `${String(v.open_time).slice(0,5)}–${String(v.close_time).slice(0,5)}` : undefined),
          });
        });
      } catch (e) { console.warn('[nearme] venues', e); }

      // Events
      try {
        const { data } = await supabase.from('events').select('*');
        data?.forEach((e: any) => {
          const c = coordsOrCity(e);
          if (!c) return;
          combined.push({
            id: e.id, type: 'event', name: e.title, city: e.city || '',
            lat: c.lat, lng: c.lng,
            img: e.image_url || e.cover, date: e.date,
          });
        });
      } catch (e) { console.warn('[nearme] events', e); }

      // Artists (incluye singers, dancers, djs, instructors)
      try {
        const { data } = await supabase.from('artists').select('*');
        data?.forEach((a: any) => {
          const c = coordsOrCity(a);
          if (!c) return;
          const t: Item['type'] = a.type === 'dancer' ? 'dancer' : a.type === 'dj' ? 'dj' : 'artist';
          combined.push({
            id: a.id, type: t, name: a.name, city: a.city || '',
            lat: c.lat, lng: c.lng,
            img: a.avatar, genre: Array.isArray(a.genre) ? a.genre.join(', ') : a.genre,
            rating: Number(a.rating) || undefined,
          });
        });
      } catch (e) { console.warn('[nearme] artists', e); }

      // PROFILES (usuarios reales — DJs, bailarines, artistas, instructores...)
      try {
        const { data } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS);
        data?.forEach((p: any) => {
          const role = String(p.role || '').toLowerCase();
          // mapping permisivo: si el rol no es admin/superadmin, lo mostramos en alguna categoria
          const t: Item['type'] | null =
            role === 'dj'        ? 'dj'     :
            role === 'dancer'    ? 'dancer' :
            (role === 'venue' || role === 'business') ? 'venue' :
            ['artist','instructor','singer','musician','promoter','band','vendor','user'].includes(role) ? 'artist' :
            null;
          if (!t) return;
          const c = coordsOrCity(p);
          if (!c) return;
          combined.push({
            id: p.id, type: t,
            name: p.full_name || p.name || 'Usuario',
            city: p.city || p.location || '',
            lat: c.lat, lng: c.lng,
            img: p.avatar_url || p.avatar,
            genre: Array.isArray(p.styles) ? p.styles.join(', ') : undefined,
          });
        });
      } catch (e) { console.warn('[nearme] profiles load', e); }

      // LIVE SESSIONS (en vivo o programados)
      try {
        const { data } = await supabase
          .from('live_sessions_enriched')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .order('started_at', { ascending: false })
          .limit(200);
        data?.forEach((l: any) => {
          const c = coordsOrCity(l);
          if (!c) return;
          combined.push({
            id: l.id, type: 'live',
            name: l.title, city: l.city || '',
            lat: c.lat, lng: c.lng,
            img: l.cover_url || l.host_avatar,
            isLive: l.status === 'live',
            pricing_mode: l.pricing_mode,
            price: l.price,
            liveData: l as LiveSessionLite,
          });
        });
      } catch (e) { console.warn('[nearme] live load', e); }

      if (!cancelled) {
        setItems(combined);
        setLoading(false);
      }
    };
    load().catch(e => { console.error('[nearme] fatal', e); if (!cancelled) setLoading(false); });

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // Locate user via GPS — con alta precisión
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización');
      return;
    }
    setLocating(true); setGpsError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setCity('');
        localStorage.removeItem('bailanow-near-city');
        setLocating(false);
        setShowCityPicker(false);
      },
      err => {
        setLocating(false);
        const msg = err.code === 1 ? '❌ Has denegado el permiso de ubicación. Activa la geolocalización en los ajustes del navegador.'
                  : err.code === 2 ? '❌ No se pudo obtener tu GPS. Verifica tu conexión.'
                  : err.code === 3 ? '⏱ Tiempo agotado. Vuelve a intentarlo o selecciona una ciudad.'
                  : '❌ Error desconocido. Selecciona una ciudad.';
        setGpsError(msg);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const selectCity = (c: string) => {
    if (!CITY_COORDS[c]) return;
    setCity(c);
    setPosition(CITY_COORDS[c]);
    localStorage.setItem('bailanow-near-city', c);
    setShowCityPicker(false);
  };

  // Compute distances + filter
  const filtered = useMemo(() => {
    if (!position) return [];
    return items
      .map(it => ({ ...it, distance: distanceKm(position[0], position[1], it.lat, it.lng) }))
      .filter(it => it.distance! <= radius)
      .filter(it => {
        if (activeTab === 'live'    && it.type !== 'live')   return false;
        if (activeTab === 'open'    && !it.isOpenNow)        return false;
        if (activeTab === 'venues'  && it.type !== 'venue')  return false;
        if (activeTab === 'events'  && it.type !== 'event')  return false;
        if (activeTab === 'artists' && it.type !== 'artist') return false;
        if (activeTab === 'dancers' && it.type !== 'dancer') return false;
        if (activeTab === 'djs'     && it.type !== 'dj')     return false;
        if (search) return it.name.toLowerCase().includes(search.toLowerCase()) ||
                          it.city.toLowerCase().includes(search.toLowerCase());
        return true;
      })
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [items, position, radius, activeTab, search]);

  const counts = useMemo(() => {
    if (!position) return { all: 0, venues: 0, events: 0, artists: 0, dancers: 0, djs: 0 };
    const inRadius = items
      .map(it => ({ ...it, distance: distanceKm(position[0], position[1], it.lat, it.lng) }))
      .filter(it => it.distance! <= radius);
    return {
      all:     inRadius.length,
      live:    inRadius.filter(i => i.type === 'live').length,
      open:    inRadius.filter(i => i.isOpenNow).length,
      venues:  inRadius.filter(i => i.type === 'venue').length,
      events:  inRadius.filter(i => i.type === 'event').length,
      artists: inRadius.filter(i => i.type === 'artist').length,
      dancers: inRadius.filter(i => i.type === 'dancer').length,
      djs:     inRadius.filter(i => i.type === 'dj').length,
    };
  }, [items, position, radius]);

  const goTo = (it: Item) => {
    if (it.type === 'live' && it.liveData) { setLivePreview(it.liveData); return; }
    if (it.type === 'venue')  return navigate(`/venues/${it.id}`);
    if (it.type === 'event')  return navigate(`/eventos/${it.id}`);
    // profiles vs artists: si parece UUID lo tratamos como perfil público
    if (/^[0-9a-f-]{8,}/i.test(it.id)) return navigate(`/p/${it.id}`);
    navigate(`/artistas/${it.id}`);
  };

  const locationLabel = city || (position ? 'Tu ubicación' : 'Sin ubicación');

  // ── Card COMPACTA (para grids de 2/3/4 columnas) ─────────────────────────
  const renderCardCompact = (it: Item) => {
    const typeMeta = {
      venue:  { label: 'Local',     emoji: '🏛️', color: 'from-pink-500 to-rose-600' },
      event:  { label: 'Evento',    emoji: '🎉', color: 'from-orange-500 to-red-500' },
      artist: { label: 'Artista',   emoji: '🎤', color: 'from-purple-500 to-fuchsia-600' },
      dancer: { label: 'Bailarín',  emoji: '💃', color: 'from-green-500 to-emerald-600' },
      dj:     { label: 'DJ',        emoji: '🎧', color: 'from-cyan-500 to-blue-600' },
      live:   { label: 'LIVE',      emoji: '🔴', color: 'from-red-500 to-pink-600' },
    }[it.type];
    return (
      <article key={`c-${it.type}-${it.id}`} onClick={() => goTo(it)}
        className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.97] transition-all flex flex-col">
        {/* Cover */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
          {it.img
            ? <img src={it.img} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-4xl">{typeMeta.emoji}</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Badge tipo */}
          <span className={`absolute top-1.5 left-1.5 bg-gradient-to-r ${typeMeta.color} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}>
            {typeMeta.emoji}
          </span>
          {/* Estado */}
          {it.type === 'venue' && it.isOpenNow && (
            <span className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> ABIERTO
            </span>
          )}
          {it.type === 'live' && it.isLive && (
            <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">🔴 LIVE</span>
          )}
          {/* Distancia */}
          <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {it.distance!.toFixed(1)} km
          </span>
          {/* Precio si es live de pago */}
          {it.type === 'live' && it.pricing_mode === 'paid' && it.price && (
            <span className="absolute bottom-1.5 left-1.5 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">€{it.price}</span>
          )}
          {it.type === 'live' && it.pricing_mode === 'free' && (
            <span className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">GRATIS</span>
          )}
        </div>
        {/* Info */}
        <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
          <h3 className="font-black text-[13px] text-gray-900 dark:text-white leading-tight line-clamp-2">{it.name}</h3>
          <div className="flex items-center justify-between gap-1 mt-auto">
            <p className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{it.city}</span>
            </p>
            {it.rating && (
              <span className="text-[10px] text-yellow-600 font-bold flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />{it.rating}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  };

  // ── Renderiza una card individual (compartido por vistas agrupada y flat) ──
  const renderCard = (it: Item) => {
    const typeMeta = {
      venue:  { label: 'Local',     emoji: '🏛️', color: 'from-pink-500 to-rose-600' },
      event:  { label: 'Evento',    emoji: '🎉', color: 'from-orange-500 to-red-500' },
      artist: { label: 'Artista',   emoji: '🎤', color: 'from-purple-500 to-fuchsia-600' },
      dancer: { label: 'Bailarín',  emoji: '💃', color: 'from-green-500 to-emerald-600' },
      dj:     { label: 'DJ',        emoji: '🎧', color: 'from-cyan-500 to-blue-600' },
      live:   { label: 'LIVE',      emoji: '🔴', color: 'from-red-500 to-pink-600' },
    }[it.type];
    return (
      <article key={`${it.type}-${it.id}`} onClick={() => goTo(it)}
        className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.99] transition-all">
        <header className="flex items-center gap-3 px-4 py-3">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${typeMeta.color} p-[2px] flex-shrink-0`}>
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
              {it.img
                ? <img src={it.img} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center text-lg">{typeMeta.emoji}</div>}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-[15px] text-gray-900 dark:text-white truncate leading-tight flex items-center gap-1.5">
              {it.name}
              {it.type === 'venue' && it.isOpenNow && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Abierto ahora" />}
            </h3>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold bg-gradient-to-r ${typeMeta.color}`}>
                {typeMeta.emoji} {typeMeta.label}
              </span>
              <MapPin className="w-3 h-3 ml-1" />{it.city}
              {it.type === 'venue' && it.openHoursText && (
                <span className="ml-1 text-[10px] text-gray-500">· {it.openHoursText}</span>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-full px-2 py-1">
              <p className="text-[10px] font-black text-pink-600 dark:text-pink-300">{it.distance!.toFixed(1)} km</p>
            </div>
          </div>
        </header>
        {it.img && (
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
            <img src={it.img} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            {it.type === 'venue' && it.isOpenNow && (
              <div className="absolute top-3 left-3">
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> ABIERTO AHORA
                </span>
              </div>
            )}
            {it.type === 'live' && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {it.isLive && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE</span>}
                {it.liveData?.preview_url && <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">PREVIEW 60s</span>}
                {it.pricing_mode === 'free' && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">GRATIS</span>}
                {it.pricing_mode === 'paid' && <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded">€{it.price}</span>}
                {it.pricing_mode === 'reservation' && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded">RESERVA €{it.price}</span>}
                {it.pricing_mode === 'donation' && <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded">DONACIÓN</span>}
              </div>
            )}
            {it.rating && (
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white text-xs font-bold">{it.rating}</span>
              </div>
            )}
            {it.date && (
              <div className="absolute bottom-3 left-3 bg-white/95 rounded-full px-2.5 py-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-pink-600" />
                <span className="text-gray-900 text-[11px] font-bold">{it.date}</span>
              </div>
            )}
          </div>
        )}
        <footer className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-1 min-w-0">
            {it.genre && (
              <span className="flex items-center gap-1 truncate">
                <Music className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                <span className="font-medium truncate">{it.genre}</span>
              </span>
            )}
          </div>
          <button className={`bg-gradient-to-r ${typeMeta.color} text-white text-xs font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-1`}>
            Ver
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </footer>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* ── HERO HEADER ── */}
      <div className="bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-700 text-white px-4 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative">
          <h1 className="font-display font-black text-2xl flex items-center gap-2 mb-1">
            <MapPin className="w-6 h-6" /> Cerca de mí
          </h1>
          <p className="text-white/80 text-sm mb-4">Descubre lo mejor del baile latino a tu alrededor</p>

          <button onClick={() => setShowCityPicker(true)}
            className="w-full bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/25 transition-all">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider opacity-80">Tu ubicación</p>
                <p className="font-bold text-sm">{locationLabel}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </button>

          {/* Radio selector */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] uppercase tracking-wider opacity-70 flex-shrink-0">Radio:</span>
            {[50, 100, 500, 5000].map(r => (
              <button key={r} onClick={() => setRadius(r as any)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  radius === r ? 'bg-white text-pink-600' : 'bg-white/20 text-white'
                }`}>
                {r >= 1000 ? `${r/1000}K km` : `${r} km`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── GPS ERROR BANNER ── */}
      {gpsError && !position && (
        <div className="mx-3 mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-2xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-orange-700 dark:text-orange-300">{gpsError}</p>
            <p className="text-orange-600 dark:text-orange-400 mt-0.5">Elige una ciudad de abajo o haz clic en "Tu ubicación"</p>
          </div>
        </div>
      )}

      {/* ── SUPER BUSCADOR (abre GlobalSearch) ── */}
      <div className="px-4 pt-3">
        <SearchTriggerBar placeholder="🔍 Súper buscador: locales, artistas, eventos, ciudades…" />
      </div>

      {/* ── FILTRO LOCAL ── */}
      <div className="px-4 py-3 sticky top-14 z-20 bg-gray-50 dark:bg-gray-950">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar resultados en esta página…"
            className="w-full bg-white dark:bg-gray-900 rounded-2xl pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="px-4 mb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { key: 'all',     label: `Todo (${counts.all})`,     icon: '🌍' },
          { key: 'live',    label: `En vivo (${counts.live})`,  icon: '🔴' },
          { key: 'open',    label: `Abierto ahora (${counts.open})`, icon: '🟢' },
          { key: 'venues',  label: `Locales (${counts.venues})`, icon: '🏛️' },
          { key: 'events',  label: `Eventos (${counts.events})`, icon: '🎉' },
          { key: 'artists', label: `Artistas (${counts.artists})`,icon: '🎤' },
          { key: 'dancers', label: `Bailarines (${counts.dancers})`, icon: '💃' },
          { key: 'djs',     label: `DJs (${counts.djs})`,        icon: '🎧' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === t.key
                ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}>
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── RESULTS — formato post/publicación con logo ── */}
      <div className="px-4 pb-32 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-sm mt-3">Buscando cerca de ti…</p>
          </div>
        ) : !position ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-700 dark:text-gray-300">Activa tu ubicación</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">o elige una ciudad para empezar</p>
            <button onClick={handleLocate} className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl">
              📍 Usar mi ubicación
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold text-gray-700 dark:text-gray-300">Nada cerca de {locationLabel}</p>
            <p className="text-gray-400 text-xs mt-1">Prueba ampliando el radio o cambiando de ciudad</p>
          </div>
        ) : activeTab === 'all' ? (
          // ── VISTA "TODO": agrupa por categoria, max 4 por seccion + ver mas ──
          (() => {
            type TabKey = typeof activeTab;
            const SECTIONS: { key: Item['type']; label: string; emoji: string; tab: TabKey }[] = [
              { key: 'live',   label: 'En vivo',   emoji: '🔴', tab: 'live' as TabKey },
              { key: 'venue',  label: 'Locales',   emoji: '🏛️', tab: 'venues' as TabKey },
              { key: 'event',  label: 'Eventos',   emoji: '🎉', tab: 'events' as TabKey },
              { key: 'artist', label: 'Artistas',  emoji: '🎤', tab: 'artists' as TabKey },
              { key: 'dancer', label: 'Bailarines',emoji: '💃', tab: 'dancers' as TabKey },
              { key: 'dj',     label: 'DJs',       emoji: '🎧', tab: 'djs' as TabKey },
            ];
            return SECTIONS.map(sec => {
              const sectionItems = filtered.filter(it => it.type === sec.key);
              if (sectionItems.length === 0) return null;
              const visible = sectionItems.slice(0, 4);
              const hasMore = sectionItems.length > 4;
              return (
                <section key={sec.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{sec.emoji}</span> {sec.label}
                      <span className="text-sm font-bold text-gray-400">({sectionItems.length})</span>
                    </h2>
                    {hasMore && (
                      <button onClick={() => setActiveTab(sec.tab)}
                        className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
                        Ver todo <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {visible.map(it => renderCardCompact(it))}
                  </div>
                </section>
              );
            });
          })()
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(it => renderCardCompact(it))}
          </div>
        )}
      </div>

      {/* ── CITY PICKER MODAL ── */}
      {showCityPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setShowCityPicker(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-black text-gray-900 dark:text-white">Elige tu ubicación</h2>
              <button onClick={() => setShowCityPicker(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto">
              <button onClick={handleLocate}
                className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 mb-2 active:scale-95">
                {locating
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Localizando…</>
                  : <><Navigation className="w-4 h-4" /> Usar mi ubicación actual</>
                }
              </button>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider px-2 pt-2">Ciudades populares</p>
              {POPULAR_CITIES.map(c => (
                <button key={c} onClick={() => selectCity(c)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center justify-between text-sm font-bold transition-all ${
                    city === c ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-50" />{c}</span>
                  {city === c && <span className="text-pink-500">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Map shortcut — barra ancha sobre el bottom nav, sin solapar FABs ── */}
      {position && (
        <div className="fixed left-0 right-0 bottom-[68px] lg:bottom-4 z-30 px-3 pointer-events-none">
          <button onClick={() => navigate('/mapa')}
            className="pointer-events-auto w-full sm:w-auto sm:mx-auto sm:max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-pink-500/40 font-bold text-base active:scale-95 transition-transform mx-auto block">
            <Map className="w-5 h-5" /> Ver mapa
          </button>
        </div>
      )}

      <LivePreviewModal isOpen={!!livePreview} onClose={() => setLivePreview(null)} session={livePreview} />
    </div>
  );
};

export default NearMePage;
