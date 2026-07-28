import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Users, X, Loader2, Calendar, Clock, Trash2, Check, Route as RouteIcon, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import MapErrorBoundary from '../components/MapErrorBoundary';

interface Stop { name: string; address?: string; lat: number; lng: number; }
interface Ruta {
  id: string; creator_id: string; creator_name: string | null; title: string; city: string;
  description: string | null; date: string | null; time: string | null; stops: Stop[]; created_at: string;
}

const CARTO = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const numberPin = (n: number) => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:linear-gradient(135deg,#EC4899,#A855F7);color:#fff;font-weight:800;font-size:13px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="transform:rotate(45deg)">${n}</span></div>`,
  iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
});

const FitStops: React.FC<{ stops: Stop[] }> = ({ stops }) => {
  const map = useMap();
  useEffect(() => {
    // Leaflet en móvil necesita recalcular el tamaño cuando el contenedor se apila/redimensiona,
    // si no el mapa sale gris o descentrado.
    const apply = () => {
      map.invalidateSize();
      if (stops.length === 1) map.setView([stops[0].lat, stops[0].lng], 14);
      else if (stops.length > 1) map.fitBounds(stops.map(s => [s.lat, s.lng]) as any, { padding: [30, 30], maxZoom: 15 });
    };
    const t = setTimeout(apply, 200);
    window.addEventListener('resize', apply);
    return () => { clearTimeout(t); window.removeEventListener('resize', apply); };
  }, [stops, map]);
  return null;
};

