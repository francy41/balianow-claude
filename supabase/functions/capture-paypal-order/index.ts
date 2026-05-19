// Supabase Edge Function — PayPal Capture Order
// POST /functions/v1/capture-paypal-order
// Body: { orderId: string, userId: string, sellerBreakdown: [...] }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PAYPAL_BASE = Deno.env.get('PAYPAL_ENV') === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getPayPalToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  return (await res.json()).access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { orderId, userId, sellerBreakdown } = await req.json();
    const token = await getPayPalToken();

    // Capturar el pago
    const capture = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const captureData = await capture.json();

    if (!capture.ok || captureData.status !== 'COMPLETED') {
      throw new Error(captureData.message || 'Error al capturar pago PayPal');
    }

    const purchaseUnit = captureData.purchase_units?.[0];
    const captureId = purchaseUnit?.payments?.captures?.[0]?.id;
    const amount = parseFloat(purchaseUnit?.payments?.captures?.[0]?.amount?.value ?? '0');

    // Registrar en Supabase
    await supabase.from('transactions').insert({
      id: captureId,
      user_id: userId,
      amount,
      currency: 'eur',
      status: 'completed',
      provider: 'paypal',
      provider_id: orderId,
      seller_breakdown: sellerBreakdown,
      created_at: new Date().toISOString(),
    });

    // Distribuir pagos a vendedores (actualizar wallets)
    for (const seller of sellerBreakdown) {
      await supabase.rpc('add_to_wallet', {
        p_user_id: seller.sellerId,
        p_amount: seller.net,
      });
    }

    return new Response(
      JSON.stringify({ success: true, captureId, status: captureData.status, sellerBreakdown }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('capture-paypal-order error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
