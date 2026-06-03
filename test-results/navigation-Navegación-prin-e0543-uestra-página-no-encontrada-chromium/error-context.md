# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navegación principal >> 404 muestra página no encontrada
- Location: tests\e2e\navigation.spec.ts:37:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/404|no encontrad|Not Found/').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=/404|no encontrad|Not Found/').first()

```

```yaml
- complementary:
  - img "BailaNow"
  - navigation:
    - paragraph: MENÚ
    - link "🏠 Inicio":
      - /url: /
    - link "📍 Cerca de mí":
      - /url: /cerca
    - link "🏙️ Ciudades":
      - /url: /venues
    - link "📅 Eventos":
      - /url: /eventos
    - link "🎶 Artistas":
      - /url: /artistas
    - link "💃 Bailarines":
      - /url: /artistas?tipo=dancer
    - link "🔴 En Directo":
      - /url: /clases
    - link "🛍️ Marketplace":
      - /url: /marketplace
    - link "🎥 Streams":
      - /url: /live
    - link "💬 Comunidad":
      - /url: /chat
    - paragraph: MERCADO
    - link "Ruta de Hoy":
      - /url: /
      - img
      - text: Ruta de Hoy
    - link "Proyectos":
      - /url: /marketplace
      - img
      - text: Proyectos
    - link "📢 Promociónate":
      - /url: /promocionate
      - img
      - text: 📢 Promociónate
    - link "Clases en vivo":
      - /url: /live
      - img
      - text: Clases en vivo
    - link "Ofertas":
      - /url: /marketplace?cat=ofertas
      - img
      - text: Ofertas
    - paragraph: COMUNIDAD
    - link "Anuncios":
      - /url: /comunidad
      - img
      - text: Anuncios
    - link "Academia":
      - /url: /academia
      - img
      - text: Academia
    - link "Comunidad":
      - /url: /chat
      - img
      - text: Comunidad
    - paragraph: MI CUENTA
    - link "Mi Dashboard":
      - /url: /dashboard
      - img
      - text: Mi Dashboard
    - link "Mi Perfil":
      - /url: /perfil
      - img
      - text: Mi Perfil
    - link "📱 Redes Sociales":
      - /url: /redes
      - img
      - text: 📱 Redes Sociales
  - img
  - text: Radio Latino — En directo
- banner:
  - link "BailaNow":
    - /url: /
    - img "BailaNow"
  - navigation:
    - link "Cerca de mí":
      - /url: /cerca
    - link "Mercado":
      - /url: /marketplace
    - link "Eventos":
      - /url: /eventos
    - link "Artistas":
      - /url: /artistas
  - button:
    - img
  - button "ES"
  - button "EN"
  - button "Buscar... Ctrl K":
    - img
    - text: Buscar... Ctrl K
  - link "Entrar":
    - /url: /auth
  - link "Únete":
    - /url: /auth?tab=register
- main:
  - text: 4💃4
  - heading "¡Esta página no baila aquí!" [level=1]
  - paragraph: La página que buscas no existe o fue movida. ¡Pero hay mucho más por descubrir!
  - button "Volver":
    - img
    - text: Volver
  - button "Ir al inicio":
    - img
    - text: Ir al inicio
  - button "Explorar":
    - img
    - text: Explorar
  - paragraph: Páginas populares
  - button "🎧 Artistas"
  - button "🎉 Eventos"
  - button "🏪 Marketplace"
  - button "📢 Promociónate"
  - button "🎥 En Directo"
- img
- heading "Usamos cookies" [level=3]
- paragraph: Usamos cookies propias y de terceros para mejorar tu experiencia, analizar el uso y mostrarte contenido relevante. Puedes aceptar todas o personalizar tus preferencias.
- button "Aceptar todas":
  - img
  - text: Aceptar todas
- button "Personalizar":
  - img
  - text: Personalizar
- button "Solo necesarias":
  - img
  - text: Solo necesarias
- paragraph:
  - link "Política de cookies":
    - /url: /legal/cookies
  - text: ·
  - link "Privacidad":
    - /url: /legal/privacidad
- button "Cambiar a modo oscuro":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navegación principal', () => {
  4  |   const routes = [
  5  |     { path: '/', titleRegex: /BailaNow/ },
  6  |     { path: '/cerca', titleRegex: /BailaNow/ },
  7  |     { path: '/artistas', titleRegex: /BailaNow/ },
  8  |     { path: '/eventos', titleRegex: /BailaNow/ },
  9  |     { path: '/venues', titleRegex: /BailaNow/ },
  10 |     { path: '/clases', titleRegex: /BailaNow/ },
  11 |     { path: '/live', titleRegex: /BailaNow/ },
  12 |     { path: '/marketplace', titleRegex: /BailaNow/ },
  13 |     { path: '/mapa', titleRegex: /BailaNow/ },
  14 |     { path: '/legal/terminos', titleRegex: /BailaNow/ },
  15 |   ];
  16 | 
  17 |   for (const { path, titleRegex } of routes) {
  18 |     test(`${path} carga sin crash`, async ({ page }) => {
  19 |       const errors: string[] = [];
  20 |       page.on('pageerror', (err) => {
  21 |         if (!err.message.includes('manifest')) errors.push(err.message);
  22 |       });
  23 | 
  24 |       const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  25 |       expect(response?.status(), `Status para ${path}`).toBeLessThan(400);
  26 |       await expect(page).toHaveTitle(titleRegex);
  27 | 
  28 |       // No errores críticos JavaScript
  29 |       const critical = errors.filter(e =>
  30 |         e.includes('Minified React error') ||
  31 |         e.includes('Maximum update depth')
  32 |       );
  33 |       expect(critical, `${path} errores: ${critical.join(' | ')}`).toEqual([]);
  34 |     });
  35 |   }
  36 | 
  37 |   test('404 muestra página no encontrada', async ({ page }) => {
  38 |     await page.goto('/ruta-que-no-existe-12345');
  39 |     await page.waitForLoadState('domcontentloaded');
  40 |     // Debería redirigir a NotFoundPage (404)
  41 |     const notFound = page.locator('text=/404|no encontrad|Not Found/').first();
> 42 |     await expect(notFound).toBeVisible({ timeout: 5000 });
     |                            ^ Error: expect(locator).toBeVisible() failed
  43 |   });
  44 | });
  45 | 
```