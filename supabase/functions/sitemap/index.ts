// ════════════════════════════════════════════════════════════════
// Edge Function: sitemap
// Genera sitemap.xml dinámico con todas las URLs públicas indexables
//
// GET /functions/v1/sitemap → sitemap.xml
// Configurar en Vercel: /sitemap.xml → rewrite a esta función
// ════════════════════════════════════════════════════════════════

// Sitemap dinámico — usa fetch directo a Supabase REST
const BASE = 'https://bailanow.com';
const STATIC_URLS = [
  '', '/cerca', '/clases', '/eventos', '/artistas', '/venues',
  '/marketplace', '/live', '/mapa', '/promocionate', '/vendedores',
  '/tv', '/rutas', '/comunidad', '/partner/aplicar',
  '/legal/terminos', '/legal/privacidad', '/legal/cookies',
];

Deno.serve(async () => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const sbHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    Accept: 'application/json',
  };
  const sbGet = async (path: string): Promise<any[]> => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
      if (!r.ok) return [];
      return await r.json();
    } catch { return []; }
  };

  const urls: { loc: string; lastmod?: string; priority: number; changefreq: string }[] = [];

  STATIC_URLS.forEach(path => {
    urls.push({ loc: `${BASE}${path}`, priority: path === '' ? 1.0 : 0.8, changefreq: 'weekly' });
  });

  (await sbGet('artists?select=id,updated_at&limit=5000')).forEach((a: any) => urls.push({
    loc: `${BASE}/artistas/${a.id}`, lastmod: a.updated_at, priority: 0.7, changefreq: 'monthly',
  }));

  (await sbGet('profiles?select=id,updated_at&role=neq.admin&role=neq.superadmin&deleted_at=is.null&limit=5000')).forEach((p: any) => urls.push({
    loc: `${BASE}/p/${p.id}`, lastmod: p.updated_at, priority: 0.6, changefreq: 'monthly',
  }));

  const today = new Date().toISOString();
  (await sbGet(`events?select=id,updated_at,date&date=gte.${today}&limit=5000`)).forEach((e: any) => urls.push({
    loc: `${BASE}/eventos/${e.id}`, lastmod: e.updated_at, priority: 0.9, changefreq: 'daily',
  }));

  (await sbGet('venues?select=id,updated_at&limit=5000')).forEach((v: any) => urls.push({
    loc: `${BASE}/venues/${v.id}`, lastmod: v.updated_at, priority: 0.7, changefreq: 'monthly',
  }));

  // Páginas públicas de ciudad de cada partner activo (bailanow.com/Madrid)
  const seenCities = new Set<string>();
  (await sbGet("partners?select=cities&status=eq.active&limit=1000")).forEach((p: any) => {
    (p.cities || []).forEach((c: string) => {
      const city = (c || '').trim();
      if (city && !seenCities.has(city.toLowerCase())) {
        seenCities.add(city.toLowerCase());
        urls.push({ loc: `${BASE}/${encodeURIComponent(city)}`, priority: 0.8, changefreq: 'weekly' });
      }
    });
  });

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
