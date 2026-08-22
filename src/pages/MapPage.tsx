import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Navigation, Star, Music, X, Search } from 'lucide-react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '../lib/supabase';
import MapErrorBoundary from '../components/MapErrorBoundary';

// ── Leaflet icon fix (bundled icons) ────────────────────────────────────
// @ts-expect-error - leaflet internal
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Pin icons ───────────────────────────────────────────────────────────
const makePin = (color: string, emoji: string, isSelected: boolean, img?: string) => {
  const size = isSelected ? 44 : 36;
  const inner = size - 8;
  // Contenido: foto/logo del perfil si existe, si no el emoji.
  const content = img
    ? `<img src="${img}" referrerpolicy="no-referrer"
         style="width:${inner}px;height:${inner}px;border-radius:50%;object-fit:cover;transform:rotate(45deg);display:block;"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{innerText:'${emoji}',style:'transform:rotate(45deg);font-size:${isSelected ? 16 : 13}px;'}))" />`
    : `<div style="transform: rotate(45deg); font-size: ${isSelected ? 16 : 13}px;">${emoji}</div>`;
  return L.divIcon({
    className: 'bn-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      ">
        ${content}
      </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size],
  });
};

// ── Types ───────────────────────────────────────────────────────────────
type MapItem = {
  id: string;
  type: 'venue' | 'event' | 'artist' | 'dancer' | 'dj';
  name: string;
  city: string;
  country?: string;
  lat: number;
  lng: number;
  genre?: string;
  rating?: number;
  open?: boolean;
  img?: string;
  date?: string;
  color: string;
  emoji: string;
};

// Default coordinates for cities (used when DB row has no lat/lng)
const CITY_COORDS: Record<string, [number, number]> = {
  Madrid: [40.4168, -3.7038],     Barcelona: [41.3851, 2.1734],
  Valencia: [39.4699, -0.3763],   Sevilla: [37.3891, -5.9845],
  Paris: [48.8566, 2.3522],       Londres: [51.5074, -0.1278],
  London: [51.5074, -0.1278],     Berlin: [52.5200, 13.4050],
  Berlín: [52.5200, 13.4050],     Miami: [25.7617, -80.1918],
  Cali: [3.4516, -76.5320],       Bogotá: [4.7110, -74.0721],
  Bogota: [4.7110, -74.0721],     'La Habana': [23.1136, -82.3666],
  Habana: [23.1136, -82.3666],    NewYork: [40.7128, -74.0060],
  'New York': [40.7128, -74.0060], Mexico: [19.4326, -99.1332],
  Buenos: [-34.6037, -58.3816],   'Buenos Aires': [-34.6037, -58.3816],
  Lima: [-12.0464, -77.0428],     Santiago: [-33.4489, -70.6693],
  Caracas: [10.4806, -66.9036],   'Santo Domingo': [18.4861, -69.9312],
  'San Juan': [18.4655, -66.1057], Roma: [41.9028, 12.4964],
  Rome: [41.9028, 12.4964],       Milán: [45.4642, 9.1900],
};

const cityCoord = (city: string): [number, number] => {
  const key = Object.keys(CITY_COORDS).find(k => city.toLowerCase().includes(k.toLowerCase()));
  return key ? CITY_COORDS[key] : [40.4168, -3.7038]; // Madrid default
};

// Add small random offset to avoid stacked pins
const jitter = (coord: [number, number], seed: string): [number, number] => {
  const h = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return [coord[0] + ((h % 100) - 50) / 5000, coord[1] + (((h * 7) % 100) - 50) / 5000];
};

