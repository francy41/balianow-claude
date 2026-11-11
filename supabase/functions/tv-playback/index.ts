// Supabase Edge Function — tv-playback
// Comprueba que quien pide ver una lección tiene derecho a ella y, solo
// entonces, pide a Cloudflare una firma de corta duración para reproducirla.
//
// POST { lesson_id }  →  { token, uid, expires_in } | { locked: true, reason }
//
// Por qué una firma y no la URL del vídeo: con la URL directa, cualquiera abre
// el inspector del navegador, la copia y la reparte. El contenido de pago se
// filtra el primer día. La firma caduca en minutos y se emite por usuario.
//
// Secrets: CF_ACCOUNT_ID, CF_STREAM_TOKEN

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const CF_ACCOUNT = Deno.env.get('CF_ACCOUNT_ID') ?? '';
const CF_TOKEN = Deno.env.get('CF_STREAM_TOKEN') ?? '';

const ORIGENES = ['https://bailanow.com', 'https://www.bailanow.com'];
if (Deno.env.get('SUPABASE_ENV') !== 'production') {
  ORIGENES.push('http://localhost:3000', 'http://localhost:5173');
}
const cors = (req: Request) => ({
  'Access-Control-Allow-Origin': ORIGENES.includes(req.headers.get('origin') ?? '') ? req.headers.get('origin')! : ORIGENES[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

// Vida de la firma. Corta para que compartirla no sirva de nada, pero holgada
// para que no caduque a mitad de una clase larga: el reproductor ya tiene el
// manifiesto cargado y sigue reproduciendo aunque expire.
const VIDA_SEGUNDOS = 7200;

serve(async (req) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });

  if (!CF_ACCOUNT || !CF_TOKEN) return json({ error: 'Cloudflare Stream no está configurado' }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }
  const lessonId = String(body.lesson_id ?? '');
  if (!lessonId) return json({ error: 'Falta lesson_id' }, 400);

  const { data: leccion } = await admin
    .from('tv_lessons')
    .select('id, access, video_uid, video_ready, title_id, tv_titles(status, creator_id)')
    .eq('id', lessonId).maybeSingle();

  if (!leccion) return json({ error: 'Lección no encontrada' }, 404);
  if (!leccion.video_uid) return json({ locked: true, reason: 'sin_video' });

  // Cloudflare tarda en transcodificar. En vez de montar un webhook aparte, se
  // consulta aquí la primera vez que alguien pide la lección: si ya está lista
  // se marca y se sigue. Así el estado se corrige solo, sin tareas de fondo.
  if (!leccion.video_ready) {
    const est = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${leccion.video_uid}`,
      { headers: { Authorization: `Bearer ${CF_TOKEN}` } },
    );
    const e = await est.json();
    const listo = e?.success && e.result?.readyToStream === true;
    if (!listo) return json({ locked: true, reason: 'procesando' });
    await admin.from('tv_lessons').update({
      video_ready: true,
      duration_seconds: Math.round(Number(e.result?.duration) || 0),
    }).eq('id', leccion.id);
  }

  const titulo = Array.isArray(leccion.tv_titles) ? leccion.tv_titles[0] : leccion.tv_titles;

  // Quién pide verlo. Sin sesión solo se sirve el contenido gratuito.
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await asUser.auth.getUser();

  let permitido = leccion.access === 'free';
  let motivo = 'necesita_suscripcion';

  if (!permitido && user) {
    const { data: perfil } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const esAdmin = perfil?.role === 'admin' || perfil?.role === 'superadmin';
    // El creador siempre puede ver lo suyo, publicado o no.
    const esDueno = titulo?.creator_id === user.id;
    if (esAdmin || esDueno) {
      permitido = true;
    } else {
      const { data: tieneSub } = await admin.rpc('has_membership_access', { p_uid: user.id });
      permitido = tieneSub === true;
    }
  } else if (!permitido && !user) {
    motivo = 'necesita_cuenta';
  }

  // Un título sin publicar no se sirve a nadie salvo a su creador o a un admin,
  // comprobado arriba.
  if (permitido && titulo?.status !== 'published' && !user) permitido = false;

  if (!permitido) return json({ locked: true, reason: motivo });

  const cf = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${leccion.video_uid}/token`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + VIDA_SEGUNDOS }),
    },
  );
  const r = await cf.json();
  if (!cf.ok || !r?.success) {
    console.error('[tv-playback] cloudflare', JSON.stringify(r?.errors ?? r));
    return json({ error: 'No se pudo firmar la reproducción' }, 502);
  }

  return json({ token: r.result.token, uid: leccion.video_uid, expires_in: VIDA_SEGUNDOS });
});
