import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── QR / TICKET TYPES ────────────────────────────────────────────────────────

export type QRStatus = 'valid' | 'used' | 'expired' | 'fraudulent' | 'refunded';
export type TicketType = 'general' | 'vip' | 'mesa' | 'palco' | 'backstage' | 'lounge' | 'terraza' | 'fan-zone' | 'premium-experience';
export type PaymentMethod = 'stripe' | 'paypal' | 'card' | 'transfer';

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  sectionId: string | null;   // null = general admission
  sectionName: string;
  ticketType: TicketType;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  qrToken: string;            // unique encrypted token
  qrStatus: QRStatus;
  accessTime: Date | null;    // when scanned
  purchaseDate: Date;
  eventDate: string;
  companions: number;         // extra people with this ticket
  notes: string;
}

export interface TicketScanResult {
  ticketId: string;
  status: QRStatus;
  buyerName: string;
  eventTitle: string;
  sectionName: string;
  ticketType: TicketType;
  companions: number;
  scannedAt: Date;
}

// ── VENUE SECTIONS / SEATING ─────────────────────────────────────────────────

export type SectionStatus = 'available' | 'sold-out' | 'reserved' | 'presale' | 'coming-soon';

export interface VenueSection {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  type: TicketType;
  price: number;
  capacity: number;
  available: number;
  benefits: string[];
  accessLevel: string;       // e.g. "Acceso VIP + Backstage"
  image: string;
  mapZone: string;           // zone label for interactive map
  color: string;             // hex for map visualization
  status: SectionStatus;
  order: number;
  holdExpiresAt: Date | null; // temp hold for cart
}

// ── STORE ────────────────────────────────────────────────────────────────────

interface TicketState {
  tickets: Ticket[];
  sections: VenueSection[];
  scanHistory: TicketScanResult[];

  // Tickets
  purchaseTicket: (data: Omit<Ticket, 'id' | 'qrToken' | 'qrStatus' | 'accessTime' | 'purchaseDate' | 'paymentStatus'>) => Ticket;
  getTicketsByEvent: (eventId: string) => Ticket[];
  getTicketsByBuyer: (buyerId: string) => Ticket[];
  getTicketByQR: (qrToken: string) => Ticket | undefined;

  // QR Scanning
  scanTicket: (qrToken: string) => TicketScanResult;
  refundTicket: (ticketId: string) => void;

  // Venue Sections
  addSection: (data: Omit<VenueSection, 'id' | 'holdExpiresAt'>) => VenueSection;
  updateSection: (id: string, updates: Partial<VenueSection>) => void;
  removeSection: (id: string) => void;
  getSectionsByEvent: (eventId: string) => VenueSection[];
  holdSection: (sectionId: string, quantity: number) => boolean;
  releaseHold: (sectionId: string, quantity: number) => void;

  // Analytics
  getEventAnalytics: (eventId: string) => {
    totalRevenue: number;
    totalTickets: number;
    totalScanned: number;
    sectionBreakdown: { name: string; sold: number; capacity: number; revenue: number }[];
    conversionRate: number;
  };
}

// Generate crypto-safe-ish QR token
const generateQRToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [8, 4, 4, 12].map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return `TKT-${segments.join('-')}-${Date.now().toString(36)}`;
};

