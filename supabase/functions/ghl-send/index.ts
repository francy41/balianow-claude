// Supabase Edge Function — ghl-send
// Envía la respuesta del partner por GoHighLevel (Conversations API), al canal
// del contacto (IG/FB/WhatsApp/SMS/Email). La llama el panel del partner.
//
// URL: https://<project>.supabase.co/functions/v1/ghl-send
// Token de la API de GHL por partner en partner_social_tokens (provider='ghl').
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (inyectadas).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Nuestro canal → tipo de mensaje de GHL
const GHL_TYPE: Record<string, string> = {
  instagram: 'IG', facebook: 'FB', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email',
};

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  // 1) Autenticar al que llama (partner dueño o admin)
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'No autenticado' }, 401);

  let inquiryId = '', text = '';
  try { const b = await req.json(); inquiryId = b.inquiry_id; text = (b.text ?? '').trim(); }
  catch { return json({ error: 'Body inválido' }, 400); }
  if (!inquiryId || !text) return json({ error: 'Faltan inquiry_id o text' }, 400);

  // 2) Conversación + permisos
  const { data: inq } = await admin
    .from('partner_inquiries').select('partner_id, channel, contact_handle')
    .eq('id', inquiryId).maybeSingle();
  if (!inq) return json({ error: 'Conversación no encontrada' }, 404);
  if (inq.channel === 'web') return json({ error: 'Los mensajes web no se envían por GHL' }, 400);

  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = prof?.role === 'admin' || prof?.role === 'superadmin';
  if (inq.partner_id !== user.id && !isAdmin) return json({ error: 'Sin permiso' }, 403);

  // 3) Token GHL del partner
  const { data: tok } = await admin
    .from('partner_social_tokens').select('access_token')
    .eq('partner_id', inq.partner_id).eq('provider', 'ghl').maybeSingle();
  if (!tok?.access_token) {
    return json({ error: 'No hay token de GHL configurado para este partner.', delivered: false }, 501);
  }

  // 4) Enviar por la Conversations API de GHL
  const res = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      Version: '2021-04-15',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: GHL_TYPE[inq.channel] ?? 'SMS',
      contactId: inq.contact_handle,
      message: text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('[ghl-send]', detail);
    return json({ error: 'GHL rechazó el envío', detail, delivered: false }, 502);
  }
  return json({ delivered: true });
});
