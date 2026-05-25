/**
 * ArtistsPage — listado de artistas, DJs, bailarines, instructores y cantantes
 *
 * Carga unificada desde Supabase:
 *  - tabla `artists` (artistas curados por admin/CMS)
 *  - tabla `profiles` con role IN (artist, dj, dancer, instructor)
 *  - tabla `live_sessions` (status=live) para mostrar indicador en vivo
 *
 * Cada tarjeta tiene un badge LIVE si el artista está emitiendo ahora mismo.
 * Botón flotante "Iniciar Live" para los creadores autenticados.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Users, CheckCircle, Radio, Loader2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge, StarRating, Avatar, FilterChips, SearchBar, EmptyState } from '../components/ui';
import SearchTriggerBar from '../components/SearchTriggerBar';
import LiveFab from '../components/LiveFab';
import LivePreviewModal, { type LiveSessionLite } from '../components/LivePreviewModal';

const TYPES = ['Todos', 'DJ', 'Bailarín/a', 'Banda', 'Instructor/a', 'Cantante', 'Artista'];
const GENRES = ['Todos', 'Salsa', 'Bachata', 'Merengue', 'Cumbia', 'Reggaeton', 'Timba', 'Kizomba'];

type UnifiedArtist = {
  id: string;
  source: 'artist' | 'profile';
  name: string;
  type: 'dj' | 'dancer' | 'band' | 'instructor' | 'singer' | 'artist';
  avatar: string;
  cover: string;
  city: string;
  country: string;
  rating: number;
  reviews: number;
  followers: number;
  priceFrom: number;
  isVerified: boolean;
  isPremium: boolean;
  isLive: boolean;
  liveSessionId?: string;
  genre: string[];
  styles: string[];
};

const ROLE_TO_TYPE: Record<string, UnifiedArtist['type']> = {
  dj: 'dj', dancer: 'dancer', instructor: 'instructor',
  singer: 'singer', band: 'band', artist: 'artist',
};

function mapType(t: string): UnifiedArtist['type'] {
  return (ROLE_TO_TYPE[t] || 'artist');
}

function typeLabel(t: UnifiedArtist['type']): string {
  return ({ dj: 'DJ', dancer: 'Bailarín/a', band: 'Banda', instructor: 'Instructor/a', singer: 'Cantante', artist: 'Artista' })[t];
}

const ArtistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = params.get('tipo') || 'Todos';

  const [artists, setArtists] = useState<UnifiedArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePreview, setLivePreview] = useState<LiveSessionLite | null>(null);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState([
    initialType === 'dj' ? 'DJ' :
    initialType === 'dancer' ? 'Bailarín/a' :
    initialType === 'instructor' ? 'Instructor/a' : 'Todos'
  ]);
  const [selectedGenre, setSelectedGenre] = useState(['Todos']);
  const [onlyLive, setOnlyLive] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'live'>('live');

  useEffect(() => {
    (async () => {
      try {
        const [
          { data: dbArtists },
          { data: dbProfiles },
          { data: liveSessions },
        ] = await Promise.all([
          supabase.from('artists').select('*'),
          supabase.from('profiles').select('id, full_name, name, role, avatar_url, avatar, cover_photo, location, city, country, styles, tags, is_premium, verified, is_verified').in('role', ['artist', 'dj', 'dancer', 'instructor', 'singer', 'band']),
          supabase.from('live_sessions').select('id, host_id, status').eq('status', 'live'),
        ]);

        const liveByHost = new Map<string, string>();
        (liveSessions || []).forEach((ls: any) => liveByHost.set(ls.host_id, ls.id));

        const merged: UnifiedArtist[] = [];

        (dbArtists || []).forEach((a: any) => {
          merged.push({
            id: a.id,
            source: 'artist',
            name: a.name || 'Artista',
            type: mapType(a.type || 'artist'),
            avatar: a.avatar || '',
            cover: a.cover || a.avatar || '',
            city: a.city || '',
            country: a.country || '',
            rating: Number(a.rating) || 0,
            reviews: Number(a.reviews) || 0,
            followers: Number(a.followers) || 0,
            priceFrom: Number(a.price_from) || 0,
            isVerified: !!a.is_verified,
            isPremium: !!a.is_premium,
            isLive: liveByHost.has(a.user_id || a.id),
            liveSessionId: liveByHost.get(a.user_id || a.id),
            genre: Array.isArray(a.genre) ? a.genre : [],
            styles: Array.isArray(a.tags) ? a.tags : [],
          });
        });

        (dbProfiles || []).forEach((p: any) => {
          const liveId = liveByHost.get(p.id);
          merged.push({
            id: p.id,
            source: 'profile',
            name: p.full_name || p.name || 'Creador',
            type: mapType(p.role || 'artist'),
            avatar: p.avatar_url || p.avatar || '',
            cover: p.cover_photo || p.avatar_url || p.avatar || '',
            city: p.location || p.city || '',
            country: p.country || '',
            rating: 0,
            reviews: 0,
            followers: 0,
            priceFrom: 0,
            isVerified: !!(p.verified ?? p.is_verified),
            isPremium: !!p.is_premium,
            isLive: !!liveId,
            liveSessionId: liveId,
            genre: Array.isArray(p.styles) ? p.styles : [],
            styles: Array.isArray(p.tags) ? p.tags : [],
          });
        });

        setArtists(merged);
      } catch (e) {
        console.warn('[ArtistsPage] load:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return artists.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.genre.some(g => g.toLowerCase().includes(search.toLowerCase())) ||
        a.city.toLowerCase().includes(search.toLowerCase());
      const matchType = selectedType.includes('Todos') || selectedType.some(t => typeLabel(a.type) === t);
      const matchGenre = selectedGenre.includes('Todos') || selectedGenre.some(g => a.genre.includes(g));
      const matchLive = !onlyLive || a.isLive;
      const matchVerified = !onlyVerified || a.isVerified;
      return matchSearch && matchType && matchGenre && matchLive && matchVerified;
    }).sort((a, b) => {
      if (sortBy === 'live') {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return b.rating - a.rating;
      }
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.priceFrom - b.priceFrom;
    });
  }, [artists, search, selectedType, selectedGenre, onlyLive, onlyVerified, sortBy]);

  const handleOpen = async (a: UnifiedArtist) => {
    if (a.isLive && a.liveSessionId) {
      // Mostrar preview del live antes de entrar
      const { data } = await supabase.from('live_sessions_enriched').select('*').eq('id', a.liveSessionId).maybeSingle();
      if (data) setLivePreview(data as LiveSessionLite);
      return;
    }
    // No live → ir al perfil
    if (a.source === 'profile') navigate(`/p/${a.id}`);
    else navigate(`/artistas/${a.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 pb-28">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 dark:text-white mb-1">🎧 Artistas</h1>
          <p className="text-gray-400">DJs, bailarines, instructores y músicos · click en LIVE para ver preview</p>
        </div>

        <SearchTriggerBar placeholder="🔍 Buscar artistas, eventos, locales en todo BailaNow…" className="mb-3" />
        <SearchBar placeholder="Filtrar en esta página..." value={search} onChange={setSearch} />

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">Tipo</p>
            <FilterChips options={TYPES} selected={selectedType} onChange={setSelectedType} />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">Género</p>
            <FilterChips options={GENRES} selected={selectedGenre} onChange={setSelectedGenre} />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setOnlyLive(!onlyLive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyLive ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-400 hover:text-red-500'}`}
            >
              <Radio className="w-3.5 h-3.5" /> Solo en vivo
            </button>
            <button
              onClick={() => setOnlyVerified(!onlyVerified)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyVerified ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-500'}`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Verificados
            </button>
            <div className="ml-auto flex gap-1">
              {(['live', 'rating', 'price'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${sortBy === s ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-orange hover:text-brand-orange'}`}
                >
                  {s === 'live' ? '🔴 En vivo' : s === 'rating' ? '⭐ Rating' : '💰 Precio'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto" />
              <p className="text-gray-400 text-sm mt-3">Cargando artistas y perfiles…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🎧"
              title="No se encontraron artistas"
              description="Crea tu propio perfil de artista o cambia los filtros"
              action={<button onClick={() => { setSearch(''); setSelectedType(['Todos']); setSelectedGenre(['Todos']); setOnlyLive(false); }} className="btn-outline text-sm">Limpiar filtros</button>}
            />
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-4">{filtered.length} resultados</p>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map(a => (
                  <ArtistCard key={`${a.source}-${a.id}`} artist={a} onClick={() => handleOpen(a)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <LiveFab category="show" />
      <LivePreviewModal open={!!livePreview} onClose={() => setLivePreview(null)} session={livePreview} />
    </div>
  );
};

const ArtistCard: React.FC<{ artist: UnifiedArtist; onClick: () => void }> = ({ artist, onClick }) => (
  <div
    onClick={onClick}
    className="card-white overflow-hidden hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:scale-[1.02] relative"
  >
    <div className="relative h-40 overflow-hidden bg-gradient-to-br from-pink-500 to-fuchsia-700">
      {artist.cover
        ? <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-white/70 text-3xl">🎤</div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      {artist.isLive && (
        <Badge variant="live" className="absolute top-2 left-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </Badge>
      )}
      {artist.isPremium && <Badge variant="orange" className="absolute top-2 right-2">👑 PRO</Badge>}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Avatar src={artist.avatar} name={artist.name} size="md" isLive={artist.isLive} />
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold text-sm">{artist.name}</span>
            {artist.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-400" />}
          </div>
          <span className="text-white/70 text-xs capitalize">{typeLabel(artist.type)}</span>
        </div>
      </div>
    </div>

    <div className="p-4">
      <div className="flex flex-wrap gap-1 mb-3 min-h-[18px]">
        {artist.genre.slice(0, 3).map(g => (
          <span key={g} className="text-xs bg-pink-50 dark:bg-pink-900/30 text-brand-orange px-2 py-0.5 rounded-full font-medium">{g}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {artist.rating > 0 ? (
            <StarRating rating={artist.rating} count={artist.reviews} />
          ) : (
            <span className="text-[10px] text-gray-400 uppercase font-bold">Nuevo</span>
          )}
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
        className={`w-full mt-3 text-xs py-2 rounded-lg font-bold ${
          artist.isLive
            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:scale-[1.02] transition-transform shadow-md flex items-center justify-center gap-1.5'
            : 'btn-orange'
        }`}
      >
        {artist.isLive ? (<><Eye className="w-3.5 h-3.5" /> Ver preview · LIVE</>) : 'Ver Perfil'}
      </button>
    </div>
  </div>
);

export default ArtistsPage;
