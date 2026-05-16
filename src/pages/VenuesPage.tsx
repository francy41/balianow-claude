import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Users, Clock, CheckCircle } from 'lucide-react';
import { VENUES } from '../data/mockData';
import type { Venue } from '../data/mockData';
import { Badge, StarRating, SearchBar, FilterChips, EmptyState, Button } from '../components/ui';
import { useAuthStore, useUIStore } from '../store/appStore';
import BookingModal from '../components/BookingModal';

const TYPES = ['Todos', 'Club', 'Bar', 'Studio', 'Rooftop', 'Lounge', 'Restaurante'];
const CITIES = ['Todas', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Paris', 'Milano'];

const VenuesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Si hay :id, delegamos en el detalle (componente separado para que cada uno
  // mantenga su propio set estable de hooks — evita React error #300)
  if (id) return <VenueDetail venueId={id} />;
  return <VenuesList />;
};

const VenuesList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(['Todos']);
  const [selectedCity, setSelectedCity] = useState(['Todas']);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const filtered = useMemo(() => {
    return VENUES.filter(v => {
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase());
      const matchType = selectedType.includes('Todos') || selectedType.some(t => v.type === t.toLowerCase());
      const matchCity = selectedCity.includes('Todas') || selectedCity.includes(v.city);
      const matchOpen = !onlyOpen || v.isOpen;
      return matchSearch && matchType && matchCity && matchOpen;
    });
  }, [search, selectedType, selectedCity, onlyOpen]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 mb-1">🏛️ Venues</h1>
          <p className="text-gray-400">Clubs, estudios y espacios de entretenimiento latino</p>
        </div>

        <SearchBar placeholder="Buscar venues, ciudades..." value={search} onChange={setSearch} />

        <div className="mt-4 space-y-3">
          <FilterChips options={TYPES} selected={selectedType} onChange={setSelectedType} />
          <FilterChips options={CITIES} selected={selectedCity} onChange={setSelectedCity} />
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${onlyOpen ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500 hover:text-emerald-600'}`}
          >
            🟢 Solo abiertos ahora
          </button>
        </div>

        <div className="mt-6">
          <p className="text-gray-400 text-sm mb-4">{filtered.length} venues</p>
          {filtered.length === 0 ? (
            <EmptyState icon="🏛️" title="No hay venues" description="Intenta con otros filtros" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(venue => (
                <VenueCard key={venue.id} venue={venue} onClick={() => navigate(`/venues/${venue.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VenueCard: React.FC<{ venue: Venue; onClick: () => void }> = ({ venue, onClick }) => (
  <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300">
    <div className="relative h-44 overflow-hidden">
      <img src={venue.cover} alt={venue.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <Badge variant={venue.isOpen ? 'green' : 'gray'} className="absolute top-2 right-2">
        {venue.isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
      </Badge>
      {venue.isPremium && <Badge variant="orange" className="absolute top-2 left-2">👑 Premium</Badge>}
      <div className="absolute bottom-2 left-2">
        <span className="bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-lg capitalize font-medium">{venue.type}</span>
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-gray-900 font-semibold line-clamp-1">{venue.name}</h3>
      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
        <MapPin className="w-3 h-3" /> {venue.city}
        <span className="mx-1">·</span>
        {'€'.repeat(venue.priceRange)}
      </div>
      <StarRating rating={venue.rating} count={venue.reviews} className="mt-2" />
      <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {venue.openHours}
      </p>
    </div>
  </div>
);

const VenueDetail: React.FC<{ venueId: string }> = ({ venueId }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const venue = VENUES.find(v => v.id === venueId) || VENUES[0];
  const [activeTab, setActiveTab] = useState<'info' | 'events' | 'photos'>('info');
  const [bookingOpen, setBookingOpen] = useState(false);

  const handleReserve = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="relative h-72 overflow-hidden">
        <img src={venue.cover} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        <button onClick={() => navigate('/venues')} className="absolute top-6 left-4 bg-white/90 text-gray-700 text-sm px-3 py-1.5 rounded-xl hover:bg-white font-medium">← Volver</button>
        <Badge variant={venue.isOpen ? 'green' : 'gray'} className="absolute top-6 right-4">
          {venue.isOpen ? '🟢 Abierto Ahora' : '🔴 Cerrado'}
        </Badge>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative">
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-card-hover border border-gray-100">
          <div className="flex items-start gap-4">
            <img src={venue.avatar} alt={venue.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-brand-orange/30" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-2xl text-gray-900">{venue.name}</h1>
                {venue.isPremium && <Badge variant="orange">👑 Premium</Badge>}
              </div>
              <p className="text-gray-400 capitalize mt-0.5">{venue.type} · {venue.city}</p>
              <div className="flex items-center gap-4 mt-1 text-gray-400 text-sm flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{venue.address}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{venue.capacity} cap.</span>
                <span>{'€'.repeat(venue.priceRange)}</span>
              </div>
              <StarRating rating={venue.rating} count={venue.reviews} size="md" className="mt-2" />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-2 border border-gray-100">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 text-sm">{venue.openHours}</span>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="orange" className="flex-1" onClick={handleReserve}>📅 Reservar Espacio</Button>
            <Button variant="outline" onClick={() => navigate('/chat')}>💬 Contactar</Button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(['info', 'events', 'photos'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'info' ? 'Info' : t === 'events' ? 'Eventos' : 'Fotos'}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="card-white rounded-2xl p-4">
              <h3 className="text-gray-900 font-semibold mb-2">Descripción</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{venue.description}</p>
            </div>
            <div className="card-white rounded-2xl p-4">
              <h3 className="text-gray-900 font-semibold mb-3">Servicios & Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map(a => (
                  <span key={a} className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-sm border border-green-100">
                    <CheckCircle className="w-3.5 h-3.5" /> {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card-white rounded-2xl p-4 flex gap-4">
                <div className="w-14 flex-shrink-0 bg-brand-orange rounded-xl flex flex-col items-center justify-center p-2">
                  <span className="text-white font-black text-xl">{14 + i * 7}</span>
                  <span className="text-white/80 text-xs">JUN</span>
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-sm">Noche de Salsa #{i}</p>
                  <p className="text-gray-400 text-xs mt-1">{venue.name} · 22:00 – 05:00</p>
                  <p className="text-brand-orange text-sm font-bold mt-2">€20</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl">
                <img src={`https://picsum.photos/seed/${venue.id}${i}/400/400`} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerId={venue.id}
        providerName={venue.name}
        source="booking"
        defaultConcept={`Reserva del espacio ${venue.name}`}
        defaultPrice={venue.priceRange * 100}
        helperText={`${venue.type} en ${venue.city} · Capacidad ${venue.capacity}`}
      />
    </div>
  );
};

export default VenuesPage;
