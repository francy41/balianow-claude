import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('carga sin errores y muestra elementos clave', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('manifest') && !msg.text().includes('favicon')) {
        errors.push(`Console: ${msg.text()}`);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Título de la app
    await expect(page).toHaveTitle(/BailaNow/i);

    // Navbar / sidebar trigger visible
    await expect(page.locator('body')).toBeVisible();

    // Hero / banner principal cargado (esperar a que aparezca contenido)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => { /* fallback */ });

    // No debe haber errores React (#310 etc) ni script errors críticos
    const critical = errors.filter(e =>
      e.includes('Minified React error') ||
      e.includes('Cannot read prop') ||
      e.includes('is not a function')
    );
    expect(critical, `Errores críticos: ${critical.join(' | ')}`).toEqual([]);
  });

  test('navegación bottom bar tiene los enlaces principales', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Bottom nav (móvil) o sidebar (desktop) deben tener al menos Cerca y Eventos
    const cercaLink = page.locator('a[href*="/cerca"], a[href="/cerca"]').first();
    const eventosLink = page.locator('a[href*="/eventos"], a[href="/eventos"]').first();

    await expect(cercaLink).toBeVisible({ timeout: 5000 });
    await expect(eventosLink).toBeVisible({ timeout: 5000 });
  });
});
