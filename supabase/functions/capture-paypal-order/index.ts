// Supabase Edge Function — PayPal Capture Order
// POST /functions/v1/capture-paypal-order
// Body: { orderId: string, userId: string, sellerBreakdown: [...] }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const PAYPAL_BASE = Deno.env.get('PAYPAL_ENV') === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Service role for writing transactions after verified capture
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getPayPalToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
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
  // Captures are more sensitive — limit to 5/min per IP
  const rl = checkRateLimit(req, { max: 5, windowMs: 60_000, keyPrefix: 'cap' });
  if (!rl.ok) return rl.response;

  // ── AUTH CHECK ─────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // ── INPUT VALIDATION ───────────────────────────────────────
  let body: { orderId?: unknown; userId?: unknown; sellerBreakdown?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const { orderId, userId, sellerBreakdown } = body;

  // Validate orderId format (PayPal order IDs are alphanumeric)
  if (typeof orderId !== 'string' || !/^[A-Z0-9]{8,20}$/.test(orderId)) {
    return new Response(JSON.stringify({ error: 'ID de orden inválido' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // Ensure userId matches authenticated user (prevent IDOR)
  if (typeof userId !== 'string' || userId !== user.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(sellerBreakdown)) {
    return new Response(JSON.stringify({ error: 'Datos de distribución inválidos' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // ── CAPTURE ────────────────────────────────────────────────
  try {
    const token = await getPayPalToken();

    const capture = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const captureData = await capture.json();

    if (!capture.ok || captureData.status !== 'COMPLETED') {
      console.error('[capture-paypal-order] Capture failed:', captureData.name);
      return new Response(
        JSON.stringify({ error: 'El pago no pudo ser completado. Inténtalo de nuevo.' }),
        { status: 400, headers: { ...corsH, 'Content-Type': 'application/json' } }
      );
    }

    const purchaseUnit = captureData.purchase_units?.[0];
    const captureId = purchaseUnit?.payments?.captures?.[0]?.id;
    const amount = parseFloat(purchaseUnit?.payments?.captures?.[0]?.amount?.value ?? '0');

    // Verify the custom_id matches our user (set during order creation)
    if (purchaseUnit?.custom_id && purchaseUnit.custom_id !== user.id) {
      console.error('[capture-paypal-order] custom_id mismatch');
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403, headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    // Registrar en Supabase usando service role (operación privilegiada post-captura verificada)
    await supabaseAdmin.from('transactions').insert({
      id: captureId,
      user_id: user.id, // use server-verified user.id, NOT body userId
      amount,
      currency: 'eur',
      status: 'completed',
      provider: 'paypal',
      provider_id: orderId,
      seller_breakdown: sellerBreakdown,
      created_at: new Date().toISOString(),
    });

    // Distribuir pagos a vendedores
    for (const seller of sellerBreakdown) {
      if (typeof seller?.sellerId === 'string' && typeof seller?.net === 'number') {
        await supabaseAdmin.rpc('add_to_wallet', {
          p_user_id: seller.sellerId,
          p_amount: seller.net,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, captureId, status: captureData.status }),
      { headers: { ...corsH, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[capture-paypal-order] Error:', err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: 'Error al completar el pago. Inténtalo de nuevo.' }),
      { status: 500, headers: { ...corsH, 'Content-Type': 'application/json' } }
    );
  }
});
