// Supabase Edge Function — Stripe Webhook
// Escucha eventos de Stripe y registra transacciones en Supabase
// Configura en: https://dashboard.stripe.com/webhooks
// URL: https://<project>.supabase.co/functions/v1/stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const corsH = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  // Stripe webhooks come from Stripe servers, not browsers — no need for CORS,
  // but we still validate the signature before processing anything.
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    // Only log the type, not the full error (may contain key material)
    console.error('[stripe-webhook] Signature verification failed');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { userId, sellerBreakdown } = pi.metadata;

      // Registrar transacción en Supabase
      await supabase.from('transactions').insert({
        id: pi.id,
        user_id: userId,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: 'completed',
        provider: 'stripe',
        provider_id: pi.id,
        seller_breakdown: JSON.parse(sellerBreakdown || '[]'),
        created_at: new Date().toISOString(),
      });

      // Notificar a cada vendedor (actualizar wallet)
      const breakdown = JSON.parse(sellerBreakdown || '[]');
      for (const seller of breakdown) {
        await supabase.rpc('add_to_wallet', {
          p_user_id: seller.id,
          p_amount: seller.net / 100,
        });
      }

      console.log(`✅ Pago completado: ${pi.id} — ${pi.amount / 100}€`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Pago fallido: ${pi.id}`);
      await supabase.from('transactions').insert({
        id: pi.id,
        user_id: pi.metadata.userId,
        amount: pi.amount / 100,
        status: 'failed',
        provider: 'stripe',
        provider_id: pi.id,
        created_at: new Date().toISOString(),
      });
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      console.log(`↩️ Reembolso: ${charge.id}`);
      await supabase.from('transactions')
        .update({ status: 'refunded' })
        .eq('provider_id', charge.payment_intent);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsH, 'Content-Type': 'application/json' },
  });
});
