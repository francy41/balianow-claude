// Supabase Edge Function — PayPal Create Order
// POST /functions/v1/create-paypal-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const PAYPAL_BASE = Deno.env.get('PAYPAL_ENV') === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

const PLATFORM_FEE_RATE = 0.15;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { amount, currency = 'EUR', items, userId } = await req.json();

    // Calcular breakdown
    const sellerMap = new Map<string, { name: string; gross: number }>();
    for (const item of items) {
      const itemTotal = item.price + (item.extrasTotal || 0);
      const existing = sellerMap.get(item.sellerId);
      if (existing) existing.gross += itemTotal;
      else sellerMap.set(item.sellerId, { name: item.sellerName, gross: itemTotal });
    }

    const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;

    const token = await getPayPalToken();

    // Crear orden PayPal con breakdown detallado
    const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `bailanow-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: String(amount),
            breakdown: {
              item_total: { currency_code: currency, value: String(amount) },
            },
          },
          items: items.map((item: any) => ({
            name: item.title.slice(0, 127),
            unit_amount: { currency_code: currency, value: String(item.price + (item.extrasTotal || 0)) },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          })),
          description: `BailaNow — ${items.length} servicio(s) de promoción`,
          custom_id: userId,
          soft_descriptor: 'BAILANOW',
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'BailaNow',
              locale: 'es-ES',
              landing_page: 'LOGIN',
              user_action: 'PAY_NOW',
              return_url: `${Deno.env.get('APP_URL') ?? 'https://bailanow.com'}/pago-exitoso`,
              cancel_url: `${Deno.env.get('APP_URL') ?? 'https://bailanow.com'}/promocionate`,
            },
          },
        },
      }),
    });

    const orderData = await order.json();

    if (!order.ok) {
      throw new Error(orderData.message || 'Error al crear orden PayPal');
    }

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        status: orderData.status,
        links: orderData.links,
        platformFee,
        sellerBreakdown: Array.from(sellerMap.entries()).map(([id, s]) => ({
          sellerId: id,
          sellerName: s.name,
          gross: s.gross,
          commission: Math.round(s.gross * PLATFORM_FEE_RATE * 100) / 100,
          net: Math.round(s.gross * (1 - PLATFORM_FEE_RATE) * 100) / 100,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-paypal-order error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