const RutaMap: React.FC<{ stops: Stop[] }> = ({ stops }) => (
  <MapErrorBoundary>
    <MapContainer center={[40.4168, -3.7038]} zoom={12} style={{ width: '100%', height: '100%', background: '#0a0a0a' }} zoomControl={false}>
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
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopName, setStopName] = useState('');
  const [stopAddr, setStopAddr] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const addStop = async () => {
    if (!stopName.trim()) { addToast({ message: 'Ponle nombre a la parada', type: 'error' }); return; }
    setAdding(true);
    const query = [stopName, stopAddr, city].filter(Boolean).join(', ');
    const geo = await geocode(query);
    setAdding(false);
    if (!geo) { addToast({ message: 'No encontré esa dirección. Prueba con más detalle.', type: 'error' }); return; }
    setStops(s => [...s, { name: stopName.trim(), address: geo.address, lat: geo.lat, lng: geo.lng }]);
    setStopName(''); setStopAddr('');
  };

  const save = async () => {
    if (!user) { onClose(); return; }
    if (!title.trim() || !city.trim()) { addToast({ message: 'Título y ciudad son obligatorios', type: 'error' }); return; }
    if (stops.length === 0) { addToast({ message: 'Añade al menos una parada', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('rutas').insert({
      creator_id: user.id, creator_name: user.name, title: title.trim(), city: city.trim(),
      description: description.trim() || null, date: date || null, time: time || null, stops,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: '¡Ruta creada! 🗺️', type: 'success' });
    onCreated(); onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2"><RouteIcon className="w-5 h-5 text-pink-500" /> Crear ruta</h2>
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
            <div />
          </div>
          <textarea className="input-field" rows={2} placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} />

          {/* Paradas */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Paradas ({stops.length})</p>
            {stops.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {stops.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg px-2.5 py-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{s.address}</p>
                    </div>
                    <button onClick={() => setStops(st => st.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <input className="input-field" placeholder="Nombre del sitio (ej: Café Berlín)" value={stopName} onChange={e => setStopName(e.target.value)} />
              <input className="input-field" placeholder="Dirección o zona (opcional, mejora la ubicación)" value={stopAddr} onChange={e => setStopAddr(e.target.value)} />
              <button onClick={addStop} disabled={adding} className="w-full border-2 border-dashed border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-400 font-bold rounded-xl py-2 text-sm hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all disabled:opacity-50">
                {adding ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Plus className="w-4 h-4 inline mr-1" /> Añadir parada al mapa</>}
              </button>
            </div>
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
  const [members, setMembers] = useState<{ user_id: string; user_name: string | null }[]>([]);
  const [comments, setComments] = useState<{ id: string; user_id: string; user_name: string | null; text: string; created_at: string }[]>([]);
  const [commentText, setCommentText] = useState('');
  const [creating, setCreating] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  const load = useCallback(async () => {
    const safety = setTimeout(() => setLoading(false), 8000);
    const { data } = await supabase.from('rutas').select('*').order('created_at', { ascending: false });
    clearTimeout(safety);
    const list = (data || []).map((r: any) => ({ ...r, stops: Array.isArray(r.stops) ? r.stops : [] })) as Ruta[];
    setRutas(list);
    setLoading(false);
    setSelected(prev => prev ? (list.find(r => r.id === prev.id) || list[0] || null) : (list[0] || null));
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  useEffect(() => {
    if (!selected) { setMembers([]); setComments([]); return; }
    supabase.from('ruta_members').select('user_id, user_name').eq('ruta_id', selected.id)
      .then(({ data }) => setMembers((data || []) as any), () => {});
    supabase.from('ruta_comments').select('*').eq('ruta_id', selected.id).order('created_at', { ascending: true })
      .then(({ data }) => setComments((data || []) as any), () => {});
  }, [selected]);

  const postComment = async () => {
    if (!isAuthenticated || !user || !selected) { navigate('/auth'); return; }
    const t = commentText.trim();
    if (!t) return;
    setCommentText('');
    const { data, error } = await supabase.from('ruta_comments')
      .insert({ ruta_id: selected.id, user_id: user.id, user_name: user.name, text: t }).select().single();
    if (!error && data) setComments(c => [...c, data as any]);
  };

  const cities = useMemo(() => [...new Set(rutas.map(r => r.city))], [rutas]);
  const filtered = useMemo(() => cityFilter ? rutas.filter(r => r.city === cityFilter) : rutas, [rutas, cityFilter]);
  // Mantén siempre una ruta seleccionada dentro del filtro (para que el mapa nunca quede vacío en móvil).
  useEffect(() => {
    if (filtered.length && (!selected || !filtered.some(r => r.id === selected.id))) setSelected(filtered[0]);
  }, [filtered, selected]);
  const isMember = !!user && members.some(m => m.user_id === user.id);

  const toggleJoin = async () => {
    if (!isAuthenticated || !user || !selected) { navigate('/auth'); return; }
    if (isMember) {
      await supabase.from('ruta_members').delete().eq('ruta_id', selected.id).eq('user_id', user.id);
    } else {
      await supabase.from('ruta_members').insert({ ruta_id: selected.id, user_id: user.id, user_name: user.name });
      addToast({ message: `¡Te uniste a "${selected.title}"! 🗺️`, type: 'success' });
    }
    const { data } = await supabase.from('ruta_members').select('user_id, user_name').eq('ruta_id', selected.id);
    setMembers((data || []) as any);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-600 via-fuchsia-600 to-purple-700 px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-2">🔥 Ruta de Hoy</h1>
            <p className="text-white/80 text-sm mt-1">Crea la ruta de esta noche y que el grupo se una en el mapa.</p>
          </div>
          <button onClick={() => (isAuthenticated ? setCreating(true) : navigate('/auth'))} className="bg-white text-gray-900 font-bold rounded-xl px-5 py-2.5 text-sm hover:bg-gray-100 transition-all flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Crear ruta
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-4">
        {/* Filtro de ciudad */}
        {cities.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setCityFilter('')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${!cityFilter ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800'}`}>Todas</button>
            {cities.map(c => (
              <button key={c} onClick={() => setCityFilter(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cityFilter === c ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800'}`}>📍 {c}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-pink-500" /></div>
        ) : rutas.length === 0 ? (
          <div className="py-20 text-center">
            <RouteIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-900 dark:text-white font-bold">Aún no hay rutas</p>
            <p className="text-gray-400 text-sm mt-1">Sé el primero: crea la ruta de esta noche y que el grupo se una.</p>
            <button onClick={() => (isAuthenticated ? setCreating(true) : navigate('/auth'))} className="mt-4 bg-brand-orange text-white font-bold rounded-xl px-5 py-2.5 text-sm">Crear la primera ruta</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[360px_1fr] gap-4">
            {/* Lista de rutas */}
            <div className="space-y-3 order-2 lg:order-1">
              {filtered.map(r => (
                <button key={r.id} onClick={() => setSelected(r)} className={`w-full text-left card-white rounded-2xl p-4 transition-all ${selected?.id === r.id ? 'ring-2 ring-pink-500' : 'hover:shadow-lg'}`}>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{r.title}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.city}</span>
                    {r.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.date}</span>}
                    {r.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.time}</span>}
                    <span className="flex items-center gap-1"><RouteIcon className="w-3 h-3" /> {r.stops.length} paradas</span>
                  </div>
                  {r.creator_name && <p className="text-[10px] text-gray-400 mt-1">por {r.creator_name}</p>}
                </button>
              ))}
            </div>

            {/* Mapa + detalle */}
            <div className="order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 h-[340px] sm:h-[440px]">
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
                      </p>
                    </div>
                    <button onClick={toggleJoin} className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-1.5 ${isMember ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-orange text-white'}`}>
                      {isMember ? <><Check className="w-4 h-4" /> Voy</> : <><Users className="w-4 h-4" /> Unirme</>}
                    </button>
                  </div>
                  {selected.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{selected.description}</p>}
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Users className="w-4 h-4 text-pink-500" /> {members.length} {members.length === 1 ? 'persona va' : 'personas van'}
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
                    <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2">
                      {comments.length === 0 ? (
                        <p className="text-xs text-gray-400">Aún no hay mensajes. Coordina la hora y el punto de encuentro con el grupo. 🙂</p>
                      ) : comments.map(c => (
                        <p key={c.id} className="text-sm">
                          <span className="font-bold text-gray-900 dark:text-white text-xs">{c.user_name || 'Anónimo'}:</span>
                          <span className="text-gray-600 dark:text-gray-300 ml-1">{c.text}</span>
                        </p>
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
                      <button onClick={postComment} className="bg-pink-500 hover:bg-pink-600 text-white rounded-xl px-3.5 flex items-center justify-center transition-colors">
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
