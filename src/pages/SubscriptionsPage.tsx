import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../data/mockData';
import { useAuthStore, useUIStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { createSubscriptionCheckout } from '../lib/payments';
import { Button, Badge } from '../components/ui';

const SubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;
    setLoading(planId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(null); navigate('/auth'); return; }

    const periodKey = period === 'year' ? 'yearly' : 'monthly';
    const now = new Date();
    const end = new Date(now); end.setMonth(end.getMonth() + (period === 'year' ? 12 : 1));

    // 1. Insertamos la fila de suscripción en estado 'pending' y recuperamos su id.
    const { data: row, error } = await supabase.from('subscriptions').insert({
      user_id: session.user.id,
      plan: plan.id, plan_name: plan.name,
      price: plan.price, currency: 'EUR',
      period: periodKey,
      status: 'pending', provider: 'stripe',
      started_at: now.toISOString(), current_period_end: end.toISOString(),
    }).select('id').single();

    if (error || !row) {
      setLoading(null);
      addToast({ message: `No se pudo registrar: ${error?.message || 'error'}`, type: 'error' });
      return;
    }

    // 2. Pedimos la sesión de Stripe Checkout (recurrente).
    try {
      const res = await createSubscriptionCheckout({
        planId: plan.id, planName: plan.name, price: plan.price,
        period: periodKey, currency: 'eur', subscriptionRowId: row.id,
      });

      if (res.url) {
        // Redirige a Stripe; el webhook activará la suscripción al completar el pago.
        window.location.href = res.url;
        return;
      }

      // Stripe aún no configurado → dejamos la solicitud como manual.
      await supabase.from('subscriptions').update({ provider: 'manual' }).eq('id', row.id);
      setLoading(null);
      addToast({ message: `✅ Solicitud del plan ${plan.name} registrada. Te activaremos en breve para completar el pago.`, type: 'success' });
    } catch (e: any) {
      // La función no está desplegada o falló → flujo manual, sin romper la experiencia.
      await supabase.from('subscriptions').update({ provider: 'manual' }).eq('id', row.id);
      setLoading(null);
      addToast({ message: `✅ Solicitud del plan ${plan.name} registrada. Te contactaremos para completar el pago.`, type: 'success' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="orange" className="mb-4 mx-auto">👑 Planes Premium</Badge>
          <h1 className="font-display font-black text-4xl sm:text-5xl text-gray-900 mb-4">
            Crece en el<br /><span className="text-brand-orange">ecosistema latino</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Visibilidad premium, flyers, vídeos y campañas. Únete a los artistas y venues que ya destacan.
          </p>

          <div className="flex items-center justify-center gap-2 mt-6 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
            <button onClick={() => setPeriod('month')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Mensual
            </button>
            <button onClick={() => setPeriod('year')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${period === 'year' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Anual <Badge variant="green">-20%</Badge>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUBSCRIPTION_PLANS.map(plan => {
            const yearPrice = Math.round(plan.price * 12 * 0.8);
            const displayPrice = period === 'year' ? Math.round(yearPrice / 12) : plan.price;
            const isCurrentPlan = user?.subscriptionPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl p-6 flex flex-col border transition-all ${
                  plan.popular
                    ? 'border-brand-orange shadow-card-hover scale-105'
                    : 'border-gray-100 shadow-card hover:shadow-card-hover'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="orange">🔥 Más Popular</Badge>
                  </div>
                )}

                <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${plan.color} mb-4`} />

                <h3 className="font-display font-black text-xl text-gray-900">{plan.name}</h3>
                <p className="text-gray-400 text-xs mt-0.5 mb-4">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">€{displayPrice}</span>
                    <span className="text-gray-400 text-sm mb-1.5">/mes</span>
                  </div>
                  {period === 'year' && (
                    <p className="text-emerald-600 text-xs mt-1">€{yearPrice}/año — Ahorras €{plan.price * 12 - yearPrice}</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {(plan.flyers > 0 || plan.videos > 0) && (
                  <div className="flex gap-2 mb-4">
                    {plan.flyers > 0 && (
                      <div className="bg-gray-50 rounded-xl px-3 py-2 text-center flex-1 border border-gray-100">
                        <p className="text-gray-900 font-bold text-sm">{plan.flyers === -1 ? '∞' : plan.flyers}</p>
                        <p className="text-gray-400 text-[10px]">Flyers</p>
                      </div>
                    )}
                    {plan.videos > 0 && (
                      <div className="bg-gray-50 rounded-xl px-3 py-2 text-center flex-1 border border-gray-100">
                        <p className="text-gray-900 font-bold text-sm">{plan.videos === -1 ? '∞' : plan.videos}</p>
                        <p className="text-gray-400 text-[10px]">Vídeos</p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant={isCurrentPlan ? 'ghost' : plan.popular ? 'orange' : 'outline'}
                  className="w-full"
                  loading={loading === plan.id}
                  disabled={isCurrentPlan}
                  onClick={() => handleSubscribe(plan.id)}
                  icon={!isCurrentPlan ? <Zap className="w-4 h-4" /> : undefined}
                >
                  {isCurrentPlan ? '✓ Plan Activo' : `Activar ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-400 text-sm">
            ✅ Sin permanencia · 🔒 Pago seguro · 💳 Cancela cuando quieras · 📧 Soporte prioritario
          </p>
        </div>

        <div className="mt-10 max-w-2xl mx-auto">
          <h2 className="text-xl font-display font-bold text-gray-900 text-center mb-6">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {[
              { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, cancelas cuando quieras sin penalización. Tu cuenta premium se mantiene hasta fin del período pagado.' },
              { q: '¿Qué incluye la visibilidad premium?', a: 'Tu perfil aparece primero en búsquedas, en la homepage y en recomendaciones geolocalizadas.' },
              { q: '¿Cómo funciona el escrow de pagos?', a: 'El dinero queda retenido hasta que el servicio se completa. Seguridad total para artistas y clientes.' },
              { q: '¿La comisión del 15% incluye IVA?', a: 'La comisión del 15% se aplica sobre cada transacción y cubre pagos, garantías y soporte.' },
            ].map(faq => (
              <div key={faq.q} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card">
                <p className="text-gray-900 font-semibold text-sm">{faq.q}</p>
                <p className="text-gray-400 text-sm mt-2">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
