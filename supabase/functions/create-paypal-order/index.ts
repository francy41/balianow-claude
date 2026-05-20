// Supabase Edge Function — PayPal Create Order
// POST /functions/v1/create-paypal-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const PAYPAL_BASE = Deno.env.get('PAYPAL_ENV') === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PLATFORM_FEE_RATE = 0.15;
const MIN_AMOUNT = 0.50;
const MAX_AMOUNT = 9999;

async function getPayPalToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');

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
  if (!data.access_token) throw new Error('Failed to get PayPal token');
  return data.access_token;
}

serve(async (req) => {
  const corsH = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  // ── RATE LIMIT ─────────────────────────────────────────────
  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'pp' });
  if (!rl.ok) return rl.response;

  // ── AUTH CHECK ─────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // ── INPUT VALIDATION ───────────────────────────────────────
  let body: { amount?: unknown; currency?: unknown; items?: unknown; userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const { amount, currency = 'EUR', items, userId } = body;

  if (typeof amount !== 'number' || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return new Response(JSON.stringify({ error: 'Importe fuera de rango permitido' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP'];
  if (typeof currency !== 'string' || !ALLOWED_CURRENCIES.includes(currency.toUpperCase())) {
    return new Response(JSON.stringify({ error: 'Moneda no soportada' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return new Response(JSON.stringify({ error: 'Lista de artículos inválida' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  if (typeof userId !== 'string' || userId !== user.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // ── BUSINESS LOGIC ─────────────────────────────────────────
  try {
    const sellerMap = new Map<string, { name: string; gross: number }>();
    for (const item of items) {
      if (
        typeof item !== 'object' || item === null ||
        typeof (item as any).sellerId !== 'string' ||
        typeof (item as any).price !== 'number'
      ) {
        return new Response(JSON.stringify({ error: 'Artículo inválido en el carrito' }), {
          status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
        });
      }
      const itemTotal = (item as any).price + ((item as any).extrasTotal || 0);
      const existing = sellerMap.get((item as any).sellerId);
      if (existing) existing.gross += itemTotal;
      else sellerMap.set((item as any).sellerId, { name: (item as any).sellerName ?? '', gross: itemTotal });
    }

    const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
    const token = await getPayPalToken();
    const appUrl = Deno.env.get('APP_URL') ?? 'https://bailanow.com';

    const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `bailanow-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
            breakdown: {
              item_total: { currency_code: currency.toUpperCase(), value: amount.toFixed(2) },
            },
          },
          items: (items as any[]).map((item) => ({
            // Sanitize item name: strip HTML, limit length
            name: String(item.title ?? '').replace(/<[^>]*>/g, '').slice(0, 127) || 'Servicio BailaNow',
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: (item.price + (item.extrasTotal || 0)).toFixed(2),
            },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          })),
          description: `BailaNow — ${items.length} servicio(s)`,
          custom_id: user.id, // Use verified user.id, not body userId
          soft_descriptor: 'BAILANOW',
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'BailaNow',
              locale: 'es-ES',
              landing_page: 'LOGIN',
              user_action: 'PAY_NOW',
              return_url: `${appUrl}/pago-exitoso`,
              cancel_url: `${appUrl}/promocionate`,
            },
          },
        },
      }),
    });

    const orderData = await order.json();
    if (!order.ok) {
      console.error('[create-paypal-order] PayPal API error:', orderData);
      throw new Error('Error al crear la orden en PayPal');
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
      { headers: { ...corsH, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[create-paypal-order] Error:', err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: 'Error al procesar el pago. Inténtalo de nuevo.' }),
      { status: 500, headers: { ...corsH, 'Content-Type': 'application/json' } }
    );
  }
});
