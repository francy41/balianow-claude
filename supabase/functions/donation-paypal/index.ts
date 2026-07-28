// Supabase Edge Function — donation-paypal
// Donaciones vía PayPal. Dos acciones en un mismo endpoint:
//   { action: 'create', amount, currency? }  → { orderId }
//   { action: 'capture', orderId, message? } → { success, amount } (registra la donación)
// No requiere cuenta. Requiere PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (ya usados).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const PAYPAL_BASE = Deno.env.get('PAYPAL_ENV') === 'production'
  ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function token(): Promise<string> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
  const secret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
  if (!id || !secret) throw new Error('PayPal no configurado');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token PayPal fallido');
  return data.access_token;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  const rl = checkRateLimit(req, { max: 12, windowMs: 60_000, keyPrefix: 'don-pp' });
  if (!rl.ok) return rl.response;

  if (!Deno.env.get('PAYPAL_CLIENT_ID')) return json({ notConfigured: true });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }
  const action = String(body.action ?? '');

  try {
    if (action === 'create') {
      const amount = Number(body.amount);
      const currency = String(body.currency ?? 'EUR').toUpperCase();
      if (!Number.isFinite(amount) || amount < 1 || amount > 5000) return json({ error: 'Importe no válido (mín. 1€)' }, 400);
      const t = await token();
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) }, description: 'Donación a BailaNow ❤️' }],
          application_context: { brand_name: 'BailaNow', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
        }),
      });
      const order = await res.json();
      if (!order.id) return json({ error: 'No se pudo crear la orden' }, 400);
      return json({ orderId: order.id });
    }

    if (action === 'capture') {
      const orderId = String(body.orderId ?? '');
      const message = String(body.message ?? '').slice(0, 140);
      if (!orderId) return json({ error: 'Falta orderId' }, 400);
      const t = await token();
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      });
      const cap = await res.json();
      if (cap.status !== 'COMPLETED') return json({ error: 'Pago no completado', detail: cap.status }, 400);
      const capture = cap.purchase_units?.[0]?.payments?.captures?.[0];
      const amount = Number(capture?.amount?.value ?? 0);
      await admin.from('donations').upsert({
        stripe_session_id: `paypal_${capture?.id ?? orderId}`,
        amount, currency: (capture?.amount?.currency_code ?? 'EUR').toLowerCase(),
        email: cap.payer?.email_address ?? null, message: message || null, status: 'completed',
      }, { onConflict: 'stripe_session_id' });
      return json({ success: true, amount });
    }

    return json({ error: 'Acción no válida' }, 400);
  } catch (e) {
    console.error('[donation-paypal]', (e as Error).message);
    return json({ error: (e as Error).message }, 400);
  }
});
