import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Clock, Users, Calendar, ArrowLeft } from 'lucide-react';
import { EVENTS } from '../data/mockData';
import { Badge, SearchBar, FilterChips, EmptyState, Button } from '../components/ui';
import { useAuthStore, useUIStore } from '../store/appStore';
import BookingModal from '../components/BookingModal';

const CATEGORIES = ['Todos', 'Salsa', 'Bachata', 'Festival', 'Masterclass', 'Online', 'Reggaeton', 'Timba'];
const CITIES = ['Todas', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Paris', 'Online'];

/* ── Router wrapper — prevents React #300 ─────────────────────────── */
const EventsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (id) return <EventDetail eventId={id} />;
  return <EventsList />;
};

/* ── List view — 4-column grid like Venues ────────────────────────── */
const EventsList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);
  const [onlyOnline, setOnlyOnline] = useState(false);

  const filtered = useMemo(() => {
    return EVENTS.filter(e => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat.includes('Todos') || e.category.some(c => selectedCat.includes(c));
      const matchCity = selectedCity.includes('Todas') || selectedCity.includes(e.city);
      const matchOnline = !onlyOnline || e.isOnline;
      return matchSearch && matchCat && matchCity && matchOnline;
    });
  }, [search, selectedCat, selectedCity, onlyOnline]);

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

        <div className="mt-4 space-y-3">
          <FilterChips options={CATEGORIES} selected={selectedCat} onChange={setSelectedCat} />
          <FilterChips options={CITIES} selected={selectedCity} onChange={setSelectedCity} />
          <button
            onClick={() => setOnlyOnline(!onlyOnline)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyOnline ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500 hover:text-blue-600'}`}
          >
            🌐 Solo Online
          </button>
        </div>

        <div className="mt-6">
          <p className="text-gray-400 text-sm mb-4">{filtered.length} eventos</p>
          {filtered.length === 0 ? (
            <EmptyState icon="🎉" title="No hay eventos" description="Prueba con otros filtros o ciudades"
              action={<button onClick={() => { setSearch(''); setSelectedCat(['Todos']); setSelectedCity(['Todas']); }} className="btn-outline text-sm">Limpiar filtros</button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(event => (
                <EventCard key={event.id} event={event}
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

/* ── Card — vertical style matching Venues ────────────────────────── */
const EventCard: React.FC<{
  event: typeof EVENTS[0];
  onClick: () => void;
  onBuy: (e: React.MouseEvent) => void;
}> = ({ event, onClick, onBuy }) => {
  const dateObj = new Date(event.date);
  const day = dateObj.toLocaleDateString('es-ES', { day: '2-digit' });
  const month = dateObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
  const pct = Math.round((event.attending / event.capacity) * 100);

  return (
    <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300">
      <div className="relative h-44 overflow-hidden">
        <img src={event.cover} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Date badge */}
        <div className="absolute top-2 right-2 bg-brand-orange rounded-xl px-2.5 py-1.5 flex flex-col items-center">
          <span className="text-white font-black text-lg leading-none">{day}</span>
          <span className="text-white/80 text-[10px] font-bold">{month}</span>
        </div>
        {event.isFeatured && <Badge variant="orange" className="absolute top-2 left-2">⭐ Destacado</Badge>}
        {event.isOnline && <Badge variant="blue" className="absolute bottom-2 left-2">🌐 Online</Badge>}
        {/* Capacity bar */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-white text-[10px] font-medium">{pct}%</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-gray-900 font-semibold line-clamp-2 text-sm">{event.title}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
          <MapPin className="w-3 h-3" /> {event.isOnline ? 'Online' : event.city}
          <span className="mx-1">·</span>
          <Clock className="w-3 h-3" /> {event.time}
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
          <Users className="w-3 h-3" /> {event.attending}/{event.capacity}
        </div>
        <div className="flex gap-1 flex-wrap mt-2">
          {event.category.slice(0, 2).map(c => (
            <span key={c} className="text-[10px] bg-orange-50 text-brand-orange px-2 py-0.5 rounded-full font-medium">{c}</span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-brand-orange font-bold text-lg">€{event.price}</span>
          <button
            onClick={onBuy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              pct >= 100 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-orange text-white hover:bg-brand-orange-dark hover:scale-105'
            }`}
            disabled={pct >= 100}
          >
            {pct >= 100 ? 'Agotado' : '🎫 Comprar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Detail view ──────────────────────────────────────────────────── */
const EventDetail: React.FC<{ eventId: string }> = ({ eventId }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const event = EVENTS.find(e => e.id === eventId) || EVENTS[0];
  const [bookingOpen, setBookingOpen] = useState(false);

  const dateObj = new Date(event.date);
  const pct = Math.round((event.attending / event.capacity) * 100);

  const handleBuy = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="relative h-72 overflow-hidden">
        <img src={event.cover} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        <button onClick={() => navigate('/eventos')} className="absolute top-6 left-4 bg-white/90 text-gray-700 text-sm px-3 py-1.5 rounded-xl hover:bg-white font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        {event.isFeatured && <Badge variant="orange" className="absolute top-6 right-4">⭐ Destacado</Badge>}
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative">
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-card-hover border border-gray-100">
          <h1 className="font-display font-black text-2xl text-gray-900">{event.title}</h1>

          <div className="flex items-center gap-4 mt-3 text-gray-400 text-sm flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {event.time}</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.isOnline ? 'Online' : `${event.venueName}, ${event.city}`}</span>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <Users className="w-4 h-4 text-gray-400" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full">
                <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-gray-500 text-sm font-medium">{event.attending}/{event.capacity}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mt-4">
            {event.category.map(c => (
              <span key={c} className="text-xs bg-orange-50 text-brand-orange px-3 py-1 rounded-full font-medium">{c}</span>
            ))}
            {event.isOnline && <Badge variant="blue">🌐 Online</Badge>}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="orange" className="flex-1" onClick={handleBuy}>
              🎫 Comprar Ticket — €{event.price}
            </Button>
            <Button variant="outline" onClick={() => navigate('/chat')}>💬 Contactar</Button>
          </div>
        </div>

        <div className="card-white rounded-2xl p-4">
          <h3 className="text-gray-900 font-semibold mb-2">Descripción</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{event.description}</p>
        </div>
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerId={event.id}
        providerName={event.title}
        source="booking"
        defaultConcept={`Ticket: ${event.title}`}
        defaultPrice={event.price}
        helperText={`${event.isOnline ? 'Online' : event.city} · ${event.time}`}
      />
    </div>
  );
};

export default EventsPage;
