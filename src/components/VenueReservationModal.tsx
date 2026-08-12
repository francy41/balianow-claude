import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { useSaleFees } from '../lib/saleFees';
import { getStripe, createStripePaymentIntent } from '../lib/payments';
import StripePayment from './payment/StripePayment';
import { X, Loader2, CheckCircle, CalendarDays, Users, Wine, FileText, CreditCard, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  venueId: string;
  venueName: string;
}

interface Product { id: string; name: string; price: number; }

const genCode = () => 'BN-' + Math.random().toString(36).slice(2, 8).toUpperCase();

const VenueReservationModal: React.FC<Props> = ({ open, onClose, venueId, venueName }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const saleFees = useSaleFees();

  const [products, setProducts] = useState<Product[]>([]);
  const [refundPct, setRefundPct] = useState(50);
  const [terms, setTerms] = useState('');
  const [kind, setKind] = useState<'normal' | 'reservado'>('normal');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('23:30');
  const [party, setParty] = useState(2);
  const [productId, setProductId] = useState('');
  const [productQty, setProductQty] = useState(1);
  const [guestDesc, setGuestDesc] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ code: string; total: number; table?: string } | null>(null);
  const [step, setStep] = useState<'form' | 'pay'>('form');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeReady] = useState(!!getStripe());

  useEffect(() => {
    if (!open) return;
    setStep('form'); setClientSecret(''); setDone(null);
    setEmail(user?.email || '');
    (async () => {
      const { data: v } = await supabase.from('venues').select('refund_percent, reservation_terms').eq('id', venueId).maybeSingle();
      if (v) { setRefundPct(v.refund_percent ?? 50); setTerms(v.reservation_terms || ''); }
      const { data: p } = await supabase.from('venue_products').select('id,name,price').eq('venue_id', venueId).eq('active', true).order('sort');
      if (p) setProducts(p.map((r: any) => ({ id: r.id, name: r.name, price: Number(r.price) })));
    })();
  }, [open, venueId]);

  if (!open) return null;

  const product = products.find(p => p.id === productId) || null;
  const productTotal = product ? Math.round(product.price * productQty * 100) / 100 : 0;
  const fee = Math.round(saleFees.reservation * 100) / 100;
  const total = Math.round((productTotal + fee) * 100) / 100;

  const validate = () => {
    if (!date) { addToast({ message: 'Elige una fecha', type: 'error' }); return false; }
    if (!email.trim() && !whatsapp.trim()) { addToast({ message: 'Deja un email o WhatsApp para la confirmación', type: 'error' }); return false; }
    if (terms && !acceptTerms) { addToast({ message: 'Debes aceptar los términos', type: 'error' }); return false; }
    return true;
  };

  const createReservation = async (paymentId: string | null) => {
    setSaving(true);
    const code = genCode();
    const table = kind === 'reservado' ? 'Mesa ' + Math.floor(10 + Math.random() * 90) : null;
    const { error } = await supabase.from('reservations').insert({
      venue_id: venueId,
      customer_id: user?.id ?? null,
      kind,
      reservation_date: date,
      reservation_time: time || null,
      party_size: party,
      table_number: table,
      guest_description: guestDesc || null,
      product_id: productId || null,
      product_qty: product ? productQty : 0,
      unit_price: product ? product.price : 0,
      total_amount: total,
      currency: 'EUR',
      status: 'pending',
      payment_status: paymentId ? 'paid' : (total > 0 ? 'pending' : 'unpaid'),
      refund_percent: refundPct,
      confirmation_code: code,
      contact_email: email.trim() || null,
      contact_whatsapp: whatsapp.trim() || null,
    });
    setSaving(false);
    if (error) {
      if (/does not exist|schema cache|42P01/i.test(error.message)) {
        addToast({ message: 'Reservas aún no activadas por el local (falta configurar la BD).', type: 'warning' });
      } else {
        addToast({ message: `No se pudo reservar: ${error.message}`, type: 'error' });
      }
      return;
    }
    setDone({ code, total, table: table || undefined });
  };

  // Reserva gratis → crea directo. Con importe → intento de pago Stripe (o demo).
  const goToPay = async () => {
    if (!validate()) return;
    if (total <= 0) { await createReservation(null); return; }
    setSaving(true);
    if (stripeReady && user) {
      try {
        const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000));
        const result: any = await Promise.race([
          createStripePaymentIntent({
            amount: total, currency: 'eur', userId: user.id,
            items: [{ serviceId: venueId, sellerId: venueId, sellerName: venueName, title: `Reserva ${venueName}`, price: total, extrasTotal: 0 }],
          }),
          timeout,
        ]);
        setClientSecret(result.clientSecret);
      } catch { /* fallback demo */ }
    }
    setSaving(false);
    setStep('pay');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        {done ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full grid place-items-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white">¡Reserva confirmada!</h3>
            <p className="text-sm text-gray-500 mt-1">Te enviaremos la confirmación a tu email/WhatsApp.</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mt-4 text-left space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Código</span><span className="font-black text-gray-900 dark:text-white">{done.code}</span></div>
              {done.table && <div className="flex justify-between"><span className="text-gray-500">Mesa</span><span className="font-bold text-gray-900 dark:text-white">{done.table}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-black text-brand-orange">€{done.total.toFixed(2)}</span></div>
            </div>
            <button onClick={onClose} className="btn-orange w-full mt-5 py-2.5">Cerrar</button>
          </div>
        ) : step === 'pay' ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-gray-900 dark:text-white">Pagar reserva</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-4 flex justify-between font-black">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-brand-orange text-lg">€{total.toFixed(2)}</span>
            </div>
            {clientSecret && stripeReady ? (
              <StripePayment clientSecret={clientSecret} total={total} onSuccess={(pid: string) => createReservation(pid)} onError={(e: string) => addToast({ type: 'error', message: e })} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Modo demo. En producción configura <code>VITE_STRIPE_PUBLISHABLE_KEY</code> para pagos reales.</p>
                </div>
                <button onClick={() => createReservation(`demo-${Date.now()}`)} disabled={saving} className="btn-orange w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />} Pagar €{total.toFixed(2)} (Demo)
                </button>
              </div>
            )}
            <button onClick={() => setStep('form')} className="w-full text-center text-sm text-gray-500 mt-3">← Volver</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-black text-lg text-gray-900 dark:text-white">Reservar en {venueName}</h3>
                <p className="text-xs text-gray-400">Elige tu tipo de reserva</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'reservado'] as const).map(k => (
                  <button key={k} onClick={() => setKind(k)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${kind === k ? 'border-brand-orange bg-pink-50 dark:bg-pink-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
                    <p className="font-black text-gray-900 dark:text-white text-sm">{k === 'normal' ? 'Entrada' : 'Reservado / Mesa'}</p>
                    <p className="text-[11px] text-gray-400">{k === 'normal' ? 'Acceso al local' : 'Mesa reservada con producto'}</p>
                  </button>
                ))}
              </div>

              {/* Fecha / hora / personas */}
              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-2 text-xs font-bold text-gray-500 uppercase">Fecha
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent" />
                </label>
                <label className="text-xs font-bold text-gray-500 uppercase">Hora
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent" />
                </label>
              </div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Nº de personas
                <input type="number" min="1" value={party} onChange={e => setParty(parseInt(e.target.value) || 1)} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent" />
              </label>

              {/* Producto (opcional para normal, típico en reservado) */}
              {products.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <label className="col-span-2 text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Wine className="w-3.5 h-3.5" /> Producto
                    <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent">
                      <option value="">Sin producto</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} — €{p.price}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-gray-500 uppercase">Cantidad
                    <input type="number" min="1" value={productQty} onChange={e => setProductQty(parseInt(e.target.value) || 1)} disabled={!productId} className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent disabled:opacity-50" />
                  </label>
                </div>
              )}

              {/* Descripción invitados */}
              <label className="block text-xs font-bold text-gray-500 uppercase">Descripción de las personas
                <textarea value={guestDesc} onChange={e => setGuestDesc(e.target.value)} rows={2} placeholder="Ej. grupo de 4, cumpleaños de Ana…" className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent" />
              </label>

              {/* Contacto */}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Email
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent" />
                </label>
                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+34 600…" className="w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-transparent" />
                </label>
              </div>

              {/* Total */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-1.5 text-sm">
                {productTotal > 0 && <div className="flex justify-between"><span className="text-gray-500">{product?.name} ×{productQty}</span><span className="font-bold text-gray-900 dark:text-white">€{productTotal.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-400">Tarifa de servicio</span><span className="text-gray-400">€{fee.toFixed(2)}</span></div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between font-black"><span className="text-gray-900 dark:text-white">Total</span><span className="text-brand-orange">€{total.toFixed(2)}</span></div>
              </div>

              {/* Reembolso + términos */}
              <p className="text-[11px] text-gray-400 flex items-start gap-1"><FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Si no asistes se reembolsa el <b className="text-gray-600 dark:text-gray-300">{refundPct}%</b>. {terms}</p>
              {terms && (
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="w-4 h-4 accent-brand-orange" /> Acepto los términos y la política de reembolso
                </label>
              )}

              <button onClick={goToPay} disabled={saving} className="btn-orange w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarDays className="w-5 h-5" />}
                {total > 0 ? `Continuar al pago — €${total.toFixed(2)}` : 'Confirmar reserva'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VenueReservationModal;
