import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Users, CheckCircle, Radio } from 'lucide-react';
import { ARTISTS } from '../data/mockData';
import type { Artist } from '../data/mockData';
import { Badge, StarRating, Avatar, FilterChips, SearchBar, SectionHeader, EmptyState } from '../components/ui';
import SearchTriggerBar from '../components/SearchTriggerBar';
import LiveFab from '../components/LiveFab';

const TYPES = ['Todos', 'DJ', 'Bailarín/a', 'Banda', 'Instructor/a', 'Cantante'];
const GENRES = ['Todos', 'Salsa', 'Bachata', 'Merengue', 'Cumbia', 'Reggaeton', 'Timba', 'Afrobeats'];
const CITIES = ['Todas', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Paris', 'Milano'];

const ArtistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = params.get('tipo') || 'Todos';

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState([initialType === 'dj' ? 'DJ' : 'Todos']);
  const [selectedGenre, setSelectedGenre] = useState(['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);
  const [onlyLive, setOnlyLive] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'followers'>('rating');

  const filtered = useMemo(() => {
    return ARTISTS.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.genre.some(g => g.toLowerCase().includes(search.toLowerCase())) ||
        a.city.toLowerCase().includes(search.toLowerCase());
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
      return matchSearch && matchType && matchGenre && matchCity && matchLive && matchVerified;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price') return a.priceFrom - b.priceFrom;
      return b.followers - a.followers;
    });
  }, [search, selectedType, selectedGenre, selectedCity, onlyLive, onlyVerified, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 mb-1">🎧 Artistas</h1>
          <p className="text-gray-400">Los mejores DJs, bailarines y músicos latinos</p>
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
          <div>
            <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">Ciudad</p>
            <FilterChips options={CITIES} selected={selectedCity} onChange={setSelectedCity} />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
            <div className="ml-auto flex gap-1">
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
        </div>

        <div className="mt-6">
          <p className="text-gray-400 text-sm mb-4">{filtered.length} artistas encontrados</p>
          {filtered.length === 0 ? (
            <EmptyState
              icon="🎧"
              title="No se encontraron artistas"
              description="Intenta cambiar los filtros o busca con otros términos"
              action={<button onClick={() => { setSearch(''); setSelectedType(['Todos']); setSelectedGenre(['Todos']); }} className="btn-outline text-sm">Limpiar filtros</button>}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map(artist => (
                <ArtistCard key={artist.id} artist={artist} onClick={() => navigate(`/artistas/${artist.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <LiveFab defaultCategory="show" label="Iniciar Live" />
    </div>
  );
};

const ArtistCard: React.FC<{ artist: Artist; onClick: () => void }> = ({ artist, onClick }) => (
  <div
    onClick={onClick}
    className="card-white overflow-hidden hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:scale-[1.02]"
  >
    <div className="relative h-40 overflow-hidden">
      <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      {artist.isLive && <Badge variant="live" className="absolute top-2 left-2">🔴 LIVE</Badge>}
      {artist.isPremium && <Badge variant="orange" className="absolute top-2 right-2">👑 PRO</Badge>}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Avatar src={artist.avatar} name={artist.name} size="md" isLive={artist.isLive} />
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
      <div className="flex flex-wrap gap-1 mb-3">
        {artist.genre.slice(0, 3).map(g => (
          <span key={g} className="text-xs bg-pink-50 text-brand-orange px-2 py-0.5 rounded-full font-medium">{g}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <StarRating rating={artist.rating} count={artist.reviews} />
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{artist.city}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{artist.followers.toLocaleString()}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Desde</p>
          <p className="text-brand-orange font-bold">€{artist.priceFrom}</p>
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        className="w-full mt-3 btn-orange text-xs py-2"
      >
        Ver Perfil & Contratar
      </button>
    </div>
  </div>
);

export default ArtistsPage;
