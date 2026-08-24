import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, SectionHeader, Avatar, StarRating, Badge, EmptyState } from '../components/ui';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ArtistResult { id: string; name: string; avatar: string; type: string; rating: number; isLive: boolean }
interface EventResult { id: string; title: string; cover: string; city: string; date: string; category: string[]; price: number }
interface VenueResult { id: string; name: string; cover: string; city: string; rating: number; reviews: number }
interface ServiceResult { id: string; title: string; cover: string; category: string; price: number; rating: number; orders: number }

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [tab, setTab] = useState<'all' | 'artists' | 'events' | 'venues' | 'services'>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ artists: ArtistResult[]; events: EventResult[]; venues: VenueResult[]; services: ServiceResult[] }>({
    artists: [], events: [], venues: [], services: [],
  });

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setResults({ artists: [], events: [], venues: [], services: [] }); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const like = `%${q}%`;
    const timer = setTimeout(async () => {
      const [artistsRes, eventsRes, venuesRes, servicesRes] = await Promise.all([
        supabase.from('artists').select('id,name,avatar,type,rating,is_live').ilike('name', like).limit(12),
        supabase.from('events').select('id,title,cover,image_url,city,date,category,price').is('deleted_at', null).ilike('title', like).limit(12),
        supabase.from('venues').select('id,name,cover,image_url,city,rating,reviews').is('deleted_at', null).ilike('name', like).limit(12),
        supabase.from('services').select('id,title,cover,image_url,category,price,rating').eq('admin_status', 'approved').ilike('title', like).limit(12),
      ]);
      if (cancelled) return;
      setResults({
        artists: (artistsRes.data || []).map((a: any) => ({
          id: a.id, name: a.name || 'Artista', avatar: a.avatar || '', type: a.type || 'artist',
          rating: Number(a.rating) || 0, isLive: !!a.is_live,
        })),
        events: (eventsRes.data || []).map((e: any) => ({
          id: e.id, title: e.title || 'Evento', cover: e.cover || e.image_url || '', city: e.city || '',
          date: e.date || '', category: Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []),
          price: Number(e.price) || 0,
        })),
        venues: (venuesRes.data || []).map((v: any) => ({
          id: v.id, name: v.name || 'Local', cover: v.cover || v.image_url || '', city: v.city || '',
          rating: Number(v.rating) || 0, reviews: Number(v.reviews) || 0,
        })),
        services: (servicesRes.data || []).map((s: any) => ({
          id: s.id, title: s.title || 'Servicio', cover: s.cover || s.image_url || '', category: s.category || '',
          price: Number(s.price) || 0, rating: Number(s.rating) || 0, orders: 0,
        })),
      });
      setLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  const totalResults = results.artists.length + results.events.length + results.venues.length + results.services.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] py-6 overflow-x-hidden transition-colors">
      <div className="max-w-7xl mx-auto px-4 overflow-hidden">
        <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-fuchsia-950 to-black p-6 sm:p-8 text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-brand-secondary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-pink-300">🔍 Explorar</span>
            <h1 className="font-display font-black text-3xl sm:text-4xl mt-1.5 leading-tight">Explora todo el mundo del baile</h1>
            <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-xl">Locales, eventos, artistas, clases y mucho más en un solo lugar</p>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar artistas, eventos, locales, servicios…"
              className="mt-4 w-full max-w-md bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
            />
          </div>
        </div>

        <div className="mt-6">
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
          {loading && (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Buscando…</p>
            </div>
          )}

          {/* Artists */}
          {!loading && (tab === 'all' || tab === 'artists') && results.artists.length > 0 && (
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
          {!loading && (tab === 'all' || tab === 'events') && results.events.length > 0 && (
            <div>
              <SectionHeader title="🎉 Eventos" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/eventos') } : undefined} />
              <div className="space-y-3">
                {results.events.map(e => (
                  <button key={e.id} onClick={() => navigate(`/eventos/${e.id}`)}
                    className="w-full card-white rounded-xl p-4 flex gap-4 hover:shadow-card-hover transition-all text-left">
                    <img src={e.cover} alt={e.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold text-sm">{e.title}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{e.city}{e.date && ` · ${new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
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
          {!loading && (tab === 'all' || tab === 'venues') && results.venues.length > 0 && (
            <div>
              <SectionHeader title="📍 Venues" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/venues') } : undefined} />
              <div className="scroll-x">
                {results.venues.map(v => (
                  <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
                    className="flex-shrink-0 w-56 card-white rounded-xl overflow-hidden hover:shadow-card-hover transition-all">
                    <img src={v.cover} alt={v.name} className="w-full h-32 object-cover bg-gray-100" />
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
          {!loading && (tab === 'all' || tab === 'services') && results.services.length > 0 && (
            <div>
              <SectionHeader title="💼 Servicios" action={tab === 'all' ? { label: 'Ver todos', onClick: () => navigate('/marketplace') } : undefined} />
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {results.services.map(s => (
                  <button key={s.id} onClick={() => navigate(`/marketplace/${s.id}`)}
                    className="card-white rounded-xl overflow-hidden hover:shadow-card-hover transition-all text-left">
                    <img src={s.cover} alt={s.title} className="w-full h-36 object-cover bg-gray-100" />
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

          {!loading && search.trim().length >= 2 && totalResults === 0 && (
            <EmptyState icon="🔍" title="Sin resultados" description={`No encontramos nada para "${search}"`}
              action={<button onClick={() => setSearch('')} className="btn-outline text-sm">Limpiar búsqueda</button>} />
          )}

          {!loading && search.trim().length < 2 && (
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
