// BailaNow - Edge Function: send-admin-invite
// Sends an invitation email to a new admin with a secure token link.
// Only callable by users with role 'admin' or 'superadmin'.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is admin/superadmin
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS });
    }

    const { data: caller, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single();

    if (profileErr || !caller || !['admin', 'superadmin'].includes(caller.role)) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: CORS });
    }

    const { email, role = 'admin' } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400, headers: CORS });
    }
    if (!['admin', 'superadmin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Rol inválido' }), { status: 400, headers: CORS });
    }
    // Only superadmin can invite other superadmins
    if (role === 'superadmin' && caller.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Solo superadmin puede invitar superadmins' }), { status: 403, headers: CORS });
    }

    // Check for existing unused invitation
    const { data: existing } = await supabaseAdmin
      .from('admin_invitations')
      .select('id, expires_at')
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una invitación pendiente para este email' }),
        { status: 409, headers: CORS }
      );
    }

    // Create invitation record
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('admin_invitations')
      .insert({ email, invited_by: user.id, role })
      .select()
      .single();

    if (invErr) throw invErr;

    const APP_URL = Deno.env.get('APP_URL') ?? 'https://bailanow.com';
    const inviteUrl = `${APP_URL}/aceptar-invitacion?token=${invitation.token}`;
    const roleLabel = role === 'superadmin' ? 'Super Administrador' : 'Administrador';

    // Send email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY not configured');

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación Admin - BailaNow</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#EC4899,#F97316);padding:36px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">💃 BailaNow</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">La plataforma del mundo latino</p>
    </div>
    <!-- Body -->
    <div style="padding:40px 32px;">
      <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">🎉 ¡Has sido invitado!</h2>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 8px;">
        <strong style="color:#111827;">${caller.name}</strong> te ha invitado a unirte como
        <strong style="color:#EC4899;">${roleLabel}</strong> de BailaNow.
      </p>
      <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 28px;">
        Tendrás acceso al panel de control de la plataforma para gestionar usuarios, artistas, eventos y mucho más.
      </p>
      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${inviteUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#EC4899,#F97316);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
          ✅ Aceptar invitación
        </a>
      </div>
      <!-- Info box -->
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;">
          ⏰ Este enlace caduca en <strong>48 horas</strong>.<br>
          Si no esperabas este correo, puedes ignorarlo de forma segura.
        </p>
      </div>
      <!-- Link fallback -->
      <p style="color:#9CA3AF;font-size:12px;margin:0;">
        Si el botón no funciona, copia este enlace en tu navegador:<br>
        <a href="${inviteUrl}" style="color:#EC4899;word-break:break-all;">${inviteUrl}</a>
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">
        © 2026 BailaNow · La red del mundo latino
      </p>
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BailaNow Admin <noreply@bailanow.com>',
        to: email,
        subject: `🎉 Invitación como ${roleLabel} - BailaNow`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const emailErr = await emailRes.json();
      // Roll back invitation if email failed
      await supabaseAdmin.from('admin_invitations').delete().eq('id', invitation.id);
      throw new Error(`Email error: ${JSON.stringify(emailErr)}`);
    }

    return new Response(
      JSON.stringify({ success: true, invitationId: invitation.id, email }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('send-admin-invite error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Error interno' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
