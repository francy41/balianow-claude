// Supabase Edge Function — ghl-inbound
// Recibe los mensajes entrantes de GoHighLevel (inbox unificado: IG/FB/WhatsApp/
// SMS/Email) y los deposita en la bandeja del partner (partner_inquiries).
//
// URL: https://<project>.supabase.co/functions/v1/ghl-inbound?key=<GHL_WEBHOOK_SECRET>
// En GHL: Workflow con trigger "Customer Replied" → acción "Webhook" a esta URL.
//
// Env (supabase secrets set ...):
//   GHL_WEBHOOK_SECRET        → texto secreto; debe coincidir con el ?key= de la URL
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY → inyectadas por Supabase
//
// Desplegar sin JWT (GHL no manda el JWT de Supabase):
//   supabase functions deploy ghl-inbound --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);
const SECRET = Deno.env.get('GHL_WEBHOOK_SECRET') ?? '';

// GHL manda el canal como SMS/Email/FB/IG/WhatsApp/GMB/Live_Chat… → lo normalizamos.
function normChannel(raw: string): string {
  const t = (raw || '').toLowerCase();
  if (t.includes('insta') || t === 'ig') return 'instagram';
  if (t.includes('face') || t === 'fb' || t.includes('messenger')) return 'facebook';
  if (t.includes('whats') || t === 'wa') return 'whatsapp';
  if (t.includes('tiktok')) return 'tiktok';
  return t || 'web';   // sms/email/otros → estilo genérico en la UI
}

// Toma el primer campo no vacío de una lista de posibles nombres.
function pick(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), obj);
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return '';
}

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  // fail-closed: exige el secreto siempre (si no está configurado, rechaza).
  if (!SECRET || url.searchParams.get('key') !== SECRET) return new Response('Forbidden', { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }

  // GHL puede envolver los datos en customData/message/contact; sé tolerante.
  const locationId = pick(body, ['locationId', 'location_id', 'location.id', 'customData.locationId']);
  const text = pick(body, ['message.body', 'body', 'messageBody', 'message', 'customData.message', 'text']);
  const contactId = pick(body, ['contactId', 'contact_id', 'contact.id', 'customData.contactId']);
  const channel = normChannel(pick(body, ['messageType', 'message.type', 'type', 'channel', 'customData.channel']));
  const contactName = pick(body, ['full_name', 'fullName', 'contactName', 'contact.name', 'name'])
    || [pick(body, ['first_name', 'firstName', 'contact.firstName']), pick(body, ['last_name', 'lastName', 'contact.lastName'])].filter(Boolean).join(' ');
  const contactRef = contactId || pick(body, ['phone', 'contact.phone', 'email', 'contact.email']) || 'ghl';

  if (!locationId || !text) {
    console.warn('[ghl-inbound] falta locationId o texto');
    return new Response('IGNORED', { status: 200 });   // 200 para que GHL no reintente
  }

  // ¿De qué partner es esta location de GHL?
  const { data: partner } = await supabase
    .from('partners').select('user_id').eq('ghl_location_id', locationId).maybeSingle();
  if (!partner?.user_id) {
    console.warn(`[ghl-inbound] sin partner para location ${locationId}`);
    return new Response('NO_PARTNER', { status: 200 });
  }

  const now = new Date().toISOString();
  // ¿Conversación abierta con este contacto por este canal?
  const { data: existing } = await supabase
    .from('partner_inquiries').select('id')
    .eq('partner_id', partner.user_id).eq('channel', channel).eq('contact_handle', contactRef)
    .neq('status', 'closed').order('last_activity_at', { ascending: false }).limit(1).maybeSingle();

  if (existing?.id) {
    await supabase.from('partner_inquiry_messages').insert({ inquiry_id: existing.id, from_partner: false, text });
    await supabase.from('partner_inquiries').update({ status: 'new', last_activity_at: now }).eq('id', existing.id);
  } else {
    await supabase.from('partner_inquiries').insert({
      partner_id: partner.user_id, channel,
      contact_name: contactName || null, contact_handle: contactRef,
      message: text, status: 'new', last_activity_at: now,
    });
  }

  return new Response('EVENT_RECEIVED', { status: 200 });
});
