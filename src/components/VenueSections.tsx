import React, { useState } from 'react';
import { MapPin, Users, CheckCircle, Star, Clock, Ticket, ChevronRight, Shield, Sparkles } from 'lucide-react';
import { useTicketStore, type VenueSection, type SectionStatus } from '../store/ticketStore';
import { Button, Badge } from './ui';

/* ── Section type icons ──────────────────────────────────────────────────── */
const SECTION_ICONS: Record<string, string> = {
  general: '🎫', vip: '👑', mesa: '🍾', palco: '🏛️', backstage: '🎤',
  lounge: '🛋️', terraza: '🌅', 'fan-zone': '🎉', 'premium-experience': '💎',
};

const SECTION_LABELS: Record<string, string> = {
  general: 'General', vip: 'VIP', mesa: 'Mesa', palco: 'Palco', backstage: 'Backstage',
  lounge: 'Lounge', terraza: 'Terraza', 'fan-zone': 'Fan Zone', 'premium-experience': 'Premium',
};

const STATUS_BADGE: Record<SectionStatus, { label: string; color: string }> = {
  available:    { label: 'Disponible',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'sold-out':   { label: 'Agotado',       color: 'bg-red-100 text-red-700 border-red-200' },
  reserved:     { label: 'Reservado',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  presale:      { label: 'Preventa',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'coming-soon':{ label: 'Próximamente',  color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

/* ── Interactive Venue Map ───────────────────────────────────────────────── */
const VenueMap: React.FC<{
  sections: VenueSection[];
  selected: string | null;
  onSelect: (id: string) => void;
}> = ({ sections, selected, onSelect }) => {
  // Simple interactive map layout
  const zones: { zone: string; x: number; y: number; w: number; h: number }[] = [
    { zone: 'A1', x: 15, y: 10, w: 30, h: 20 },
    { zone: 'A2', x: 55, y: 10, w: 30, h: 20 },
    { zone: 'B1', x: 15, y: 35, w: 30, h: 20 },
    { zone: 'C1', x: 10, y: 60, w: 80, h: 25 },
    { zone: 'D1', x: 55, y: 35, w: 30, h: 20 },
    { zone: 'E1', x: 35, y: 88, w: 30, h: 10 },
  ];

  return (
    <div className="card-white rounded-2xl p-5">
      <h3 className="font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-brand-orange" /> Mapa del local
      </h3>
      <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/10' }}>
        {/* Stage */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-xs font-black px-8 py-1.5 rounded-b-xl uppercase tracking-widest">
          Escenario
        </div>

        <svg viewBox="0 0 100 100" className="w-full h-full">
          {zones.map(z => {
            const section = sections.find(s => s.mapZone === z.zone);
            if (!section) return null;
            const isSelected = selected === section.id;
            const isSoldOut = section.status === 'sold-out';
            return (
              <g key={z.zone} onClick={() => !isSoldOut && onSelect(section.id)} className={isSoldOut ? 'opacity-40' : 'cursor-pointer'}>
                <rect
                  x={z.x} y={z.y} width={z.w} height={z.h}
                  rx={2}
                  fill={isSelected ? section.color : `${section.color}33`}
                  stroke={section.color}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                  className="transition-all duration-200"
                />
                <text
                  x={z.x + z.w / 2} y={z.y + z.h / 2 - 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="3.5" fontWeight="bold"
                >
                  {section.name}
                </text>
                <text
                  x={z.x + z.w / 2} y={z.y + z.h / 2 + 4}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="2.5" opacity={0.7}
                >
                  €{section.price} · {section.available} libres
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {sections.map(s => (
          <button key={s.id}
            onClick={() => s.status !== 'sold-out' && onSelect(s.id)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
              selected === s.id ? 'border-brand-orange bg-pink-50 text-brand-orange font-bold' :
              s.status === 'sold-out' ? 'border-gray-200 bg-gray-50 text-gray-400' :
              'border-gray-200 bg-white text-gray-600 hover:border-brand-orange'
            }`}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Section Card ────────────────────────────────────────────────────────── */
const SectionCard: React.FC<{
  section: VenueSection;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ section, isSelected, onSelect }) => {
  const pctSold = Math.round(((section.capacity - section.available) / section.capacity) * 100);
  const statusCfg = STATUS_BADGE[section.status];
  const isSoldOut = section.status === 'sold-out';

  return (
    <div
      onClick={() => !isSoldOut && onSelect()}
      className={`card-white rounded-2xl p-4 transition-all duration-200 ${
        isSoldOut ? 'opacity-60 cursor-not-allowed' :
        isSelected ? 'ring-2 ring-brand-orange shadow-card-hover scale-[1.02] cursor-pointer' :
        'hover:shadow-card-hover hover:scale-[1.01] cursor-pointer'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{SECTION_ICONS[section.type] || '🎫'}</span>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">{section.name}</h4>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{SECTION_LABELS[section.type] || section.type}</span>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-black text-brand-orange">€{section.price}</span>
        <span className="text-gray-400 text-xs">/persona</span>
      </div>

      {/* Availability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{section.available} libres</span>
          <span className={`font-bold ${pctSold > 80 ? 'text-red-500' : 'text-gray-600'}`}>{pctSold}% vendido</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pctSold > 80 ? 'bg-red-500' : pctSold > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
            style={{ width: `${pctSold}%` }}
          />
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-1 mb-3">
        {section.benefits.slice(0, 3).map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            {b}
          </div>
        ))}
        {section.benefits.length > 3 && (
          <span className="text-[10px] text-brand-orange font-bold">+{section.benefits.length - 3} más</span>
        )}
      </div>

      {/* Access level */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
        <Shield className="w-3 h-3" />
        Acceso: {section.accessLevel}
      </div>
    </div>
  );
};

/* ── Main Sections Component ─────────────────────────────────────────────── */
export const VenueSectionsSelector: React.FC<{
  eventId: string;
  onSelectSection: (section: VenueSection, quantity: number) => void;
}> = ({ eventId, onSelectSection }) => {
  const sections = useTicketStore(s => s.getSectionsByEvent(eventId));
  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedSection = sections.find(s => s.id === selected);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Interactive Map */}
      <VenueMap sections={sections} selected={selected} onSelect={setSelected} />

      {/* Section cards grid — mobile 2 cols */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map(sec => (
          <SectionCard
            key={sec.id}
            section={sec}
            isSelected={selected === sec.id}
            onSelect={() => setSelected(sec.id)}
          />
        ))}
      </div>

      {/* Selection summary + checkout (sticky on mobile) */}
      {selectedSection && selectedSection.status !== 'sold-out' && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-t-3xl p-4 shadow-2xl -mx-4 sm:mx-0 sm:rounded-2xl sm:border sm:shadow-card-hover sm:relative">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{SECTION_ICONS[selectedSection.type] || '🎫'}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selectedSection.name}</p>
                  <p className="text-gray-400 text-xs">{selectedSection.accessLevel}</p>
                </div>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white text-gray-700 font-bold shadow-sm hover:bg-gray-100"
              >−</button>
              <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(selectedSection.available, quantity + 1))}
                className="w-8 h-8 rounded-lg bg-white text-gray-700 font-bold shadow-sm hover:bg-gray-100"
              >+</button>
            </div>

            {/* Total + Buy */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total</p>
                <p className="font-black text-xl text-brand-orange">€{selectedSection.price * quantity}</p>
              </div>
              <Button variant="orange" onClick={() => onSelectSection(selectedSection, quantity)}>
                🎫 Comprar
              </Button>
            </div>
          </div>

          {/* Hold timer notice */}
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Reserva temporal: 10 minutos para completar la compra
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Compact sections grid for mobile (2 cols) ───────────────────────────── */
export const SectionsGridCompact: React.FC<{
  eventId: string;
  onSelect: (section: VenueSection) => void;
}> = ({ eventId, onSelect }) => {
  const sections = useTicketStore(s => s.getSectionsByEvent(eventId));
  if (sections.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {sections.map(sec => {
        const isSoldOut = sec.status === 'sold-out';
        return (
          <button
            key={sec.id}
            onClick={() => !isSoldOut && onSelect(sec)}
            disabled={isSoldOut}
            className={`text-left p-3 rounded-2xl border-2 transition-all ${
              isSoldOut ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-white hover:border-brand-orange hover:shadow-card-hover active:scale-95'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{SECTION_ICONS[sec.type] || '🎫'}</span>
              <span className="font-bold text-gray-900 text-xs">{sec.name}</span>
            </div>
            <p className="font-black text-xl text-brand-orange">€{sec.price}</p>
            <p className={`text-xs mt-1 font-medium ${sec.available <= 5 ? 'text-red-500' : 'text-emerald-600'}`}>
              {isSoldOut ? 'Agotado' : `${sec.available} libres`}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default VenueSectionsSelector;
