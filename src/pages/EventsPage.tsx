import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users } from 'lucide-react';
import { EVENTS } from '../data/mockData';
import { Badge, SearchBar, FilterChips, SectionHeader, EmptyState, Tabs } from '../components/ui';
import { useAuthStore, useUIStore } from '../store/appStore';

const CATEGORIES = ['Todos', 'Salsa', 'Bachata', 'Festival', 'Masterclass', 'Online', 'Reggaeton', 'Timba'];
const CITIES = ['Todas', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Paris', 'Online'];

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'online' | 'featured'>('upcoming');
  const [selectedCat, setSelectedCat] = useState(['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);

  const filtered = useMemo(() => {
    return EVENTS.filter(e => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat.includes('Todos') || e.category.some(c => selectedCat.includes(c));
      const matchCity = selectedCity.includes('Todas') || selectedCity.includes(e.city);
      const matchTab = tab === 'online' ? e.isOnline : tab === 'featured' ? e.isFeatured : !e.isOnline;
      return matchSearch && matchCat && matchCity && matchTab;
    });
  }, [search, selectedCat, selectedCity, tab]);

  const handleBuyTicket = (event: typeof EVENTS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }
    addToast({ message: `Procesando ticket para: ${event.title}`, type: 'success' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 mb-1">🎉 Eventos</h1>
          <p className="text-gray-400">Los mejores eventos latinos cerca de ti</p>
        </div>

        <SearchBar placeholder="Buscar eventos, ciudades..." value={search} onChange={setSearch} />

        <div className="mt-4">
          <Tabs
            tabs={[
              { id: 'upcoming', label: 'Próximos' },
              { id: 'featured', label: 'Destacados' },
              { id: 'online', label: 'Online' },
            ]}
            active={tab}
            onChange={(v) => setTab(v as typeof tab)}
          />
        </div>

        <div className="mt-4 space-y-3">
          <FilterChips options={CATEGORIES} selected={selectedCat} onChange={setSelectedCat} />
          <FilterChips options={CITIES} selected={selectedCity} onChange={setSelectedCity} />
        </div>

        <div className="mt-6">
          <p className="text-gray-400 text-sm mb-4">{filtered.length} eventos</p>
          {filtered.length === 0 ? (
            <EmptyState icon="🎉" title="No hay eventos" description="Prueba con otros filtros o ciudades"
              action={<button onClick={() => { setSearch(''); setSelectedCat(['Todos']); setSelectedCity(['Todas']); }} className="btn-outline text-sm">Limpiar filtros</button>} />
          ) : (
            <div className="space-y-4">
              {filtered.map(event => (
                <EventListItem key={event.id} event={event}
                  onClick={() => navigate(`/eventos/${event.id}`)}
                  onBuy={(e) => handleBuyTicket(event, e)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EventListItem: React.FC<{
  event: typeof EVENTS[0];
  onClick: () => void;
  onBuy: (e: React.MouseEvent) => void;
}> = ({ event, onClick, onBuy }) => {
  const dateObj = new Date(event.date);
  const day = dateObj.toLocaleDateString('es-ES', { day: '2-digit' });
  const month = dateObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
  const pct = Math.round((event.attending / event.capacity) * 100);

  return (
    <div
      onClick={onClick}
      className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover transition-all hover:scale-[1.01] flex"
    >
      {/* Date column */}
      <div className="w-20 flex-shrink-0 bg-brand-orange flex flex-col items-center justify-center p-3">
        <span className="text-white font-black text-2xl leading-none">{day}</span>
        <span className="text-white/80 text-xs font-bold">{month}</span>
      </div>

      {/* Image */}
      <div className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden">
        <img src={event.cover} alt={event.title} className="w-full h-full object-cover" />
        {event.isFeatured && (
          <Badge variant="orange" className="absolute bottom-1 left-1 text-[10px]">⭐</Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        <h3 className="text-gray-900 font-semibold text-sm sm:text-base line-clamp-2 mb-1">{event.title}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400 text-xs mb-2">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.isOnline ? 'Online' : event.city}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.attending}/{event.capacity}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full w-full max-w-xs mb-3">
          <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {event.category.slice(0, 2).map(c => (
              <span key={c} className="text-[10px] bg-orange-50 text-brand-orange px-2 py-0.5 rounded-full font-medium">{c}</span>
            ))}
            {event.isOnline && <Badge variant="blue" className="text-[10px]">Online</Badge>}
          </div>
          <button
            onClick={onBuy}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              pct >= 100 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-orange text-white hover:bg-brand-orange-dark hover:scale-105'
            }`}
            disabled={pct >= 100}
          >
            {pct >= 100 ? 'Agotado' : `€${event.price}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
