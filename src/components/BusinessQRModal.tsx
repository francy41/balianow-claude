import React, { useMemo, useState } from 'react';
import { X, Download, Copy, Check, QrCode, Link as LinkIcon } from 'lucide-react';
import { QRCodeCanvas, downloadTicketQR } from './QRTicket';
import { useUIStore } from '../store/appStore';

interface Preset {
  id: string;
  label: string;
  icon: string;
  build: (origin: string, profileSlug?: string) => string;
}

// Destinos rápidos que un negocio suele querer en su QR.
const PRESETS: Preset[] = [
  { id: 'perfil',   label: 'Mi perfil',     icon: '👤', build: (o, s) => (s ? `${o}/u/${s}` : o) },
  { id: 'reservas', label: 'Reservar',      icon: '📅', build: (o, s) => (s ? `${o}/u/${s}?reservar=1` : `${o}/promocionate`) },
  { id: 'web',      label: 'BailaNow',      icon: '🌐', build: (o) => o },
  { id: 'custom',   label: 'Enlace propio', icon: '✏️', build: (o) => o },
];

interface BusinessQRModalProps {
  open: boolean;
  onClose: () => void;
  businessName?: string;
  profileSlug?: string;
}

const BusinessQRModal: React.FC<BusinessQRModalProps> = ({ open, onClose, businessName = '', profileSlug }) => {
  const { addToast } = useUIStore();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bailanow.com';

  const [name, setName] = useState(businessName);
  const [presetId, setPresetId] = useState('perfil');
  const [customUrl, setCustomUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const targetUrl = useMemo(() => {
    if (presetId === 'custom') return customUrl.trim() || origin;
    const preset = PRESETS.find(p => p.id === presetId) || PRESETS[0];
    return preset.build(origin, profileSlug);
  }, [presetId, customUrl, origin, profileSlug]);

  if (!open) return null;

  const safeName = name.trim() || 'negocio';
  const fileName = `qr-${safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ message: 'No se pudo copiar el enlace', type: 'error' });
    }
  };

  const handleDownload = async () => {
    await downloadTicketQR(targetUrl, fileName);
    addToast({ message: 'QR descargado ✔️', type: 'success' });
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </span>
            Tu código QR
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Imprímelo en tu local, flyers o mesas. Tus clientes lo escanean y llegan directos a donde tú elijas.
          </p>

          {/* Nombre del negocio */}
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Nombre del negocio</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Academia BailaNow"
            className="w-full mb-4 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none"
          />

          {/* Destino */}
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">¿A dónde lleva el QR?</label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                  presetId === p.id
                    ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-transparent shadow-lg shadow-fuchsia-500/25'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-fuchsia-300'
                }`}
              >
                <span className="text-base">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          {presetId === 'custom' && (
            <div className="relative mb-3">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://tu-enlace.com o WhatsApp"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none"
              />
            </div>
          )}

          {/* QR preview */}
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center mb-3">
            {name.trim() && <p className="font-black text-gray-900 dark:text-white text-sm mb-3 text-center">{name.trim()}</p>}
            <QRCodeCanvas token={targetUrl} size={190} />
            <p className="text-[10px] text-gray-400 mt-3 font-mono break-all text-center max-w-[240px]">{targetUrl}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl py-2.5 text-sm hover:border-fuchsia-400 transition-all"
            >
              {copied ? <><Check className="w-4 h-4 text-green-500" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold rounded-xl py-2.5 text-sm hover:opacity-90 transition-all shadow-lg shadow-fuchsia-500/25"
            >
              <Download className="w-4 h-4" /> Descargar PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessQRModal;
