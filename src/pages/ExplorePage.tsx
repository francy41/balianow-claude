import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ARTISTS, EVENTS, VENUES, SERVICES } from '../data/mockData';
import { SearchBar, Tabs, SectionHeader, Avatar, StarRating, Badge, EmptyState } from '../components/ui';
import { MapPin } from 'lucide-react';

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [tab, setTab] = useState<'all' | 'artists' | 'events' | 'venues' | 'services'>('all');

  const results = useMemo(() => {
    const q = search.toLowerCase();
    return {
      artists: ARTISTS.filter(a => !q || a.name.toLowerCase().includes(q) || a.genre.some(g => g.toLowerCase().includes(q)) || a.city.toLowerCase().includes(q)),
      events: EVENTS.filter(e => !q || e.title.toLowerCase().includes(q) || e.city.toLowerCase().includes(q)),
      venues: VENUES.filter(v => !q || v.name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q)),
      services: SERVICES.filter(s => !q || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    };
  }, [search]);

  const totalResults = results.artists.length + results.events.length + results.venues.length + results.services.length;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="font-display font-black text-3xl text-gray-900 mb-6">🔍 Explorar</h1>

        <SearchBar
          placeholder="Busca artistas, DJs, eventos, venues..."
          value={search}
          onChange={setSearch}
        />

        <div className="mt-4">
          <Tabs
            tabs={[
              { id: 'all', label: 'Todo', count: totalResults },
              { id: 'artists', label: 'Artistas', count: results.artists.length },
              { id: 'events', label: 'Eventos', count: results.events.length },
              { id: 'venues', label: 'Venues', count: results.venues.length },
              { id: 'services', label: 'Servicios', count: results.services.length },
            ]}
            active={tab}
            onChange={v => setTab(v as typeof tab)}
          />
        </div>

        <div className="mt-6 space-y-8">
          {/* Artists */}
          {(tab === 'all' || tab === 'artists') && results.artists.length > 0 && (
            <div>
              <SectionHeader title="🎧 Artistas" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/artistas') } : undefined} />
              <div className="scroll-x">
                {results.artists.map(a => (
                  <button key={a.id} onClick={() => navigate(`/artistas/${a.id}`)}
                    className="flex-shrink-0 w-40 card-white rounded-2xl p-4 text-center hover:shadow-card-hover hover:scale-[1.02] transition-all">
                    <Avatar src={a.avatar} name={a.name} size="lg" isLive={a.isLive} className="mx-auto mb-2" />
                    <p className="text-gray-900 font-semibold text-sm truncate">{a.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{a.type}</p>
                    <StarRating rating={a.rating} className="mt-1 justify-center" />
                    {a.isLive && <Badge variant="live" className="mt-1">LIVE</Badge>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events */}
          {(tab === 'all' || tab === 'events') && results.events.length > 0 && (
            <div>
              <SectionHeader title="🎉 Eventos" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/eventos') } : undefined} />
              <div className="space-y-3">
                {results.events.map(e => (
                  <button key={e.id} onClick={() => navigate(`/eventos/${e.id}`)}
                    className="w-full card-white rounded-xl p-4 flex gap-4 hover:shadow-card-hover transition-all text-left">
                    <img src={e.cover} alt={e.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold text-sm">{e.title}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{e.city} · {new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {e.category.slice(0, 2).map(c => (
                          <span key={c} className="text-[10px] bg-pink-50 text-brand-orange px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-brand-orange font-bold flex-shrink-0">€{e.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Venues */}
          {(tab === 'all' || tab === 'venues') && results.venues.length > 0 && (
            <div>
              <SectionHeader title="📍 Venues" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/venues') } : undefined} />
              <div className="scroll-x">
                {results.venues.map(v => (
                  <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
                    className="flex-shrink-0 w-56 card-white rounded-xl overflow-hidden hover:shadow-card-hover transition-all">
                    <img src={v.cover} alt={v.name} className="w-full h-32 object-cover" />
                    <div className="p-3">
                      <p className="text-gray-900 font-semibold text-sm">{v.name}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{v.city}
                      </p>
                      <StarRating rating={v.rating} count={v.reviews} className="mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {(tab === 'all' || tab === 'services') && results.services.length > 0 && (
            <div>
              <SectionHeader title="💼 Servicios" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/marketplace') } : undefined} />
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {results.services.map(s => (
                  <button key={s.id} onClick={() => navigate(`/marketplace/${s.id}`)}
                    className="card-white rounded-xl overflow-hidden hover:shadow-card-hover transition-all text-left">
                    <img src={s.cover} alt={s.title} className="w-full h-36 object-cover" />
                    <div className="p-4">
                      <p className="text-gray-900 font-semibold text-sm">{s.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{s.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <StarRating rating={s.rating} count={s.orders} />
                        <span className="text-brand-orange font-bold">€{s.price}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {search && totalResults === 0 && (
            <EmptyState icon="🔍" title="Sin resultados" description={`No encontramos nada para "${search}"`}
              action={<button onClick={() => setSearch('')} className="btn-outline text-sm">Limpiar búsqueda</button>} />
          )}

          {!search && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🎵</p>
              <p className="text-gray-400">Escribe algo para buscar artistas, eventos, venues o servicios</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
