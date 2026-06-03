import { test, expect } from '@playwright/test';

/**
 * API health + sitemap + robots smoke tests
 * Verifica que los endpoints públicos funcionen.
 */

test.describe('API endpoints', () => {
  test('GET /api/health → 200 con metrics', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.db).toBe(true);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.active_users).toBeGreaterThanOrEqual(0);
    expect(body.metrics.active_artists).toBeGreaterThan(0);
    expect(body.response_time_ms).toBeLessThan(5000);
  });

  test('GET /sitemap.xml → 200 con URLs válidas', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');

    const xml = await res.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('https://bailanow.com');
    // Al menos las páginas estáticas + algunas dinámicas
    const urlCount = (xml.match(/<url>/g) || []).length;
    expect(urlCount).toBeGreaterThanOrEqual(10);
  });

  test('GET /robots.txt → 200 con sitemap declarado', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);

    const text = await res.text();
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Sitemap: https://bailanow.com/sitemap.xml');
    expect(text).toContain('Disallow: /admin');
  });
});
