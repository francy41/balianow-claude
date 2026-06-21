/**
 * smart-import — Importador inteligente por URL
 *
 * Recibe { url } → descarga la página (sin CORS, server-side) → extrae
 * JSON-LD + OpenGraph + texto visible → Claude clasifica y estructura:
 *   { type: 'event' | 'venue' | 'profile', data: {...campos mapeados} }
 *
 * Secret requerido: ANTHROPIC_API_KEY (ya configurado para danceflow-chat)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

// ── Anti-SSRF: bloquea hosts internos / privados / metadata cloud ──
function isPrivateIp(ip: string): boolean {
  // IPv4
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 127) return true;                         // loopback
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 169 && b === 254) return true;            // link-local + metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16/12
    if (a === 192 && b === 168) return true;            // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT 100.64/10
    return false;
  }
  // IPv6 loopback / unique-local / link-local
  const low = ip.toLowerCase();
  if (low === '::1' || low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80') || low === '::') return true;
  return false;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('URL invalida'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Solo http/https');
  // Puertos no estandar -> bloquear (evita pivotar a servicios internos)
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('Puerto no permitido');
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Host no permitido');
  // Si es IP literal, validar directamente
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (isPrivateIp(host)) throw new Error('Host privado no permitido');
    return u;
  }
  // Resolver DNS y comprobar que NINGUNA IP sea privada (mitiga DNS rebinding)
  try {
    const a = await Deno.resolveDns(host, 'A').catch(() => [] as string[]);
    const aaaa = await Deno.resolveDns(host, 'AAAA').catch(() => [] as string[]);
    const ips = [...a, ...aaaa];
    if (ips.length && ips.some(isPrivateIp)) throw new Error('Host resuelve a IP privada');
  } catch (e) {
    if (e instanceof Error && e.message.includes('privada')) throw e;
    // si la resolucion falla por permisos, seguimos (fetch fallara igual)
  }
  return u;
}

const json = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Extrae bloques JSON-LD del HTML */
function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { out.push(JSON.parse(m[1].trim())); } catch { /* ignorar bloques rotos */ }
  }
  return out;
}

/** Extrae meta tags OG/twitter */
function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const re = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const k = m[1].toLowerCase();
    if (/^(og:|twitter:|description|author)/.test(k) && !meta[k]) meta[k] = m[2];
  }
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) meta['title'] = t[1].trim();
  return meta;
}

/** HTML → texto visible condensado */
function htmlToText(html: string, max = 7000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const SYSTEM = `Eres un extractor de datos para BailaNow, una plataforma de baile latino.
Recibirás el contenido de una página web (JSON-LD, metadatos y texto). Tu trabajo:

1. CLASIFICA la página como uno de: "event" (evento/fiesta/festival/congreso), "venue" (local/discoteca/academia/sala), "profile" (artista/DJ/bailarín/profesor persona).
2. EXTRAE los datos al esquema correspondiente. USA null si un dato no aparece. NO inventes datos.

Esquemas (devuelve SOLO los campos del tipo elegido):

event: { "title": str, "description": str(max 500), "date": "YYYY-MM-DD", "time": "HH:MM"|null, "end_time": "HH:MM"|null, "city": str, "country": str|null, "location": str (dirección o nombre del lugar), "venue_name": str|null, "price": number|null, "currency": "EUR"|"USD"|null, "category": una de [conciertos, festivales, club, social, competiciones, talleres]|null, "image_url": str|null, "artists": [str]|null }

venue: { "name": str, "description": str(max 500), "city": str, "country": str|null, "address": str|null, "type": una de [Discoteca, Academia, Sala, Bar, Restaurante, Social]|null, "style": [str géneros de baile]|null, "image_url": str|null, "email": str|null, "whatsapp": str|null, "open_hours": str|null }

profile: { "name": str, "role": una de [dj, dancer, teacher, artist, singer, band]|null, "city": str|null, "bio": str(max 400)|null, "avatar_url": str|null, "instagram_url": str|null, "tiktok_url": str|null, "youtube_url": str|null, "website": str|null, "styles": [str]|null }

Responde SOLO con JSON válido: {"type": "...", "confidence": 0-100, "data": {...}}
Sin markdown, sin explicaciones.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders);

  // ── Rate limit: import es costoso (fetch + LLM) ──
  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'smart-import' });
  if (!rl.ok) return rl.response;

  // ── Auth: solo administradores pueden importar ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401, corsHeaders);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: 'No autorizado' }, 401, corsHeaders);
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!prof || !['admin', 'superadmin'].includes(String(prof.role))) {
    return json({ error: 'Requiere permisos de administrador' }, 403, corsHeaders);
  }

  const API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!API_KEY) return json({ error: 'ANTHROPIC_API_KEY no configurada' }, 500, corsHeaders);

  let url = '';
  try { ({ url } = await req.json()); } catch { return json({ error: 'JSON invalido' }, 400, corsHeaders); }
  if (!url || typeof url !== 'string') return json({ error: 'URL invalida' }, 400, corsHeaders);

  // ── Anti-SSRF: validar destino antes de descargar ──
  let safeUrl: URL;
  try { safeUrl = await assertPublicUrl(url); }
  catch (e) { return json({ error: (e as Error).message || 'URL no permitida' }, 400, corsHeaders); }

  // 1) Descargar la pagina (server-side). redirect:manual para no saltar a hosts internos.
  let html = '';
  try {
    const res = await fetch(safeUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    // Si redirige, validar el destino y hacer UN salto controlado
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return json({ error: 'Redireccion sin destino' }, 422, corsHeaders);
      const next = await assertPublicUrl(new URL(loc, safeUrl).toString()).catch(() => null);
      if (!next) return json({ error: 'Redireccion a host no permitido' }, 400, corsHeaders);
      const res2 = await fetch(next.toString(), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      if (!res2.ok) return json({ error: `La pagina respondio ${res2.status}` }, 422, corsHeaders);
      html = await res2.text();
    } else if (!res.ok) {
      return json({ error: `La pagina respondio ${res.status}` }, 422, corsHeaders);
    } else {
      html = await res.text();
    }
  } catch (e) {
    return json({ error: 'No se pudo descargar la pagina', detail: String(e) }, 422, corsHeaders);
  }

  // 2) Condensar señal
  const jsonLd = extractJsonLd(html);
  const meta = extractMeta(html);
  const text = htmlToText(html);

  const content = [
    `URL: ${url}`,
    jsonLd.length ? `JSON-LD:\n${JSON.stringify(jsonLd).slice(0, 6000)}` : '',
    `META:\n${JSON.stringify(meta).slice(0, 2000)}`,
    `TEXTO:\n${text}`,
  ].filter(Boolean).join('\n\n');

  // 3) Claude clasifica + estructura
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      }),
    });
    const ai = await res.json();
    if (!res.ok) return json({ error: 'Error de IA', detail: ai?.error?.message }, 502, corsHeaders);

    let raw = ai?.content?.[0]?.text ?? '';
    raw = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(raw);

    // Completar imagen desde OG si la IA no la encontro
    const ogImg = meta['og:image'];
    if (ogImg && parsed?.data && !parsed.data.image_url && !parsed.data.avatar_url) {
      if (parsed.type === 'profile') parsed.data.avatar_url = ogImg;
      else parsed.data.image_url = ogImg;
    }

    return json({ ok: true, source: url, ...parsed }, 200, corsHeaders);
  } catch (e) {
    return json({ error: 'No se pudo estructurar el contenido', detail: String(e) }, 502, corsHeaders);
  }
});
