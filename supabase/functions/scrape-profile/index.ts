// Supabase Edge Function — scrape-profile
// POST /functions/v1/scrape-profile
//
// Body: { url: string }
//
// Fetches the URL server-side (sin CORS), extrae metadatos OpenGraph,
// Twitter Card, JSON-LD y enlaces sociales, y devuelve un perfil parseado
// listo para insertar en `profiles`.
//
// Returns: {
//   url, name, full_name, bio, avatar_url, cover_photo,
//   city, country, role_hint,
//   instagram_url, tiktok_url, youtube_url, facebook_url,
//   spotify_url, soundcloud_url, twitch_url, website_url,
//   raw_meta: {...}
// }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

// ── SSRF protection: block private/local/cloud-metadata IPs ──────────
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,                  // link-local + AWS metadata 169.254.169.254
  /^0\./,
  /^\[?::1\]?$/,                  // IPv6 loopback
  /^\[?fc00:/i, /^\[?fd00:/i,    // IPv6 ULA
  /^\[?fe80:/i,                  // IPv6 link-local
  /\.internal$/i, /\.local$/i,
];

function isUrlAllowed(input: string): { ok: boolean; reason?: string } {
  let u: URL;
  try { u = new URL(input); }
  catch { return { ok: false, reason: 'URL inválida' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: 'Solo http(s) permitido' };
  }
  const host = u.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some(p => p.test(host))) {
    return { ok: false, reason: 'Host privado/local bloqueado' };
  }
  return { ok: true };
}

// ── HTML helpers ─────────────────────────────────────────────────────
function getMetaTag(html: string, attr: 'name' | 'property', value: string): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  if (m) return decodeHtml(m[1]);
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`, 'i');
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1]) : null;
}

function getTitle(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? decodeHtml(m[1].trim()) : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function getJsonLd(html: string): any[] {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const out: any[] = [];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed['@graph']) out.push(...parsed['@graph']);
      else out.push(parsed);
    } catch { /* ignore */ }
  }
  return out;
}

function getAllLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    try {
      const abs = new URL(m[1], baseUrl).toString();
      links.add(abs);
    } catch { /* ignore */ }
  }
  return [...links];
}

// ── Social extractors ────────────────────────────────────────────────
const SOCIAL_PATTERNS: { key: string; rx: RegExp }[] = [
  { key: 'instagram_url',  rx: /^https?:\/\/(www\.)?instagram\.com\/(?!p\/|reel\/|stories\/)([^/?#]+)/i },
  { key: 'tiktok_url',     rx: /^https?:\/\/(www\.)?tiktok\.com\/@[^/?#]+/i },
  { key: 'youtube_url',    rx: /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|@|user\/)/i },
  { key: 'facebook_url',   rx: /^https?:\/\/(www\.)?facebook\.com\/(?!sharer|tr\/|plugins\/)([^/?#]+)/i },
  { key: 'spotify_url',    rx: /^https?:\/\/open\.spotify\.com\/(artist|user)\//i },
  { key: 'soundcloud_url', rx: /^https?:\/\/(www\.)?soundcloud\.com\/[^/?#]+/i },
  { key: 'twitch_url',     rx: /^https?:\/\/(www\.)?twitch\.tv\/[^/?#]+/i },
];

function detectSocialFromUrl(url: string): { key: string; value: string } | null {
  for (const { key, rx } of SOCIAL_PATTERNS) {
    if (rx.test(url)) return { key, value: url };
  }
  return null;
}

// ── Role / city detection from text ──────────────────────────────────
function detectRoleHint(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bdj\b/.test(t)) return 'dj';
  if (/instructor|profesor|teacher|maestro/.test(t)) return 'instructor';
  if (/dancer|bailarin|bailarina|bailaor/.test(t)) return 'dancer';
  if (/singer|cantante|vocalist/.test(t)) return 'singer';
  if (/band|orquesta|grupo|trio/.test(t)) return 'band';
  if (/club|sala|venue|escuela|academy/.test(t)) return 'venue';
  if (/promoter|productora|booking/.test(t)) return 'promoter';
  return null;
}

const KNOWN_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Malaga',
  'Granada', 'Zaragoza', 'Paris', 'París', 'Londres', 'London', 'Berlin',
  'Berlín', 'Roma', 'Rome', 'Milano', 'Milán', 'Miami', 'New York', 'Cali',
  'Bogotá', 'Bogota', 'Medellín', 'Medellin', 'La Habana', 'Habana',
  'Santo Domingo', 'Buenos Aires', 'Lima', 'México DF', 'Mexico DF', 'CDMX',
];

function detectCity(text: string): string | null {
  for (const c of KNOWN_CITIES) {
    const rx = new RegExp(`\\b${c.replace('í', '[ií]').replace('é', '[eé]').replace('á', '[aá]').replace('ó', '[oó]')}\\b`, 'i');
    if (rx.test(text)) return c.normalize('NFC');
  }
  return null;
}

// ── Main scraper ─────────────────────────────────────────────────────
async function scrape(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (BailaNow-ProfileBot/1.0; +https://bailanow.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    return { error: `HTTP ${res.status}` };
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
    return { error: `Tipo no soportado: ${ct}` };
  }

  const html = (await res.text()).slice(0, 800_000); // máx 800KB

  // 1. OpenGraph
  const og = {
    title:       getMetaTag(html, 'property', 'og:title'),
    description: getMetaTag(html, 'property', 'og:description'),
    image:       getMetaTag(html, 'property', 'og:image'),
    url:         getMetaTag(html, 'property', 'og:url'),
    type:        getMetaTag(html, 'property', 'og:type'),
    site_name:   getMetaTag(html, 'property', 'og:site_name'),
  };
  // 2. Twitter Card (fallback)
  const tw = {
    title:       getMetaTag(html, 'name', 'twitter:title'),
    description: getMetaTag(html, 'name', 'twitter:description'),
    image:       getMetaTag(html, 'name', 'twitter:image'),
  };
  // 3. Basic
  const title = getTitle(html);
  const description = getMetaTag(html, 'name', 'description');

  // 4. JSON-LD (Person, MusicGroup, Organization, etc.)
  const jsonld = getJsonLd(html);
  const person = jsonld.find(x => {
    const t = x?.['@type'];
    return t === 'Person' || t === 'MusicGroup' || t === 'PerformingGroup' || t === 'Organization' || t === 'LocalBusiness' || (Array.isArray(t) && t.some((tt: string) => ['Person', 'MusicGroup', 'Organization', 'LocalBusiness'].includes(tt)));
  });

  // 5. Social links from page anchors + JSON-LD sameAs
  const socials: Record<string, string> = {};
  const candidates = getAllLinks(html, url);
  if (person?.sameAs) {
    const arr = Array.isArray(person.sameAs) ? person.sameAs : [person.sameAs];
    candidates.push(...arr);
  }
  for (const link of candidates) {
    const hit = detectSocialFromUrl(link);
    if (hit && !socials[hit.key]) socials[hit.key] = hit.value;
  }

  // 6. Build result
  const name =
    person?.name ||
    og.title?.split(/[·|—–-]/)[0].trim() ||
    tw.title?.split(/[·|—–-]/)[0].trim() ||
    title?.split(/[·|—–-]/)[0].trim() ||
    '';

  const bio = person?.description || og.description || tw.description || description || '';
  const avatar = person?.image
    ? (typeof person.image === 'string' ? person.image : person.image.url || person.image[0]?.url)
    : (og.image || tw.image || '');

  const city =
    person?.address?.addressLocality ||
    detectCity([og.title, og.description, title, description, bio].filter(Boolean).join(' '));

  const country = person?.address?.addressCountry || null;

  const roleHint = detectRoleHint([name, bio, og.type, person?.['@type']].filter(Boolean).join(' '));

  return {
    url,
    name: name.slice(0, 200),
    full_name: name.slice(0, 200),
    bio: bio.slice(0, 1000),
    avatar_url: avatar || '',
    cover_photo: avatar || '',  // mismo por defecto, se puede sobreescribir
    city: city || null,
    country,
    role_hint: roleHint,
    ...socials,
    website_url: socials.website_url || (og.url && !Object.values(socials).includes(og.url) ? og.url : url),
    raw_meta: {
      og, tw, title, description,
      jsonld_type: person?.['@type'] || null,
      site_name: og.site_name,
    },
  };
}

// ── Handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  const corsH = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  // Rate limit: 30 req/min por IP (es scraping, no abusivo)
  const rl = checkRateLimit(req, { max: 30, windowMs: 60_000, keyPrefix: 'scrape' });
  if (!rl.ok) return rl.response;

  // Auth required — solo usuarios autenticados pueden scrapear
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  // Verifica sesión vía Supabase
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error verificando sesión' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  let body: { url?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), {
    status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
  }); }

  if (!body.url) {
    return new Response(JSON.stringify({ error: 'Falta url' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const allowed = isUrlAllowed(body.url);
  if (!allowed.ok) {
    return new Response(JSON.stringify({ error: allowed.reason }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await scrape(body.url);
    return new Response(JSON.stringify(result), {
      headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }
});