// ── DEFAULT SEED SECTIONS ────────────────────────────────────────────────────
const SEED_SECTIONS: VenueSection[] = [
  // Event e1 — Club Tropicana Madrid
  { id: 'sec-e1-vip',     eventId: 'e1', venueId: 'v1', name: 'VIP Lounge',          type: 'vip',       price: 120, capacity: 20, available: 5,  benefits: ['Barra libre premium', 'Sofás exclusivos', 'Acceso backstage', 'Meet & Greet'], accessLevel: 'VIP + Backstage', image: '', mapZone: 'A1', color: '#F59E0B', status: 'available', order: 0, holdExpiresAt: null },
  { id: 'sec-e1-mesa',    eventId: 'e1', venueId: 'v1', name: 'Mesa Premium',        type: 'mesa',      price: 250, capacity: 10, available: 2,  benefits: ['Mesa reservada (6 personas)', 'Botella incluida', 'Camarero privado'], accessLevel: 'VIP', image: '', mapZone: 'A2', color: '#8B5CF6', status: 'available', order: 1, holdExpiresAt: null },
  { id: 'sec-e1-palco',   eventId: 'e1', venueId: 'v1', name: 'Palco Privado',       type: 'palco',     price: 500, capacity: 4,  available: 1,  benefits: ['Palco privado con vista', '2 botellas premium', 'Servicio dedicado', 'Entrada lateral'], accessLevel: 'PALCO VIP', image: '', mapZone: 'B1', color: '#EC4899', status: 'available', order: 2, holdExpiresAt: null },
  { id: 'sec-e1-general', eventId: 'e1', venueId: 'v1', name: 'Entrada General',     type: 'general',   price: 25,  capacity: 400,available: 113,benefits: ['Acceso pista de baile', '1 consumición incluida'], accessLevel: 'General', image: '', mapZone: 'C1', color: '#3B82F6', status: 'available', order: 3, holdExpiresAt: null },
  { id: 'sec-e1-backstage',eventId: 'e1', venueId: 'v1', name: 'Backstage Pass',     type: 'backstage', price: 180, capacity: 8,  available: 3,  benefits: ['Acceso total backstage', 'Meet & Greet artistas', 'Fotos exclusivas', 'Gift bag'], accessLevel: 'ALL ACCESS', image: '', mapZone: 'D1', color: '#EF4444', status: 'available', order: 4, holdExpiresAt: null },
  { id: 'sec-e1-terraza',  eventId: 'e1', venueId: 'v1', name: 'Terraza Chill',      type: 'terraza',   price: 45,  capacity: 50, available: 22, benefits: ['Zona exterior', 'Cocktails especiales', 'Música ambiente'], accessLevel: 'Terraza', image: '', mapZone: 'E1', color: '#10B981', status: 'available', order: 5, holdExpiresAt: null },

  // Event e3 — Festival Latino BCN
  { id: 'sec-e3-vip',     eventId: 'e3', venueId: 'v5', name: 'VIP Festival',        type: 'vip',       price: 150, capacity: 200, available: 45, benefits: ['Zona VIP exclusiva', 'Barra libre', 'Acceso preferente escenario', 'Lounge privado'], accessLevel: 'VIP', image: '', mapZone: 'A1', color: '#F59E0B', status: 'available', order: 0, holdExpiresAt: null },
  { id: 'sec-e3-general',  eventId: 'e3', venueId: 'v5', name: 'Entrada General',    type: 'general',   price: 45,  capacity: 4000, available: 800, benefits: ['Acceso a todos los escenarios', 'Zona food trucks'], accessLevel: 'General', image: '', mapZone: 'C1', color: '#3B82F6', status: 'available', order: 1, holdExpiresAt: null },
  { id: 'sec-e3-premium',  eventId: 'e3', venueId: 'v5', name: 'Premium Experience', type: 'premium-experience', price: 350, capacity: 50, available: 12, benefits: ['Front row', 'Meet & greet todos artistas', 'Cena exclusiva', 'After party privada', 'Merch exclusivo'], accessLevel: 'ALL ACCESS PREMIUM', image: '', mapZone: 'A2', color: '#EC4899', status: 'available', order: 2, holdExpiresAt: null },
  { id: 'sec-e3-fanzone',  eventId: 'e3', venueId: 'v5', name: 'Fan Zone',           type: 'fan-zone',  price: 65,  capacity: 500, available: 180, benefits: ['Zona cercana al escenario', 'Pantalla gigante', 'Barra rápida'], accessLevel: 'Fan Zone', image: '', mapZone: 'B1', color: '#06B6D4', status: 'available', order: 3, holdExpiresAt: null },

  // Event e5 — Noche Timba Paris
  { id: 'sec-e5-vip',     eventId: 'e5', venueId: 'v7', name: 'VIP Table',           type: 'vip',       price: 80,  capacity: 15, available: 4,  benefits: ['Mesa reservada', 'Botella', 'Vista preferente'], accessLevel: 'VIP', image: '', mapZone: 'A1', color: '#F59E0B', status: 'available', order: 0, holdExpiresAt: null },
  { id: 'sec-e5-general',  eventId: 'e5', venueId: 'v7', name: 'Entrada General',    type: 'general',   price: 20,  capacity: 250, available: 111, benefits: ['Acceso pista', 'Guardarropa incluido'], accessLevel: 'General', image: '', mapZone: 'C1', color: '#3B82F6', status: 'available', order: 1, holdExpiresAt: null },

  // Event e6 — Bachata Open Air Sevilla
  { id: 'sec-e6-lounge',  eventId: 'e6', venueId: 'v4', name: 'Lounge Premium',      type: 'lounge',    price: 75,  capacity: 30, available: 8,  benefits: ['Sofás rooftop', 'Cocktails premium', 'Vista 360°'], accessLevel: 'Lounge', image: '', mapZone: 'A1', color: '#8B5CF6', status: 'available', order: 0, holdExpiresAt: null },
  { id: 'sec-e6-general',  eventId: 'e6', venueId: 'v4', name: 'Entrada General',    type: 'general',   price: 18,  capacity: 200, available: 49, benefits: ['Acceso terraza', 'Pista de baile'], accessLevel: 'General', image: '', mapZone: 'C1', color: '#3B82F6', status: 'available', order: 1, holdExpiresAt: null },
];

