import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings2, X, Plus, Trash2, Search, Loader2, Save,
  Music2, Award, Radio, Link2, Users, Mic2, Headphones,
  CheckCircle, Star, ChevronDown, Globe, Video, Upload, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { uploadImage } from '../lib/uploadHelper';

// ─── Types ────────────────────────────────────────────────────────────────────

type LineupRole = 'DJ' | 'Bailarín/a' | 'Cantante' | 'Instructor/a' | 'Banda' | 'Artista invitado';

interface LineupEntry {
  artist_id?: string;
  name: string;
  avatar?: string;
  role: LineupRole;
  time_slot?: string;
  genre?: string;
}

type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze';

interface Sponsor {
  name: string;
  logo?: string;
  url?: string;
  tier: SponsorTier;
}

interface GeneralData {
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  type: string;
  category: string;
  city: string;
  country: string;
  location: string;
  venue_name: string;
  price: number | '';
  price_original: number | '';
  currency: string;
  capacity: number | '';
  attending: number | '';
  cover: string;
  image_url: string;
  is_featured: boolean;
  is_premium: boolean;
  is_online: boolean;
  admin_status: string;
}

interface AdminData extends GeneralData {
  lineup: LineupEntry[];
  sponsors: Sponsor[];
  live_url: string;
  live_title: string;
  is_live: boolean;
}

const EMPTY_GENERAL: GeneralData = {
  title: '', description: '', date: '', time: '', end_time: '', type: '',
  category: '', city: '', country: '', location: '', venue_name: '',
  price: '', price_original: '', currency: 'EUR', capacity: '', attending: '',
  cover: '', image_url: '', is_featured: false, is_premium: false,
  is_online: false, admin_status: 'approved',
};

interface ArtistResult {
  id: string;
  name: string;
  avatar?: string;
  type?: string;
  genre?: string[];
  city?: string;
  rating?: number;
  is_verified?: boolean;
}

interface Props {
  eventId: string;
  onSaved?: () => void;
  ownerUserId?: string;
}

type Tab = 'general' | 'lineup' | 'sponsors' | 'live';

// ─── Tier Config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<SponsorTier, { label: string; color: string; bg: string }> = {
  platinum: { label: 'Platino',  color: 'text-purple-700', bg: 'bg-purple-100' },
  gold:     { label: 'Oro',      color: 'text-yellow-700', bg: 'bg-yellow-100' },
  silver:   { label: 'Plata',    color: 'text-gray-600',   bg: 'bg-gray-100'   },
  bronze:   { label: 'Bronce',   color: 'text-amber-700',  bg: 'bg-amber-100'  },
};

const ROLE_OPTIONS: LineupRole[] = ['DJ', 'Bailarín/a', 'Cantante', 'Instructor/a', 'Banda', 'Artista invitado'];

const ROLE_ICON: Record<LineupRole, React.ReactNode> = {
  'DJ':               <Headphones className="w-3.5 h-3.5" />,
  'Bailarín/a':       <Users className="w-3.5 h-3.5" />,
  'Cantante':         <Mic2 className="w-3.5 h-3.5" />,
  'Instructor/a':     <Star className="w-3.5 h-3.5" />,
  'Banda':            <Music2 className="w-3.5 h-3.5" />,
  'Artista invitado': <Award className="w-3.5 h-3.5" />,
};

// ─── Main Component ───────────────────────────────────────────────────────────

