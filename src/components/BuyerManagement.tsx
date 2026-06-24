import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight, Eye, QrCode, CheckCircle, XCircle, Clock, AlertTriangle, Shield, Camera, CameraOff, Loader2 } from 'lucide-react';
import { useTicketStore, type Ticket, type QRStatus, type TicketScanResult } from '../store/ticketStore';
import { QRStatusBadge, ScanResultCard } from './QRTicket';
import { Badge, Button } from './ui';
import { supabase } from '../lib/supabase';

/* ══════════════════════════════════════════════════════════════════════════
   BUYER TABLE — SaaS-style for sellers/organizers
   ══════════════════════════════════════════════════════════════════════════ */
export const BuyerTable: React.FC<{ eventId: string }> = ({ eventId }) => {
  const tickets = useTicketStore(s => s.getTicketsByEvent(eventId));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QRStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = !search ||
        t.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        t.buyerEmail.toLowerCase().includes(search.toLowerCase()) ||
        t.qrToken.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.qrStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, statusFilter]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Sección', 'Tipo', 'Cantidad', 'Total', 'Método Pago', 'Estado QR', 'Fecha Compra'];
    const rows = filtered.map(t => [
      t.buyerName, t.buyerEmail, t.buyerPhone, t.sectionName, t.ticketType,
      t.quantity, `€${t.totalPrice}`, t.paymentMethod, t.qrStatus,
      new Date(t.purchaseDate).toLocaleDateString('es-ES'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `compradores-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Compradores', value: tickets.length, icon: '👥', color: 'bg-blue-50 text-blue-700' },
          { label: 'Tickets Vendidos', value: tickets.reduce((s, t) => s + t.quantity, 0), icon: '🎫', color: 'bg-pink-50 text-brand-orange' },
          { label: 'Revenue', value: `€${tickets.filter(t => t.paymentStatus === 'paid').reduce((s, t) => s + t.totalPrice, 0).toLocaleString()}`, icon: '💰', color: 'bg-green-50 text-green-700' },
          { label: 'Accesos', value: tickets.filter(t => t.qrStatus === 'used').length, icon: '✅', color: 'bg-purple-50 text-purple-700' },
        ].map(stat => (
          <div key={stat.label} className="card-white rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
            </div>
            <p className={`font-black text-xl ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Buscar nombre, email, QR..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setPage(0); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-orange"
          >
            <option value="all">Todos los estados</option>
            <option value="valid">✅ Válido</option>
            <option value="used">📋 Utilizado</option>
            <option value="expired">⏰ Expirado</option>
            <option value="refunded">↩️ Reembolsado</option>
          </select>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Comprador</th>
                <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Sección</th>
                <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Entradas</th>
                <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Pago</th>
                <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">QR</th>
                <th className="text-left py-3 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(ticket => (
                <tr key={ticket.id} className="border-b border-gray-50 hover:bg-pink-50/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-gray-900">{ticket.buyerName}</p>
                      <p className="text-gray-400 text-xs">{ticket.buyerEmail}</p>
                      <p className="text-gray-400 text-xs sm:hidden">{ticket.sectionName}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="text-xs font-medium text-gray-700">{ticket.sectionName}</span>
                    <span className="block text-[10px] text-gray-400 uppercase">{ticket.ticketType}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-gray-900">{ticket.quantity}</span>
                    <span className="block text-xs text-brand-orange font-bold">€{ticket.totalPrice}</span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs capitalize text-gray-600">{ticket.paymentMethod}</span>
                    <span className={`block text-[10px] font-bold ${ticket.paymentStatus === 'paid' ? 'text-emerald-600' : ticket.paymentStatus === 'refunded' ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {ticket.paymentStatus === 'paid' ? '✓ Pagado' : ticket.paymentStatus === 'refunded' ? '↩ Reembolsado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <QRStatusBadge status={ticket.qrStatus} className="text-[10px] px-2 py-1" />
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="text-xs text-gray-500">
                      {new Date(ticket.purchaseDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      {new Date(ticket.purchaseDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <p className="text-3xl mb-2">🎫</p>
                    <p className="font-semibold">Sin compradores</p>
                    <p className="text-xs mt-1">Los compradores aparecerán aquí</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{filtered.length} registros · Página {page + 1} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   QR SCANNER — Real camera scanner + Supabase validation
   ══════════════════════════════════════════════════════════════════════════ */

interface ScanResult {
  status: QRStatus;
  buyerName: string;
  eventTitle: string;
  sectionName: string;
  ticketType: string;
  companions: number;
  quantity: number;
}

// Validate ticket token against Supabase (primary) + local store (fallback)
async function validateTicketToken(token: string, localScan: (t: string) => TicketScanResult): Promise<ScanResult> {
  const clean = token.trim();
  // Try Supabase first
  const { data, error } = await supabase
    .from('tickets')
    .select('id, status, buyer_name, event_title, section_name, ticket_type, companions, quantity, qr_token')
    .eq('qr_token', clean)
    .maybeSingle();

  if (!error && data) {
    if (data.status !== 'valid') {
      return {
        status: data.status as QRStatus,
        buyerName: data.buyer_name || 'Desconocido',
        eventTitle: data.event_title || '',
        sectionName: data.section_name || 'General',
        ticketType: data.ticket_type || 'general',
        companions: data.companions || 0,
        quantity: data.quantity || 1,
      };
    }
    // Mark as used in DB
    await supabase.from('tickets').update({ status: 'used', scanned_at: new Date().toISOString() }).eq('id', data.id);
    return {
      status: 'valid',
      buyerName: data.buyer_name || 'Desconocido',
      eventTitle: data.event_title || '',
      sectionName: data.section_name || 'General',
      ticketType: data.ticket_type || 'general',
      companions: data.companions || 0,
      quantity: data.quantity || 1,
    };
  }

  // Fallback: local Zustand store (demo tickets)
  const local = localScan(clean);
  return { ...local, quantity: 1 };
}

export const QRScanner: React.FC<{ eventId?: string }> = ({ eventId }) => {
  const { scanTicket, scanHistory } = useTicketStore();
  const [manualToken, setManualToken] = useState('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<'scan' | 'history'>('scan');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const handleScan = useCallback(async (token: string) => {
    if (!token.trim() || scanning) return;
    setScanning(true);
    const result = await validateTicketToken(token.trim(), scanTicket);
    setLastResult(result);
    setManualToken('');
    setScanning(false);
  }, [scanning, scanTicket]);

  // Camera scanning loop using jsqr
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('No se pudo acceder a la cámara. Usa la entrada manual.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    cancelAnimationFrame(rafRef.current);
    setCameraActive(false);
  };

  useEffect(() => {
    if (!cameraActive) return;
    let lastToken = '';
    const scan = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return; }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      const imageData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data && code.data !== lastToken) {
          lastToken = code.data;
          stopCamera();
          await handleScan(code.data);
          return;
        }
      } catch { /* jsqr not available */ }
      rafRef.current = requestAnimationFrame(scan);
    };
    rafRef.current = requestAnimationFrame(scan);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [cameraActive, handleScan]);

  useEffect(() => () => stopCamera(), []);

  const filteredHistory = eventId
    ? scanHistory.filter(s => s.eventTitle)
    : scanHistory;

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setMode('scan')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'scan' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500'}`}>
          <Camera className="w-4 h-4" /> Escanear
        </button>
        <button onClick={() => setMode('history')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'history' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500'}`}>
          <Clock className="w-4 h-4" /> Historial ({filteredHistory.length})
        </button>
      </div>

      {mode === 'scan' && (
        <>
          {/* Camera area */}
          <div className="bg-gray-900 rounded-2xl aspect-square max-w-sm mx-auto flex flex-col items-center justify-center relative overflow-hidden">
            {cameraActive ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-2/3 h-2/3 border-2 border-brand-orange rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-orange rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-orange rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-orange rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-orange rounded-br-xl" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-orange animate-bounce opacity-70" style={{ animationDuration: '1.5s' }} />
                  </div>
                </div>
                <button onClick={stopCamera} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                  <CameraOff className="w-4 h-4 text-white" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-16 h-16 text-white/20" />
                <p className="text-white/40 text-sm">Escanea el QR de la entrada</p>
                {cameraError ? (
                  <p className="text-red-400 text-xs px-4 text-center">{cameraError}</p>
                ) : (
                  <button onClick={startCamera} className="bg-brand-orange text-white text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Activar cámara
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Manual input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Introduce código QR (TKT-...)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange font-mono"
              onKeyDown={e => e.key === 'Enter' && handleScan(manualToken)}
            />
            <Button variant="orange" onClick={() => handleScan(manualToken)} disabled={scanning}>
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar'}
            </Button>
          </div>

          {/* Last scan result */}
          {lastResult && (
            <ScanResultCard
              status={lastResult.status}
              buyerName={lastResult.buyerName}
              eventTitle={lastResult.eventTitle}
              sectionName={lastResult.sectionName}
              ticketType={lastResult.ticketType}
              companions={lastResult.companions}
              quantity={lastResult.quantity}
            />
          )}
        </>
      )}

      {mode === 'history' && (
        <div className="space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-semibold">Sin escaneos</p>
              <p className="text-xs mt-1">El historial aparecerá aquí</p>
            </div>
          ) : (
            filteredHistory.map((scan, i) => (
              <div key={i} className={`card-white rounded-xl p-3 flex items-center gap-3 ${
                scan.status === 'valid' ? 'border-l-4 border-l-emerald-500' :
                scan.status === 'used' ? 'border-l-4 border-l-blue-500' :
                'border-l-4 border-l-red-500'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  scan.status === 'valid' ? 'bg-emerald-100 text-emerald-600' :
                  scan.status === 'used' ? 'bg-blue-100 text-blue-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {scan.status === 'valid' ? <CheckCircle className="w-4 h-4" /> :
                   scan.status === 'used' ? <Clock className="w-4 h-4" /> :
                   <XCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{scan.buyerName || 'Desconocido'}</p>
                  <p className="text-gray-400 text-xs">{scan.sectionName} · {scan.ticketType}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <QRStatusBadge status={scan.status} className="text-[9px] px-1.5 py-0.5" />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(scan.scannedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BuyerTable;