// ── SEED TICKETS ─────────────────────────────────────────────────────────────
const SEED_TICKETS: Ticket[] = [
  {
    id: 'tkt-001', eventId: 'e1', eventTitle: 'Salsa & Bachata Night — Gran Gala',
    sectionId: 'sec-e1-vip', sectionName: 'VIP Lounge', ticketType: 'vip',
    buyerId: 'user-1', buyerName: 'María García', buyerEmail: 'maria@email.com', buyerPhone: '+34 612 345 678',
    quantity: 2, unitPrice: 120, totalPrice: 240, currency: 'EUR',
    paymentMethod: 'stripe', paymentStatus: 'paid',
    qrToken: 'TKT-AbCd1234-EfGh-5678-IjKlMnOpQrSt-m1abc', qrStatus: 'valid',
    accessTime: null, purchaseDate: new Date('2026-05-15T14:30:00'), eventDate: '2026-06-07',
    companions: 1, notes: '',
  },
  {
    id: 'tkt-002', eventId: 'e1', eventTitle: 'Salsa & Bachata Night — Gran Gala',
    sectionId: 'sec-e1-general', sectionName: 'Entrada General', ticketType: 'general',
    buyerId: 'user-2', buyerName: 'Carlos Rodríguez', buyerEmail: 'carlos@email.com', buyerPhone: '+34 623 456 789',
    quantity: 3, unitPrice: 25, totalPrice: 75, currency: 'EUR',
    paymentMethod: 'paypal', paymentStatus: 'paid',
    qrToken: 'TKT-XyZw9876-AbCd-1234-EfGhIjKlMnOp-m2def', qrStatus: 'valid',
    accessTime: null, purchaseDate: new Date('2026-05-16T09:15:00'), eventDate: '2026-06-07',
    companions: 2, notes: 'Mesa cerca de la pista por favor',
  },
  {
    id: 'tkt-003', eventId: 'e1', eventTitle: 'Salsa & Bachata Night — Gran Gala',
    sectionId: 'sec-e1-mesa', sectionName: 'Mesa Premium', ticketType: 'mesa',
    buyerId: 'user-3', buyerName: 'Ana Martínez', buyerEmail: 'ana@email.com', buyerPhone: '+34 634 567 890',
    quantity: 1, unitPrice: 250, totalPrice: 250, currency: 'EUR',
    paymentMethod: 'card', paymentStatus: 'paid',
    qrToken: 'TKT-QwEr5678-TyUi-9012-OpAsDfGhJkLz-m3ghi', qrStatus: 'used',
    accessTime: new Date('2026-05-10T22:15:00'), purchaseDate: new Date('2026-05-08T18:00:00'), eventDate: '2026-06-07',
    companions: 5, notes: '',
  },
  {
    id: 'tkt-004', eventId: 'e3', eventTitle: 'Festival Latino BCN 2026',
    sectionId: 'sec-e3-vip', sectionName: 'VIP Festival', ticketType: 'vip',
    buyerId: 'user-4', buyerName: 'Pablo Sánchez', buyerEmail: 'pablo@email.com', buyerPhone: '+34 645 678 901',
    quantity: 2, unitPrice: 150, totalPrice: 300, currency: 'EUR',
    paymentMethod: 'stripe', paymentStatus: 'paid',
    qrToken: 'TKT-ZxCv3456-BnMl-7890-KjHgFdSaQwEr-m4jkl', qrStatus: 'valid',
    accessTime: null, purchaseDate: new Date('2026-05-17T11:00:00'), eventDate: '2026-07-11',
    companions: 1, notes: '',
  },
  {
    id: 'tkt-005', eventId: 'e1', eventTitle: 'Salsa & Bachata Night — Gran Gala',
    sectionId: 'sec-e1-backstage', sectionName: 'Backstage Pass', ticketType: 'backstage',
    buyerId: 'user-5', buyerName: 'Laura Fernández', buyerEmail: 'laura@email.com', buyerPhone: '+34 656 789 012',
    quantity: 1, unitPrice: 180, totalPrice: 180, currency: 'EUR',
    paymentMethod: 'card', paymentStatus: 'paid',
    qrToken: 'TKT-MnBv1234-CxZa-5678-QwErTyUiOpAs-m5mno', qrStatus: 'valid',
    accessTime: null, purchaseDate: new Date('2026-05-17T16:45:00'), eventDate: '2026-06-07',
    companions: 0, notes: 'Fan de DJ Mambo King',
  },
  {
    id: 'tkt-006', eventId: 'e1', eventTitle: 'Salsa & Bachata Night — Gran Gala',
    sectionId: 'sec-e1-general', sectionName: 'Entrada General', ticketType: 'general',
    buyerId: 'user-6', buyerName: 'Diego López', buyerEmail: 'diego@email.com', buyerPhone: '+34 667 890 123',
    quantity: 1, unitPrice: 25, totalPrice: 25, currency: 'EUR',
    paymentMethod: 'paypal', paymentStatus: 'refunded',
    qrToken: 'TKT-LkJh9012-GfDs-3456-AqWsEdRfTgYh-m6pqr', qrStatus: 'refunded',
    accessTime: null, purchaseDate: new Date('2026-05-14T20:30:00'), eventDate: '2026-06-07',
    companions: 0, notes: '',
  },
];

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: SEED_TICKETS,
      sections: SEED_SECTIONS,
      scanHistory: [],

      purchaseTicket: (data) => {
        const ticket: Ticket = {
          ...data,
          id: `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          qrToken: generateQRToken(),
          qrStatus: 'valid',
          accessTime: null,
          purchaseDate: new Date(),
          paymentStatus: 'paid',
        };
        set(s => ({ tickets: [ticket, ...s.tickets] }));
        // Decrease available in section
        if (data.sectionId) {
          const sec = get().sections.find(s => s.id === data.sectionId);
          if (sec) {
            set(s => ({
              sections: s.sections.map(sc =>
                sc.id === data.sectionId
                  ? { ...sc, available: Math.max(0, sc.available - data.quantity), status: sc.available - data.quantity <= 0 ? 'sold-out' as SectionStatus : sc.status }
                  : sc
              ),
            }));
          }
        }
        return ticket;
      },

      getTicketsByEvent: (eventId) => get().tickets.filter(t => t.eventId === eventId),
      getTicketsByBuyer: (buyerId) => get().tickets.filter(t => t.buyerId === buyerId),
      getTicketByQR: (qrToken) => get().tickets.find(t => t.qrToken === qrToken),

      scanTicket: (qrToken) => {
        const ticket = get().tickets.find(t => t.qrToken === qrToken);
        if (!ticket) {
          const result: TicketScanResult = {
            ticketId: '', status: 'fraudulent', buyerName: 'Desconocido',
            eventTitle: '', sectionName: '', ticketType: 'general', companions: 0, scannedAt: new Date(),
          };
          set(s => ({ scanHistory: [result, ...s.scanHistory] }));
          return result;
        }

        const now = new Date();
        let status: QRStatus = ticket.qrStatus;

        if (ticket.qrStatus === 'used') {
          status = 'used';
        } else if (ticket.qrStatus === 'refunded') {
          status = 'refunded';
        } else if (new Date(ticket.eventDate) < new Date(now.toDateString())) {
          status = 'expired';
          set(s => ({ tickets: s.tickets.map(t => t.id === ticket.id ? { ...t, qrStatus: 'expired' } : t) }));
        } else {
          status = 'valid';
          set(s => ({
            tickets: s.tickets.map(t => t.id === ticket.id ? { ...t, qrStatus: 'used', accessTime: now } : t),
          }));
          status = 'valid'; // report as valid for the scan result
        }

        const result: TicketScanResult = {
          ticketId: ticket.id, status, buyerName: ticket.buyerName,
          eventTitle: ticket.eventTitle, sectionName: ticket.sectionName,
          ticketType: ticket.ticketType, companions: ticket.companions, scannedAt: now,
        };
        set(s => ({ scanHistory: [result, ...s.scanHistory] }));
        return result;
      },

      refundTicket: (ticketId) => {
        const ticket = get().tickets.find(t => t.id === ticketId);
        if (!ticket) return;
        set(s => ({
          tickets: s.tickets.map(t => t.id === ticketId ? { ...t, qrStatus: 'refunded', paymentStatus: 'refunded' } : t),
          sections: ticket.sectionId
            ? s.sections.map(sc => sc.id === ticket.sectionId ? { ...sc, available: sc.available + ticket.quantity, status: 'available' } : sc)
            : s.sections,
        }));
      },

      addSection: (data) => {
        const section: VenueSection = { ...data, id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, holdExpiresAt: null };
        set(s => ({ sections: [...s.sections, section] }));
        return section;
      },

      updateSection: (id, updates) =>
        set(s => ({ sections: s.sections.map(sc => sc.id === id ? { ...sc, ...updates } : sc) })),

      removeSection: (id) =>
        set(s => ({ sections: s.sections.filter(sc => sc.id !== id) })),

      getSectionsByEvent: (eventId) =>
        get().sections.filter(s => s.eventId === eventId).sort((a, b) => a.order - b.order),

      holdSection: (sectionId, quantity) => {
        const sec = get().sections.find(s => s.id === sectionId);
        if (!sec || sec.available < quantity) return false;
        set(s => ({
          sections: s.sections.map(sc =>
            sc.id === sectionId
              ? { ...sc, available: sc.available - quantity, holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }
              : sc
          ),
        }));
        return true;
      },

      releaseHold: (sectionId, quantity) =>
        set(s => ({
          sections: s.sections.map(sc =>
            sc.id === sectionId
              ? { ...sc, available: sc.available + quantity, holdExpiresAt: null }
              : sc
          ),
        })),

      getEventAnalytics: (eventId) => {
        const tickets = get().tickets.filter(t => t.eventId === eventId && t.paymentStatus === 'paid');
        const sections = get().sections.filter(s => s.eventId === eventId);
        const totalRevenue = tickets.reduce((s, t) => s + t.totalPrice, 0);
        const totalTickets = tickets.reduce((s, t) => s + t.quantity, 0);
        const totalScanned = tickets.filter(t => t.qrStatus === 'used').length;
        const totalCapacity = sections.reduce((s, sc) => s + sc.capacity, 0);

        const sectionBreakdown = sections.map(sc => {
          const sectionTickets = tickets.filter(t => t.sectionId === sc.id);
          return {
            name: sc.name,
            sold: sc.capacity - sc.available,
            capacity: sc.capacity,
            revenue: sectionTickets.reduce((s, t) => s + t.totalPrice, 0),
          };
        });

        return {
          totalRevenue,
          totalTickets,
          totalScanned,
          sectionBreakdown,
          conversionRate: totalCapacity > 0 ? Math.round((totalTickets / totalCapacity) * 100) : 0,
        };
      },
    }),
    {
      name: 'ritmolatino-tickets',
      version: 1,
      migrate: () => undefined as any,
    }
  )
);
