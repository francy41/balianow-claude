import React, { useState, useEffect } from 'react';
import { X, Ticket, CreditCard, CheckCircle, Loader2, ChevronRight, Minus, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { getStripe, createStripePaymentIntent } from '../lib/payments';
import StripePayment from './payment/StripePayment';
import { QRCodeCanvas, downloadTicketQR } from './QRTicket';
import { useCommissionPercent } from '../lib/commission';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TicketSection {
  id: string;
  name: string;
  type: string;
  price: number;
  available: number;
  benefits: string[];
  color: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  organizerId?: string;
  sections?: TicketSection[];
}

type Step = 'select' | 'pay' | 'done';

const SECTION_ICONS: Record<string, string> = {
  general: '🎫', vip: '👑', mesa: '🍾', palco: '🏛️', backstage: '🎤',
  lounge: '🛋️', terraza: '🌅', 'fan-zone': '🎉', 'premium-experience': '💎',
};

// Generate unique QR token for ticket
const generateQRToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const seg = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `TKT-${seg(8)}-${seg(4)}-${seg(4)}-${seg(12)}-${Date.now().toString(36)}`;
};

const EventTicketModal: React.FC<Props> = ({
  open, onClose, eventId, eventTitle, eventDate, organizerId, sections: propSections,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const commissionPct = useCommissionPercent();

  const [step, setStep] = useState<Step>('select');
  const [sections, setSections] = useState<TicketSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<TicketSection | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [stripeReady] = useState(!!getStripe());
  const [doneTicket, setDoneTicket] = useState<{ qrToken: string; total: number; section: string } | null>(null);

  // Load sections: use prop sections or local ticket store sections for this event
  useEffect(() => {
    if (!open) return;
    setStep('select');
    setSelectedSection(null);
    setQty(1);
    setDoneTicket(null);
    setClientSecret('');

    if (propSections && propSections.length > 0) {
      setSections(propSections.filter(s => s.available > 0));
      return;
    }
    // Fallback: default sections for any event
    setSections([
      { id: 'gen', name: 'Entrada General', type: 'general', price: 25, available: 100, benefits: ['Acceso pista de baile', '1 consumición incluida'], color: '#3B82F6' },
      { id: 'vip', name: 'VIP Lounge', type: 'vip', price: 80, available: 20, benefits: ['Zona VIP exclusiva', 'Barra libre 2h', 'Acceso prioritario'], color: '#F59E0B' },
    ]);
  }, [open, propSections]);

  if (!open) return null;

  const total = selectedSection ? selectedSection.price * qty : 0;
  const commission = Math.round(total * commissionPct * 100) / 100;
  const net = Math.round((total - commission) * 100) / 100;

  const goToPay = async () => {
    if (!selectedSection || !isAuthenticated || !user) return;
    setLoading(true);

    if (stripeReady) {
      try {
        const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000));
        const result = await Promise.race([
          createStripePaymentIntent({
            amount: total,
            currency: 'eur',
            items: [{ serviceId: eventId, sellerId: organizerId || eventId, sellerName: eventTitle, title: selectedSection.name, price: total, extrasTotal: 0 }],
            userId: user.id,
          }),
          timeout,
        ]);
        setClientSecret(result.clientSecret);
      } catch {
        // Fallback to demo
      }
    }

    setLoading(false);
    setStep('pay');
  };

  const createTicketInDB = async (paymentId: string) => {
    if (!selectedSection || !user) return null;
    const qrToken = generateQRToken();
    const { data, error } = await supabase.from('tickets').insert({
      event_id: eventId,
      user_id: user.id,
      qr_token: qrToken,
      status: 'valid',
      buyer_name: user.name,
      buyer_email: user.email || '',
      price: total,
      quantity: qty,
      section_type: selectedSection.type,
      section_name: selectedSection.name,
      event_title: eventTitle,
      commission,
      net_amount: net,
      payment_id: paymentId,
      organizer_id: organizerId || '',
      ticket_type: selectedSection.type,
    }).select('qr_token').single();

    if (error) {
      addToast({ type: 'error', message: `Error al crear entrada: ${error.message}` });
      return null;
    }
    return data.qr_token as string;
  };

  const payDemo = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    const qrToken = await createTicketInDB(`demo-${Date.now()}`);
    setLoading(false);
    if (qrToken) {
      setDoneTicket({ qrToken, total, section: selectedSection!.name });
      setStep('done');
    }
  };

  const handleStripeSuccess = async (paymentId: string) => {
    const qrToken = await createTicketInDB(paymentId);
    if (qrToken) {
      setDoneTicket({ qrToken, total, section: selectedSection!.name });
      setStep('done');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] flex flex-col z-10 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-brand-orange to-pink-500 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-black text-lg flex items-center gap-2">
                <Ticket className="w-5 h-5" /> Comprar Entradas
              </h2>
              <p className="text-white/80 text-xs mt-0.5 truncate max-w-[260px]">{eventTitle}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-3">
            {(['select', 'pay', 'done'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1 text-xs font-bold ${step === s ? 'text-white' : step === 'done' || (step === 'pay' && i === 0) ? 'text-white/60' : 'text-white/30'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === s ? 'bg-white text-brand-orange' : (step === 'done' || (step === 'pay' && i === 0)) ? 'bg-white/40 text-white' : 'bg-white/20 text-white/50'}`}>
                    {i + 1}
                  </div>
                  {s === 'select' ? 'Sección' : s === 'pay' ? 'Pago' : 'Entrada'}
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Select section ── */}
          {step === 'select' && (
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-500 font-medium">Elige tu tipo de entrada y cantidad</p>
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${selectedSection?.id === sec.id ? 'border-brand-orange bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{SECTION_ICONS[sec.type] || '🎫'}</span>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{sec.name}</p>
                        <p className="text-xs text-gray-400">{sec.available} disponibles</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-brand-orange text-lg">€{sec.price}</p>
                      <p className="text-[10px] text-gray-400">por persona</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sec.benefits.slice(0, 3).map(b => (
                      <span key={b} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{b}</span>
                    ))}
                  </div>
                  {selectedSection?.id === sec.id && (
                    <div className="mt-3 pt-3 border-t border-orange-200 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Cantidad:</span>
                      <div className="flex items-center gap-3">
                        <button onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="font-black text-gray-900 w-6 text-center">{qty}</span>
                        <button onClick={e => { e.stopPropagation(); setQty(q => Math.min(sec.available, q + 1)); }}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              ))}

              {selectedSection && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({qty}×€{selectedSection.price})</span>
                    <span className="font-bold text-gray-900">€{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Comisión plataforma ({Math.round(commissionPct * 100)}%)</span>
                    <span className="text-gray-400">€{commission.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-black">
                    <span className="text-gray-900">Total</span>
                    <span className="text-brand-orange text-lg">€{total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 'pay' && selectedSection && (
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-gray-900">{selectedSection.name}</p>
                    <p className="text-sm text-gray-500">{qty} entrada{qty > 1 ? 's' : ''}</p>
                  </div>
                  <p className="font-black text-brand-orange text-xl">€{total.toFixed(2)}</p>
                </div>
              </div>

              {clientSecret && stripeReady ? (
                <StripePayment
                  clientSecret={clientSecret}
                  total={total}
                  onSuccess={handleStripeSuccess}
                  onError={e => addToast({ type: 'error', message: e })}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Modo demo activo. En producción, configura <code>VITE_STRIPE_PUBLISHABLE_KEY</code> para pagos reales.</p>
                  </div>
                  <button
                    onClick={payDemo}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-brand-orange to-pink-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 text-lg"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    {loading ? 'Procesando…' : `Pagar €${total.toFixed(2)} (Demo)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Done — show QR ticket ── */}
          {step === 'done' && doneTicket && (
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="font-black text-xl text-gray-900">¡Entrada confirmada!</h3>
                <p className="text-gray-500 text-sm mt-1">Guarda este QR — es tu entrada al evento</p>
              </div>

              {/* QR real */}
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-6">
                <div className="text-center mb-4">
                  <p className="font-black text-gray-900">{eventTitle}</p>
                  <p className="text-sm text-gray-400">{new Date(eventDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <QRCodeCanvas token={doneTicket.qrToken} size={200} />
                <p className="text-center text-[10px] text-gray-400 mt-2 font-mono break-all">{doneTicket.qrToken}</p>
                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sección</span>
                    <span className="font-bold text-gray-900">{doneTicket.section}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Entradas</span>
                    <span className="font-bold text-gray-900">{qty}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total pagado</span>
                    <span className="font-black text-brand-orange">€{doneTicket.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => downloadTicketQR(doneTicket.qrToken, `entrada-${eventId}.png`)}
                className="w-full border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl hover:border-brand-orange hover:text-brand-orange transition-colors flex items-center justify-center gap-2"
              >
                ⬇️ Descargar entrada como imagen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select' && (
          <div className="border-t border-gray-100 p-4 flex-shrink-0">
            <button
              onClick={goToPay}
              disabled={!selectedSection || loading}
              className="w-full bg-brand-orange text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-500 disabled:opacity-40 transition-colors text-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              {selectedSection ? `Continuar al pago — €${total.toFixed(2)}` : 'Selecciona una sección'}
            </button>
          </div>
        )}
        {step === 'pay' && (
          <div className="border-t border-gray-100 p-4 flex-shrink-0">
            <button onClick={() => setStep('select')} className="w-full text-gray-500 font-semibold py-2 hover:text-gray-700">
              ← Cambiar sección
            </button>
          </div>
        )}
        {step === 'done' && (
          <div className="border-t border-gray-100 p-4 flex-shrink-0">
            <button onClick={onClose} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-gray-800">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventTicketModal;
