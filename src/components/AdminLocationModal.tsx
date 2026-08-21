/**
 * AdminLocationModal — Formulario admin con mapa interactivo
 * Permite añadir venues o eventos clickeando directamente en el mapa para
 * elegir las coordenadas exactas. Soporta búsqueda de direcciones con
 * Nominatim (OpenStreetMap, gratis) y guarda en Supabase.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Search, Save, Loader2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/uploadHelper';
import { useUIStore } from '../store/appStore';
import MapErrorBoundary from './MapErrorBoundary';

// Pin icon
const pinIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="
    width: 36px; height: 36px;
    background: ${color};
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
  "><div style="transform: rotate(45deg); font-size: 14px;">📍</div></div>`,
  iconSize: [36, 36], iconAnchor: [18, 36],
});

// ── Internal: Map click handler ────────────────────────────────────────
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, 14, { duration: 1 }); }, [pos, map]);
  return null;
}

// ── Component ───────────────────────────────────────────────────────────
type Mode = 'venue' | 'event';
interface Props {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSaved?: () => void;
}

const AdminLocationModal: React.FC<Props> = ({ open, mode, onClose, onSaved }) => {
  const { addToast } = useUIStore();
  const [saving, setSaving]   = useState(false);
  const [searching, setSearching] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [search, setSearch]   = useState('');

  // Common fields
  const [name, setName]       = useState('');
  const [city, setCity]       = useState('');
  const [country, setCountry] = useState('España');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Venue-specific
  const [style, setStyle]     = useState('');
  const [capacity, setCapacity] = useState('');
  const [venueType, setVenueType] = useState('Discoteca');

  // Event-specific
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('20:00');
  const [price, setPrice]     = useState('');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPosition(null); setSearch(''); setName(''); setCity(''); setCountry('España');
      setAddress(''); setDescription(''); setImageUrl(''); setStyle(''); setCapacity('');
      setDate(''); setTime('20:00'); setPrice('');
    }
  }, [open]);

  // Geocode address with Nominatim (free, OpenStreetMap)
  const geocode = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1&accept-language=es`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        // Auto-fill city from display name
        const parts = data[0].display_name.split(',').map((s: string) => s.trim());
        if (parts.length > 2) {
          setAddress(parts.slice(0, 2).join(', '));
          setCity(parts[parts.length - 4] || parts[parts.length - 3] || '');
          setCountry(parts[parts.length - 1] || '');
        }
      } else {
        addToast({ message: 'No se encontró esa dirección', type: 'error' });
      }
    } catch {
      addToast({ message: 'Error al buscar dirección', type: 'error' });
    }
    setSearching(false);
  };

  // Upload image — usa helper unificado con timeout + fallback
  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadImage(file, mode);
    setUploading(false);

    if (result.url) {
      setImageUrl(result.url);
      addToast({
        message: result.fallback
          ? '⚠ Imagen guardada localmente (sin servidor)'
          : '✅ Imagen subida correctamente',
        type: result.fallback ? 'warning' : 'success',
      });
    } else {
      addToast({ message: `❌ ${result.error}`, type: 'error' });
    }
  };

  // Save to Supabase with robust error handling
  const handleSave = async () => {
    if (!name.trim()) { addToast({ message: '⚠ El nombre es obligatorio', type: 'error' }); return; }
    if (!city.trim()) { addToast({ message: '⚠ La ciudad es obligatoria', type: 'error' }); return; }
    if (!position)    { addToast({ message: '⚠ Selecciona una ubicación en el mapa', type: 'error' }); return; }
    if (mode === 'event' && !date) { addToast({ message: '⚠ La fecha es obligatoria para eventos', type: 'error' }); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addToast({ message: '❌ Debes iniciar sesión', type: 'error' });
        setSaving(false); return;
      }

      // Insert robusto: si una columna no existe en la tabla, la descarta y reintenta
      // (reconoce el error crudo de Postgres Y el PGRST204 de Supabase). Así una
      // columna sobrante no bloquea la creación entera.
      const insertRobust = async (table: string, payload: Record<string, any>) => {
        const p = { ...payload };
        const dropped: string[] = [];
        let lastErr: any = null;
        for (let i = 0; i < 16; i++) {
          if (Object.keys(p).length === 0) { throw lastErr || new Error('sin campos válidos'); }
          const { data, error } = await supabase.from(table).insert(p).select().single();
          if (!error) return { data, dropped };
          lastErr = error;
          const m = /column "?([a-z_]+)"? of relation .* does not exist/i.exec(error.message || '')
            || /Could not find the '([a-z_]+)' column/i.exec(error.message || '');
          if (m && p[m[1]] !== undefined) { dropped.push(m[1]); delete p[m[1]]; continue; }
          throw error;
        }
        throw lastErr;
      };

      let dropped: string[] = [];
      if (mode === 'venue') {
        const payload = {
          name, city, country: country || 'España', address: address || null,
          description: description || null,
          image_url: imageUrl || null,
          style: style ? style.split(',').map(s => s.trim()).filter(Boolean) : [],
          capacity: capacity ? parseInt(capacity) : null,
          lat: position[0], lng: position[1],
          status: 'active', admin_status: 'approved',
          type: venueType.toLowerCase(),
        };
        ({ dropped } = await insertRobust('venues', payload));
      } else {
        const payload = {
          title: name, city, country: country || 'España', location: address || city,
          description: description || null,
          image_url: imageUrl || null, cover: imageUrl || null,
          venue_name: address || name,
          date, time: time || '20:00',
          price: price ? parseFloat(price) : null,
          currency: 'EUR',
          lat: position[0], lng: position[1],
          admin_status: 'approved', type: 'Social',
          owner_id: session?.user?.id ?? null,
          user_id: session?.user?.id ?? null,
        };
        ({ dropped } = await insertRobust('events', payload));
      }
      addToast({ message: `✅ ${mode === 'venue' ? 'Local' : 'Evento'} guardado correctamente${dropped.length ? ` (omitido: ${dropped.join(', ')})` : ''}`, type: 'success' });
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      addToast({ message: `❌ Error: ${err.message || 'No se pudo guardar'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const mapDefault: [number, number] = useMemo(() => [40.4168, -3.7038], []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg ${mode === 'venue' ? 'bg-brand-orange' : 'bg-brand-orange'}`}>
              {mode === 'venue' ? '🏛️' : '🎉'}
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">
                Añadir nuevo {mode === 'venue' ? 'local' : 'evento'}
              </h2>
              <p className="text-xs text-gray-400">Busca dirección o clickea en el mapa para fijar la ubicación</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY: 2 cols on desktop */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-0">

          {/* MAP COL */}
          <div className="lg:order-2 h-[280px] lg:h-auto lg:min-h-[480px] relative bg-gray-950">
            {/* Search */}
            <div className="absolute top-3 left-3 right-3 z-[500]">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center gap-1 p-1">
                <Search className="w-4 h-4 text-gray-400 ml-2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && geocode()}
                  placeholder="Ej: Calle Princesa 1, Madrid"
                  className="flex-1 bg-transparent text-sm py-2 px-1 focus:outline-none text-gray-800 dark:text-white"
                />
                <button onClick={geocode} disabled={searching}
                  className="bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95">
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                </button>
              </div>
            </div>

            <MapErrorBoundary>
            <MapContainer center={mapDefault} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; CARTO &copy; OpenStreetMap"
              />
              <ClickHandler onPick={(lat, lng) => setPosition([lat, lng])} />
              <FlyTo pos={position} />
              {position && (
                <Marker position={position} icon={pinIcon(mode === 'venue' ? '#EC4899' : '#F59E0B')} />
              )}
            </MapContainer>
            </MapErrorBoundary>

            {position && (
              <div className="absolute bottom-3 left-3 right-3 z-[500] bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 text-xs">
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-pink-500" /> Ubicación seleccionada
                </p>
                <p className="text-gray-500 mt-0.5 font-mono text-[11px]">
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </p>
              </div>
            )}
          </div>

          {/* FORM COL */}
          <div className="lg:order-1 p-5 space-y-3 overflow-y-auto">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={mode === 'venue' ? 'Azúcar Disco' : 'Bachata Festival Madrid'}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ciudad *</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Madrid"
                  className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">País</label>
                <input value={country} onChange={e => setCountry(e.target.value)} placeholder="España"
                  className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dirección</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle Princesa 1"
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>

            {mode === 'venue' ? (
              <>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tipo de local</label>
                  <select value={venueType} onChange={e => setVenueType(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                    {['Discoteca', 'Club', 'Bar', 'Studio', 'Rooftop', 'Lounge', 'Restaurante'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Estilos (coma separados)</label>
                  <input value={style} onChange={e => setStyle(e.target.value)} placeholder="Bachata, Salsa, Kizomba"
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Capacidad</label>
                  <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="300"
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fecha *</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hora</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Precio (€)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="25"
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Una breve descripción del lugar/evento…"
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
            </div>

            {/* Image */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Imagen</label>
              {imageUrl ? (
                <div className="mt-1 relative w-full h-24 rounded-xl overflow-hidden">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-3 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-colors">
                  {uploading
                    ? <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                    : <><Upload className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-500">Subir imagen</span></>
                  }
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-gray-950/50">
          <div className={`text-xs font-bold flex items-center gap-1.5 ${position ? 'text-green-600' : 'text-orange-500'}`}>
            {position ? (
              <><span className="w-2 h-2 bg-green-500 rounded-full" /> Ubicación marcada</>
            ) : (
              <><span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> Selecciona ubicación en el mapa</>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !position || !name || !city}
              className="bg-brand-orange text-white text-sm font-black px-5 py-2 rounded-xl shadow-lg shadow-pink-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLocationModal;
