import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShoppingBag, Loader2 } from 'lucide-react';
import { Avatar, Badge, StarRating, SearchBar, EmptyState } from '../components/ui';
import { FilterFacet, ActiveFilterBar, FilterPanel, PriceRange } from '../components/SmartFilters';
import { useAuthStore, useCartStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import PaymentGateway from '../components/payment/PaymentGateway';

const CATEGORIES = ['Todos', 'DJ Set', 'Clases', 'Clases Online', 'Música en Vivo', 'Show Baile', 'Producción', 'Fotografía'];

type SvcRow = {
  id: string; title: string; cover: string; category: string;
  artistId: string; artistName: string; artistAvatar: string;
  price: number; rating: number; reviews: number; orders: number;
  tags: string[]; deliveryDays: number;
};

function normalize(r: any): SvcRow {
  return {
    id: r.id, title: r.title || r.name || '', cover: r.cover || r.image_url || '',
    category: r.category || '', artistId: r.artist_id || r.owner_id || '',
    artistName: r.artist_name || r.name || '', artistAvatar: r.artist_avatar || '',
    price: Number(r.price) || Number(r.price_base) || 0,
    rating: Number(r.rating) || 0, reviews: Number(r.reviews) || 0,
    orders: Number(r.orders) || 0, tags: Array.isArray(r.tags) ? r.tags : [],
    deliveryDays: Number(r.delivery_days) || 1,
  };
}

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addItem, clearCart } = useCartStore();
  const [services, setServices] = useState<SvcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(['Todos']);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'orders'>('rating');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    supabase.from('services').select('*').eq('admin_status', 'approved').order('rating', { ascending: false }).limit(200)
      .then(({ data }) => { setServices((data || []).map(normalize)); setLoading(false); });
  }, []);

  const priceMax = useMemo(() => {
    const m = services.reduce((mx, s) => Math.max(mx, s.price), 0);
    return Math.max(100, Math.ceil(m / 50) * 50);
  }, [services]);

  useEffect(() => {
    if (services.length && priceRange[1] === 0) setPriceRange([0, priceMax]);
  }, [services, priceMax, priceRange]);

  const handleQuickBuy = (service: SvcRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }
    clearCart();
    addItem({
      serviceId: service.id, sellerId: service.artistId,
      sellerName: service.artistName, sellerAvatar: service.artistAvatar,
      title: service.title, price: service.price, extras: [], currency: 'EUR',
    });
    setCheckoutOpen(true);
  };

  const filtered = useMemo(() => {
    return services.filter(s => {
      const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artistName.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat.includes('Todos') || selectedCat.includes(s.category);
      const [plo, phi] = priceRange;
      const matchPrice = phi === 0 || (s.price >= plo && (phi >= priceMax || s.price <= phi));
      return matchSearch && matchCat && matchPrice;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return b.orders - a.orders;
    });
  }, [services, search, selectedCat, priceRange, priceMax, sortBy]);

  const priceNarrowed = priceRange[1] !== 0 && (priceRange[0] > 0 || priceRange[1] < priceMax);
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedCat.filter(c => c !== 'Todos').map(c => ({ label: c, onRemove: () => setSelectedCat(prev => { const n = prev.filter(x => x !== c && x !== 'Todos'); return n.length ? n : ['Todos']; }) })),
  ];
  if (priceNarrowed) activeChips.push({ label: `💰 ${priceRange[0]}€–${priceRange[1]}€`, onRemove: () => setPriceRange([0, priceMax]) });
  const activeCount = activeChips.length;
  const clearAll = () => { setSelectedCat(['Todos']); setPriceRange([0, priceMax]); setSearch(''); };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-black text-3xl text-gray-900">💼 Marketplace</h1>
            <Badge variant="orange">Fiverr/Upwork Latino</Badge>
          </div>
          <p className="text-gray-400">Contrata servicios de artistas latinos profesionales</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '🔍', title: 'Busca', desc: 'Encuentra el servicio perfecto' },
            { icon: '💬', title: 'Contacta', desc: 'Chat interno seguro' },
            { icon: '✅', title: 'Paga seguro', desc: 'Escrow garantizado' },
          ].map(step => (
            <div key={step.icon} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-card">
              <span className="text-2xl">{step.icon}</span>
              <p className="text-gray-900 font-semibold text-xs mt-1">{step.title}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>

        <SearchBar placeholder="Filtrar servicios..." value={search} onChange={setSearch} />

        <div className="flex items-center gap-3 mt-4 mb-2">
          <FilterPanel activeCount={activeCount} resultCount={filtered.length} onClear={clearAll}>
            <FilterFacet label="Categoría" icon={<span>🎬</span>} options={CATEGORIES} selected={selectedCat} onChange={setSelectedCat} collapsible limit={8} />
            <PriceRange min={0} max={priceMax} value={priceRange[1] === 0 ? [0, priceMax] : priceRange} onChange={setPriceRange} currency="€" step={10} />
            <div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Ordenar por</span>
              <div className="flex gap-2 flex-wrap mt-2">
                {[
                  { id: 'rating',     label: '⭐ Mejor valorados' },
                  { id: 'price_asc',  label: '💰 Precio ↑' },
                  { id: 'price_desc', label: '💰 Precio ↓' },
                  { id: 'orders',     label: '🔥 Más vendidos' },
                ].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id as typeof sortBy)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      sortBy === s.id ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-500 border-gray-200 hover:border-brand-orange hover:text-brand-orange'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </FilterPanel>
          <div className="flex-1 min-w-0 overflow-x-auto">
            {!loading && (
              <ActiveFilterBar chips={activeChips} count={filtered.length} total={services.length} noun="servicios" onClearAll={clearAll} />
            )}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="py-16 text-center text-gray-400"><Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" /><p>Cargando servicios…</p></div>
          ) : services.length === 0 ? (
            <div className="card-white p-10 text-center text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-gray-600 mb-1">Aún no hay servicios publicados</p>
              <p className="text-sm">Los artistas pueden ofrecer sus servicios desde su perfil. ¡Pronto habrá ofertas aquí!</p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-4">{filtered.length} servicios disponibles</p>
              {filtered.length === 0 ? (
                <EmptyState icon="💼" title="No hay servicios" description="Prueba con otros filtros"
                  action={<button onClick={() => { setSearch(''); setSelectedCat(['Todos']); }} className="btn-outline text-sm">Limpiar filtros</button>} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filtered.map(service => (
                    <ServiceCard key={service.id} service={service}
                      onClick={() => navigate(`/marketplace/${service.id}`)}
                      onQuickBuy={(e) => handleQuickBuy(service, e)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <PaymentGateway open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
};

const ServiceCard: React.FC<{ service: SvcRow; onClick: () => void; onQuickBuy: (e: React.MouseEvent) => void }> = ({ service, onClick, onQuickBuy }) => (
  <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300">
    <div className="relative h-44 overflow-hidden">
      <img src={service.cover} alt={service.title} loading="lazy" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <span className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">{service.category}</span>
    </div>

    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Avatar src={service.artistAvatar} name={service.artistName} size="xs" />
        <span className="text-gray-400 text-xs">{service.artistName}</span>
      </div>

      <h3 className="text-gray-900 font-semibold text-sm line-clamp-2 mb-2">{service.title}</h3>

      <div className="flex items-center gap-3 mb-3">
        <StarRating rating={service.rating} count={service.reviews} />
        <span className="text-gray-300 text-xs flex items-center gap-1">
          <ShoppingBag className="w-3 h-3" />{service.orders}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {service.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] bg-pink-50 text-brand-orange px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          <span>{service.deliveryDays === 1 ? 'Entrega hoy' : `${service.deliveryDays} días`}</span>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-[10px]">Desde</p>
          <p className="text-brand-orange font-bold text-lg">€{service.price}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={e => { e.stopPropagation(); onClick(); }} className="flex-1 btn-outline text-xs py-2">
          Ver Servicio
        </button>
        <button onClick={onQuickBuy} className="flex-1 btn-orange text-xs py-2">
          🛒 Contratar
        </button>
      </div>
    </div>
  </div>
);

export default MarketplacePage;
