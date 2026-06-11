/**
 * smart-import — Importador inteligente por URL
 *
 * Recibe { url } → descarga la página (sin CORS, server-side) → extrae
 * JSON-LD + OpenGraph + texto visible → Claude clasifica y estructura:
 *   { type: 'event' | 'venue' | 'profile', data: {...campos mapeados} }
 *
 * Secret requerido: ANTHROPIC_API_KEY (ya configurado para danceflow-chat)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!API_KEY) return json({ error: 'ANTHROPIC_API_KEY no configurada' }, 500);

  let url = '';
  try { ({ url } = await req.json()); } catch { return json({ error: 'JSON inválido' }, 400); }
  if (!url || !/^https?:\/\//i.test(url)) return json({ error: 'URL inválida' }, 400);

  // 1) Descargar la página (server-side, sin CORS)
  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return json({ error: `La página respondió ${res.status}` }, 422);
    html = await res.text();
  } catch (e) {
    return json({ error: 'No se pudo descargar la página', detail: String(e) }, 422);
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
    if (!res.ok) return json({ error: 'Error de IA', detail: ai?.error?.message }, 502);

    let raw = ai?.content?.[0]?.text ?? '';
    raw = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(raw);

    // Completar imagen desde OG si la IA no la encontró
    const ogImg = meta['og:image'];
    if (ogImg && parsed?.data && !parsed.data.image_url && !parsed.data.avatar_url) {
      if (parsed.type === 'profile') parsed.data.avatar_url = ogImg;
      else parsed.data.image_url = ogImg;
    }

    return json({ ok: true, source: url, ...parsed });
  } catch (e) {
    return json({ error: 'No se pudo estructurar el contenido', detail: String(e) }, 502);
  }
});
