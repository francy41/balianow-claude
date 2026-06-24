import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle, XCircle, AlertTriangle, Clock, Shield, Download } from 'lucide-react';
import type { Ticket, QRStatus } from '../store/ticketStore';

/* ── Real QR Code (scannable) ────────────────────────────────────────────── */
export const QRCodeCanvas: React.FC<{ token: string; size?: number }> = ({ token, size = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !token) return;
    QRCode.toCanvas(canvasRef.current, token, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#1a1a2e', light: '#ffffff' },
    }).catch(() => setError(true));
  }, [token, size]);

  if (error) return (
    <div style={{ width: size, height: size }} className="mx-auto bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs">
      QR no disponible
    </div>
  );

  return <canvas ref={canvasRef} className="mx-auto rounded-lg shadow-sm" />;
};

/* ── Download QR as PNG ──────────────────────────────────────────────────── */
export const downloadTicketQR = async (token: string, filename = 'entrada-bailanow.png') => {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, token, { width: 300, margin: 2, errorCorrectionLevel: 'H' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
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
      <div className="bg-gradient-to-r from-brand-orange to-pink-500 p-4 text-white">
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

      {/* QR Code real */}
      <div className="p-6 flex flex-col items-center">
        <QRCodeCanvas token={ticket.qrToken} size={160} />
        <p className="text-[10px] text-gray-400 mt-2 font-mono tracking-wider">{ticket.qrToken}</p>
        <button
          onClick={() => downloadTicketQR(ticket.qrToken, `entrada-${ticket.id}.png`)}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-orange transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Descargar QR
        </button>
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
  quantity?: number;
}> = ({ status, buyerName, eventTitle, sectionName, ticketType, companions, quantity = 1 }) => {
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
            <span className="text-emerald-600">Evento</span>
            <span className="font-bold text-emerald-900 text-right max-w-[60%]">{eventTitle}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Sección</span>
            <span className="font-bold text-emerald-900">{sectionName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Tipo</span>
            <span className="font-bold text-emerald-900 uppercase text-xs">{ticketType}</span>
          </div>
          {quantity > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Entradas</span>
              <span className="font-bold text-emerald-900">{quantity}</span>
            </div>
          )}
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

export default QRCodeCanvas;
