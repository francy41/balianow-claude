import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { getStripe, createStripePaymentIntent } from '../lib/payments';
import StripePayment from './payment/StripePayment';
import { Loader2, X, CreditCard, AlertCircle, CheckCircle, ShoppingBag } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
}

const BuyServicesTab: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [buying, setBuying] = useState<Service | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('platform_services').select('*').eq('active', true).order('sort');
    if (error) {
      if (/does not exist|schema cache|42P01/i.test(error.message)) setTableMissing(true);
      setServices([]);
    } else {
      setTableMissing(false);
      setServices((data || []) as Service[]);
    }
    if (user?.id) {
      const { data: ord } = await supabase.from('service_orders').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false });
      if (ord) setOrders(ord);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto" /></div>;

  if (tableMissing) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">El catálogo de servicios aún no está activado. Vuelve pronto.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-brand-orange" /> Comprar servicios</h2>
        <p className="text-gray-500 text-sm mt-1">Flyers, vídeos y campañas para hacer crecer tu perfil.</p>
      </div>

      {services.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay servicios publicados.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(s => (
            <div key={s.id} className="card-white rounded-2xl p-5 flex flex-col">
              <span className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-500/10 grid place-items-center text-2xl mb-3">{s.icon}</span>
              <p className="font-black text-gray-900 dark:text-white">{s.name}</p>
              <p className="text-gray-400 text-xs mt-1 flex-1">{s.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-brand-orange font-black text-lg">€{Number(s.price).toFixed(2)}</span>
                <button onClick={() => setBuying(s)} className="btn-orange text-sm px-4 py-2">Comprar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {orders.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">Tus pedidos</h3>
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="card-white rounded-xl p-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{o.service_name}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {o.payment_status === 'paid' ? 'Pagado' : 'Pendiente de pago'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {buying && <BuyModal service={buying} userId={user?.id || ''} onClose={() => setBuying(null)} onDone={() => { setBuying(null); load(); }} />}
    </div>
  );
};

const BuyModal: React.FC<{ service: Service; userId: string; onClose: () => void; onDone: () => void }> = ({ service, userId, onClose, onDone }) => {
  const { addToast } = useUIStore();
  const [step, setStep] = useState<'confirm' | 'pay' | 'done'>('confirm');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeReady] = useState(!!getStripe());
  const [saving, setSaving] = useState(false);

  const createOrder = async (paymentId: string | null) => {
    setSaving(true);
    const { error } = await supabase.from('service_orders').insert({
      service_id: service.id, buyer_id: userId, service_name: service.name,
      price: service.price, currency: 'EUR',
      status: 'pending', payment_status: paymentId ? 'paid' : 'unpaid',
    });
    setSaving(false);
    if (error) { addToast({ message: `No se pudo crear el pedido: ${error.message}`, type: 'error' }); return; }
    setStep('done');
  };

  const goToPay = async () => {
    setSaving(true);
    if (stripeReady) {
      try {
        const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000));
        const result: any = await Promise.race([
          createStripePaymentIntent({
            amount: service.price, currency: 'eur', userId,
            items: [{ serviceId: service.id, sellerId: 'bailanow', sellerName: 'BailaNow', title: service.name, price: service.price, extrasTotal: 0 }],
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
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6">
        {step === 'done' ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full grid place-items-center mx-auto mb-3"><CheckCircle className="w-7 h-7 text-green-600" /></div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white">¡Pedido enviado!</h3>
            <p className="text-sm text-gray-500 mt-1">Nuestro equipo se pondrá en contacto contigo para {service.name.toLowerCase()}.</p>
            <button onClick={onDone} className="btn-orange w-full mt-5 py-2.5">Cerrar</button>
          </div>
        ) : step === 'pay' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-gray-900 dark:text-white">Pagar servicio</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-4 flex justify-between font-black">
              <span className="text-gray-900 dark:text-white">{service.name}</span>
              <span className="text-brand-orange">€{Number(service.price).toFixed(2)}</span>
            </div>
            {clientSecret && stripeReady ? (
              <StripePayment clientSecret={clientSecret} total={service.price} onSuccess={(pid: string) => createOrder(pid)} onError={(e: string) => addToast({ type: 'error', message: e })} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Modo demo. En producción configura <code>VITE_STRIPE_PUBLISHABLE_KEY</code>.</p>
                </div>
                <button onClick={() => createOrder(`demo-${Date.now()}`)} disabled={saving} className="btn-orange w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />} Pagar €{Number(service.price).toFixed(2)} (Demo)
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-gray-900 dark:text-white">Confirmar compra</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-4">
              <p className="font-black text-gray-900 dark:text-white">{service.name}</p>
              <p className="text-gray-500 text-sm mt-1">{service.description}</p>
              <p className="text-brand-orange font-black text-xl mt-3">€{Number(service.price).toFixed(2)}</p>
            </div>
            <button onClick={goToPay} disabled={saving} className="btn-orange w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />} Continuar al pago
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BuyServicesTab;
