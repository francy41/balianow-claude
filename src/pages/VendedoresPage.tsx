import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, Filter, Store, ChevronRight } from 'lucide-react';
import { ARTISTS, SERVICES } from '../data/mockData';

const TYPES = ['Todos', 'DJ', 'Bailarín', 'Cantante', 'Instructor', 'Banda'];
const CITIES_LIST = ['Todas', 'Madrid', 'Barcelona', 'Valencia', 'Cali', 'Buenos Aires', 'Miami', 'Paris', 'London'];

const VendedoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return ARTISTS.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.genre.some(g => g.toLowerCase().includes(search.toLowerCase()));
      const matchType = selectedType === 'Todos' || a.type.toLowerCase() === selectedType.toLowerCase();
      const matchCity = selectedCity === 'Todas' || a.city === selectedCity;
      return matchSearch && matchType && matchCity;
    });
  }, [search, selectedType, selectedCity]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">Vendedores</h1>
            <p className="text-white/60 text-xs">{filtered.length} artistas disponibles</p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar vendedor, servicio, género..."
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/40 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-pink-400"
          />
        </div>
        {/* Filter toggle */}
        <button onClick={() => setShowFilters(v => !v)} className="mt-3 flex items-center gap-2 text-white/70 text-xs font-bold">
          <Filter className="w-3.5 h-3.5" /> Filtros {showFilters ? '▲' : '▼'}
        </button>
        {showFilters && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => setSelectedType(t)}
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${selectedType === t ? 'bg-pink-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {CITIES_LIST.map(c => (
                <button key={c} onClick={() => setSelectedCity(c)}
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${selectedCity === c ? 'bg-fuchsia-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Servicios destacados */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-gray-900 dark:text-white text-base">🔥 Servicios Destacados</h2>
            <button onClick={() => navigate('/marketplace')} className="text-pink-500 text-xs font-bold flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {SERVICES.slice(0, 5).map(svc => (
              <button key={svc.id} onClick={() => navigate(`/marketplace/${svc.id}`)}
                className="flex-shrink-0 w-52 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all text-left">
                <img src={svc.cover} alt={svc.title} className="w-full h-28 object-cover" />
                <div className="p-3">
                  <p className="font-bold text-gray-900 dark:text-white text-xs line-clamp-2">{svc.title}</p>
                  <p className="text-gray-500 text-[10px] mt-1">{svc.artistName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{svc.rating}</span>
                    </div>
                    <span className="text-pink-500 font-black text-sm">€{svc.price}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Vendedores grid */}
        <h2 className="font-black text-gray-900 dark:text-white text-base mb-3">
          🎧 Todos los Vendedores
          {(selectedType !== 'Todos' || selectedCity !== 'Todas' || search) && (
            <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length} resultados)</span>
          )}
        </h2>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-bold text-gray-700 dark:text-gray-300">Sin resultados</p>
            <p className="text-gray-400 text-sm mt-1">Prueba con otros filtros</p>
            <button onClick={() => { setSearch(''); setSelectedType('Todos'); setSelectedCity('Todas'); }}
              className="mt-4 text-pink-500 text-sm font-bold underline">Limpiar filtros</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(artist => (
              <button key={artist.id} onClick={() => navigate(`/artistas/${artist.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 transition-all hover:-translate-y-1 group text-left">
                <div className="relative">
                  <img src={artist.cover} alt={artist.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                  {artist.isPremium && (
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1.5 py-0.5 rounded">PRO</span>
                  )}
                  {artist.isLive && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{artist.name}</p>
                  <p className="text-gray-400 text-[10px] capitalize">{artist.type} · {artist.city}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{artist.rating}</span>
                      <span className="text-[9px] text-gray-400">({artist.reviews})</span>
                    </div>
                    <span className="text-[10px] font-bold text-pink-500">€{artist.priceFrom}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-[9px] text-gray-400">{artist.completedBookings} reservas</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendedoresPage;
