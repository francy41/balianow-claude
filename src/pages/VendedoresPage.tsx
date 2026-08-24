import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, Filter, Store, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TYPES = ['Todos', 'DJ', 'Bailarín', 'Cantante', 'Instructor', 'Banda'];
const CITIES_LIST = ['Todas', 'Madrid', 'Barcelona', 'Valencia', 'Cali', 'Buenos Aires', 'Miami', 'Paris', 'London'];

type ArtRow = { id: string; name: string; type: string; city: string; cover: string; avatar: string; isPremium: boolean; isLive: boolean; rating: number; reviews: number; priceFrom: number; completedBookings: number; };
type SvcRow = { id: string; title: string; cover: string; artistName: string; rating: number; price: number; };

function normArtist(a: any): ArtRow {
  return {
    id: a.id, name: a.name || a.full_name || '', type: a.type || a.role || '',
    city: a.city || '', cover: a.cover || a.avatar || a.image_url || '',
    avatar: a.avatar || '', isPremium: !!a.is_premium, isLive: !!a.is_live,
    rating: Number(a.rating) || 0, reviews: Number(a.reviews) || 0,
    priceFrom: Number(a.price_from) || 0, completedBookings: Number(a.completed_bookings) || 0,
  };
}

const VendedoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<ArtRow[]>([]);
  const [services, setServices] = useState<SvcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('artists').select('id,name,type,city,cover,avatar,image_url,is_premium,is_live,rating,reviews,price_from,completed_bookings').order('rating', { ascending: false }).limit(200),
      supabase.from('services').select('id,title,cover,image_url,artist_name,rating,price').eq('admin_status', 'approved').order('rating', { ascending: false }).limit(5),
    ]).then(([{ data: arts }, { data: svcs }]) => {
      setArtists((arts || []).map(normArtist));
      setServices((svcs || []).map(s => ({ id: s.id, title: s.title || '', cover: s.cover || s.image_url || '', artistName: s.artist_name || '', rating: Number(s.rating) || 0, price: Number(s.price) || 0 })));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return artists.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase());
      const matchType = selectedType === 'Todos' || a.type.toLowerCase().includes(selectedType.toLowerCase());
      const matchCity = selectedCity === 'Todas' || a.city === selectedCity;
      return matchSearch && matchType && matchCity;
    });
  }, [artists, search, selectedType, selectedCity]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-brand-deep to-brand-deep px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">Vendedores</h1>
            <p className="text-white/60 text-xs">{loading ? 'Cargando…' : `${filtered.length} artistas disponibles`}</p>
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
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${selectedType === t ? 'bg-brand text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {CITIES_LIST.map(c => (
                <button key={c} onClick={() => setSelectedCity(c)}
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${selectedCity === c ? 'bg-brand-secondary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
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
            <button onClick={() => navigate('/marketplace')} className="text-brand text-xs font-bold flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="py-6 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-pink-400" /></div>
          ) : services.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">Aún no hay servicios publicados. <button onClick={() => navigate('/marketplace')} className="text-brand font-bold underline">Ver marketplace</button></p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {services.map(svc => (
                <button key={svc.id} onClick={() => navigate(`/marketplace/${svc.id}`)}
                  className="flex-shrink-0 w-52 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all text-left">
                  {svc.cover ? <img src={svc.cover} alt={svc.title} className="w-full h-28 object-cover" /> : <div className="w-full h-28 bg-brand-orange" />}
                  <div className="p-3">
                    <p className="font-bold text-gray-900 dark:text-white text-xs line-clamp-2">{svc.title}</p>
                    <p className="text-gray-500 text-[10px] mt-1">{svc.artistName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{svc.rating || '—'}</span>
                      </div>
                      <span className="text-brand font-black text-sm">€{svc.price}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vendedores grid */}
        <h2 className="font-black text-gray-900 dark:text-white text-base mb-3">
          🎧 Todos los Vendedores
          {(selectedType !== 'Todos' || selectedCity !== 'Todas' || search) && (
            <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length} resultados)</span>
          )}
        </h2>

        {loading ? (
          <div className="py-16 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-pink-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{artists.length === 0 ? '🎧' : '🔍'}</div>
            <p className="font-bold text-gray-700 dark:text-gray-300">{artists.length === 0 ? 'Aún no hay artistas registrados' : 'Sin resultados'}</p>
            <p className="text-gray-400 text-sm mt-1">{artists.length === 0 ? 'Los artistas aparecerán aquí cuando se registren en la plataforma.' : 'Prueba con otros filtros'}</p>
            {artists.length > 0 && <button onClick={() => { setSearch(''); setSelectedType('Todos'); setSelectedCity('Todas'); }} className="mt-4 text-brand text-sm font-bold underline">Limpiar filtros</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(artist => (
              <button key={artist.id} onClick={() => navigate(`/artistas/${artist.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 transition-all hover:-translate-y-1 group text-left">
                <div className="relative">
                  {artist.cover ? (
                    <img src={artist.cover} alt={artist.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-32 bg-gray-800 flex items-center justify-center text-3xl">🎧</div>
                  )}
                  {artist.isPremium && <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1.5 py-0.5 rounded">PRO</span>}
                  {artist.isLive && <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5"><span className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE</span>}
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{artist.name}</p>
                  <p className="text-gray-400 text-[10px] capitalize">{artist.type}{artist.city ? ` · ${artist.city}` : ''}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{artist.rating || '—'}</span>
                      {artist.reviews > 0 && <span className="text-[9px] text-gray-400">({artist.reviews})</span>}
                    </div>
                    {artist.priceFrom > 0 && <span className="text-[10px] font-bold text-brand">€{artist.priceFrom}</span>}
                  </div>
                  {artist.completedBookings > 0 && <div className="mt-2 flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-gray-400" /><span className="text-[9px] text-gray-400">{artist.completedBookings} reservas</span></div>}
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
