// Supabase Edge Function - Deno runtime
// POST /functions/v1/create-subscription-checkout
//
// Creates a Stripe Checkout Session in 'subscription' mode (recurring).
// Uses inline price_data so no pre-created Stripe Price IDs are needed.
//
// Body: { planId, period: 'monthly'|'yearly', subscriptionRowId }
// Returns: { url } | { notConfigured: true }
//
// El precio NO viaja en la petición. Antes se hacía `Number(body.price)` y se
// cobraba eso, así que cualquiera podía pedir el plan de 22 € por un céntimo.
// Ahora se lee de `plan_prices` con la clave de servicio. Si el cliente manda
// un precio, se ignora.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://bailanow.com';

serve(async (req) => {
  const corsH = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsH, 'Content-Type': 'application/json' } });

  // Rate limit: evita spam de creacion de sesiones de pago.
  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'sub-checkout' });
  if (!rl.ok) return rl.response;

  // If Stripe is not configured yet, return notConfigured so the frontend can
  // fall back to the manual pending-request flow without breaking.
  if (!SECRET || SECRET.includes('XXXX')) return json({ notConfigured: true });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'No autorizado' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Cuerpo invalido' }, 400); }

  const planId = String(body.planId ?? '');
  const period = body.period === 'yearly' ? 'yearly' : 'monthly';
  const subscriptionRowId = String(body.subscriptionRowId ?? '');

  if (!planId || !subscriptionRowId) {
    return json({ error: 'Datos de plan invalidos' }, 400);
  }

  // El precio oficial, de la base de datos. La clave de servicio salta el RLS
  // a propósito: aquí se necesita el precio real, no el que pueda ver nadie.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data: plan } = await admin
    .from('plan_prices')
    .select('name, price, currency, active')
    .eq('plan_id', planId)
    .maybeSingle();

  if (!plan || plan.active === false) return json({ error: 'Plan no disponible' }, 400);

  const basePrice = Number(plan.price);
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return json({ error: 'Plan sin precio valido' }, 400);
  }
  const planName = String(plan.name ?? 'Plan');
  const currency = String(plan.currency ?? 'eur').toLowerCase();

  // Monthly = base; yearly = base * 12 * 0.8 (20% off, matching the UI).
  const unitAmount = period === 'yearly'
    ? Math.round(basePrice * 12 * 0.8 * 100)
    : Math.round(basePrice * 100);

  const stripe = new Stripe(SECRET, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: unitAmount,
          recurring: { interval: period === 'yearly' ? 'year' : 'month' },
          product_data: { name: `BailaNow ${planName}`, metadata: { planId } },
        },
      }],
      client_reference_id: subscriptionRowId,
      customer_email: user.email ?? undefined,
      metadata: { userId: user.id, planId, planName, period, subscriptionRowId },
      subscription_data: { metadata: { userId: user.id, planId, subscriptionRowId } },
      success_url: `${APP_URL}/pago-exitoso?type=subscription&plan=${encodeURIComponent(planId)}`,
      cancel_url: `${APP_URL}/suscripciones`,
      allow_promotion_codes: true,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[create-subscription-checkout] stripe error');
    return json({ error: (err as Error).message || 'Error creando la sesion de pago' }, 400);
  }
});
