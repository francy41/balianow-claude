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

// Nada de HTML venido de fuera dentro de un correo.
const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').slice(0, 120);

// Destinatarios de los avisos internos: quien tenga admin o superadmin en la
// base de datos. Así, al añadir o quitar un administrador, los avisos siguen
// solos — no hay ninguna dirección escrita a mano en el código.
async function resolveAdmins(): Promise<string[]> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) return [];
  try {
    const r = await fetch(
      `${url}/rest/v1/profiles?select=email&role=in.(admin,superadmin)`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return (rows as { email?: string }[])
      .map(x => String(x.email ?? '').trim())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  } catch { return []; }
}

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
    case 'claim_approved':
      return { subject: `✅ Tu reclamación de "${d.targetName || 'perfil'}" fue aprobada`, html: shell('¡Perfil verificado! ✅',
        `<p>Tu solicitud para reclamar <b>${d.targetName || 'el perfil'}</b> ha sido aprobada. Ya puedes editarlo, recibir reservas y gestionarlo desde tu panel.</p>${btn(`${APP}/dashboard`, 'Ir a mi panel')}`) };
    case 'claim_rejected':
      return { subject: `Tu reclamación de "${d.targetName || 'perfil'}" no fue aprobada`, html: shell('Solicitud no aprobada',
        `<p>Tu solicitud para reclamar <b>${d.targetName || 'el perfil'}</b> no ha sido aprobada${d.reason ? `: <br><i>${d.reason}</i>` : '.'}</p>
         <p>Si crees que es un error o quieres aportar más información, responde a este correo.</p>`) };
    case 'claim_needs_info':
      return { subject: `Necesitamos más información sobre tu reclamación de "${d.targetName || 'perfil'}"`, html: shell('Nos falta un dato ✍️',
        `<p>Estamos revisando tu solicitud para reclamar <b>${d.targetName || 'el perfil'}</b>, pero necesitamos más información antes de continuar:</p>
         <p style="background:#faf7fb;padding:12px 14px;border-radius:10px"><i>${d.reason || 'Por favor contáctanos con más detalles.'}</i></p>
         <p>Responde a este correo con la información solicitada.</p>`) };
    // ── Avisos internos al equipo. El destinatario NO llega en la petición:
    //    se resuelve en el servidor (ver resolveAdmins), así el navegador nunca
    //    ve las direcciones del equipo. El detalle va escapado.
    case 'admin_claim':
      return { subject: '🔔 Nueva reclamación de perfil · BailaNow', html: shell('Hay una reclamación esperando',
        `<p>Alguien ha solicitado reclamar <b>${esc(d.targetName) || 'un perfil'}</b>.</p>
         <p>Revísala y apruébala o recházala desde el panel.</p>${btn(`${APP}/admin/reclamaciones`, 'Revisar reclamación')}`) };
    case 'admin_partner':
      return { subject: '🔔 Nueva solicitud de partner · BailaNow', html: shell('Nueva solicitud de partner',
        `<p>Se ha recibido una solicitud para el programa de partners${d.city ? ` en <b>${esc(d.city)}</b>` : ''}.</p>${btn(`${APP}/admin/partner`, 'Revisar solicitud')}`) };
    case 'admin_creator':
      return { subject: '🔔 Nueva solicitud de creador · BailaNow', html: shell('Nueva solicitud de creador',
        `<p>Se ha recibido una solicitud de creador${d.name ? ` de <b>${esc(d.name)}</b>` : ''}.</p>${btn(`${APP}/admin/solicitudes-creador`, 'Revisar solicitud')}`) };
    case 'admin_signup':
      return { subject: `👤 Alta nueva en BailaNow${d.role ? ` · ${esc(d.role)}` : ''}`, html: shell('Se ha registrado alguien',
        `<p><b>${esc(d.name) || 'Un usuario'}</b> ha creado una cuenta${d.role ? ` como <b>${esc(d.role)}</b>` : ''}${d.city ? ` en ${esc(d.city)}` : ''}.</p>
         <p style="color:#6b7280;font-size:13px">Si estos avisos te resultan demasiados, se pueden agrupar en un resumen diario.</p>${btn(`${APP}/admin/usuarios`, 'Ver usuarios')}`) };
    case 'admin_dispute':
      return { subject: '⚠️ Disputa abierta · BailaNow', html: shell('Se ha abierto una disputa',
        `<p>Hay una disputa esperando mediación. Conviene atenderla pronto: hay dinero retenido de por medio.</p>${btn(`${APP}/admin/disputas`, 'Ver disputa')}`) };

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

  const type = String(body.type ?? 'generic');
  const esAviso = type.startsWith('admin_');

  // En los avisos internos el destinatario lo pone el servidor. Si viniera en la
  // petición, cualquiera podría usar esta función para mandar correos a quien
  // quisiera con la imagen de BailaNow.
  let destinatarios: string[];
  if (esAviso) {
    destinatarios = await resolveAdmins();
    if (destinatarios.length === 0) return json({ sent: false, sinDestinatarios: true });
  } else {
    const to = String(body.to ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'Email destino no válido' }, 400);
    destinatarios = [to];
  }

  const { subject, html } = template(type, body.data || {});
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: destinatarios, subject, html }),
  });
  if (!res.ok) { console.error('[send-email]', await res.text()); return json({ error: 'No se pudo enviar' }, 502); }
  return json({ sent: true, destinatarios: destinatarios.length });
});
