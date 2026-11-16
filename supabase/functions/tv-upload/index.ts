// Supabase Edge Function — tv-upload
// Pide a Cloudflare Stream una URL de subida de un solo uso, para que el vídeo
// viaje del navegador del creador a Cloudflare SIN pasar por nuestros servidores.
// Subir vídeo a través del backend sería caro, lento y tiraría la función.
//
// POST { title_id, name, access?, duration_minutes? }  →  { uploadURL, uid, lesson_id }
//
// El vídeo se crea con requireSignedURLs: sin firma no se puede reproducir, ni
// aunque alguien consiga el UID. La firma la emite tv-playback tras comprobar
// la suscripción.
//
// Secrets: CF_ACCOUNT_ID, CF_STREAM_TOKEN (token de API con permiso Stream:Edit)

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

// Tope de duración por lección. Evita que una subida errónea de 4 horas se
// convierta en una factura: Cloudflare cobra por minuto almacenado.
const MAX_MINUTOS = 90;

serve(async (req) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });

  if (!CF_ACCOUNT || !CF_TOKEN) return json({ error: 'Cloudflare Stream no está configurado' }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'No autenticado' }, 401);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }

  const titleId = String(body.title_id ?? '');
  const nombre = String(body.name ?? '').trim().slice(0, 160);
  const acceso = ['free', 'basico', 'premium'].includes(body.access) ? body.access : 'basico';
  const minutos = Math.min(Math.max(Number(body.duration_minutes) || 30, 1), MAX_MINUTOS);
  if (!titleId || !nombre) return json({ error: 'Faltan title_id o name' }, 400);

  // Solo el dueño del título o un administrador pueden añadirle lecciones.
  const { data: titulo } = await admin
    .from('tv_titles').select('id, creator_id').eq('id', titleId).maybeSingle();
  if (!titulo) return json({ error: 'Título no encontrado' }, 404);

  const { data: perfil } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const esAdmin = perfil?.role === 'admin' || perfil?.role === 'superadmin';
  if (titulo.creator_id !== user.id && !esAdmin) return json({ error: 'Sin permiso' }, 403);

  // URL de subida directa. requireSignedURLs es lo que impide que el vídeo se
  // pueda ver con solo tener el enlace.
  const cf = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/direct_upload`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxDurationSeconds: minutos * 60,
        requireSignedURLs: true,
        meta: { name: nombre, title_id: titleId, creator_id: user.id },
      }),
    },
  );
  const r = await cf.json();
  if (!cf.ok || !r?.success) {
    console.error('[tv-upload] cloudflare', JSON.stringify(r?.errors ?? r));
    return json({ error: 'Cloudflare rechazó la subida' }, 502);
  }

  const uid = r.result.uid as string;
  const uploadURL = r.result.uploadURL as string;

  // La lección se crea ya, en estado "procesando". Cloudflare tarda en
  // transcodificar; el estudio consulta tv-playback para saber cuándo está lista.
  const { data: siguiente } = await admin
    .from('tv_lessons').select('position').eq('title_id', titleId)
    .order('position', { ascending: false }).limit(1).maybeSingle();

  const { data: leccion, error } = await admin.from('tv_lessons').insert({
    title_id: titleId,
    position: (siguiente?.position ?? 0) + 1,
    name: nombre,
    video_uid: uid,
    video_ready: false,
    access: acceso,
  }).select('id').single();

  if (error) {
    console.error('[tv-upload] insert', error.message);
    return json({ error: 'No se pudo crear la lección' }, 500);
  }

  return json({ uploadURL, uid, lesson_id: leccion.id });
});
