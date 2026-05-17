import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Shield } from 'lucide-react';
import type { Ticket, QRStatus } from '../store/ticketStore';

/* ── QR Code visual (SVG-based, no external lib) ─────────────────────────── */
const QRPattern: React.FC<{ token: string; size?: number }> = ({ token, size = 180 }) => {
  // Generate deterministic pattern from token
  const cells = 21;
  const cellSize = size / cells;
  const hash = token.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // Finder patterns (top-left, top-right, bottom-left)
      const inFinder = (cr: number, cc: number) =>
        cr < 7 && cc < 7 || cr < 7 && cc >= cells - 7 || cr >= cells - 7 && cc < 7;
      const finderBorder = (cr: number, cc: number) => {
        const corners = [[0, 0], [0, cells - 7], [cells - 7, 0]];
        return corners.some(([fr, fc]) => {
          const lr = cr - fr, lc = cc - fc;
          return (lr === 0 || lr === 6) && lc >= 0 && lc <= 6 ||
                 (lc === 0 || lc === 6) && lr >= 0 && lr <= 6 ||
                 lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        });
      };
      if (inFinder(r, c)) return finderBorder(r, c);
      // Data pattern from hash
      const seed = (hash * (r * cells + c + 1) * 7919) & 0x7FFFFFFF;
      return seed % 3 !== 0;
    })
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect width={size} height={size} fill="white" rx={8} />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1a1a2e"
              rx={cellSize * 0.15}
            />
          ) : null
        )
      )}
    </svg>
  );
};

/* ── QR Status Badge ─────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<QRStatus, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  valid:      { label: 'Válido',      icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  used:       { label: 'Utilizado',   icon: <Clock className="w-5 h-5" />,       bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-700' },
  expired:    { label: 'Expirado',    icon: <XCircle className="w-5 h-5" />,     bg: 'bg-gray-50 border-gray-200',    text: 'text-gray-500' },
  fraudulent: { label: 'Fraudulento', icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-red-50 border-red-200',   text: 'text-red-700' },
  refunded:   { label: 'Reembolsado', icon: <Shield className="w-5 h-5" />,      bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
};

export const QRStatusBadge: React.FC<{ status: QRStatus; className?: string }> = ({ status, className = '' }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${cfg.bg} ${cfg.text} ${className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ── Full Ticket Card (for buyer view) ───────────────────────────────────── */
export const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const dateObj = new Date(ticket.eventDate);

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-orange to-orange-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-lg leading-tight">{ticket.eventTitle}</p>
            <p className="text-white/80 text-xs mt-1">
              {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">{dateObj.toLocaleDateString('es-ES', { day: '2-digit' })}</p>
            <p className="text-white/80 text-xs font-bold uppercase">{dateObj.toLocaleDateString('es-ES', { month: 'short' })}</p>
          </div>
        </div>
      </div>

      {/* Divider dashed */}
      <div className="relative">
        <div className="absolute -left-3 -top-3 w-6 h-6 bg-gray-50 rounded-full" />
        <div className="absolute -right-3 -top-3 w-6 h-6 bg-gray-50 rounded-full" />
        <div className="border-t-2 border-dashed border-gray-200 mx-6" />
      </div>

      {/* QR Code */}
      <div className="p-6 flex flex-col items-center">
        <QRPattern token={ticket.qrToken} size={160} />
        <p className="text-[10px] text-gray-400 mt-2 font-mono tracking-wider">{ticket.qrToken}</p>
      </div>

      {/* Details */}
      <div className="px-6 pb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Sección</span>
          <span className="font-bold text-gray-900">{ticket.sectionName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Tipo</span>
          <span className="font-bold text-gray-900 uppercase text-xs">{ticket.ticketType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Cantidad</span>
          <span className="font-bold text-gray-900">{ticket.quantity} {ticket.companions > 0 ? `(+${ticket.companions} acomp.)` : ''}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total</span>
          <span className="font-bold text-brand-orange">€{ticket.totalPrice}</span>
        </div>
      </div>

      {/* Status footer */}
      <div className="px-6 pb-4 flex justify-center">
        <QRStatusBadge status={ticket.qrStatus} />
      </div>
    </div>
  );
};

/* ── Scan Result Card (for scanner view) ─────────────────────────────────── */
export const ScanResultCard: React.FC<{
  status: QRStatus;
  buyerName: string;
  eventTitle: string;
  sectionName: string;
  ticketType: string;
  companions: number;
}> = ({ status, buyerName, eventTitle, sectionName, ticketType, companions }) => {
  const isOk = status === 'valid';
  return (
    <div className={`rounded-3xl p-8 text-center ${isOk ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-red-50 border-2 border-red-300'}`}>
      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`}>
        {isOk ? <CheckCircle className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />}
      </div>
      <h2 className={`font-black text-2xl mb-1 ${isOk ? 'text-emerald-800' : 'text-red-800'}`}>
        {isOk ? '✓ Acceso Permitido' : status === 'used' ? '✕ QR Ya Utilizado' : status === 'refunded' ? '✕ Ticket Reembolsado' : status === 'expired' ? '✕ Ticket Expirado' : '⚠ QR Fraudulento'}
      </h2>
      {isOk && (
        <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Nombre</span>
            <span className="font-bold text-emerald-900">{buyerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Sección</span>
            <span className="font-bold text-emerald-900">{sectionName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Tipo</span>
            <span className="font-bold text-emerald-900 uppercase text-xs">{ticketType}</span>
          </div>
          {companions > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Acompañantes</span>
              <span className="font-bold text-emerald-900">{companions}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRPattern;
