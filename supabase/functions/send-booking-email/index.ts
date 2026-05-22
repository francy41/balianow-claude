// Supabase Edge Function: send-booking-email
// Envía email transaccional via Resend cuando se confirma una reserva
// POST { booking_id, student_email, student_name, class_title, class_date, jitsi_url, price }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = 'BailaNow <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { student_email, student_name, class_title, class_date, jitsi_url, price, vendor_name } = await req.json();

    if (!student_email || !class_title || !jitsi_url) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Reserva confirmada</title></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#fff">
  <div style="max-width:600px;margin:0 auto;background:#1a1a2e;border-radius:24px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#ec4899,#a855f7);padding:32px;text-align:center">
      <h1 style="margin:0;color:white;font-size:32px;font-weight:900">💃 BailaNow</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px">Tu reserva está confirmada</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#fff;margin:0 0 12px;font-size:24px">¡Hola ${student_name || 'estudiante'}! 👋</h2>
      <p style="color:#d4d4d4;line-height:1.6;margin:0 0 24px">Tu reserva para la clase está confirmada. Aquí los detalles:</p>

      <div style="background:#0a0a0a;border:1px solid #2a2a4a;border-radius:16px;padding:20px;margin-bottom:24px">
        <p style="color:#ec4899;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px">Clase</p>
        <p style="color:#fff;font-size:18px;font-weight:900;margin:0 0 16px">${class_title}</p>

        ${vendor_name ? `<p style="color:#a3a3a3;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px">Profesor</p><p style="color:#fff;font-size:14px;margin:0 0 16px">${vendor_name}</p>` : ''}

        <p style="color:#a3a3a3;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px">Fecha</p>
        <p style="color:#fff;font-size:14px;margin:0 0 16px">📅 ${class_date || 'Por confirmar'}</p>

        <p style="color:#a3a3a3;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px">Importe pagado</p>
        <p style="color:#10b981;font-size:20px;font-weight:900;margin:0">€${price}</p>
      </div>

      <a href="${jitsi_url}" style="display:block;background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-align:center;padding:16px;border-radius:16px;text-decoration:none;font-weight:900;font-size:16px;margin-bottom:16px">
        🎥 Entrar a la sala en vivo
      </a>

      <p style="color:#a3a3a3;font-size:12px;text-align:center;line-height:1.5">
        Podrás acceder a la sala 15 minutos antes de la clase.<br/>
        Recomendamos conectarte unos minutos antes para probar cámara y micrófono.
      </p>

      <div style="border-top:1px solid #2a2a4a;margin:24px 0;padding-top:16px">
        <p style="color:#6b7280;font-size:11px;text-align:center;margin:0">
          ¿Problemas? Responde a este email o entra al chat en BailaNow.<br/>
          Cancela hasta 24h antes para reembolso completo.
        </p>
      </div>
    </div>
    <div style="background:#0a0a0a;padding:16px;text-align:center">
      <p style="color:#6b7280;font-size:10px;margin:0">© BailaNow · El ecosistema latino de baile</p>
    </div>
  </div>
</body></html>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [student_email],
        subject: `✅ Reserva confirmada: ${class_title}`,
        html,
      }),
    });

    const result = await resendRes.json();
    return new Response(JSON.stringify(result), {
      status: resendRes.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
