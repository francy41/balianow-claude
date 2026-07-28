// Supabase Edge Function — create-module-checkout
// POST /functions/v1/create-module-checkout
// Pago ÚNICO de un módulo de creador (20€) o del Pack Full (50€).
// Body: { moduleId, moduleName, price }  → { url } | { notConfigured }
// Requiere sesión (el creador). El webhook registra la compra al completar el pago.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://bailanow.com';

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'module' });
  if (!rl.ok) return rl.response;
  if (!SECRET || SECRET.includes('XXXX')) return json({ notConfigured: true });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'No autorizado' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }
  const moduleId = String(body.moduleId ?? '');
  const moduleName = String(body.moduleName ?? 'Módulo');
  const price = Number(body.price);
  if (!moduleId || !Number.isFinite(price) || price <= 0) return json({ error: 'Datos no válidos' }, 400);

  const stripe = new Stripe(SECRET, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: Math.round(price * 100), product_data: { name: `BailaNow · ${moduleName}` } } }],
      customer_email: user.email ?? undefined,
      metadata: { type: 'module', module_id: moduleId, creator_id: user.id, price: String(price) },
      success_url: `${APP_URL}/modulos?ok=1`,
      cancel_url: `${APP_URL}/modulos`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('[create-module-checkout] stripe error');
    return json({ error: (err as Error).message || 'Error creando el pago' }, 400);
  }
});
