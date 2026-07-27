// Supabase Edge Function — create-donation-checkout
// POST /functions/v1/create-donation-checkout
//
// Crea una sesión de Stripe Checkout en modo 'payment' (pago único) para donaciones.
// No requiere cuenta: cualquiera puede donar.
//
// Body: { amount (EUR), currency?, message? }
// Devuelve: { url } | { notConfigured: true } | { error }
//
// Requiere el secret STRIPE_SECRET_KEY (ya usado por las otras funciones de pago).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://bailanow.com';

serve(async (req) => {
  const corsH = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsH, 'Content-Type': 'application/json' } });

  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'donation' });
  if (!rl.ok) return rl.response;

  if (!SECRET || SECRET.includes('XXXX')) return json({ notConfigured: true });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Cuerpo inválido' }, 400); }

  const currency = String(body.currency ?? 'eur').toLowerCase();
  const amount = Number(body.amount);
  const message = String(body.message ?? '').slice(0, 140);
  if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
    return json({ error: 'Importe de donación no válido (mín. 1€)' }, 400);
  }

  const stripe = new Stripe(SECRET, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(amount * 100),
          product_data: { name: 'Donación a BailaNow ❤️', description: message || 'Apoya a la comunidad de danza latina' },
        },
      }],
      metadata: { type: 'donation', message },
      success_url: `${APP_URL}/pago-exitoso?type=donation`,
      cancel_url: `${APP_URL}/`,
      submit_type: 'donate',
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('[create-donation-checkout] stripe error');
    return json({ error: (err as Error).message || 'Error creando la donación' }, 400);
  }
});
