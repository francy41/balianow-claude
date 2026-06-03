# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api.spec.ts >> API endpoints >> GET /sitemap.xml → 200 con URLs válidas
- Location: tests\e2e\api.spec.ts:22:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "xml"
Received string:    "text/plain"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * API health + sitemap + robots smoke tests
  5  |  * Verifica que los endpoints públicos funcionen.
  6  |  */
  7  | 
  8  | test.describe('API endpoints', () => {
  9  |   test('GET /api/health → 200 con metrics', async ({ request }) => {
  10 |     const res = await request.get('/api/health');
  11 |     expect(res.status()).toBe(200);
  12 | 
  13 |     const body = await res.json();
  14 |     expect(body.status).toBe('healthy');
  15 |     expect(body.checks.db).toBe(true);
  16 |     expect(body.metrics).toBeDefined();
  17 |     expect(body.metrics.active_users).toBeGreaterThanOrEqual(0);
  18 |     expect(body.metrics.active_artists).toBeGreaterThan(0);
  19 |     expect(body.response_time_ms).toBeLessThan(5000);
  20 |   });
  21 | 
  22 |   test('GET /sitemap.xml → 200 con URLs válidas', async ({ request }) => {
  23 |     const res = await request.get('/sitemap.xml');
  24 |     expect(res.status()).toBe(200);
> 25 |     expect(res.headers()['content-type']).toContain('xml');
     |                                           ^ Error: expect(received).toContain(expected) // indexOf
  26 | 
  27 |     const xml = await res.text();
  28 |     expect(xml).toContain('<?xml');
  29 |     expect(xml).toContain('<urlset');
  30 |     expect(xml).toContain('https://bailanow.com');
  31 |     // Al menos las páginas estáticas + algunas dinámicas
  32 |     const urlCount = (xml.match(/<url>/g) || []).length;
  33 |     expect(urlCount).toBeGreaterThanOrEqual(10);
  34 |   });
  35 | 
  36 |   test('GET /robots.txt → 200 con sitemap declarado', async ({ request }) => {
  37 |     const res = await request.get('/robots.txt');
  38 |     expect(res.status()).toBe(200);
  39 | 
  40 |     const text = await res.text();
  41 |     expect(text).toContain('User-agent: *');
  42 |     expect(text).toContain('Sitemap: https://bailanow.com/sitemap.xml');
  43 |     expect(text).toContain('Disallow: /admin');
  44 |   });
  45 | });
  46 | 
```