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

    // ── SUSCRIPCIONES ──────────────────────────────────────────
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      // Donaciones (pago único) → registrar recaudación
      if (s.metadata?.type === 'donation') {
        await supabase.from('donations').upsert({
          stripe_session_id: s.id,
          amount: (s.amount_total ?? 0) / 100,
          currency: s.currency ?? 'eur',
          email: s.customer_details?.email ?? null,
          message: (s.metadata?.message as string) || null,
          status: 'completed',
        }, { onConflict: 'stripe_session_id' });
        console.log('✅ Donación registrada');
        break;
      }
      if (s.mode !== 'subscription') break;
      const rowId = s.client_reference_id || s.metadata?.subscriptionRowId;
      if (!rowId) break;
      await supabase.from('subscriptions').update({
        status: 'active',
        provider: 'stripe',
        provider_sub_id: typeof s.subscription === 'string' ? s.subscription : null,
        updated_at: new Date().toISOString(),
      }).eq('id', rowId);
      console.log(`✅ Suscripción activada (row ${rowId})`);
      break;
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      const subId = typeof inv.subscription === 'string' ? inv.subscription : null;
      if (!subId) break;
      const periodEnd = inv.lines?.data?.[0]?.period?.end;
      await supabase.from('subscriptions').update({
        status: 'active',
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
        updated_at: new Date().toISOString(),
      }).eq('provider_sub_id', subId);
      console.log(`✅ Factura pagada — suscripción ${subId} renovada`);
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const subId = typeof inv.subscription === 'string' ? inv.subscription : null;
      if (!subId) break;
      await supabase.from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('provider_sub_id', subId);
      console.log(`⚠️ Pago de suscripción fallido: ${subId}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('provider_sub_id', sub.id);
      console.log(`↩️ Suscripción cancelada: ${sub.id}`);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsH, 'Content-Type': 'application/json' },
  });
});
