import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Users, X, Loader2, Calendar, Clock, Trash2, Check, Route as RouteIcon, MessageCircle, Send, Search, Building2, LifeBuoy, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import MapErrorBoundary from '../components/MapErrorBoundary';
import { Avatar } from '../components/ui';

interface Stop { name: string; address?: string; lat: number; lng: number; venue_id?: string; }
interface Ruta {
  id: string; creator_id: string; creator_name: string | null; title: string; city: string;
  description: string | null; date: string | null; time: string | null; stops: Stop[]; created_at: string;
  end_date: string | null; status: 'open' | 'closed';
}
interface Member { user_id: string; user_name: string | null; avatar_url?: string | null; }
interface RutaComment { id: string; user_id: string; user_name: string | null; text: string; created_at: string; avatar_url?: string | null; }

const CARTO = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const numberPin = (n: number) => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:linear-gradient(135deg,#EC4899,#A855F7);color:#fff;font-weight:800;font-size:13px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="transform:rotate(45deg)">${n}</span></div>`,
  iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
});

const FitStops: React.FC<{ stops: Stop[] }> = ({ stops }) => {
  const map = useMap();
  useEffect(() => {
    // Leaflet en móvil necesita recalcular el tamaño cuando el contenedor se apila/redimensiona,
    // si no el mapa sale gris, descentrado o cortado. El evento "resize" de window NO cubre esto:
    // en móvil el viewport ya nace con su tamaño final, así que ese evento nunca llega a dispararse
    // cuando lo que cambia es el layout interno (el grid pasa de 2 columnas a apilado). Un
    // ResizeObserver sobre el propio contenedor del mapa detecta ese cambio de verdad.
    const apply = () => {
      map.invalidateSize();
      if (stops.length === 1) map.setView([stops[0].lat, stops[0].lng], 14);
      else if (stops.length > 1) map.fitBounds(stops.map(s => [s.lat, s.lng]) as any, { padding: [30, 30], maxZoom: 15 });
    };
    const t = setTimeout(apply, 200);
    window.addEventListener('resize', apply);

    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => { clearTimeout(t); window.removeEventListener('resize', apply); ro.disconnect(); };
  }, [stops, map]);
  return null;
};

