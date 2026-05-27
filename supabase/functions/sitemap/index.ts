// ════════════════════════════════════════════════════════════════
// Edge Function: sitemap
// Genera sitemap.xml dinámico con todas las URLs públicas indexables
//
// GET /functions/v1/sitemap → sitemap.xml
// Configurar en Vercel: /sitemap.xml → rewrite a esta función
// ════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BASE = 'https://bailanow.com';
const STATIC_URLS = [
  '', '/cerca', '/clases', '/eventos', '/artistas', '/venues',
  '/marketplace', '/live', '/mapa', '/promocionate', '/vendedores',
  '/legal/terminos', '/legal/privacidad', '/legal/cookies',
];

Deno.serve(async () => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const urls: { loc: string; lastmod?: string; priority: number; changefreq: string }[] = [];

  // 1) URLs estáticas
  STATIC_URLS.forEach(path => {
    urls.push({
      loc: `${BASE}${path}`,
      priority: path === '' ? 1.0 : 0.8,
      changefreq: 'weekly',
    });
  });

  // 2) Artistas
  try {
    const { data } = await supabase.from('artists').select('id, updated_at').limit(5000);
    data?.forEach((a: any) => urls.push({
      loc: `${BASE}/artistas/${a.id}`,
      lastmod: a.updated_at || new Date().toISOString(),
      priority: 0.7, changefreq: 'monthly',
    }));
  } catch { /* skip */ }

  // 3) Profiles públicos
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .neq('role', 'admin').neq('role', 'superadmin')
      .is('deleted_at', null)
      .limit(5000);
    data?.forEach((p: any) => urls.push({
      loc: `${BASE}/p/${p.id}`,
      lastmod: p.updated_at || new Date().toISOString(),
      priority: 0.6, changefreq: 'monthly',
    }));
  } catch { /* skip */ }

  // 4) Eventos futuros
  try {
    const { data } = await supabase
      .from('events')
      .select('id, updated_at, date')
      .gte('date', new Date().toISOString())
      .limit(5000);
    data?.forEach((e: any) => urls.push({
      loc: `${BASE}/eventos/${e.id}`,
      lastmod: e.updated_at || new Date().toISOString(),
      priority: 0.9, changefreq: 'daily',
    }));
  } catch { /* skip */ }

  // 5) Venues
  try {
    const { data } = await supabase.from('venues').select('id, updated_at').limit(5000);
    data?.forEach((v: any) => urls.push({
      loc: `${BASE}/venues/${v.id}`,
      lastmod: v.updated_at || new Date().toISOString(),
      priority: 0.7, changefreq: 'monthly',
    }));
  } catch { /* skip */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod.slice(0,10)}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c));
}
