import { supabase } from './supabase';
import { createSubscriptionCheckout } from './payments';

// ── Contratar un plan de negocio ────────────────────────────────────────────
// Hasta ahora los planes de 100/200/400 € solo abrían el chat de soporte con un
// asunto escrito: una página de precios que no cobraba. Esto los conecta al
// mismo circuito que ya usan las membresías de usuario.
//
// El precio NO viaja hasta Stripe desde aquí. La función `create-subscription-
// checkout` lo lee de la tabla `plan_prices` e ignora lo que le mande el
// navegador. Lo que se pasa abajo es solo para dejar constancia en la fila de
// `subscriptions`, que es nuestra, no la de cobro.

// En `plan_prices` los planes de negocio van con prefijo para que no choquen
// con los de usuario: 'premium' existía ya en los dos sitios con precios
// distintos (400 € el de negocio, otro el de usuario).
export const idPlanNegocio = (idTarjeta: string) => `negocio_${idTarjeta}`;

export type ResultadoContratar =
  | { estado: 'redirigiendo' }
  | { estado: 'sin-sesion' }
  | { estado: 'sin-pagos' }
  | { estado: 'error'; mensaje: string };

export async function contratarPlanNegocio(opts: {
  idTarjeta: string;        // 'starter' | 'growth' | 'premium' | 'boost'
  nombre: string;
  precio: number;
  userId: string | undefined;
}): Promise<ResultadoContratar> {
  if (!opts.userId) return { estado: 'sin-sesion' };

  const planId = idPlanNegocio(opts.idTarjeta);
  const ahora = new Date();
  const fin = new Date(ahora);
  fin.setMonth(fin.getMonth() + 1);

  // La fila se crea en 'pending'. El webhook de Stripe la pasa a 'active'
  // cuando el pago se completa — si la persona abandona el checkout, queda
  // pendiente y no da acceso a nada.
  const { data: fila, error } = await supabase.from('subscriptions').insert({
    user_id: opts.userId,
    plan: planId,
    plan_name: `BailaNow ${opts.nombre}`,
    price: opts.precio,
    currency: 'EUR',
    period: 'monthly',
    status: 'pending',
    provider: 'stripe',
    started_at: ahora.toISOString(),
    current_period_end: fin.toISOString(),
  }).select('id').single();

  if (error || !fila) {
    return { estado: 'error', mensaje: error?.message || 'No se pudo registrar el plan' };
  }

  try {
    const res = await createSubscriptionCheckout({
      planId,
      planName: `BailaNow ${opts.nombre}`,
      price: opts.precio,
      period: 'monthly',
      currency: 'eur',
      subscriptionRowId: fila.id,
    });
    if (res.url) {
      window.location.href = res.url;
      return { estado: 'redirigiendo' };
    }
    // notConfigured: Stripe aún no tiene clave. Mejor decirlo que fingir.
    return { estado: 'sin-pagos' };
  } catch (e) {
    return { estado: 'error', mensaje: (e as Error).message || 'No se pudo abrir el pago' };
  }
}
