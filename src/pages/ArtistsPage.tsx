import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Users, CheckCircle, Radio, Music } from 'lucide-react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '../lib/supabase';
import { Badge, StarRating, Avatar, SectionHeader, EmptyState } from '../components/ui';
import DemoBadge from '../components/DemoBadge';
import ClaimProfileButton from '../components/ClaimProfileButton';
import { FilterFacet, ActiveFilterBar, FilterPanel } from '../components/SmartFilters';
import LiveFab from '../components/LiveFab';
import { usePageMeta } from '../hooks/usePageMeta';
import { ARTISTS } from '../data/mockData';

interface DbArtist {
  id: string;
  name: string;
  type: 'dj' | 'dancer' | 'singer' | 'band' | 'instructor' | 'artist';
  city: string;
  country?: string;
  cover?: string;
  avatar?: string;
  genre: string[];
  rating: number;
  reviews: number;
  followers: number;
  priceFrom: number;
  isVerified?: boolean;
  isPremium?: boolean;
  isLive?: boolean;
  bio?: string;
  source: 'artist' | 'profile';
  userId?: string;
}

// Ejemplos de fallback (sin dueño = "Ejemplo") cuando la BD no devuelve artistas.
const FALLBACK_ARTISTS: DbArtist[] = ARTISTS.map((a: any) => ({
  id: a.id, name: a.name, type: (a.type || 'artist'),
  city: a.city || '', country: a.country, cover: a.cover, avatar: a.avatar,
  genre: Array.isArray(a.genre) ? a.genre : [], rating: Number(a.rating) || 4.5,
  reviews: Number(a.reviews) || 0, followers: Number(a.followers) || 0,
  priceFrom: Number(a.priceFrom) || 0, isVerified: !!a.isVerified,
  isPremium: !!a.isPremium, isLive: !!a.isLive, bio: a.bio,
  userId: '', source: 'artist',
}));

const TYPES = ['Todos', 'DJ', 'Bailarín/a', 'Banda', 'Instructor/a', 'Cantante'];
const GENRES = ['Todos', 'Salsa', 'Salsa Cubana', 'Salsa Colombiana (Caleña)', 'Bachata', 'Bachata Dominicana', 'Bachata Moderna', 'Bachata Sensual', 'Bachata Urbana', 'Cha-cha-chá', 'Cumbia', 'Reparto Cubano', 'Merengue', 'Reggaeton', 'Timba', 'Afrobeats', 'Kizomba'];

const normalizeRoleToType = (role: string): DbArtist['type'] | null => {
  const r = String(role || '').toLowerCase();
  if (r === 'dj')                                  return 'dj';
  if (r === 'dancer')                              return 'dancer';
  if (r === 'singer' || r === 'musician')          return 'singer';
  if (r === 'band')                                return 'band';
  if (r === 'instructor' || r === 'teacher')       return 'instructor';
  if (['artist','promoter','performer','user','vendor'].includes(r)) return 'artist';
  return null;
};

