// Supabase Edge Function — Deno runtime
// POST /functions/v1/create-payment-intent
//
// Body: {
//   amount: number,          // total en céntimos (ej: 8900 = 89€)
//   currency: string,        // 'eur'
//   items: CartItem[],       // servicios del carrito
//   userId: string,
//   metadata?: Record<string, string>
// }
//
// Returns: { clientSecret: string, paymentIntentId: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const PLATFORM_FEE_RATE = 0.15; // 15%

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'eur', items, userId, metadata = {} } = await req.json();

    if (!amount || amount < 50) {
      return new Response(JSON.stringify({ error: 'Importe mínimo 0.50€' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular distribución por vendedor
    const sellerMap = new Map<string, number>();
    for (const item of items) {
      const itemTotal = Math.round((item.price + (item.extrasTotal || 0)) * 100);
      sellerMap.set(item.sellerId, (sellerMap.get(item.sellerId) ?? 0) + itemTotal);
    }

    const sellerBreakdown = Array.from(sellerMap.entries()).map(([sellerId, gross]) => ({
      sellerId,
      gross,
      commission: Math.round(gross * PLATFORM_FEE_RATE),
      net: Math.round(gross * (1 - PLATFORM_FEE_RATE)),
    }));

    // Crear PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convertir a céntimos
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        platform: 'bailanow',
        sellerCount: String(sellerBreakdown.length),
        sellerBreakdown: JSON.stringify(sellerBreakdown.map(s => ({
          id: s.sellerId, gross: s.gross, net: s.net
        }))),
        ...metadata,
      },
      description: `BailaNow — ${items.length} servicio(s) de promoción`,
      statement_descriptor_suffix: 'BAILANOW',
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        sellerBreakdown,
        platformFee: Math.round(amount * 100 * PLATFORM_FEE_RATE),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
