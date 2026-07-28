// Supabase Edge Function — social-webhook
// Recibe los mensajes de Instagram / Facebook Messenger / WhatsApp (Meta) y los
// deposita en la bandeja del partner (partner_inquiries / partner_inquiry_messages).
//
// URL pública: https://<project>.supabase.co/functions/v1/social-webhook
// Configúrala como "Callback URL" en tu app de Meta (Webhooks).
//
// Variables de entorno necesarias (supabase secrets set ...):
//   META_VERIFY_TOKEN         → el mismo texto que pongas en Meta al verificar
//   META_APP_SECRET           → App Secret de tu app de Meta (para validar la firma)
//   SUPABASE_URL              → (lo inyecta Supabase)
//   SUPABASE_SERVICE_ROLE_KEY → (lo inyecta Supabase)
//
// IMPORTANTE: despliega con --no-verify-jwt (Meta no envía el JWT de Supabase):
//   supabase functions deploy social-webhook --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') ?? '';
const APP_SECRET = Deno.env.get('META_APP_SECRET') ?? '';

// ── Validación de firma X-Hub-Signature-256 (HMAC SHA-256 con el App Secret) ──
async function validSignature(payload: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET) return false;             // fail-closed: sin secreto, se rechaza (seguridad)
  if (!header) return false;
  const expected = header.replace('sha256=', '').trim();
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const got = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // comparación en tiempo constante
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

interface Inbound {
  channel: string;          // instagram | facebook | whatsapp
  accountId: string;        // page_id / ig_id / phone_number_id (para localizar al partner)
  contactHandle: string;    // id o teléfono del que escribe
  contactName?: string;
  text: string;
}

// ── Convierte el payload de Meta (los 3 formatos) en mensajes normalizados ──
function parse(body: any): Inbound[] {
  const out: Inbound[] = [];
  const object = body?.object;

  // Facebook Messenger ('page') e Instagram ('instagram') comparten estructura
  if (object === 'page' || object === 'instagram') {
    const channel = object === 'instagram' ? 'instagram' : 'facebook';
    for (const entry of body.entry ?? []) {
      for (const m of entry.messaging ?? []) {
        const text = m?.message?.text;
        if (!text || m?.message?.is_echo) continue;   // ignora ecos/eventos sin texto
        out.push({
          channel,
          accountId: String(m?.recipient?.id ?? entry.id ?? ''),
          contactHandle: String(m?.sender?.id ?? ''),
          text,
        });
      }
    }
  }

  // WhatsApp Cloud API
  if (object === 'whatsapp_business_account') {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneNumberId = value?.metadata?.phone_number_id ?? '';
        const nameByWa: Record<string, string> = {};
        for (const c of value.contacts ?? []) nameByWa[c?.wa_id] = c?.profile?.name ?? '';
        for (const msg of value.messages ?? []) {
          const text = msg?.text?.body;
          if (!text) continue;
          out.push({
            channel: 'whatsapp',
            accountId: String(phoneNumberId),
            contactHandle: String(msg?.from ?? ''),
            contactName: nameByWa[msg?.from] || undefined,
            text,
          });
        }
      }
    }
  }

  return out;
}

// ── Deposita un mensaje entrante en la bandeja del partner ──
async function deliver(m: Inbound) {
  // 1) ¿De qué partner es esta cuenta?
  const { data: conn } = await supabase
    .from('partner_social_connections')
    .select('partner_id')
    .eq('account_id', m.accountId)
    .eq('connected', true)
    .maybeSingle();
  if (!conn?.partner_id) {
    console.warn(`[social-webhook] sin partner para account_id=${m.accountId} (${m.channel})`);
    return;
  }
  const partnerId = conn.partner_id;
  const now = new Date().toISOString();

  // 2) ¿Existe una conversación abierta con este contacto por este canal?
  const { data: existing } = await supabase
    .from('partner_inquiries')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('channel', m.channel)
    .eq('contact_handle', m.contactHandle)
    .neq('status', 'closed')
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // Añade el mensaje al hilo y reactiva la conversación
    await supabase.from('partner_inquiry_messages').insert({
      inquiry_id: existing.id, from_partner: false, text: m.text,
    });
    await supabase.from('partner_inquiries')
      .update({ status: 'new', last_activity_at: now })
      .eq('id', existing.id);
  } else {
    // Nueva conversación
    await supabase.from('partner_inquiries').insert({
      partner_id: partnerId,
      channel: m.channel,
      contact_name: m.contactName ?? null,
      contact_handle: m.contactHandle,
      message: m.text,
      status: 'new',
      last_activity_at: now,
    });
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  // ── Verificación del webhook (Meta hace un GET al configurarlo) ──
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) {
    console.error('[social-webhook] firma inválida');
    return new Response('Invalid signature', { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }

  try {
    const messages = parse(body);
    // Procesa en serie (el volumen de un webhook es pequeño) para no perder ninguno
    for (const m of messages) {
      if (m.accountId && m.contactHandle && m.text) await deliver(m);
    }
  } catch (err) {
    console.error('[social-webhook] error procesando', err);
    // Devolvemos 200 igualmente: Meta reintenta en 5xx y no queremos bucles.
  }

  // Meta espera 200 rápido para no reintentar
  return new Response('EVENT_RECEIVED', { status: 200 });
});