// ── Map helpers ─────────────────────────────────────────────────────────
function FlyToPos({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, 14, { duration: 1.2 }); }, [pos, map]);
  return null;
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────
type FilterType = 'all' | 'venues' | 'events' | 'artists' | 'dancers' | 'djs' | 'open';

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter]     = useState<FilterType>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [userPos, setUserPos]   = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo]       = useState<[number, number] | null>(null);
  const [items, setItems]       = useState<MapItem[]>([]);
  const [loading, setLoading]   = useState(true);

  // Load real data from Supabase + fallback to mockData
  useEffect(() => {
    const load = async () => {
      const combined: MapItem[] = [];

      // 1. Try venues from Supabase — guarda los dueños para no duplicar su
      // perfil más abajo (un local reclamado tiene fila en venues Y en profiles).
      const venueOwnerIds = new Set<string>();
      try {
        const { data: venues } = await supabase.from('venues').select('*').is('deleted_at', null);
        if (venues && venues.length) {
          venues.forEach((v: any) => {
            if (v.owner_id) venueOwnerIds.add(String(v.owner_id));
            if (v.user_id) venueOwnerIds.add(String(v.user_id));
            const baseCoord = v.lat && v.lng
              ? [Number(v.lat), Number(v.lng)] as [number, number]
              : cityCoord(v.city || v.location || 'Madrid');
            combined.push({
              id: v.id, type: 'venue', name: v.name,
              city: v.city || v.location || '', country: v.country || '',
              lat: baseCoord[0], lng: baseCoord[1],
              genre: v.genre || v.style || 'Latin',
              rating: v.rating || undefined,
              open: v.status === 'active' || v.is_open !== false,
              img: v.cover_image || v.image || `https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=200&fit=crop`,
              color: '#EC4899', emoji: '💃',
            });
          });
        }
      } catch {}

      // 2. Try events from Supabase
      try {
        const { data: events } = await supabase.from('events').select('*').is('deleted_at', null);
        if (events && events.length) {
          events.forEach((e: any) => {
            const baseCoord = e.lat && e.lng
              ? [Number(e.lat), Number(e.lng)] as [number, number]
              : jitter(cityCoord(e.city || e.location || 'Madrid'), e.id);
            combined.push({
              id: e.id, type: 'event', name: e.title || e.name,
              city: e.city || e.location || '', country: e.country || '',
              lat: baseCoord[0], lng: baseCoord[1],
              date: e.date || e.start_date,
              img: e.cover_image || e.image || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=200&fit=crop',
              color: '#F59E0B', emoji: '🎉',
            });
          });
        }
      } catch {}

      // 3. Try artists/dancers/DJs from Supabase (tabla artists)
      try {
        const { data: artists } = await supabase.from('artists').select('*');
        if (artists && artists.length) {
          artists.forEach((a: any) => {
            const baseCoord = a.lat && a.lng
              ? [Number(a.lat), Number(a.lng)] as [number, number]
              : jitter(cityCoord(a.city || 'Madrid'), a.id);
            const mapType: MapItem['type'] = a.type === 'dancer' ? 'dancer' : a.type === 'dj' ? 'dj' : 'artist';
            const color = mapType === 'dancer' ? '#10B981' : mapType === 'dj' ? '#06B6D4' : '#8B5CF6';
            const emoji = mapType === 'dancer' ? '💃' : mapType === 'dj' ? '🎧' : '🎤';
            combined.push({
              id: a.id, type: mapType, name: a.name,
              city: a.city || '', country: a.country || '',
              lat: baseCoord[0], lng: baseCoord[1],
              genre: Array.isArray(a.genre) ? a.genre.join(', ') : a.genre,
              rating: Number(a.rating) || undefined,
              img: a.avatar || a.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=8B5CF6&color=fff`,
              color, emoji,
            });
          });
        }
      } catch {}

      // 4. Perfiles reales creados por usuarios (tabla profiles) — con su avatar
      try {
        const { data: profiles } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS);
        if (profiles && profiles.length) {
          profiles.forEach((p: any) => {
            if (venueOwnerIds.has(String(p.id))) return; // ya está representado por su fila en venues
            const role = String(p.role || '').toLowerCase();
            const mapType: MapItem['type'] | null =
              role === 'dj'                    ? 'dj'     :
              role === 'dancer'                ? 'dancer' :
              (role === 'venue' || role === 'business') ? 'venue' :
              ['artist', 'instructor', 'singer', 'musician', 'promoter', 'band', 'vendor', 'user'].includes(role) ? 'artist' :
              null;
            if (!mapType) return;
            const baseCoord = p.lat && p.lng
              ? [Number(p.lat), Number(p.lng)] as [number, number]
              : jitter(cityCoord(p.city || p.location || 'Madrid'), p.id);
            const color = mapType === 'dancer' ? '#10B981' : mapType === 'dj' ? '#06B6D4' : mapType === 'venue' ? '#EC4899' : '#8B5CF6';
            const emoji = mapType === 'dancer' ? '💃' : mapType === 'dj' ? '🎧' : mapType === 'venue' ? '🏛️' : '🎤';
            combined.push({
              id: p.id, type: mapType, name: p.full_name || p.name || 'Perfil',
              city: p.city || p.location || '', country: p.country || '',
              lat: baseCoord[0], lng: baseCoord[1],
              genre: Array.isArray(p.styles) ? p.styles.join(', ') : undefined,
              img: p.avatar_url || p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'BN')}&background=8B5CF6&color=fff`,
              color, emoji,
            });
          });
        }
      } catch {}

      setItems(combined);
      setLoading(false);
    };

    load();
  }, []);

  // Filter items
  const filteredItems = useMemo(() => items.filter(it => {
    if (filter === 'venues'  && it.type !== 'venue')  return false;
    if (filter === 'events'  && it.type !== 'event')  return false;
    if (filter === 'artists' && it.type !== 'artist') return false;
    if (filter === 'dancers' && it.type !== 'dancer') return false;
    if (filter === 'djs'     && it.type !== 'dj')     return false;
    if (filter === 'open'    && !(it.type === 'venue' && it.open)) return false;
    if (search) {
      const q = search.toLowerCase();
      return it.name.toLowerCase().includes(q) || it.city.toLowerCase().includes(q);
    }
    return true;
  }), [items, filter, search]);

  const selectedItem = items.find(it => it.id === selected);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coords); setFlyTo(coords); setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const counts = useMemo(() => ({
    venues:  items.filter(i => i.type === 'venue').length,
    events:  items.filter(i => i.type === 'event').length,
    artists: items.filter(i => i.type === 'artist').length,
    dancers: items.filter(i => i.type === 'dancer').length,
    djs:     items.filter(i => i.type === 'dj').length,
  }), [items]);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-gray-950 relative">

      {/* ── HEADER (search + filters) ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-3 pt-3 pb-2 space-y-2 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar venues, eventos, artistas, ciudades…"
              className="w-full bg-white dark:bg-gray-900 rounded-2xl pl-9 pr-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 shadow-xl border border-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 pointer-events-auto" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'all',     label: `🌍 Todo (${items.length})` },
            { key: 'venues',  label: `💃 Locales (${counts.venues})` },
            { key: 'events',  label: `🎉 Eventos (${counts.events})` },
            { key: 'artists', label: `🎤 Artistas (${counts.artists})` },
            { key: 'dancers', label: `💃 Bailarines (${counts.dancers})` },
            { key: 'djs',     label: `🎧 DJs (${counts.djs})` },
            { key: 'open',    label: '🟢 Abierto ahora' },
          ] as { key: FilterType; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all ${
                filter === f.key
                  ? 'bg-brand-orange text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white font-bold text-sm">Cargando mapa…</p>
          </div>
        </div>
      )}

      {/* ── MAP ── */}
      <div className="flex-1">
        <MapErrorBoundary>
        <MapContainer
          center={[40.4168, -3.7038]}
          zoom={4}
          style={{ width: '100%', height: '100%', background: '#e5e3df' }}
          zoomControl={false}
          worldCopyJump
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          <FlyToPos pos={flyTo} />

          {userPos && (
            <Marker position={userPos} icon={L.divIcon({
              className: '',
              html: `<div style="width:16px;height:16px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.3)"></div>`,
              iconSize: [16, 16], iconAnchor: [8, 8],
            })}>
              <Popup>📍 Estás aquí</Popup>
            </Marker>
          )}

          {filteredItems.map(it => (
            <Marker
              key={`${it.type}-${it.id}`}
              position={[it.lat, it.lng]}
              icon={makePin(it.color, it.emoji, selected === it.id, it.img)}
              eventHandlers={{ click: () => { setSelected(it.id); setFlyTo([it.lat, it.lng]); }}}
            >
              <Popup closeButton={false}>
                <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                  {it.img && <img src={it.img} alt={it.name}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                  <strong style={{ fontSize: 13, color: '#111' }}>{it.name}</strong>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0' }}>📍 {it.city}{it.country ? `, ${it.country}` : ''}</p>
                  {it.genre && <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0' }}>🎵 {it.genre}</p>}
                  {it.date && <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0' }}>📅 {it.date}</p>}
                  <button
                    onClick={() => {
                      if (it.type === 'venue')  navigate(`/venues/${it.id}`);
                      else if (it.type === 'event')  navigate(`/eventos/${it.id}`);
                      else if (/^[0-9a-f-]{8,}/i.test(it.id)) navigate(`/p/${it.id}`);
                      else navigate(`/artistas/${it.id}`);
                    }}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #EC4899, #A855F7)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}>
                    Ver detalles →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        </MapErrorBoundary>
      </div>

      {/* ── LOCATE BUTTON ── */}
      <button onClick={handleLocate}
        className="absolute bottom-32 right-4 z-[1000] w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 dark:border-gray-700 active:scale-95 transition-all"
      >
        {locating
          ? <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          : <Navigation className="w-5 h-5 text-pink-500" />
        }
      </button>

      {/* ── COUNTER ── */}
      <div className="absolute bottom-32 left-4 z-[1000] bg-white dark:bg-gray-900 rounded-2xl shadow-xl px-3 py-2 border border-gray-100 dark:border-gray-700">
        <p className="text-xs font-bold text-gray-900 dark:text-white">{filteredItems.length} resultados</p>
        <p className="text-[10px] text-gray-400">en el mapa</p>
      </div>

      {/* ── SELECTED CARD ── */}
      {selectedItem && (
        <div className="absolute bottom-16 left-3 right-3 z-[1000] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="relative">
            {selectedItem.img && (
              <img src={selectedItem.img} alt={selectedItem.name} className="w-full h-28 object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button onClick={() => setSelected(null)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
              <div>
                <h3 className="text-white font-black text-base leading-tight">{selectedItem.name}</h3>
                <p className="text-white/80 text-xs">📍 {selectedItem.city}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/95 text-gray-800 capitalize">
                {selectedItem.type === 'venue' ? '🏛️ Local' : selectedItem.type === 'event' ? '🎉 Evento' : selectedItem.type === 'dancer' ? '💃 Bailarín' : selectedItem.type === 'dj' ? '🎧 DJ' : '🎤 Artista'}
              </span>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {selectedItem.rating && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /><strong className="text-gray-900 dark:text-white">{selectedItem.rating}</strong></span>}
              {selectedItem.genre && <span className="flex items-center gap-1"><Music className="w-3.5 h-3.5 text-pink-500" />{selectedItem.genre}</span>}
              {selectedItem.date && <span>📅 {selectedItem.date}</span>}
            </div>
            <button onClick={() => {
                if (selectedItem.type === 'venue')  navigate(`/venues/${selectedItem.id}`);
                else if (selectedItem.type === 'event')  navigate(`/eventos/${selectedItem.id}`);
                else if (/^[0-9a-f-]{8,}/i.test(selectedItem.id)) navigate(`/p/${selectedItem.id}`);
                else navigate(`/artistas/${selectedItem.id}`);
              }}
              className="bg-brand-orange text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 shadow-lg shadow-pink-500/30">
              Ver →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
