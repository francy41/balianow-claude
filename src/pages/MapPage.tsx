import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { VENUES, EVENTS } from '../data/mockData';
import { Badge, Button } from '../components/ui';

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'venues' | 'events'>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <h1 className="font-display font-bold text-xl text-gray-900 flex-1">🗺️ Mapa Latino</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'venues', 'events'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-brand-orange text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'all' ? 'Todo' : f === 'venues' ? '🏛️ Venues' : '🎉 Eventos'}
            </button>
          ))}
        </div>
      </div>

      {/* Map placeholder */}
      <div className="flex-1 relative bg-gray-200 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(236,72,153,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-brand-orange/30">
              <Navigation className="w-8 h-8 text-brand-orange" />
            </div>
            <p className="text-gray-600 text-sm font-medium">Mapa interactivo</p>
            <p className="text-gray-400 text-xs mt-1">Google Maps se integrará aquí</p>
            <p className="text-gray-300 text-xs">API Key requerida en producción</p>
          </div>
        </div>

        {/* Venue pins */}
        {VENUES.slice(0, 5).filter(() => filter !== 'events').map((venue, i) => (
          <button key={venue.id} onClick={() => setSelectedItem(venue.id)}
            style={{ position: 'absolute', left: `${20 + i * 15}%`, top: `${20 + (i % 3) * 20}%` }}
            className="group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
              selectedItem === venue.id ? 'bg-brand-orange scale-125' : 'bg-white border-2 border-brand-orange hover:bg-pink-50'
            }`}>
              <span className="text-lg">🏛️</span>
            </div>
            {selectedItem === venue.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl p-3 shadow-card-hover border border-gray-100 z-10">
                <p className="text-gray-900 font-semibold text-sm">{venue.name}</p>
                <p className="text-gray-400 text-xs">{venue.city}</p>
                <Badge variant={venue.isOpen ? 'green' : 'gray'} className="mt-1">{venue.isOpen ? '🟢 Abierto' : '🔴 Cerrado'}</Badge>
                <Button variant="orange" size="sm" className="w-full mt-2" onClick={() => navigate(`/venues/${venue.id}`)}>Ver venue</Button>
              </div>
            )}
          </button>
        ))}

        {/* Event pins */}
        {EVENTS.slice(0, 3).filter(() => filter !== 'venues').map((event, i) => (
          <button key={event.id} onClick={() => setSelectedItem(event.id)}
            style={{ position: 'absolute', left: `${60 + i * 10}%`, top: `${40 + i * 15}%` }}
            className="group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
              selectedItem === event.id ? 'bg-red-500 scale-125' : 'bg-white border-2 border-red-400 hover:bg-red-50'
            }`}>
              <span className="text-lg">🎉</span>
            </div>
            {selectedItem === event.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl p-3 shadow-card-hover border border-gray-100 z-10">
                <p className="text-gray-900 font-semibold text-sm line-clamp-2">{event.title}</p>
                <p className="text-gray-400 text-xs">{event.city} · €{event.price}</p>
                <Button variant="orange" size="sm" className="w-full mt-2" onClick={() => navigate(`/eventos/${event.id}`)}>Ver evento</Button>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom list */}
      <div className="h-52 overflow-y-auto border-t border-gray-100 bg-white">
        <div className="p-3 border-b border-gray-50">
          <p className="text-gray-400 text-xs font-medium">
            {(filter !== 'events' ? VENUES.length : 0) + (filter !== 'venues' ? EVENTS.length : 0)} lugares encontrados
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {VENUES.filter(() => filter !== 'events').map(venue => (
            <button key={venue.id} onClick={() => navigate(`/venues/${venue.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
              <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" />
              <div className="flex-1">
                <p className="text-gray-900 text-sm font-medium">{venue.name}</p>
                <p className="text-gray-400 text-xs">{venue.address}</p>
              </div>
              <Badge variant={venue.isOpen ? 'green' : 'gray'} className="flex-shrink-0">{venue.isOpen ? 'Abierto' : 'Cerrado'}</Badge>
            </button>
          ))}
          {EVENTS.filter(() => filter !== 'venues').map(event => (
            <button key={event.id} onClick={() => navigate(`/eventos/${event.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
              <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-gray-900 text-sm font-medium">{event.title}</p>
                <p className="text-gray-400 text-xs">{event.city} · {event.date}</p>
              </div>
              <span className="text-brand-orange font-bold text-sm flex-shrink-0">€{event.price}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
