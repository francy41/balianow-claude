// Supabase Edge Function — moderar-cuenta
// Bloquea o devuelve el acceso de una cuenta en `auth`.
//
// POST { user_id, accion: 'bloquear' | 'desbloquear' }  →  { ok: true }
//
// Por qué hace falta una función aparte: suspender a alguien en `profiles` le
// corta la parte social (desaparece de los locales, no puede escribir ni dar
// likes), pero NO le impide iniciar sesión. Eso solo se puede hacer con la API
// de administración de auth, que exige la clave de servicio y por tanto no
// puede ejecutarse desde el navegador.
//
// Secrets ya presentes en el proyecto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_ANON_KEY. No hace falta configurar nada nuevo.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const ORIGENES = ['https://bailanow.com', 'https://www.bailanow.com'];
if (Deno.env.get('SUPABASE_ENV') !== 'production') {
  ORIGENES.push('http://localhost:3000', 'http://localhost:5173');
}
const cors = (req: Request) => ({
  'Access-Control-Allow-Origin': ORIGENES.includes(req.headers.get('origin') ?? '')
    ? req.headers.get('origin')!
    : ORIGENES[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

// 100 años. Supabase no tiene un "para siempre": lo más cercano es una
// duración larga, y se levanta con 'none'.
const INDEFINIDO = '876000h';

const api = (ruta: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}${ruta}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

serve(async (req) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Faltan secretos del proyecto' }, 503);

  // ── Quién llama ──
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) return json({ error: 'No autenticado' }, 401);

  const quien = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: auth },
  });
  if (!quien.ok) return json({ error: 'No autenticado' }, 401);
  const yo = await quien.json();
  const miId = String(yo?.id ?? '');
  if (!miId) return json({ error: 'No autenticado' }, 401);

  // El rol se lee en el servidor. Si viniera en la petición, cualquiera podría
  // declararse administrador y bloquear cuentas ajenas.
  const perfilRes = await api(`/rest/v1/profiles?select=role&id=eq.${miId}`);
  const perfil = perfilRes.ok ? (await perfilRes.json())[0] : null;
  if (!perfil || !['admin', 'superadmin'].includes(String(perfil.role))) {
    return json({ error: 'Sin permiso' }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }

  const userId = String(body.user_id ?? '');
  const accion = String(body.accion ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'user_id inválido' }, 400);
  if (!['bloquear', 'desbloquear'].includes(accion)) return json({ error: 'Acción inválida' }, 400);
  if (userId === miId) return json({ error: 'No puedes bloquear tu propia cuenta' }, 400);

  // Un administrador no bloquea a otro: evita que una cuenta comprometida deje
  // al equipo fuera. Misma regla que en suspender_usuario().
  const objetivoRes = await api(`/rest/v1/profiles?select=role,full_name&id=eq.${userId}`);
  const objetivo = objetivoRes.ok ? (await objetivoRes.json())[0] : null;
  if (objetivo && ['admin', 'superadmin'].includes(String(objetivo.role))) {
    return json({ error: 'No se puede bloquear a un administrador' }, 403);
  }

  const res = await api(`/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ ban_duration: accion === 'bloquear' ? INDEFINIDO : 'none' }),
  });
  if (!res.ok) {
    console.error('[moderar-cuenta]', res.status, await res.text());
    return json({ error: 'No se pudo cambiar el acceso' }, 502);
  }

  // Las sesiones ya abiertas siguen vivas hasta que caduca su token, así que se
  // cierran a mano. Sin esto, alguien bloqueado seguiría dentro hasta una hora.
  if (accion === 'bloquear') {
    await api(`/auth/v1/admin/users/${userId}/logout`, { method: 'POST' }).catch(() => {});
  }

  return json({ ok: true, accion });
});
