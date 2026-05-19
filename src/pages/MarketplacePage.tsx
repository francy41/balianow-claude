import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShoppingBag } from 'lucide-react';
import { SERVICES } from '../data/mockData';
import type { Service } from '../data/mockData';
import { Avatar, Badge, StarRating, SearchBar, FilterChips, EmptyState, SectionHeader } from '../components/ui';

const CATEGORIES = ['Todos', 'DJ Set', 'Clases', 'Clases Online', 'Música en Vivo', 'Show Baile', 'Producción', 'Fotografía'];
const PRICE_RANGES = ['Todos', '< €100', '€100–€500', '€500–€1000', '> €1000'];

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(['Todos']);
  const [selectedPrice, setSelectedPrice] = useState(['Todos']);
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'orders'>('rating');

  const filtered = useMemo(() => {
    return SERVICES.filter(s => {
      const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artistName.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat.includes('Todos') || selectedCat.includes(s.category);
      const matchPrice = selectedPrice.includes('Todos') ||
        (selectedPrice.includes('< €100') && s.price < 100) ||
        (selectedPrice.includes('€100–€500') && s.price >= 100 && s.price <= 500) ||
        (selectedPrice.includes('€500–€1000') && s.price > 500 && s.price <= 1000) ||
        (selectedPrice.includes('> €1000') && s.price > 1000);
      return matchSearch && matchCat && matchPrice;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return b.orders - a.orders;
    });
  }, [search, selectedCat, selectedPrice, sortBy]);

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

        <SearchBar placeholder="Buscar servicios, artistas..." value={search} onChange={setSearch} />

        <div className="mt-4 space-y-3">
          <FilterChips options={CATEGORIES} selected={selectedCat} onChange={setSelectedCat} />
          <FilterChips options={PRICE_RANGES} selected={selectedPrice} onChange={setSelectedPrice} />

          <div className="flex gap-1 overflow-x-auto">
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

        <div className="mt-6">
          <p className="text-gray-400 text-sm mb-4">{filtered.length} servicios disponibles</p>
          {filtered.length === 0 ? (
            <EmptyState icon="💼" title="No hay servicios" description="Prueba con otros filtros"
              action={<button onClick={() => { setSearch(''); setSelectedCat(['Todos']); }} className="btn-outline text-sm">Limpiar</button>} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.map(service => (
                <ServiceCard key={service.id} service={service} onClick={() => navigate(`/marketplace/${service.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceCard: React.FC<{ service: Service; onClick: () => void }> = ({ service, onClick }) => (
  <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300">
    <div className="relative h-44 overflow-hidden">
      <img src={service.cover} alt={service.title} className="w-full h-full object-cover" />
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

      <button onClick={e => { e.stopPropagation(); onClick(); }} className="w-full mt-3 btn-orange text-xs py-2">
        Ver Servicio
      </button>
    </div>
  </div>
);

export default MarketplacePage;
