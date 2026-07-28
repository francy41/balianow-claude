// Supabase Edge Function — translate
// Traduce textos de CONTENIDO (títulos y descripciones de vídeos, cursos, eventos)
// a cualquier idioma, con CACHÉ en BD para no volver a pagar por lo ya traducido.
//
// POST { texts: string[], target: 'en'|'fr'|'de'|'it'|'zh'|'ja'|'ko'|... , source?: 'es' }
//   → { translations: string[] }   (mismo orden; si no hay API configurada, devuelve el original)
//
// Env: DEEPL_API_KEY (recomendado para EU/JP/KO/ZH) o GOOGLE_TRANSLATE_KEY.
//      SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (inyectadas) para la caché.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const DEEPL = Deno.env.get('DEEPL_API_KEY') ?? '';
const GOOGLE = Deno.env.get('GOOGLE_TRANSLATE_KEY') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

async function deepl(texts: string[], target: string): Promise<string[]> {
  const host = DEEPL.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const params = new URLSearchParams();
  texts.forEach(t => params.append('text', t));
  params.append('target_lang', target.toUpperCase());
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${DEEPL}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await res.json();
  return (data.translations || []).map((t: any) => t.text);
}

async function google(texts: string[], target: string): Promise<string[]> {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, target, format: 'text' }),
  });
  const data = await res.json();
  return (data.data?.translations || []).map((t: any) => t.translatedText);
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }
  const texts: string[] = (body.texts || []).map((t: any) => String(t)).slice(0, 50);
  const target = String(body.target ?? '').toLowerCase();
  if (!texts.length || !target) return json({ translations: texts });
  // Sin API configurada → devolvemos el original (no rompe la app).
  if (!DEEPL && !GOOGLE) return json({ translations: texts, notConfigured: true });

  // 1) Caché
  const { data: cached } = await admin.from('translations').select('source_text,translated_text').eq('target_lang', target).in('source_text', texts);
  const cache = new Map<string, string>((cached || []).map((r: any) => [r.source_text, r.translated_text]));
  const missing = [...new Set(texts.filter(t => !cache.has(t)))];

  // 2) Traducir lo que falta
  if (missing.length) {
    try {
      const out = DEEPL ? await deepl(missing, target) : await google(missing, target);
      const rows = missing.map((src, i) => ({ source_text: src, target_lang: target, translated_text: out[i] ?? src }));
      rows.forEach(r => cache.set(r.source_text, r.translated_text));
      await admin.from('translations').upsert(rows, { onConflict: 'source_text,target_lang' });
    } catch (e) { console.error('[translate]', (e as Error).message); }
  }

  return json({ translations: texts.map(t => cache.get(t) ?? t) });
});
