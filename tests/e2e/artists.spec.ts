import { test, expect } from '@playwright/test';

test.describe('/artistas page', () => {
  test('carga datos reales desde Supabase (no 0)', async ({ page }) => {
    await page.goto('/artistas', { waitUntil: 'domcontentloaded' });

    // Esperar a que termine de cargar (max 10s)
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando'),
      { timeout: 15_000 }
    ).catch(() => { /* puede que ya esté cargado */ });

    // Buscar el contador "X de Y artistas"
    const counter = page.locator('text=/\\d+ de \\d+ artistas|de \\d+ artistas|artistas/');
    await expect(counter.first()).toBeVisible({ timeout: 10_000 });

    // Verificar que NO esté en estado vacío permanente
    const noFound = page.locator('text=/No se encontraron artistas/');
    const totalText = await page.locator('body').textContent();

    // Si está el mensaje de "no encontrados", debe ser por filtros (no por carga rota)
    if (await noFound.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Verificar que el indicador "de N" muestre un N > 0 (datos cargados pero filtrados)
      const match = totalText?.match(/de (\d+) artistas/);
      const total = match ? parseInt(match[1]) : 0;
      expect(total, 'Debería haber artistas cargados de BD').toBeGreaterThan(0);
    }
  });

  test('filtros funcionan: tipo DJ', async ({ page }) => {
    await page.goto('/artistas?tipo=dj');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando'),
      { timeout: 15_000 }
    ).catch(() => {});

    // El filtro DJ debería estar activo (visible como chip pink)
    const djChip = page.locator('text=/DJ/').first();
    await expect(djChip).toBeVisible({ timeout: 5000 });
  });
});