const EventAdminPanel: React.FC<Props> = ({ eventId, onSaved, ownerUserId }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<AdminData>({
    ...EMPTY_GENERAL,
    lineup: [],
    sponsors: [],
    live_url: '',
    live_title: '',
    is_live: false,
  });

  const isAdmin = !!user && ['admin', 'superadmin'].includes(String(user.role));
  const isOwner = !!user && !!ownerUserId && user.id === ownerUserId;
  const canManage = isAdmin || isOwner;

  // ── Load event admin data ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data: row, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    setLoading(false);

    if (error) {
      addToast({ type: 'error', message: `No se pudo cargar el evento: ${error.message}` });
      return;
    }
    if (row) {
      const num = (v: any): number | '' => (v === null || v === undefined || v === '') ? '' : Number(v);
      setData({
        title:          row.title || '',
        description:    row.description || '',
        date:           row.date || '',
        time:           row.time || '',
        end_time:       row.end_time || '',
        type:           row.type || '',
        category:       Array.isArray(row.category) ? row.category.join(', ') : (row.category || ''),
        city:           row.city || '',
        country:        row.country || '',
        location:       row.location || '',
        venue_name:     row.venue_name || '',
        price:          num(row.price),
        price_original: num(row.price_original),
        currency:       row.currency || 'EUR',
        capacity:       num(row.capacity),
        attending:      num(row.attending),
        cover:          row.cover || '',
        image_url:      row.image_url || '',
        is_featured:    !!row.is_featured,
        is_premium:     !!row.is_premium,
        is_online:      !!row.is_online,
        admin_status:   row.admin_status || 'approved',
        lineup:     Array.isArray(row.lineup)   ? row.lineup   : [],
        sponsors:   Array.isArray(row.sponsors) ? row.sponsors : [],
        live_url:   row.live_url   || '',
        live_title: row.live_title || '',
        is_live:    !!row.is_live,
      });
    }
  }, [eventId, addToast]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async (patch: Partial<AdminData>) => {
    setSaving(true);
    const { error } = await supabase
      .from('events')
      .update(patch as any)
      .eq('id', eventId);
    setSaving(false);

    if (error) {
      addToast({ type: 'error', message: `Error al guardar: ${error.message}` });
      return false;
    }
    addToast({ type: 'success', message: '¡Guardado correctamente!' });
    if (onSaved) onSaved();
    return true;
  };

  if (!canManage) return null;

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        title={isOwner ? "Panel de edición del evento (dueño)" : "Panel de edición del evento (admin)"}
        className="fixed z-[70] bottom-24 left-4 sm:bottom-8 sm:left-8 flex items-center gap-2 bg-brand-orange text-white font-black text-sm px-5 py-3.5 rounded-2xl shadow-2xl shadow-fuchsia-500/40 hover:scale-105 transition-all ring-2 ring-white/40"
      >
        <Settings2 className="w-5 h-5" /> Editar Evento
      </button>

      {/* ── Drawer overlay ── */}
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-brand-orange flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-lg">Panel de Edición del Evento</h2>
                <p className="text-white/70 text-xs">{isOwner ? 'Gestionado por ti (dueño)' : 'Solo visible para administradores'}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-shrink-0">
              {([
                { id: 'general',  icon: <FileText className="w-4 h-4" />, label: 'General' },
                { id: 'lineup',   icon: <Music2 className="w-4 h-4" />,  label: 'Lineup' },
                { id: 'sponsors', icon: <Award className="w-4 h-4" />,   label: 'Sponsors' },
                { id: 'live',     icon: <Radio className="w-4 h-4" />,   label: 'Live' },
              ] as { id: Tab; icon: React.ReactNode; label: string }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-bold border-b-2 transition-colors flex-1 justify-center whitespace-nowrap ${
                    tab === t.id
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {tab === 'general' && (
                  <GeneralTab
                    data={data}
                    onChange={patch => setData(d => ({ ...d, ...patch }))}
                    onSave={() => {
                      const catArr = data.category
                        ? data.category.split(',').map(s => s.trim()).filter(Boolean)
                        : [];
                      const n = (v: number | '') => (v === '' ? null : Number(v));
                      return save({
                        title: data.title,
                        description: data.description,
                        date: data.date || null,
                        time: data.time || null,
                        end_time: data.end_time || null,
                        type: data.type || null,
                        category: catArr,
                        city: data.city || null,
                        country: data.country || null,
                        location: data.location || null,
                        venue_name: data.venue_name || null,
                        price: n(data.price),
                        price_original: n(data.price_original),
                        currency: data.currency || null,
                        capacity: n(data.capacity),
                        attending: n(data.attending),
                        cover: data.cover || null,
                        image_url: data.image_url || null,
                        is_featured: data.is_featured,
                        is_premium: data.is_premium,
                        is_online: data.is_online,
                        admin_status: data.admin_status,
                      } as any);
                    }}
                    saving={saving}
                  />
                )}
                {tab === 'lineup' && (
                  <LineupTab
                    entries={data.lineup}
                    onChange={lineup => setData(d => ({ ...d, lineup }))}
                    onSave={() => save({ lineup: data.lineup })}
                    saving={saving}
                  />
                )}
                {tab === 'sponsors' && (
                  <SponsorsTab
                    sponsors={data.sponsors}
                    onChange={sponsors => setData(d => ({ ...d, sponsors }))}
                    onSave={() => save({ sponsors: data.sponsors })}
                    saving={saving}
                  />
                )}
                {tab === 'live' && (
                  <LiveTab
                    liveUrl={data.live_url}
                    liveTitle={data.live_title}
                    isLive={data.is_live}
                    onChange={(patch) => setData(d => ({ ...d, ...patch }))}
                    onSave={() => save({ live_url: data.live_url, live_title: data.live_title, is_live: data.is_live })}
                    saving={saving}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ─── General Tab ──────────────────────────────────────────────────────────────

const ImageInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  const { addToast } = useUIStore();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadImage(file, 'events');
    setUploading(false);
    if (error || !url) { addToast({ type: 'error', message: error || 'Error al subir' }); return; }
    onChange(url);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        {value
          ? <img src={value} alt={label} className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
          : <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><Upload className="w-5 h-5" /></div>}
        <div className="flex-1 space-y-2">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-600 text-sm font-semibold hover:bg-purple-100">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Subiendo…' : 'Subir imagen'}
            <input type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files?.[0])} />
          </label>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="o pega una URL https://…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>
    </div>
  );
};

const GeneralTab: React.FC<{
  data: GeneralData;
  onChange: (patch: Partial<GeneralData>) => void;
  onSave: () => void;
  saving: boolean;
}> = ({ data, onChange, onSave, saving }) => {
  const txt = (key: keyof GeneralData, label: string, placeholder = '', full = false) => (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type="text"
        value={(data[key] as string) ?? ''}
        onChange={e => onChange({ [key]: e.target.value } as any)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
      />
    </div>
  );

  const numField = (key: keyof GeneralData, label: string, placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type="number"
        value={(data[key] as number | '') ?? ''}
        onChange={e => onChange({ [key]: e.target.value === '' ? '' : Number(e.target.value) } as any)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
      />
    </div>
  );

  const toggle = (key: keyof GeneralData, label: string, desc: string) => (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange({ [key]: !data[key] } as any)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${data[key] ? 'bg-purple-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${data[key] ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="p-5 space-y-5">
      {/* Title & description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {txt('title', 'Título del evento *', 'Noche de Salsa…', true)}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción</label>
          <textarea
            value={data.description}
            onChange={e => onChange({ description: e.target.value })}
            rows={4}
            placeholder="Describe el evento…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-y"
          />
        </div>
      </div>

      {/* Date & time */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha</label>
          <input
            type="date"
            value={data.date}
            onChange={e => onChange({ date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        {txt('time', 'Hora inicio', '22:00')}
        {txt('end_time', 'Hora fin', '05:00')}
      </div>

      {/* Type & category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
          <select
            value={data.type}
            onChange={e => onChange({ type: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          >
            <option value="">—</option>
            <option value="Social">Social</option>
            <option value="Taller">Taller</option>
            <option value="Congreso">Congreso</option>
            <option value="Festival">Festival</option>
            <option value="Masterclass">Masterclass</option>
          </select>
        </div>
        {txt('category', 'Categorías', 'Salsa, Bachata (separadas por comas)')}
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {txt('venue_name', 'Nombre del local', 'La Clave Club')}
        {txt('city', 'Ciudad', 'Madrid')}
        {txt('country', 'País', 'España')}
        {txt('location', 'Dirección', 'Calle…')}
      </div>

      {/* Pricing & capacity */}
      <div className="grid grid-cols-3 gap-4">
        {numField('price', 'Precio (€)', '15')}
        {numField('price_original', 'Precio original (€)', '20')}
        {txt('currency', 'Moneda', 'EUR')}
        {numField('capacity', 'Aforo', '300')}
        {numField('attending', 'Asistentes', '0')}
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImageInput label="Portada / cartel" value={data.cover} onChange={v => onChange({ cover: v })} />
        <ImageInput label="Imagen alternativa" value={data.image_url} onChange={v => onChange({ image_url: v })} />
      </div>

      {/* Flags */}
      <div className="space-y-2">
        {toggle('is_featured', 'Destacado', 'Aparece resaltado en listados')}
        {toggle('is_premium', 'Premium', 'Evento de pago / exclusivo')}
        {toggle('is_online', 'Online', 'Evento virtual (sin localidades físicas)')}
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estado de publicación</label>
        <select
          value={data.admin_status}
          onChange={e => onChange({ admin_status: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
        >
          <option value="approved">Aprobado (visible)</option>
          <option value="pending">Pendiente</option>
          <option value="hidden">Oculto</option>
        </select>
      </div>

      <button
        onClick={onSave}
        disabled={saving || !data.title.trim()}
        className="w-full bg-brand-orange text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Guardar datos generales
      </button>
    </div>
  );
};

// ─── Lineup Tab ───────────────────────────────────────────────────────────────

const LineupTab: React.FC<{
  entries: LineupEntry[];
  onChange: (e: LineupEntry[]) => void;
  onSave: () => void;
  saving: boolean;
}> = ({ entries, onChange, onSave, saving }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [manualEntry, setManualEntry] = useState<Partial<LineupEntry>>({ role: 'DJ' });
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchArtists = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('artists')
      .select('id, name, avatar, type, genre, city, rating, is_verified')
      .ilike('name', `%${q}%`)
      .limit(8);
    setSearching(false);
    setResults(data || []);
  }, []);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => searchArtists(v), 300);
  };

  const addFromResult = (a: ArtistResult) => {
    const role: LineupRole = a.type === 'dj' ? 'DJ'
      : a.type === 'dancer' ? 'Bailarín/a'
      : a.type === 'singer' ? 'Cantante'
      : a.type === 'instructor' ? 'Instructor/a'
      : a.type === 'band' ? 'Banda'
      : 'Artista invitado';

    const entry: LineupEntry = {
      artist_id: a.id,
      name: a.name,
      avatar: a.avatar,
      role,
      genre: Array.isArray(a.genre) ? a.genre[0] : (a.genre || ''),
    };

    if (!entries.find(e => e.artist_id === a.id)) {
      onChange([...entries, entry]);
    }
    setSearch('');
    setResults([]);
  };

  const addManual = () => {
    if (!manualEntry.name?.trim()) return;
    onChange([...entries, { name: manualEntry.name, role: manualEntry.role || 'DJ', time_slot: manualEntry.time_slot }]);
    setManualEntry({ role: 'DJ' });
    setShowForm(false);
  };

  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));

  const updateSlot = (i: number, slot: string) => {
    const next = [...entries];
    next[i] = { ...next[i], time_slot: slot };
    onChange(next);
  };

  const updateRole = (i: number, role: LineupRole) => {
    const next = [...entries];
    next[i] = { ...next[i], role };
    onChange(next);
  };

  return (
    <div className="p-5 space-y-5">
      {/* Search from DB */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-purple-500" /> Buscar artista en la plataforma
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Nombre del artista, DJ o bailarín…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {results.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {results.map(a => {
              const already = entries.some(e => e.artist_id === a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => addFromResult(a)}
                  disabled={already}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    already ? 'opacity-40 cursor-default' : 'hover:bg-purple-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {a.avatar
                      ? <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">{a.name[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900 text-sm">{a.name}</span>
                      {a.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <p className="text-xs text-gray-400 capitalize">
                      {a.type === 'dj' ? 'DJ' : a.type === 'dancer' ? 'Bailarín/a' : a.type || 'Artista'}
                      {a.city ? ` · ${a.city}` : ''}
                      {a.rating ? ` · ⭐ ${a.rating}` : ''}
                    </p>
                  </div>
                  {already
                    ? <span className="text-xs text-green-500 font-bold">Ya añadido</span>
                    : <Plus className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Añadir manualmente (sin perfil en la plataforma)
          <ChevronDown className={`w-4 h-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>

        {showForm && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={manualEntry.name || ''}
                  onChange={e => setManualEntry(m => ({ ...m, name: e.target.value }))}
                  placeholder="DJ Latino, María García…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rol</label>
                <select
                  value={manualEntry.role || 'DJ'}
                  onChange={e => setManualEntry(m => ({ ...m, role: e.target.value as LineupRole }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Franja horaria (opcional)</label>
              <input
                type="text"
                value={manualEntry.time_slot || ''}
                onChange={e => setManualEntry(m => ({ ...m, time_slot: e.target.value }))}
                placeholder="22:00 – 23:30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <button
              onClick={addManual}
              disabled={!manualEntry.name?.trim()}
              className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-40"
            >
              Añadir al lineup
            </button>
          </div>
        )}
      </div>

      {/* Current lineup */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">
          Lineup actual <span className="text-gray-400 font-normal text-sm">({entries.length} participantes)</span>
        </h3>

        {entries.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-400">
            <Music2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin participantes todavía</p>
            <p className="text-xs mt-1">Usa el buscador o añade manualmente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 group">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 flex-shrink-0">
                  {e.avatar
                    ? <img src={e.avatar} alt={e.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-sm">{e.name[0]}</div>}
                </div>

                {/* Name & role */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{e.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={e.role}
                      onChange={ev => updateRole(i, ev.target.value as LineupRole)}
                      className="text-xs text-gray-500 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {e.genre && <span className="text-xs text-gray-400">· {e.genre}</span>}
                  </div>
                </div>

                {/* Time slot */}
                <input
                  type="text"
                  value={e.time_slot || ''}
                  onChange={ev => updateSlot(i, ev.target.value)}
                  placeholder="22:00–23:00"
                  className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-purple-200"
                />

                {/* Remove */}
                <button
                  onClick={() => remove(i)}
                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-brand-orange text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Guardar Lineup
      </button>
    </div>
  );
};

// ─── Sponsors Tab ─────────────────────────────────────────────────────────────

const SponsorsTab: React.FC<{
  sponsors: Sponsor[];
  onChange: (s: Sponsor[]) => void;
  onSave: () => void;
  saving: boolean;
}> = ({ sponsors, onChange, onSave, saving }) => {
  const [form, setForm] = useState<Partial<Sponsor>>({ tier: 'gold' });
  const [showForm, setShowForm] = useState(false);

  const add = () => {
    if (!form.name?.trim()) return;
    onChange([...sponsors, { name: form.name, logo: form.logo, url: form.url, tier: form.tier || 'gold' }]);
    setForm({ tier: 'gold' });
    setShowForm(false);
  };

  const remove = (i: number) => onChange(sponsors.filter((_, idx) => idx !== i));

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Patrocinadores del evento</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Añadir
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm">Nuevo patrocinador</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre de la empresa…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Logo (URL de imagen)
              </label>
              <input
                type="text"
                value={form.logo || ''}
                onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
                placeholder="https://empresa.com/logo.png"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Web
              </label>
              <input
                type="text"
                value={form.url || ''}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://empresa.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nivel</label>
              <select
                value={form.tier || 'gold'}
                onChange={e => setForm(f => ({ ...f, tier: e.target.value as SponsorTier }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="platinum">Platino</option>
                <option value="gold">Oro</option>
                <option value="silver">Plata</option>
                <option value="bronze">Bronce</option>
              </select>
            </div>
          </div>

          {/* Logo preview */}
          {form.logo && (
            <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
              <img src={form.logo} alt="Preview" className="w-12 h-12 object-contain rounded-lg bg-gray-50 border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{form.name || '(sin nombre)'}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_CONFIG[form.tier || 'gold'].bg} ${TIER_CONFIG[form.tier || 'gold'].color}`}>
                  {TIER_CONFIG[form.tier || 'gold'].label}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2 rounded-xl text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={add}
              disabled={!form.name?.trim()}
              className="flex-1 bg-purple-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-40"
            >
              Añadir patrocinador
            </button>
          </div>
        </div>
      )}

      {/* Sponsors list */}
      {sponsors.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-400">
          <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin patrocinadores todavía</p>
          <p className="text-xs mt-1">Añade marcas y empresas que apoyan este evento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sponsors.map((s, i) => {
            const tier = TIER_CONFIG[s.tier];
            return (
              <div key={i} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm group">
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {s.logo
                    ? <img src={s.logo} alt={s.name} className="w-full h-full object-contain p-1" />
                    : <Award className="w-6 h-6 text-gray-300" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{s.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>{tier.label}</span>
                  </div>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-0.5">
                      {s.url}
                    </a>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => remove(i)}
                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-brand-orange text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Guardar Patrocinadores
      </button>
    </div>
  );
};

// ─── Live Tab ─────────────────────────────────────────────────────────────────

function getYouTubeEmbedId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:live\/|watch\?.*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getTwitchChannel(url: string): string | null {
  const m = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  return m ? m[1] : null;
}

const LiveTab: React.FC<{
  liveUrl: string;
  liveTitle: string;
  isLive: boolean;
  onChange: (p: { live_url?: string; live_title?: string; is_live?: boolean }) => void;
  onSave: () => void;
  saving: boolean;
}> = ({ liveUrl, liveTitle, isLive, onChange, onSave, saving }) => {
  const ytId = getYouTubeEmbedId(liveUrl);
  const twitch = getTwitchChannel(liveUrl);
  const hasEmbed = !!(ytId || twitch);

  return (
    <div className="p-5 space-y-5">
      {/* Live toggle */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
        <div>
          <p className="font-bold text-gray-900">🔴 Evento en directo ahora</p>
          <p className="text-xs text-gray-400 mt-0.5">Al activarlo aparece el badge "EN VIVO" en toda la plataforma</p>
        </div>
        <button
          onClick={() => onChange({ is_live: !isLive })}
          className={`relative w-12 h-6 rounded-full transition-colors ${isLive ? 'bg-red-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isLive ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Live title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título del live (opcional)</label>
        <input
          type="text"
          value={liveTitle}
          onChange={e => onChange({ live_title: e.target.value })}
          placeholder="Ej. Noche de Salsa en Directo — Festival BailaNow"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Stream URL */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
          <Video className="w-4 h-4 text-red-500" /> URL del stream
        </label>
        <input
          type="text"
          value={liveUrl}
          onChange={e => onChange({ live_url: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=… o https://twitch.tv/canal"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <p className="text-xs text-gray-400 mt-1.5">Compatible con YouTube Live y Twitch</p>
      </div>

      {/* Embed preview */}
      {hasEmbed && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Vista previa del embed</p>
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black aspect-video">
            {ytId && (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=0&modestbranding=1&rel=0`}
                className="w-full h-full border-0"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
                title="Preview live"
              />
            )}
            {twitch && !ytId && (
              <iframe
                src={`https://player.twitch.tv/?channel=${twitch}&parent=${window.location.hostname}`}
                className="w-full h-full border-0"
                allowFullScreen
                title="Preview Twitch"
              />
            )}
          </div>
        </div>
      )}

      {!hasEmbed && liveUrl && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          <p className="font-semibold">URL no reconocida</p>
          <p className="text-xs mt-1">Introduce una URL de YouTube Live (youtube.com/watch?v=...) o Twitch (twitch.tv/canal)</p>
        </div>
      )}

      {/* Status */}
      {isLive && liveUrl && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">Evento en directo activo</p>
            <p className="text-xs text-red-500 mt-0.5">El botón Live aparece en la plataforma para todos los usuarios</p>
          </div>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-brand-orange text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Guardar configuración Live
      </button>
    </div>
  );
};

export default EventAdminPanel;