const RutaMap: React.FC<{ stops: Stop[] }> = ({ stops }) => (
  <MapErrorBoundary>
    <MapContainer center={[40.4168, -3.7038]} zoom={12} style={{ width: '100%', height: '100%', background: '#e5e3df' }} zoomControl={false}>
      <TileLayer url={CARTO} attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
      <FitStops stops={stops} />
      {stops.map((s, i) => (
        <Marker key={i} position={[s.lat, s.lng]} icon={numberPin(i + 1)}>
          <Popup closeButton={false}>
            <div style={{ minWidth: 140, fontFamily: 'Inter, sans-serif' }}>
              <strong style={{ fontSize: 13, color: '#111' }}>{i + 1}. {s.name}</strong>
              {s.address && <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>{s.address}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
      {stops.length > 1 && (
        <Polyline positions={stops.map(s => [s.lat, s.lng]) as any} pathOptions={{ color: '#EC4899', weight: 3, dashArray: '6 8', opacity: 0.9 }} />
      )}
    </MapContainer>
  </MapErrorBoundary>
);

// Geocodificación de una dirección/lugar con Nominatim (OpenStreetMap).
async function geocode(q: string): Promise<Stop | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return { name: q, address: data[0].display_name, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* noop */ }
  return null;
}

/* ── Modal para crear una ruta ── */
const CreateRutaModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [saving, setSaving] = useState(false);

  // Cómo se añade cada parada: un local ya verificado en la plataforma, o una
  // zona libre (dirección/barrio) para planes que no dependen de un sitio fijo.
  const [stopMode, setStopMode] = useState<'venue' | 'zone'>('venue');
  const [venueQuery, setVenueQuery] = useState('');
  const [venueResults, setVenueResults] = useState<any[]>([]);
  const [searchingVenues, setSearchingVenues] = useState(false);
  const venueSearchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [stopName, setStopName] = useState('');
  const [stopAddr, setStopAddr] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    clearTimeout(venueSearchTimer.current);
    if (venueQuery.trim().length < 2) { setVenueResults([]); return; }
    venueSearchTimer.current = setTimeout(async () => {
      setSearchingVenues(true);
      const { data } = await supabase.from('venues').select('id,name,city,address,lat,lng')
        .is('deleted_at', null).ilike('name', `%${venueQuery.trim()}%`).limit(6);
      setSearchingVenues(false);
      setVenueResults(data || []);
    }, 350);
    return () => clearTimeout(venueSearchTimer.current);
  }, [venueQuery]);

  const addVenueStop = (v: any) => {
    if (v.lat == null || v.lng == null) {
      addToast({ message: 'Ese local aún no tiene ubicación en el mapa. Prueba con otro o usa una zona libre.', type: 'error' });
      return;
    }
    setStops(s => [...s, { name: v.name, address: v.address || v.city || '', lat: Number(v.lat), lng: Number(v.lng), venue_id: v.id }]);
    setVenueQuery(''); setVenueResults([]);
  };

  const addZoneStop = async () => {
    if (!stopName.trim()) { addToast({ message: 'Ponle nombre a la parada', type: 'error' }); return; }
    setAdding(true);
    const query = [stopName, stopAddr, city].filter(Boolean).join(', ');
    const geo = await geocode(query);
    setAdding(false);
    if (!geo) { addToast({ message: 'No encontré esa dirección. Prueba con más detalle.', type: 'error' }); return; }
    setStops(s => [...s, { name: stopName.trim(), address: geo.address, lat: geo.lat, lng: geo.lng }]);
    setStopName(''); setStopAddr('');
  };

  const goToSupport = () => { onClose(); navigate('/dashboard?tab=support'); };

  const save = async () => {
    if (!user) { onClose(); return; }
    if (!title.trim() || !city.trim()) { addToast({ message: 'Título y ciudad son obligatorios', type: 'error' }); return; }
    if (!endDate) { addToast({ message: 'Elige una fecha de fin — el plan se cierra automáticamente ese día', type: 'error' }); return; }
    if (stops.length === 0) { addToast({ message: 'Añade al menos un local o zona', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('rutas').insert({
      creator_id: user.id, creator_name: user.name, title: title.trim(), city: city.trim(),
      description: description.trim() || null, date: date || null, time: time || null, stops,
      end_date: endDate, status: 'open',
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: '¡Ruta creada! 🗺️', type: 'success' });
    onCreated(); onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2"><RouteIcon className="w-5 h-5 text-brand" /> Crear ruta</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <input className="input-field" placeholder="Título (ej: Ruta de bachata por Madrid)" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="Ciudad" value={city} onChange={e => setCity(e.target.value)} />
            <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" type="time" value={time} onChange={e => setTime(e.target.value)} />
            <div>
              <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date || undefined} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 -mt-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Fecha de fin: el plan se cierra y deja de mostrarse automáticamente ese día.</p>
          <textarea className="input-field" rows={2} placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} />

          {/* Paradas: local verificado de la plataforma, o zona libre */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Locales / zonas del plan ({stops.length})</p>
            {stops.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {stops.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg px-2.5 py-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate flex items-center gap-1">
                        {s.name}
                        {s.venue_id && <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{s.address}</p>
                    </div>
                    <button onClick={() => setStops(st => st.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs: local de la plataforma vs zona libre */}
            <div className="flex gap-1.5 mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button type="button" onClick={() => setStopMode('venue')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${stopMode === 'venue' ? 'bg-white dark:bg-gray-900 text-brand shadow-sm' : 'text-gray-500'}`}>
                <Building2 className="w-3.5 h-3.5" /> Local de BailaNow
              </button>
              <button type="button" onClick={() => setStopMode('zone')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-all ${stopMode === 'zone' ? 'bg-white dark:bg-gray-900 text-brand shadow-sm' : 'text-gray-500'}`}>
                <MapPin className="w-3.5 h-3.5" /> Otra zona
              </button>
            </div>

            {stopMode === 'venue' ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input className="input-field pl-8" placeholder="Buscar local por nombre…" value={venueQuery} onChange={e => setVenueQuery(e.target.value)} />
                </div>
                {searchingVenues ? (
                  <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" /></div>
                ) : venueResults.length > 0 ? (
                  <div className="space-y-1">
                    {venueResults.map(v => (
                      <button key={v.id} type="button" onClick={() => addVenueStop(v)}
                        className="w-full text-left flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg px-2.5 py-2 hover:bg-pink-50 dark:hover:bg-brand-deep/20 transition-colors">
                        <Building2 className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{v.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{v.city}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : venueQuery.trim().length >= 2 ? (
                  <p className="text-[11px] text-gray-400 text-center py-1">Sin resultados para "{venueQuery}"</p>
                ) : null}
                <button type="button" onClick={goToSupport} className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-brand py-1.5">
                  <LifeBuoy className="w-3 h-3" /> ¿No encuentras tu local? Contacta con soporte para añadirlo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input className="input-field" placeholder="Nombre de la zona (ej: Malasaña)" value={stopName} onChange={e => setStopName(e.target.value)} />
                <input className="input-field" placeholder="Dirección o barrio (opcional, mejora la ubicación)" value={stopAddr} onChange={e => setStopAddr(e.target.value)} />
                <button type="button" onClick={addZoneStop} disabled={adding} className="w-full border-2 border-dashed border-pink-300 dark:border-pink-800 text-brand dark:text-pink-400 font-bold rounded-xl py-2 text-sm hover:bg-pink-50 dark:hover:bg-brand-deep/20 transition-all disabled:opacity-50">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Plus className="w-4 h-4 inline mr-1" /> Añadir zona al mapa</>}
                </button>
              </div>
            )}
          </div>

          <button onClick={save} disabled={saving} className="w-full bg-brand-orange text-white font-black rounded-xl py-3.5 text-sm hover:opacity-90 transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Publicar ruta'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Página principal ── */
const RutasPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ruta | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<RutaComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [creating, setCreating] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [closing, setClosing] = useState(false);
  // Participantes por plan (reales) para pintar la pila de avatares en cada tarjeta.
  const [crowd, setCrowd] = useState<Record<string, { count: number; avatars: (string | null)[] }>>({});

  const load = useCallback(async () => {
    const safety = setTimeout(() => setLoading(false), 8000);
    const today = new Date().toISOString().slice(0, 10);
    // Solo planes abiertos y no vencidos: uno cerrado (manual o por fecha) desaparece del listado.
    const { data } = await supabase.from('rutas').select('*')
      .eq('status', 'open')
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('created_at', { ascending: false });
    clearTimeout(safety);
    const list = (data || []).map((r: any) => ({ ...r, stops: Array.isArray(r.stops) ? r.stops : [] })) as Ruta[];
    setRutas(list);
    setLoading(false);
    setSelected(prev => prev ? (list.find(r => r.id === prev.id) || list[0] || null) : (list[0] || null));

    // Una sola consulta para todos los planes visibles: cuántos van y sus caras.
    if (list.length) {
      const { data: mem } = await supabase.from('ruta_members')
        .select('ruta_id, user_id').in('ruta_id', list.map(r => r.id));
      const rows = mem || [];
      const { data: profs } = rows.length
        ? await supabase.from('profiles').select('id, avatar_url').in('id', [...new Set(rows.map((m: any) => m.user_id))])
        : { data: [] as any[] };
      const avatarOf = new Map((profs || []).map((p: any) => [p.id, p.avatar_url]));
      const grouped: Record<string, { count: number; avatars: (string | null)[] }> = {};
      for (const m of rows as any[]) {
        const g = grouped[m.ruta_id] || (grouped[m.ruta_id] = { count: 0, avatars: [] });
        g.count++;
        if (g.avatars.length < 3) g.avatars.push(avatarOf.get(m.user_id) || null);
      }
      setCrowd(grouped);
    } else setCrowd({});
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  // Añade el avatar de cada participante consultando profiles por sus user_id.
  const withAvatars = async <T extends { user_id: string }>(rows: T[]): Promise<(T & { avatar_url?: string | null })[]> => {
    const ids = [...new Set(rows.map(r => r.user_id))];
    if (ids.length === 0) return rows;
    const { data: profs } = await supabase.from('profiles').select('id, avatar_url').in('id', ids);
    const map = new Map((profs || []).map((p: any) => [p.id, p.avatar_url]));
    return rows.map(r => ({ ...r, avatar_url: map.get(r.user_id) || null }));
  };

  useEffect(() => {
    if (!selected) { setMembers([]); setComments([]); return; }
    supabase.from('ruta_members').select('user_id, user_name').eq('ruta_id', selected.id)
      .then(async ({ data }) => setMembers(await withAvatars((data || []) as Member[])), () => {});
    supabase.from('ruta_comments').select('*').eq('ruta_id', selected.id).order('created_at', { ascending: true })
      .then(async ({ data }) => setComments(await withAvatars((data || []) as RutaComment[])), () => {});
  }, [selected]);

  const postComment = async () => {
    if (!isAuthenticated || !user || !selected) { navigate('/auth'); return; }
    const t = commentText.trim();
    if (!t) return;
    setCommentText('');
    const { data, error } = await supabase.from('ruta_comments')
      .insert({ ruta_id: selected.id, user_id: user.id, user_name: user.name, text: t }).select().single();
    if (!error && data) setComments(c => [...c, { ...(data as any), avatar_url: user.avatar }]);
  };

  const cities = useMemo(() => [...new Set(rutas.map(r => r.city))], [rutas]);
  const filtered = useMemo(() => cityFilter ? rutas.filter(r => r.city === cityFilter) : rutas, [rutas, cityFilter]);

  // Métricas de cabecera — todas calculadas de los planes reales ya cargados.
  const todayIso = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => ({
    total: rutas.length,
    hoy: rutas.filter(r => r.date === todayIso).length,
    ciudades: cities.length,
    gente: Object.values(crowd).reduce((s, g) => s + g.count, 0),
  }), [rutas, cities, crowd, todayIso]);
  // Mantén siempre una ruta seleccionada dentro del filtro (para que el mapa nunca quede vacío en móvil).
  useEffect(() => {
    if (filtered.length && (!selected || !filtered.some(r => r.id === selected.id))) setSelected(filtered[0]);
  }, [filtered, selected]);
  const isMember = !!user && members.some(m => m.user_id === user.id);
  const isCreator = !!user && !!selected && selected.creator_id === user.id;

  const toggleJoin = async () => {
    if (!isAuthenticated || !user || !selected) { navigate('/auth'); return; }
    if (isMember) {
      await supabase.from('ruta_members').delete().eq('ruta_id', selected.id).eq('user_id', user.id);
    } else {
      await supabase.from('ruta_members').insert({ ruta_id: selected.id, user_id: user.id, user_name: user.name });
      addToast({ message: `¡Te uniste a "${selected.title}"! 🗺️`, type: 'success' });
    }
    const { data } = await supabase.from('ruta_members').select('user_id, user_name').eq('ruta_id', selected.id);
    setMembers(await withAvatars((data || []) as Member[]));
  };

  const closeRuta = async () => {
    if (!selected || !isCreator) return;
    if (!confirm(`¿Cerrar "${selected.title}"? Dejará de mostrarse en el listado.`)) return;
    setClosing(true);
    const { error } = await supabase.from('rutas').update({ status: 'closed' }).eq('id', selected.id);
    setClosing(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Plan cerrado', type: 'info' });
    setSelected(null);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20 overflow-x-hidden">
      {/* Header — noche latina: mapa tenue de fondo, métricas reales y aviso de planes de hoy */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2E1440] via-[#1B0E29] to-[#0F0818] px-4 py-6 sm:py-8">
        {/* Retícula/avenidas decorativas, evocan el mapa sin competir con el mapa real de abajo */}
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 300">
          <path d="M-20 90 L 1460 60" stroke="#F9A8D4" strokeWidth="3" />
          <path d="M-20 210 L 1460 180" stroke="#F9A8D4" strokeWidth="3" />
          <path d="M340 -20 L 420 320" stroke="#F9A8D4" strokeWidth="2.5" />
          <path d="M980 -20 L 900 320" stroke="#F9A8D4" strokeWidth="2.5" />
        </svg>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full pl-2.5 pr-3.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-pink-300" />
              <span className="text-white text-xs font-extrabold tracking-wide">{cityFilter || (cities.length === 1 ? cities[0] : 'Todas las ciudades')}</span>
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white mt-3">Planes Para Bailar</h1>
            <p className="text-pink-200/80 text-sm mt-1">Crea el plan de esta noche y que el grupo se una en el mapa.</p>

            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-2">
                <span className="w-8 h-8 rounded-xl bg-brand/20 grid place-items-center flex-shrink-0"><RouteIcon className="w-4 h-4 text-pink-300" /></span>
                <span className="leading-tight"><span className="block text-white font-extrabold text-sm">{stats.total}</span><span className="block text-pink-200/70 text-[10px]">planes abiertos</span></span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 grid place-items-center flex-shrink-0"><Users className="w-4 h-4 text-emerald-300" /></span>
                <span className="leading-tight"><span className="block text-white font-extrabold text-sm">{stats.gente}</span><span className="block text-pink-200/70 text-[10px]">personas apuntadas</span></span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-2">
                <span className="w-8 h-8 rounded-xl bg-brand-secondary/20 grid place-items-center flex-shrink-0"><Building2 className="w-4 h-4 text-fuchsia-300" /></span>
                <span className="leading-tight"><span className="block text-white font-extrabold text-sm">{stats.ciudades}</span><span className="block text-pink-200/70 text-[10px]">{stats.ciudades === 1 ? 'ciudad' : 'ciudades'}</span></span>
              </div>
            </div>
          </div>

          {/* Aviso: planes de hoy (real). Sin planes hoy, la tarjeta invita a crear el primero. */}
          <div className="w-full sm:w-[290px] rounded-2xl p-4 bg-gradient-to-br from-brand to-pink-700 shadow-xl shadow-brand-deep/40 flex-shrink-0">
            <div className="flex items-start gap-3">
              <span className="relative w-9 h-9 rounded-xl bg-white/20 grid place-items-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white" />
                {stats.hoy > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-brand text-[10px] font-black grid place-items-center">{stats.hoy}</span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-white font-extrabold text-sm">{stats.hoy > 0 ? 'Planes para hoy' : 'Sin planes para hoy'}</p>
                <p className="text-white/85 text-xs mt-0.5">
                  {stats.hoy > 0
                    ? `${stats.hoy} ${stats.hoy === 1 ? 'plan sale' : 'planes salen'} hoy. ¡Únete al grupo!`
                    : 'Monta el de esta noche y que se apunte la gente.'}
                </p>
              </div>
            </div>
            <button onClick={() => (isAuthenticated ? setCreating(true) : navigate('/auth'))}
              className="w-full mt-3 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl py-2.5 text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Crear tu plan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-4">
        {/* Filtro de ciudad */}
        {cities.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setCityFilter('')}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-extrabold transition-all ${!cityFilter ? 'bg-gradient-to-br from-brand to-brand text-white shadow-lg shadow-brand/30' : 'bg-surface-elevated text-ink-secondary border border-hairline/10 hover:border-pink-300'}`}>
              <RouteIcon className="w-3.5 h-3.5" /> Todos
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${!cityFilter ? 'bg-white/25' : 'bg-surface-elevated-2'}`}>{rutas.length}</span>
            </button>
            {cities.map(c => (
              <button key={c} onClick={() => setCityFilter(c)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-extrabold transition-all ${cityFilter === c ? 'bg-gradient-to-br from-brand to-brand text-white shadow-lg shadow-brand/30' : 'bg-surface-elevated text-ink-secondary border border-hairline/10 hover:border-pink-300'}`}>
                <MapPin className="w-3.5 h-3.5" /> {c}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${cityFilter === c ? 'bg-white/25' : 'bg-surface-elevated-2'}`}>{rutas.filter(r => r.city === c).length}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-brand" /></div>
        ) : rutas.length === 0 ? (
          <div className="py-20 text-center">
            <RouteIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-900 dark:text-white font-bold">Aún no hay rutas</p>
            <p className="text-gray-400 text-sm mt-1">Sé el primero: crea el plan de esta noche y que el grupo se una.</p>
            <button onClick={() => (isAuthenticated ? setCreating(true) : navigate('/auth'))} className="mt-4 bg-brand-orange text-white font-bold rounded-xl px-5 py-2.5 text-sm">Crear la primera ruta</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[360px_1fr] gap-4 min-w-0">
            {/* Lista de rutas */}
            <div className="space-y-3 order-2 lg:order-1 min-w-0">
              {filtered.map(r => {
                const isToday = r.date === todayIso;
                const g = crowd[r.id];
                return (
                <button key={r.id} onClick={() => setSelected(r)}
                  className={`w-full text-left card-white rounded-2xl p-4 transition-all ${selected?.id === r.id ? 'ring-2 ring-brand shadow-elevation-2' : 'hover:shadow-elevation-2 hover:-translate-y-0.5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-ink-primary text-sm min-w-0">{r.title}</p>
                    {isToday && (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 bg-brand text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-tertiary mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.city}</span>
                    {r.date && !isToday && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.date}</span>}
                    {r.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.time}</span>}
                    <span className="flex items-center gap-1"><RouteIcon className="w-3 h-3" /> {r.stops.length} {r.stops.length === 1 ? 'parada' : 'paradas'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    {g && g.count > 0 ? (
                      <span className="flex items-center">
                        <span className="flex">
                          {g.avatars.map((a, i) => (
                            <span key={i} className="-mr-2 last:mr-0 ring-2 ring-white dark:ring-gray-900 rounded-full">
                              <Avatar src={a || ''} name="?" size="xs" />
                            </span>
                          ))}
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary ml-3">
                          {g.count} {g.count === 1 ? 'va' : 'van'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-tertiary">Sé el primero en unirte</span>
                    )}
                    {r.creator_name && <span className="text-[10px] text-ink-tertiary truncate max-w-[45%]">por {r.creator_name}</span>}
                  </div>
                </button>
                );
              })}
            </div>

            {/* Mapa + detalle */}
            <div className="order-1 lg:order-2 min-w-0">
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 h-[340px] sm:h-[440px] w-full">
                {selected && <RutaMap key={selected.id} stops={selected.stops} />}
              </div>
              {selected && (
                <div className="card-white rounded-2xl p-4 mt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display font-black text-lg text-gray-900 dark:text-white">{selected.title}</h2>
                      <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selected.city}</span>
                        {selected.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selected.date}</span>}
                        {selected.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selected.time}</span>}
                        {selected.end_date && <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Cierra {selected.end_date}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCreator && (
                        <button onClick={closeRuta} disabled={closing} title="Cerrar plan"
                          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50">
                          {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={toggleJoin} className={`rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-1.5 ${isMember ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-orange text-white'}`}>
                        {isMember ? <><Check className="w-4 h-4" /> Voy</> : <><Users className="w-4 h-4" /> Unirme</>}
                      </button>
                    </div>
                  </div>
                  {selected.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{selected.description}</p>}

                  {/* Grupo: perfiles de quienes van */}
                  <div className="mt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-brand" /> {members.length === 0 ? 'Aún nadie va' : `${members.length} ${members.length === 1 ? 'persona va' : 'personas van'}`}
                    </p>
                    {members.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <button key={m.user_id} onClick={() => navigate(`/artistas/${m.user_id}`)}
                            title={m.user_name || 'Perfil'} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-full pl-1 pr-2.5 py-1 hover:bg-pink-50 dark:hover:bg-brand-deep/20 transition-colors">
                            <Avatar src={m.avatar_url || ''} name={m.user_name || '?'} size="xs" />
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 max-w-[90px] truncate">{m.user_name || 'Anónimo'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Paradas */}
                  <div className="mt-3 space-y-1.5">
                    {selected.stops.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{s.name}</span>
                        {s.address && <span className="text-gray-400 text-xs truncate">· {s.address}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Chat del grupo */}
                  <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Chat del grupo</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                      {comments.length === 0 ? (
                        <p className="text-xs text-gray-400">Aún no hay mensajes. Coordina la hora y el punto de encuentro con el grupo. 🙂</p>
                      ) : comments.map(c => (
                        <div key={c.id} className="flex items-start gap-2">
                          <button onClick={() => navigate(`/artistas/${c.user_id}`)} className="flex-shrink-0">
                            <Avatar src={c.avatar_url || ''} name={c.user_name || '?'} size="xs" />
                          </button>
                          <p className="text-sm min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white text-xs">{c.user_name || 'Anónimo'}:</span>
                            <span className="text-gray-600 dark:text-gray-300 ml-1 break-words">{c.text}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="input-field flex-1"
                        placeholder="Escribe al grupo…"
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') postComment(); }}
                      />
                      <button onClick={postComment} className="bg-brand hover:bg-brand-orange-dark text-white rounded-xl px-3.5 flex items-center justify-center transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {creating && <CreateRutaModal onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  );
};

export default RutasPage;
