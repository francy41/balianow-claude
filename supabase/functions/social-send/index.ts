// Supabase Edge Function — social-send
// Envía la respuesta del partner de vuelta a la red social del contacto
// (Instagram / Facebook Messenger / WhatsApp) usando la Graph API de Meta.
//
// La llama el panel del partner al responder una conversación que NO es 'web'.
// URL: https://<project>.supabase.co/functions/v1/social-send
//
// Requiere que en partner_social_tokens exista el token del partner para ese canal.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (inyectadas).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const GRAPH = 'https://graph.facebook.com/v19.0';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function sendMeta(channel: string, token: string, recipient: string, text: string, phoneNumberId?: string) {
  if (channel === 'whatsapp') {
    if (!phoneNumberId) throw new Error('phone_number_id no configurado para WhatsApp');
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: text } }),
    });
    return res.ok ? null : `WhatsApp: ${await res.text()}`;
  }
  // Instagram y Facebook Messenger comparten el endpoint me/messages
  const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipient }, message: { text }, messaging_type: 'RESPONSE' }),
  });
  return res.ok ? null : `${channel}: ${await res.text()}`;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  // 1) Autenticar al que llama (debe ser el partner dueño o un admin)
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'No autenticado' }, 401);

  let inquiryId = '', text = '';
  try { const b = await req.json(); inquiryId = b.inquiry_id; text = (b.text ?? '').trim(); }
  catch { return json({ error: 'Body inválido' }, 400); }
  if (!inquiryId || !text) return json({ error: 'Faltan inquiry_id o text' }, 400);

  // 2) Cargar la conversación (con service_role) y comprobar permisos
  const { data: inq } = await admin
    .from('partner_inquiries')
    .select('id, partner_id, channel, contact_handle, status')
    .eq('id', inquiryId)
    .maybeSingle();
  if (!inq) return json({ error: 'Conversación no encontrada' }, 404);

  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = prof?.role === 'admin' || prof?.role === 'superadmin';
  if (inq.partner_id !== user.id && !isAdmin) return json({ error: 'Sin permiso' }, 403);

  if (inq.channel === 'web') return json({ error: 'Los mensajes web no se envían por esta vía' }, 400);

  // 3) Token del partner para ese canal
  const { data: tok } = await admin
    .from('partner_social_tokens')
    .select('access_token, phone_number_id')
    .eq('partner_id', inq.partner_id)
    .eq('provider', inq.channel)
    .maybeSingle();
  if (!tok?.access_token) {
    return json({ error: `No hay token configurado para ${inq.channel}. Conéctalo desde el panel de administración.`, delivered: false }, 501);
  }

  // 4) Enviar por la red social
  try {
    const err = await sendMeta(inq.channel, tok.access_token, inq.contact_handle ?? '', text, tok.phone_number_id ?? undefined);
    if (err) { console.error('[social-send]', err); return json({ error: 'La red social rechazó el envío', detail: err, delivered: false }, 502); }
  } catch (e) {
    console.error('[social-send]', e);
    return json({ error: String(e), delivered: false }, 502);
  }

  return json({ delivered: true });
});
