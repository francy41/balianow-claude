import { test, expect } from '@playwright/test';

test.describe('Navegación principal', () => {
  const routes = [
    { path: '/', titleRegex: /BailaNow/ },
    { path: '/cerca', titleRegex: /BailaNow/ },
    { path: '/artistas', titleRegex: /BailaNow/ },
    { path: '/eventos', titleRegex: /BailaNow/ },
    { path: '/venues', titleRegex: /BailaNow/ },
    { path: '/clases', titleRegex: /BailaNow/ },
    { path: '/live', titleRegex: /BailaNow/ },
    { path: '/marketplace', titleRegex: /BailaNow/ },
    { path: '/mapa', titleRegex: /BailaNow/ },
    { path: '/legal/terminos', titleRegex: /BailaNow/ },
  ];

  for (const { path, titleRegex } of routes) {
    test(`${path} carga sin crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => {
        if (!err.message.includes('manifest')) errors.push(err.message);
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Status para ${path}`).toBeLessThan(400);
      await expect(page).toHaveTitle(titleRegex);

      // No errores críticos JavaScript
      const critical = errors.filter(e =>
        e.includes('Minified React error') ||
        e.includes('Maximum update depth')
      );
      expect(critical, `${path} errores: ${critical.join(' | ')}`).toEqual([]);
    });
  }

  test('404 muestra página no encontrada', async ({ page }) => {
    await page.goto('/ruta-que-no-existe-12345');
    await page.waitForLoadState('domcontentloaded');
    // Debería redirigir a NotFoundPage (404)
    const notFound = page.locator('text=/404|no encontrad|Not Found/').first();
    await expect(notFound).toBeVisible({ timeout: 5000 });
  });
});
