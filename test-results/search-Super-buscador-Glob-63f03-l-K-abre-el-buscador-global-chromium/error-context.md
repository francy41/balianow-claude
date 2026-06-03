# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Super buscador (GlobalSearch) >> Ctrl+K abre el buscador global
- Location: tests\e2e\search.spec.ts:4:3

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  locator('input[placeholder*="locales"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first()
Expected: not visible
Received: visible
Timeout:  3000ms

Call log:
  - Expect "not toBeVisible" with timeout 3000ms
  - waiting for locator('input[placeholder*="locales"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first()
    9 × locator resolved to <input type="text" value="madrid" placeholder="Buscar ciudad, local, zona..." class="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-200 text-xs sm:text-sm placeholder-gray-400"/>
      - unexpected value "visible"

```

```yaml
- textbox "Buscar ciudad, local, zona...": madrid
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Super buscador (GlobalSearch)', () => {
  4  |   test('Ctrl+K abre el buscador global', async ({ page, browserName }) => {
  5  |     await page.goto('/');
  6  |     await page.waitForLoadState('domcontentloaded');
  7  | 
  8  |     // Atajo de teclado
  9  |     const key = browserName === 'webkit' ? 'Meta+k' : 'Control+k';
  10 |     await page.keyboard.press(key);
  11 | 
  12 |     // Input de búsqueda visible
  13 |     const searchInput = page.locator('input[placeholder*="locales"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first();
  14 |     await expect(searchInput).toBeVisible({ timeout: 3000 });
  15 | 
  16 |     // Escribir algo activa la búsqueda
  17 |     await searchInput.fill('madrid');
  18 |     await page.waitForTimeout(500);
  19 | 
  20 |     // Esc cierra
  21 |     await page.keyboard.press('Escape');
> 22 |     await expect(searchInput).not.toBeVisible({ timeout: 3000 });
     |                                   ^ Error: expect(locator).not.toBeVisible() failed
  23 |   });
  24 | 
  25 |   test('SearchTriggerBar abre el buscador al click', async ({ page }) => {
  26 |     await page.goto('/cerca');
  27 |     await page.waitForLoadState('domcontentloaded');
  28 | 
  29 |     // El trigger bar debe estar en la página
  30 |     const trigger = page.locator('text=/Súper buscador|Super buscador|buscador|Buscar/').first();
  31 |     if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
  32 |       await trigger.click();
  33 |       // El modal de búsqueda debería abrirse
  34 |       const searchInput = page.locator('input[placeholder*="locales"], input[placeholder*="Buscar"]').first();
  35 |       await expect(searchInput).toBeVisible({ timeout: 3000 });
  36 |     }
  37 |   });
  38 | });
  39 | 
```