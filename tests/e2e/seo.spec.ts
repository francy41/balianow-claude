import { test, expect } from '@playwright/test';

test.describe('SEO y meta', () => {
  test('home tiene meta tags esenciales', async ({ page }) => {
    await page.goto('/');

    // Title
    const title = await page.title();
    expect(title).toContain('BailaNow');
    expect(title.length).toBeGreaterThan(20);
    expect(title.length).toBeLessThan(100);

    // Meta description
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc, 'Meta description requerida').toBeTruthy();
    expect(desc!.length).toBeGreaterThan(50);

    // Open Graph básico (compartir en redes)
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle, 'og:title requerido').toBeTruthy();

    // Viewport meta (mobile-friendly)
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // Manifest PWA
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBeTruthy();
  });

  test('respuesta HTTP tiene headers de seguridad', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();

    expect(headers['x-content-type-options'], 'X-Content-Type-Options requerido').toBe('nosniff');
    expect(headers['x-frame-options'], 'X-Frame-Options requerido').toBeTruthy();
    expect(headers['strict-transport-security'], 'HSTS requerido').toBeTruthy();
    expect(headers['content-security-policy'], 'CSP requerido').toBeTruthy();
  });
});
