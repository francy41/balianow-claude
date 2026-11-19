// Supabase Edge Function — Deno runtime
// POST /functions/v1/create-payment-intent
//
// Body: {
//   amount: number,          // total en euros (ej: 89.00)
//   currency: string,        // 'eur'
//   items: CartItem[],
//   userId: string,
//   metadata?: Record<string, string>
// }
//
// Returns: { clientSecret, paymentIntentId, sellerBreakdown, platformFee }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const PLATFORM_FEE_RATE = 0.15;
// Min 0.50€, max 9999€ to avoid abuse
const MIN_AMOUNT = 0.50;
const MAX_AMOUNT = 9999;

serve(async (req) => {
  const corsH = getCorsHeaders(req);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsH });
  }

  // ── RATE LIMIT ─────────────────────────────────────────────
  // Max 10 payment intent creations per IP per minute
  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'pi' });
  if (!rl.ok) return rl.response;

  // ── AUTH CHECK ─────────────────────────────────────────────
  // Verify the caller has a valid Supabase session
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
  let body: { amount?: unknown; currency?: unknown; items?: unknown; userId?: unknown; metadata?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const { currency = 'eur', items, userId, metadata = {} } = body;

  // El importe que llegue en la petición se IGNORA. Antes se cobraba
  // `body.amount` tal cual, dentro de un rango: bastaba con abrir las
  // herramientas del navegador para pagar 0,50 € por un servicio de 500 €.
  // El total se calcula más abajo con los precios de la tabla `services`.

  // Validate currency
  const ALLOWED_CURRENCIES = ['eur', 'usd', 'gbp'];
  if (typeof currency !== 'string' || !ALLOWED_CURRENCIES.includes(currency.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Moneda no soportada' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // Validate items
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return new Response(JSON.stringify({ error: 'Lista de artículos inválida' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // Validate userId matches authenticated user (prevent IDOR)
  if (typeof userId !== 'string' || userId !== user.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // ── BUSINESS LOGIC ─────────────────────────────────────────
  try {
    // El cliente dice QUÉ compra; cuánto cuesta y de quién es lo dice la base
    // de datos. También el vendedor sale de aquí: si viniera en la petición,
    // se podría desviar la comisión a otra cuenta.
    const serviceIds = items.map((i: any) => (i && typeof i.serviceId === 'string' ? i.serviceId : null));
    if (serviceIds.some((id: string | null) => !id)) {
      return new Response(JSON.stringify({ error: 'Artículo inválido en el carrito' }), {
        status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: servicios } = await admin
      .from('services')
      .select('id, title, name, price, artist_id, owner_id, user_id')
      .in('id', serviceIds as string[]);

    const porId = new Map((servicios ?? []).map((s: any) => [String(s.id), s]));
    if (porId.size !== new Set(serviceIds).size) {
      return new Response(JSON.stringify({ error: 'Algún servicio del carrito ya no existe' }), {
        status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    const sellerMap = new Map<string, number>();
    let totalCents = 0;
    for (const id of serviceIds as string[]) {
      const s = porId.get(id);
      const precio = Number(s.price);
      if (!Number.isFinite(precio) || precio <= 0) {
        return new Response(JSON.stringify({ error: 'Servicio sin precio válido' }), {
          status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
        });
      }
      const sid = String(s.artist_id ?? s.owner_id ?? s.user_id ?? '');
      if (!sid) {
        return new Response(JSON.stringify({ error: 'Servicio sin vendedor asignado' }), {
          status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
        });
      }
      const itemTotal = Math.round(precio * 100);
      totalCents += itemTotal;
      sellerMap.set(sid, (sellerMap.get(sid) ?? 0) + itemTotal);
    }

    const amount = totalCents / 100;
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return new Response(JSON.stringify({ error: 'Importe fuera de rango permitido' }), {
        status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    const sellerBreakdown = Array.from(sellerMap.entries()).map(([sellerId, gross]) => ({
      sellerId,
      gross,
      commission: Math.round(gross * PLATFORM_FEE_RATE),
      net: Math.round(gross * (1 - PLATFORM_FEE_RATE)),
    }));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        platform: 'bailanow',
        sellerCount: String(sellerBreakdown.length),
        sellerBreakdown: JSON.stringify(sellerBreakdown.map(s => ({
          id: s.sellerId, gross: s.gross, net: s.net
        }))),
        ...(typeof metadata === 'object' && metadata !== null ? metadata as Record<string, string> : {}),
      },
      description: `BailaNow — ${items.length} servicio(s)`,
      statement_descriptor_suffix: 'BAILANOW',
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        sellerBreakdown,
        amount: totalCents,
        platformFee: Math.round(totalCents * PLATFORM_FEE_RATE),
      }),
      { headers: { ...corsH, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    // Log full error server-side, never expose to client
    console.error('[create-payment-intent] Stripe error:', err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: 'Error al procesar el pago. Inténtalo de nuevo.' }),
      { status: 500, headers: { ...corsH, 'Content-Type': 'application/json' } }
    );
  }
});