const cleanCity = (s: string | null | undefined) => (s || '').split(/[,\-\/(]/)[0].trim();

const ArtistsPage: React.FC = () => {
  usePageMeta({
    title: 'Artistas, DJs y Bailarines',
    description: 'Encuentra los mejores DJs, bailarines, cantantes e instructores latinos. Contrata talento verificado para tu evento o clase.',
  });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = params.get('tipo') || 'Todos';

  const [items, setItems] = useState<DbArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadStats, setLoadStats] = useState<{ artists: number; profiles: number }>({ artists: 0, profiles: 0 });
  const [debugInfo, setDebugInfo] = useState<string>('');

  const runDebug = async () => {
    const log: string[] = [];
    log.push(`URL: ${import.meta.env.VITE_SUPABASE_URL || '(undefined)'}`);
    log.push(`KEY: ${(import.meta.env.VITE_SUPABASE_ANON_KEY || '').slice(0, 30)}...`);
    log.push(`Session: ${(await supabase.auth.getSession()).data.session?.user?.email || '(no session)'}`);
    try {
      const t0 = Date.now();
      const { data, error, status, statusText } = await supabase.from('artists').select('id,name,type').limit(3);
      log.push(`/artists ${status} ${statusText} in ${Date.now()-t0}ms`);
      if (error) log.push(`  ERROR: ${error.message} (code: ${error.code})`);
      else log.push(`  OK: ${data?.length} rows. Sample: ${JSON.stringify(data?.[0])}`);
    } catch (e: any) { log.push(`/artists EXCEPTION: ${e.message}`); }
    try {
      const t0 = Date.now();
      const { data, error, status, statusText } = await supabase.from('profiles').select('id,full_name,role').limit(3);
      log.push(`/profiles ${status} ${statusText} in ${Date.now()-t0}ms`);
      if (error) log.push(`  ERROR: ${error.message} (code: ${error.code})`);
      else log.push(`  OK: ${data?.length} rows. Sample: ${JSON.stringify(data?.[0])}`);
    } catch (e: any) { log.push(`/profiles EXCEPTION: ${e.message}`); }
    setDebugInfo(log.join('\n'));
  };
  const [selectedType, setSelectedType] = useState([
    initialType === 'dj' ? 'DJ' :
    initialType === 'dancer' ? 'Bailarín/a' :
    initialType === 'singer' ? 'Cantante' :
    initialType === 'instructor' ? 'Instructor/a' :
    initialType === 'band' ? 'Banda' : 'Todos'
  ]);
  const [selectedGenre, setSelectedGenre] = useState(['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);
  const [onlyLive, setOnlyLive] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'followers'>('rating');

  // ── Load from Supabase ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) { setItems(prev => prev.length ? prev : FALLBACK_ARTISTS); setLoading(false); } }, 8000);

    (async () => {
      const combined: DbArtist[] = [];
      let artistCount = 0, profileCount = 0;
      const errors: string[] = [];

      // 1) tabla artists (artistas tradicionales)
      try {
        const { data, error } = await supabase.from('artists').select('*');
        if (error) errors.push(`artists: ${error.message}`);
        artistCount = data?.length || 0;
        data?.forEach((a: any) => {
          combined.push({
            id:         a.id,
            name:       a.name,
            type:       a.type || 'artist',
            city:       cleanCity(a.city),
            country:    a.country,
            cover:      a.cover || a.avatar,
            avatar:     a.avatar,
            genre:      Array.isArray(a.genre) ? a.genre : (a.genre ? [a.genre] : []),
            rating:     Number(a.rating) || 4.5,
            reviews:    Number(a.reviews) || 0,
            followers:  Number(a.followers) || 0,
            priceFrom:  Number(a.price_from || a.priceFrom) || 0,
            isVerified: !!a.is_verified,
            isPremium:  !!a.is_premium,
            isLive:     !!a.is_live,
            bio:        a.bio,
            userId:     a.user_id || '',
            source:     'artist',
          });
        });
      } catch (e: any) { errors.push(`artists fetch: ${e?.message}`); console.warn('[artists] artists table', e); }

      // 2) tabla profiles (usuarios con rol artista/dj/dancer/etc)
      try {
        const { data, error } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS);
        if (error) errors.push(`profiles: ${error.message}`);
        data?.forEach((p: any) => {
          const t = normalizeRoleToType(p.role);
          if (!t) return;
          combined.push({
            id:         p.id,
            name:       p.full_name || p.email || 'Usuario',
            type:       t,
            city:       cleanCity(p.city || p.location),
            country:    p.country,
            cover:      p.cover_photo || p.avatar_url,
            avatar:     p.avatar_url,
            genre:      Array.isArray(p.styles) ? p.styles : (Array.isArray(p.genre) ? p.genre : []),
            rating:     0,
            reviews:    0,
            followers:  0,
            priceFrom:  0,
            isVerified: !!p.verified,
            isPremium:  false,
            isLive:     !!p.is_live,
            bio:        p.bio,
            userId:     p.id,
            source:     'profile',
          });
        });
      } catch (e: any) { errors.push(`profiles fetch: ${e?.message}`); console.warn('[artists] profiles', e); }
      profileCount = combined.length - artistCount;

      // Fallback: si no hay datos reales en BD, mostrar ejemplos (sin dueño = "Ejemplo")
      if (combined.length === 0) combined.push(...FALLBACK_ARTISTS);

      if (!cancelled) {
        setItems(combined);
        setLoadStats({ artists: artistCount, profiles: profileCount });
        if (errors.length > 0 && combined.length === 0) setLoadError(errors.join(' · '));
        setLoading(false);
      }
    })().catch(e => {
      console.error('[artists] fatal', e);
      if (!cancelled) { setLoadError(e?.message || 'Error desconocido'); setLoading(false); }
    });

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // ── Lista dinámica de ciudades ────────────────────────────────
  const cities = useMemo(() => {
    const set = new Set<string>(['Todas']);
    items.forEach(i => { if (i.city) set.add(i.city); });
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(a => {
      const matchType = selectedType.includes('Todos') || selectedType.some(t =>
        (t === 'DJ' && a.type === 'dj') ||
        (t === 'Bailarín/a' && a.type === 'dancer') ||
        (t === 'Banda' && a.type === 'band') ||
        (t === 'Instructor/a' && a.type === 'instructor') ||
        (t === 'Cantante' && a.type === 'singer')
      );
      const matchGenre = selectedGenre.includes('Todos') || selectedGenre.some(g => a.genre.includes(g));
      const matchCity = selectedCity.includes('Todas') || selectedCity.includes(a.city);
      const matchLive = !onlyLive || a.isLive;
      const matchVerified = !onlyVerified || a.isVerified;
      return matchType && matchGenre && matchCity && matchLive && matchVerified;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price') return (a.priceFrom || 9999) - (b.priceFrom || 9999);
      return b.followers - a.followers;
    });
  }, [items, selectedType, selectedGenre, selectedCity, onlyLive, onlyVerified, sortBy]);

  const goToProfile = (a: DbArtist) => {
    // Perfiles de usuarios → página pública /p/:id ; artistas tradicionales → /artistas/:id
    if (a.source === 'profile') navigate(`/p/${a.id}`);
    else navigate(`/artistas/${a.id}`);
  };

  // ── Filtros activos (para la barra de pills quitables) ──
  const removeFrom = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string, allLabel: string) =>
    setter(prev => { const n = prev.filter(x => x !== val && x !== allLabel); return n.length ? n : [allLabel]; });
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedType.filter(t => t !== 'Todos').map(t => ({ label: t, onRemove: () => removeFrom(setSelectedType, t, 'Todos') })),
    ...selectedGenre.filter(g => g !== 'Todos').map(g => ({ label: g, onRemove: () => removeFrom(setSelectedGenre, g, 'Todos') })),
    ...selectedCity.filter(c => c !== 'Todas').map(c => ({ label: `📍 ${c}`, onRemove: () => removeFrom(setSelectedCity, c, 'Todas') })),
  ];
  if (onlyLive) activeChips.push({ label: '🔴 En vivo', onRemove: () => setOnlyLive(false) });
  if (onlyVerified) activeChips.push({ label: '✓ Verificados', onRemove: () => setOnlyVerified(false) });
  const clearAll = () => { setSelectedType(['Todos']); setSelectedGenre(['Todos']); setSelectedCity(['Todas']); setOnlyLive(false); setOnlyVerified(false); };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 mb-1">🎧 Artistas</h1>
          <p className="text-gray-400">Los mejores DJs, bailarines y músicos latinos</p>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <FilterPanel activeCount={activeChips.length} resultCount={filtered.length} onClear={clearAll}>
            <FilterFacet label="Tipo" icon={<span>🎭</span>} options={TYPES} selected={selectedType} onChange={setSelectedType} />
            <FilterFacet label="Género" icon={<span>🎵</span>} options={GENRES} selected={selectedGenre} onChange={setSelectedGenre} collapsible limit={8} />
            <FilterFacet label="Ciudad" icon={<span>📍</span>} options={cities} selected={selectedCity} onChange={setSelectedCity} collapsible limit={8} />

            <div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Opciones</span>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <button
                  onClick={() => setOnlyLive(!onlyLive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyLive ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-500'}`}
                >
                  <Radio className="w-3.5 h-3.5" /> Solo en vivo
                </button>
                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyVerified ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-500'}`}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Verificados
                </button>
              </div>
            </div>

            <div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Ordenar por</span>
              <div className="flex gap-2 flex-wrap mt-2">
                {(['rating', 'price', 'followers'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${sortBy === s ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-500 border-gray-200 hover:border-brand-orange hover:text-brand-orange'}`}
                  >
                    {s === 'rating' ? '⭐ Rating' : s === 'price' ? '💰 Precio' : '👥 Seguidores'}
                  </button>
                ))}
              </div>
            </div>
          </FilterPanel>
          <div className="flex-1 min-w-0 overflow-x-auto">
            {!loading && (
              <ActiveFilterBar
                chips={activeChips}
                count={filtered.length}
                total={items.length}
                noun="artistas"
                onClearAll={clearAll}
              />
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-4">
            {loading && <p className="text-gray-400 text-sm">Cargando…</p>}
          </div>
          {loadError && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4 text-xs text-red-700 dark:text-red-300">
              <strong>⚠ Error cargando datos:</strong> {loadError}
              <div className="mt-1 text-[10px] text-red-500">Comprueba conexión o RLS de Supabase</div>
            </div>
          )}
          {import.meta.env.DEV && !loading && items.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <button onClick={runDebug} className="bg-yellow-500 text-white font-bold text-xs px-3 py-1.5 rounded">
                🔍 Debug: ¿por qué 0 artistas?
              </button>
              {debugInfo && (
                <pre className="mt-2 text-[10px] text-gray-700 font-mono whitespace-pre-wrap break-all">{debugInfo}</pre>
              )}
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card-white overflow-hidden">
                  <div className="h-40 bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🎧"
              title="No se encontraron artistas"
              description="Intenta cambiar los filtros o busca con otros términos"
              action={<button onClick={() => { setSelectedType(['Todos']); setSelectedGenre(['Todos']); setSelectedCity(['Todas']); }} className="btn-outline text-sm">Limpiar filtros</button>}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-up">
              {filtered.map(artist => (
                <ArtistCard key={`${artist.source}-${artist.id}`} artist={artist} onClick={() => goToProfile(artist)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <LiveFab defaultCategory="show" label="Iniciar Live" />
    </div>
  );
};

const ArtistCard: React.FC<{ artist: DbArtist; onClick: () => void }> = ({ artist, onClick }) => (
  <div
    onClick={onClick}
    className="card-white overflow-hidden hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:scale-[1.02]"
  >
    <div className="relative h-40 overflow-hidden bg-brand-orange">
      {artist.cover
        ? <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
        : <div className="w-full h-full flex items-center justify-center"><Music className="w-12 h-12 text-white/40" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      {artist.isLive && <Badge variant="live" className="absolute top-2 left-2">🔴 LIVE</Badge>}
      {artist.isPremium && <Badge variant="orange" className="absolute top-2 right-2">👑 PRO</Badge>}
      <DemoBadge ownerId={artist.userId} className={`absolute z-10 ${artist.isLive ? 'top-9 left-2' : 'top-2 left-2'}`} />
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Avatar src={artist.avatar || ''} name={artist.name} size="md" isLive={artist.isLive} />
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold text-sm">{artist.name}</span>
            {artist.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-400" />}
          </div>
          <span className="text-white/70 text-xs capitalize">{artist.type}</span>
        </div>
      </div>
    </div>

    <div className="p-4">
      {artist.genre.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {artist.genre.slice(0, 3).map(g => (
            <span key={g} className="text-xs bg-pink-50 text-brand-orange px-2 py-0.5 rounded-full font-medium">{g}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {artist.rating > 0 && <StarRating rating={artist.rating} count={artist.reviews} />}
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            {artist.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{artist.city}</span>}
            {artist.followers > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{artist.followers.toLocaleString()}</span>}
          </div>
        </div>
        {artist.priceFrom > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Desde</p>
            <p className="text-brand-orange font-bold">€{artist.priceFrom}</p>
          </div>
        )}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        className="w-full mt-3 btn-orange text-xs py-2"
      >
        Ver Perfil
      </button>

      {!artist.userId && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <ClaimProfileButton targetTable="artists" targetId={artist.id} targetName={artist.name} fullWidth />
        </div>
      )}
    </div>
  </div>
);

export default ArtistsPage;
