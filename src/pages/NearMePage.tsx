/**
 * NearMePage — "Cerca de mí"
 * Reemplaza ExplorePage. Detecta ubicación del usuario (o permite escribir ciudad)
 * y muestra venues, eventos, artistas, bailarines y DJs cercanos.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Navigation, Search, Star, Calendar, Music, Users, X, Map, ChevronRight, AlertCircle, Radio, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CITY_COORDS, POPULAR_CITIES, distanceKm, resolveCityCoords } from '../lib/geo';
import LiveFab from '../components/LiveFab';
import LivePreviewModal, { type LiveSessionLite } from '../components/LivePreviewModal';

type ItemType = 'venue' | 'event' | 'artist' | 'dancer' | 'dj' | 'live';

type Item = {
  id: string;
  type: ItemType;
  source: 'venue' | 'event' | 'artist' | 'profile' | 'live';
  name: string;
  city: string;
  lat: number;
  lng: number;
  img?: string;
  genre?: string;
  rating?: number;
  date?: string;
  distance?: number;
  pricingMode?: 'free' | 'paid' | 'reservation' | 'donation';
  price?: number;
  liveSessionId?: string;
};

// Mapea el role del profile a un tipo visible en las pestañas
function roleToType(role?: string | null): ItemType | null {
  switch ((role || '').toLowerCase()) {
    case 'dj':                       return 'dj';
    case 'dancer':                   return 'dancer';
    case 'instructor':
    case 'artist':
    case 'singer':
    case 'band':                     return 'artist';
    case 'venue':
    case 'business':
    case 'promoter':                 return 'venue';
    default:                         return null;  // user/admin/etc. no se listan
  }
}

const NearMePage: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<'all' | 'venues' | 'events' | 'artists' | 'dancers' | 'djs' | 'lives'>('all');

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
    // No saved city: try silent GPS, fall back to picker
    if (!navigator.geolocation) {
      setShowCityPicker(true);
      setGpsError('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { setPosition([pos.coords.latitude, pos.coords.longitude]); setGpsError(''); },
      err => {
        const msg = err.code === 1 ? 'Permiso denegado'
                  : err.code === 2 ? 'GPS no disponible'
                  : err.code === 3 ? 'Tiempo de espera agotado' : 'Error desconocido';
        setGpsError(msg);
        setShowCityPicker(true);
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 600000 }
    );
  }, [searchParams]);

  // Load items from Supabase: venues + events + artists + user profiles
  useEffect(() => {
    const load = async () => {
      const combined: Item[] = [];
      const seen = new Set<string>();

      const pushOnce = (it: Item) => {
        const key = `${it.source}:${it.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        combined.push(it);
      };

      // Venues
      try {
        const { data } = await supabase.from('venues').select('*');
        data?.forEach((v: any) => {
          const coords = (v.lat && v.lng)
            ? [Number(v.lat), Number(v.lng)] as [number, number]
            : resolveCityCoords(v.city);
          if (!coords) return;
          pushOnce({
            id: v.id, type: 'venue', source: 'venue',
            name: v.name, city: v.city || '',
            lat: coords[0], lng: coords[1],
            img: v.image_url || v.cover || v.avatar,
            genre: Array.isArray(v.style) ? v.style.join(', ') : v.style,
            rating: Number(v.rating) || 4.5,
          });
        });
      } catch (e) { console.warn('[NearMe] venues:', e); }

      // Events
      try {
        const { data } = await supabase.from('events').select('*');
        data?.forEach((e: any) => {
          const coords = (e.lat && e.lng)
            ? [Number(e.lat), Number(e.lng)] as [number, number]
            : resolveCityCoords(e.city);
          if (!coords) return;
          pushOnce({
            id: e.id, type: 'event', source: 'event',
            name: e.title, city: e.city || '',
            lat: coords[0], lng: coords[1],
            img: e.image_url || e.cover, date: e.date,
          });
        });
      } catch (e) { console.warn('[NearMe] events:', e); }

      // Artists (tabla curada: incluye singers, dancers, djs, instructors)
      try {
        const { data } = await supabase.from('artists').select('*');
        data?.forEach((a: any) => {
          const coords = (a.lat && a.lng)
            ? [Number(a.lat), Number(a.lng)] as [number, number]
            : resolveCityCoords(a.city);
          if (!coords) return;
          const t: ItemType = a.type === 'dancer' ? 'dancer' : a.type === 'dj' ? 'dj' : 'artist';
          pushOnce({
            id: a.id, type: t, source: 'artist',
            name: a.name, city: a.city || '',
            lat: coords[0], lng: coords[1],
            img: a.avatar, genre: Array.isArray(a.genre) ? a.genre.join(', ') : a.genre,
            rating: Number(a.rating) || undefined,
          });
        });
      } catch (e) { console.warn('[NearMe] artists:', e); }

      // User Profiles (perfiles creados por usuarios via signup + ProfileEditModal)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, name, role, location, city, lat, lng, avatar_url, avatar, styles, tags');
        data?.forEach((p: any) => {
          const type = roleToType(p.role);
          if (!type) return;  // ignora 'user', 'admin', etc.
          const cityName = p.location || p.city || '';
          const coords = (p.lat && p.lng)
            ? [Number(p.lat), Number(p.lng)] as [number, number]
            : resolveCityCoords(cityName);
          if (!coords) return;
          const styles = Array.isArray(p.styles) ? p.styles : [];
          const tags = Array.isArray(p.tags) ? p.tags : [];
          pushOnce({
            id: p.id, type, source: 'profile',
            name: p.full_name || p.name || 'Perfil',
            city: cityName,
            lat: coords[0], lng: coords[1],
            img: p.avatar_url || p.avatar || undefined,
            genre: styles.slice(0, 3).join(', ') || (tags.length ? '#' + tags.slice(0, 3).join(' #') : undefined),
          });
        });
      } catch (e) { console.warn('[NearMe] profiles:', e); }

      // Live sessions (EN VIVO ahora) — los priorizamos al top con badge propio
      try {
        const { data } = await supabase
          .from('live_sessions_enriched')
          .select('*')
          .eq('status', 'live');
        data?.forEach((s: any) => {
          const coords = (s.lat && s.lng)
            ? [Number(s.lat), Number(s.lng)] as [number, number]
            : resolveCityCoords(s.city);
          if (!coords) return;
          pushOnce({
            id: s.id, type: 'live', source: 'live',
            name: s.title,
            city: s.city || s.host_city || '',
            lat: coords[0], lng: coords[1],
            img: s.cover_url || s.host_avatar || undefined,
            genre: Array.isArray(s.styles) ? s.styles.slice(0, 2).join(', ') : undefined,
            pricingMode: s.pricing_mode,
            price: Number(s.price) || undefined,
            liveSessionId: s.id,
          });
        });
      } catch (e) { console.warn('[NearMe] live:', e); }

      setItems(combined);
      setLoading(false);
    };
    load();
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
        if (activeTab === 'venues'  && it.type !== 'venue')  return false;
        if (activeTab === 'events'  && it.type !== 'event')  return false;
        if (activeTab === 'artists' && it.type !== 'artist') return false;
        if (activeTab === 'dancers' && it.type !== 'dancer') return false;
        if (activeTab === 'djs'     && it.type !== 'dj')     return false;
        if (activeTab === 'lives'   && it.type !== 'live')   return false;
        if (search) return it.name.toLowerCase().includes(search.toLowerCase()) ||
                          it.city.toLowerCase().includes(search.toLowerCase());
        return true;
      })
      .sort((a, b) => {
        // Lives siempre primero
        if (a.type === 'live' && b.type !== 'live') return -1;
        if (b.type === 'live' && a.type !== 'live') return 1;
        return (a.distance ?? 0) - (b.distance ?? 0);
      });
  }, [items, position, radius, activeTab, search]);

  const counts = useMemo(() => {
    if (!position) return { all: 0, venues: 0, events: 0, artists: 0, dancers: 0, djs: 0, lives: 0 };
    const inRadius = items
      .map(it => ({ ...it, distance: distanceKm(position[0], position[1], it.lat, it.lng) }))
      .filter(it => it.distance! <= radius);
    return {
      all:     inRadius.length,
      venues:  inRadius.filter(i => i.type === 'venue').length,
      events:  inRadius.filter(i => i.type === 'event').length,
      artists: inRadius.filter(i => i.type === 'artist').length,
      dancers: inRadius.filter(i => i.type === 'dancer').length,
      djs:     inRadius.filter(i => i.type === 'dj').length,
      lives:   inRadius.filter(i => i.type === 'live').length,
    };
  }, [items, position, radius]);

  const [livePreview, setLivePreview] = useState<LiveSessionLite | null>(null);

  const goTo = async (it: Item) => {
    if (it.source === 'live' && it.liveSessionId) {
      // Abre preview modal con clip de 60s antes de entrar
      const { data } = await supabase.from('live_sessions_enriched').select('*').eq('id', it.liveSessionId).maybeSingle();
      if (data) setLivePreview(data as LiveSessionLite);
      return;
    }
    if (it.source === 'venue')   return navigate(`/venues/${it.id}`);
    if (it.source === 'event')   return navigate(`/eventos/${it.id}`);
    if (it.source === 'profile') return navigate(`/p/${it.id}`);
    return navigate(`/artistas/${it.id}`);
  };

  const locationLabel = city || (position ? 'Tu ubicación' : 'Sin ubicación');

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

      {/* ── SEARCH ── */}
      <div className="px-4 py-3 sticky top-14 z-20 bg-gray-50 dark:bg-gray-950">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar venues, artistas, eventos…"
            className="w-full bg-white dark:bg-gray-900 rounded-2xl pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="px-4 mb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { key: 'all',     label: `Todo (${counts.all})`,     icon: '🌍' },
          { key: 'lives',   label: `En vivo (${counts.lives})`, icon: '🔴' },
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
      <div className="px-4 space-y-4">
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
        ) : (
          filtered.map(it => {
            const typeMeta = {
              venue:  { label: 'Local',     emoji: '🏛️', color: 'from-pink-500 to-rose-600' },
              event:  { label: 'Evento',    emoji: '🎉', color: 'from-orange-500 to-red-500' },
              artist: { label: 'Artista',   emoji: '🎤', color: 'from-purple-500 to-fuchsia-600' },
              dancer: { label: 'Bailarín',  emoji: '💃', color: 'from-green-500 to-emerald-600' },
              dj:     { label: 'DJ',        emoji: '🎧', color: 'from-cyan-500 to-blue-600' },
              live:   { label: 'EN VIVO',   emoji: '🔴', color: 'from-red-500 to-pink-600' },
            }[it.type];

            return (
              <article key={`${it.type}-${it.id}`}
                onClick={() => goTo(it)}
                className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.99] transition-all"
              >
                {/* HEADER — Logo + tipo + distancia (estilo Instagram post) */}
                <header className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${typeMeta.color} p-[2px] flex-shrink-0`}>
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                      {it.img
                        ? <img src={it.img} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">{typeMeta.emoji}</div>
                      }
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-[15px] text-gray-900 dark:text-white truncate leading-tight">{it.name}</h3>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold bg-gradient-to-r ${typeMeta.color}`}>
                        {typeMeta.emoji} {typeMeta.label}
                      </span>
                      <MapPin className="w-3 h-3 ml-1" />{it.city}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="bg-pink-50 dark:bg-pink-900/20 rounded-full px-2 py-1">
                      <p className="text-[10px] font-black text-pink-600 dark:text-pink-300">{it.distance!.toFixed(1)} km</p>
                    </div>
                  </div>
                </header>

                {/* IMAGEN DE LA PUBLICACIÓN — grande, tipo post */}
                {it.img && (
                  <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                    <img src={it.img} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* Indicador LIVE */}
                    {it.type === 'live' && (
                      <>
                        <div className="absolute top-3 left-3 bg-red-600 px-2 py-1 rounded-md flex items-center gap-1 shadow-lg">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">EN VIVO</span>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                          ⏱ PREVIEW 60s
                        </div>
                        {it.pricingMode && (
                          <div className={`absolute top-3 right-3 ${
                            it.pricingMode === 'free' ? 'bg-green-500' :
                            it.pricingMode === 'paid' ? 'bg-pink-500' :
                            it.pricingMode === 'reservation' ? 'bg-blue-500' : 'bg-orange-500'
                          } text-white text-[10px] font-black px-2 py-1 rounded-md`}>
                            {it.pricingMode === 'free' ? '🆓 GRATIS' :
                             it.pricingMode === 'paid' ? `💰 €${it.price}` :
                             it.pricingMode === 'reservation' ? `📅 €${it.price}` : '💝 DONA'}
                          </div>
                        )}
                      </>
                    )}
                    {it.type !== 'live' && it.rating && (
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

                {/* FOOTER — info + CTA */}
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
                    {it.type === 'live' ? <><Eye className="w-3.5 h-3.5" /> Ver preview</> : <>Ver <ChevronRight className="w-3.5 h-3.5" /></>}
                  </button>
                </footer>
              </article>
            );
          })
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

      {/* ── Map shortcut ── */}
      {position && (
        <button onClick={() => navigate('/mapa')}
          className="fixed bottom-20 right-4 z-30 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-4 py-3 rounded-full shadow-2xl shadow-pink-500/40 flex items-center gap-2 font-bold text-sm">
          <Map className="w-4 h-4" /> Ver mapa
        </button>
      )}

      {/* FAB Emitir en directo (creadores) */}
      <LiveFab category="show" />

      {/* Preview de live (clip 60s) antes de entrar */}
      <LivePreviewModal open={!!livePreview} onClose={() => setLivePreview(null)} session={livePreview} />
    </div>
  );
};

export default NearMePage;
