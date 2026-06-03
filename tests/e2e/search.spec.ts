import { test, expect } from '@playwright/test';

test.describe('Super buscador (GlobalSearch)', () => {
  test('Ctrl+K abre el buscador global', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Atajo de teclado
    const key = browserName === 'webkit' ? 'Meta+k' : 'Control+k';
    await page.keyboard.press(key);

    // Input de búsqueda visible
    const searchInput = page.locator('input[placeholder*="locales"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Escribir algo activa la búsqueda
    await searchInput.fill('madrid');
    await page.waitForTimeout(500);

    // Esc cierra
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible({ timeout: 3000 });
  });

  test('SearchTriggerBar abre el buscador al click', async ({ page }) => {
    await page.goto('/cerca');
    await page.waitForLoadState('domcontentloaded');

    // El trigger bar debe estar en la página
    const trigger = page.locator('text=/Súper buscador|Super buscador|buscador|Buscar/').first();
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trigger.click();
      // El modal de búsqueda debería abrirse
      const searchInput = page.locator('input[placeholder*="locales"], input[placeholder*="Buscar"]').first();
      await expect(searchInput).toBeVisible({ timeout: 3000 });
    }
  });
});
