// Supabase Edge Function — send-email
// Envía correos transaccionales con Resend (bienvenida, aprobaciones, ventas…).
// POST { to, type, data }  →  { sent } | { notConfigured }
//
// Env (supabase secrets set ...):
//   RESEND_API_KEY   = re_...        (de resend.com)
//   EMAIL_FROM       = "BailaNow <hola@bailanow.com>"  (dominio verificado en Resend)
//
// Se llama desde el frontend (invoke) tras registro/aprobación, o desde otras funciones.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('EMAIL_FROM') ?? 'BailaNow <onboarding@resend.dev>';
const APP = 'https://bailanow.com';

const shell = (title: string, body: string) => `
<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:560px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#f97316,#d946ef);padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">BailaNow</h1>
  </div>
  <div style="padding:28px 24px;color:#1f2937;font-size:15px;line-height:1.6">
    <h2 style="font-size:20px;margin:0 0 12px">${title}</h2>
    ${body}
  </div>
  <div style="padding:18px 24px;background:#faf7fb;color:#9ca3af;font-size:12px;text-align:center">
    BailaNow · el ecosistema de la danza latina · <a href="${APP}" style="color:#d946ef">bailanow.com</a>
  </div>
</div>`;

const btn = (href: string, text: string) =>
  `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#d946ef);color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;margin-top:12px">${text}</a>`;

function template(type: string, d: Record<string, any>): { subject: string; html: string } {
  const name = d.name || '';
  switch (type) {
    case 'welcome':
      return { subject: `¡Bienvenido/a a BailaNow, ${name}! 💃`, html: shell(`¡Hola ${name}! 👋`,
        `<p>Gracias por unirte a <b>BailaNow</b>, el ecosistema de la danza latina.</p>
         <p>Descubre eventos, clases, artistas y locales de tu ciudad, o crea tu perfil para conseguir bolos y vender tus servicios.</p>${btn(APP, 'Empezar')}`) };
    case 'creator_approved':
      return { subject: '🎉 ¡Tu solicitud en BailaNow ha sido aprobada!', html: shell('¡Enhorabuena! 🎉',
        `<p>Tu solicitud como creador ha sido <b>aprobada</b>. Ya puedes crear tu perfil y tu panel de control.</p>
         <p>Recibirás reservas, podrás cobrar online, publicar tus cursos y hacer directos.</p>${btn(`${APP}/auth`, 'Crear mi perfil')}`) };
    case 'partner_approved':
      return { subject: '🌎 ¡Ya eres Partner de BailaNow!', html: shell('¡Bienvenido/a al programa Partner! 🌎',
        `<p>Tu solicitud de Partner de ciudad ha sido aprobada. Ya puedes gestionar los eventos de tu zona y ganar comisiones.</p>${btn(`${APP}/partner`, 'Ir a mi panel')}`) };
    case 'booking':
      return { subject: '📅 Reserva confirmada · BailaNow', html: shell('Reserva confirmada ✅',
        `<p>${d.detail || 'Tu reserva se ha confirmado correctamente.'}</p>${btn(`${APP}/dashboard`, 'Ver mis reservas')}`) };
    case 'sale':
      return { subject: '💸 ¡Nueva venta en BailaNow!', html: shell('¡Has recibido un pago! 💸',
        `<p>${d.detail || 'Se ha registrado una nueva venta en tu cuenta.'}</p>${btn(`${APP}/dashboard`, 'Ver mis ganancias')}`) };
    default:
      // Sin contenido libre del usuario: evita usar esta función como relay de phishing.
      return { subject: 'BailaNow', html: shell('BailaNow', '<p>Tienes una novedad en BailaNow.</p>' + btn(APP, 'Abrir BailaNow')) };
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  const rl = checkRateLimit(req, { max: 20, windowMs: 60_000, keyPrefix: 'email' });
  if (!rl.ok) return rl.response;
  if (!RESEND_KEY) return json({ notConfigured: true });

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }
  const to = String(body.to ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'Email destino no válido' }, 400);

  const { subject, html } = template(String(body.type ?? 'generic'), body.data || {});
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) { console.error('[send-email]', await res.text()); return json({ error: 'No se pudo enviar' }, 502); }
  return json({ sent: true });
});
