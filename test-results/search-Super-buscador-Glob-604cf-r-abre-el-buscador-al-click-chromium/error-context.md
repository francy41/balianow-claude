# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Super buscador (GlobalSearch) >> SearchTriggerBar abre el buscador al click
- Location: tests\e2e\search.spec.ts:25:3

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=/Súper buscador|Super buscador|buscador|Buscar/').first()
    - locator resolved to <span class="text-xs hidden md:inline">Buscar...</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">…</div> from <main class="pt-14 pb-24 lg:pb-6 min-h-screen">…</main> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">…</div> from <main class="pt-14 pb-24 lg:pb-6 min-h-screen">…</main> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    10 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">…</div> from <main class="pt-14 pb-24 lg:pb-6 min-h-screen">…</main> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - img "BailaNow" [ref=e6]
    - navigation [ref=e7]:
      - generic [ref=e8]:
        - paragraph [ref=e9]: MENÚ
        - link "🏠 Inicio" [ref=e10] [cursor=pointer]:
          - /url: /
          - generic [ref=e11]: 🏠
          - generic [ref=e12]: Inicio
        - link "📍 Cerca de mí" [ref=e13] [cursor=pointer]:
          - /url: /cerca
          - generic [ref=e14]: 📍
          - generic [ref=e15]: Cerca de mí
        - link "🏙️ Ciudades" [ref=e16] [cursor=pointer]:
          - /url: /venues
          - generic [ref=e17]: 🏙️
          - generic [ref=e18]: Ciudades
        - link "📅 Eventos" [ref=e19] [cursor=pointer]:
          - /url: /eventos
          - generic [ref=e20]: 📅
          - generic [ref=e21]: Eventos
        - link "🎶 Artistas" [ref=e22] [cursor=pointer]:
          - /url: /artistas
          - generic [ref=e23]: 🎶
          - generic [ref=e24]: Artistas
        - link "💃 Bailarines" [ref=e25] [cursor=pointer]:
          - /url: /artistas?tipo=dancer
          - generic [ref=e26]: 💃
          - generic [ref=e27]: Bailarines
        - link "🔴 En Directo" [ref=e28] [cursor=pointer]:
          - /url: /clases
          - generic [ref=e29]: 🔴
          - generic [ref=e30]: En Directo
        - link "🛍️ Marketplace" [ref=e31] [cursor=pointer]:
          - /url: /marketplace
          - generic [ref=e32]: 🛍️
          - generic [ref=e33]: Marketplace
        - link "🎥 Streams" [ref=e34] [cursor=pointer]:
          - /url: /live
          - generic [ref=e35]: 🎥
          - generic [ref=e36]: Streams
        - link "💬 Comunidad" [ref=e37] [cursor=pointer]:
          - /url: /chat
          - generic [ref=e38]: 💬
          - generic [ref=e39]: Comunidad
      - generic [ref=e40]:
        - paragraph [ref=e41]: MERCADO
        - link "Ruta de Hoy" [ref=e42] [cursor=pointer]:
          - /url: /
          - img [ref=e43]
          - generic [ref=e46]: Ruta de Hoy
        - link "Proyectos" [ref=e47] [cursor=pointer]:
          - /url: /marketplace
          - img [ref=e48]
          - generic [ref=e51]: Proyectos
        - link "📢 Promociónate" [ref=e52] [cursor=pointer]:
          - /url: /promocionate
          - img [ref=e53]
          - generic [ref=e56]: 📢 Promociónate
        - link "Clases en vivo" [ref=e57] [cursor=pointer]:
          - /url: /live
          - img [ref=e58]
          - generic [ref=e61]: Clases en vivo
        - link "Ofertas" [ref=e62] [cursor=pointer]:
          - /url: /marketplace?cat=ofertas
          - img [ref=e63]
          - generic [ref=e67]: Ofertas
      - generic [ref=e68]:
        - paragraph [ref=e69]: COMUNIDAD
        - link "Anuncios" [ref=e70] [cursor=pointer]:
          - /url: /comunidad
          - img [ref=e71]
          - generic [ref=e74]: Anuncios
        - link "Academia" [ref=e75] [cursor=pointer]:
          - /url: /academia
          - img [ref=e76]
          - generic [ref=e79]: Academia
        - link "Comunidad" [ref=e80] [cursor=pointer]:
          - /url: /chat
          - img [ref=e81]
          - generic [ref=e83]: Comunidad
      - generic [ref=e84]:
        - paragraph [ref=e85]: MI CUENTA
        - link "Mi Dashboard" [ref=e86] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e87]
          - generic [ref=e92]: Mi Dashboard
        - link "Mi Perfil" [ref=e93] [cursor=pointer]:
          - /url: /perfil
          - img [ref=e94]
          - generic [ref=e97]: Mi Perfil
        - link "📱 Redes Sociales" [ref=e98] [cursor=pointer]:
          - /url: /redes
          - img [ref=e99]
          - generic [ref=e102]: 📱 Redes Sociales
    - generic [ref=e104]:
      - img [ref=e105]
      - generic [ref=e111]: Radio Latino — En directo
  - generic [ref=e113]:
    - banner [ref=e114]:
      - link "BailaNow" [ref=e115] [cursor=pointer]:
        - /url: /
        - img "BailaNow" [ref=e116]
      - navigation [ref=e117]:
        - link "Cerca de mí" [ref=e118] [cursor=pointer]:
          - /url: /cerca
        - link "Mercado" [ref=e119] [cursor=pointer]:
          - /url: /marketplace
        - link "Eventos" [ref=e120] [cursor=pointer]:
          - /url: /eventos
        - link "Artistas" [ref=e121] [cursor=pointer]:
          - /url: /artistas
      - generic [ref=e122]:
        - button [ref=e123] [cursor=pointer]:
          - img [ref=e124]
        - generic [ref=e127]:
          - button "ES" [ref=e128] [cursor=pointer]
          - button "EN" [ref=e129] [cursor=pointer]
        - button "Buscar... Ctrl K" [ref=e130] [cursor=pointer]:
          - img [ref=e131]
          - generic [ref=e134]: Buscar...
          - generic [ref=e135]: Ctrl K
        - generic [ref=e136]:
          - link "Entrar" [ref=e137] [cursor=pointer]:
            - /url: /auth
          - link "Únete" [ref=e138] [cursor=pointer]:
            - /url: /auth?tab=register
    - main [ref=e139]:
      - generic [ref=e140]:
        - generic [ref=e143]:
          - heading "Cerca de mí" [level=1] [ref=e144]:
            - img [ref=e145]
            - text: Cerca de mí
          - paragraph [ref=e148]: Descubre lo mejor del baile latino a tu alrededor
          - button "Tu ubicación Sin ubicación" [ref=e149] [cursor=pointer]:
            - generic [ref=e150]:
              - img [ref=e152]
              - generic [ref=e155]:
                - paragraph [ref=e156]: Tu ubicación
                - paragraph [ref=e157]: Sin ubicación
            - img [ref=e158]
          - generic [ref=e160]:
            - generic [ref=e161]: "Radio:"
            - button "50 km" [ref=e162] [cursor=pointer]
            - button "100 km" [ref=e163] [cursor=pointer]
            - button "500 km" [ref=e164] [cursor=pointer]
            - button "5K km" [ref=e165] [cursor=pointer]
        - generic [ref=e166]:
          - img [ref=e167]
          - generic [ref=e169]:
            - paragraph [ref=e170]: Permiso denegado
            - paragraph [ref=e171]: Elige una ciudad de abajo o haz clic en "Tu ubicación"
        - 'button "🔍 Súper buscador: locales, artistas, eventos, ciudades… K" [ref=e173] [cursor=pointer]':
          - img [ref=e174]
          - generic [ref=e177]: "🔍 Súper buscador: locales, artistas, eventos, ciudades…"
          - generic [ref=e178]:
            - img [ref=e179]
            - text: K
        - generic [ref=e182]:
          - img [ref=e183]
          - textbox "Filtrar resultados en esta página…" [ref=e186]
        - generic [ref=e187]:
          - button "🌍Todo (0)" [ref=e188] [cursor=pointer]
          - button "🔴En vivo (undefined)" [ref=e189] [cursor=pointer]
          - button "🟢Abierto ahora (undefined)" [ref=e190] [cursor=pointer]
          - button "🏛️Locales (0)" [ref=e191] [cursor=pointer]
          - button "🎉Eventos (0)" [ref=e192] [cursor=pointer]
          - button "🎤Artistas (0)" [ref=e193] [cursor=pointer]
          - button "💃Bailarines (0)" [ref=e194] [cursor=pointer]
          - button "🎧DJs (0)" [ref=e195] [cursor=pointer]
        - generic [ref=e197]:
          - img [ref=e198]
          - paragraph [ref=e201]: Activa tu ubicación
          - paragraph [ref=e202]: o elige una ciudad para empezar
          - button "📍 Usar mi ubicación" [ref=e203] [cursor=pointer]
        - generic [ref=e205]:
          - generic [ref=e206]:
            - heading "Elige tu ubicación" [level=2] [ref=e207]
            - button [ref=e208] [cursor=pointer]:
              - img [ref=e209]
          - generic [ref=e212]:
            - button "Usar mi ubicación actual" [ref=e213] [cursor=pointer]:
              - img [ref=e214]
              - text: Usar mi ubicación actual
            - paragraph [ref=e216]: Ciudades populares
            - button "Madrid" [ref=e217] [cursor=pointer]:
              - generic [ref=e218]:
                - img [ref=e219]
                - text: Madrid
            - button "Barcelona" [ref=e222] [cursor=pointer]:
              - generic [ref=e223]:
                - img [ref=e224]
                - text: Barcelona
            - button "Valencia" [ref=e227] [cursor=pointer]:
              - generic [ref=e228]:
                - img [ref=e229]
                - text: Valencia
            - button "Sevilla" [ref=e232] [cursor=pointer]:
              - generic [ref=e233]:
                - img [ref=e234]
                - text: Sevilla
            - button "Paris" [ref=e237] [cursor=pointer]:
              - generic [ref=e238]:
                - img [ref=e239]
                - text: Paris
            - button "Miami" [ref=e242] [cursor=pointer]:
              - generic [ref=e243]:
                - img [ref=e244]
                - text: Miami
            - button "New York" [ref=e247] [cursor=pointer]:
              - generic [ref=e248]:
                - img [ref=e249]
                - text: New York
            - button "Cali" [ref=e252] [cursor=pointer]:
              - generic [ref=e253]:
                - img [ref=e254]
                - text: Cali
            - button "Medellín" [ref=e257] [cursor=pointer]:
              - generic [ref=e258]:
                - img [ref=e259]
                - text: Medellín
            - button "La Habana" [ref=e262] [cursor=pointer]:
              - generic [ref=e263]:
                - img [ref=e264]
                - text: La Habana
  - generic [ref=e269]:
    - generic [ref=e270]:
      - img [ref=e272]
      - heading "Usamos cookies" [level=3] [ref=e274]
    - paragraph [ref=e275]: Usamos cookies propias y de terceros para mejorar tu experiencia, analizar el uso y mostrarte contenido relevante. Puedes aceptar todas o personalizar tus preferencias.
    - generic [ref=e276]:
      - button "Aceptar todas" [ref=e277] [cursor=pointer]:
        - img [ref=e278]
        - text: Aceptar todas
      - generic [ref=e280]:
        - button "Personalizar" [ref=e281] [cursor=pointer]:
          - img [ref=e282]
          - text: Personalizar
        - button "Solo necesarias" [ref=e285] [cursor=pointer]:
          - img [ref=e286]
          - text: Solo necesarias
    - paragraph [ref=e289]:
      - link "Política de cookies" [ref=e290] [cursor=pointer]:
        - /url: /legal/cookies
      - text: ·
      - link "Privacidad" [ref=e291] [cursor=pointer]:
        - /url: /legal/privacidad
  - button "Cambiar a modo oscuro" [ref=e292] [cursor=pointer]:
    - img [ref=e293]
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
  22 |     await expect(searchInput).not.toBeVisible({ timeout: 3000 });
  23 |   });
  24 | 
  25 |   test('SearchTriggerBar abre el buscador al click', async ({ page }) => {
  26 |     await page.goto('/cerca');
  27 |     await page.waitForLoadState('domcontentloaded');
  28 | 
  29 |     // El trigger bar debe estar en la página
  30 |     const trigger = page.locator('text=/Súper buscador|Super buscador|buscador|Buscar/').first();
  31 |     if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
> 32 |       await trigger.click();
     |                     ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  33 |       // El modal de búsqueda debería abrirse
  34 |       const searchInput = page.locator('input[placeholder*="locales"], input[placeholder*="Buscar"]').first();
  35 |       await expect(searchInput).toBeVisible({ timeout: 3000 });
  36 |     }
  37 |   });
  38 | });
  39 | 
```