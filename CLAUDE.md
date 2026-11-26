# CLAUDE.md — BailaNow (bailanow.com)

## Identidad del proyecto
- Nombre: BailaNow
- Descripción: Ecosistema SaaS de danza latina — artistas, venues, eventos, marketplace, radio en vivo, suscripciones premium
- Stack: React 18 + Vite 6 + TypeScript + Tailwind CSS + Zustand + Supabase + Cloudflare (Workers) + Capacitor (Android)
- Propietario: Solfa Mende / solfamendez41@gmail.com (superadmin)
- Repo: github.com/francy41/balianow-claude · rama: master
- Dominio producción: bailanow.com

## Comandos esenciales
- Desarrollo: `npm run dev` (puerto 3000)
- Build: `npm run build`
- Typecheck: `npx tsc --noEmit`
- Deploy: **automático** — todo push/merge a `master` en GitHub dispara build + deploy en Cloudflare Workers (~1-2 min). NO hay comando manual (ya no se usa Vercel).
- Ver despliegues: panel Cloudflare → proyecto `balianow-claude` → pestaña "Despliegues"
- Gestor de paquetes: npm (no usar pnpm/yarn)

## Hosting / Deploy (Cloudflare Workers)
- Web servida como assets estáticos SPA por Cloudflare Workers. GitHub conectado → deploy automático desde `master`.
- Config en `wrangler.jsonc`: `assets.not_found_handling: single-page-application` (fallback SPA sin `404.html`), `nodejs_compat`.
- Build command: `npm run build` · salida: `dist/` · Vite usa `@cloudflare/vite-plugin`.
- Dominios personalizados en el Worker: `bailanow.com` + `www.bailanow.com` (DNS + SSL gestionados por Cloudflare). Registros MX/TXT del correo (Amazon SES/Resend) intactos.
- Sitemap: `scripts/gen-sitemap.mjs` genera `public/sitemap.xml` en build tomando la Edge Function `sitemap` de Supabase (envía `VITE_SUPABASE_ANON_KEY` por si hay verify_jwt). Es no-fatal: si falla, el build continúa.
- Variables `VITE_*` viven en el panel de Cloudflare (Settings → Environment variables), no en Vercel.
- **Fusionar a `master` despliega SOLO la web.** Las Edge Functions de Supabase van aparte
  (MCP `deploy_edge_function` o el panel). Un arreglo en `supabase/functions/` no está vivo
  por haberlo fusionado.
- Cabeceras de seguridad y CSP en `public/_headers`, que Cloudflare sirve con los assets.
  La CSP está **probada en un navegador real**, no escrita a ojo: se sirve `dist/` con ella
  puesta y se cargan las rutas principales mirando la consola. Una CSP mal ajustada no da
  error visible — simplemente deja de funcionar el pago o el reproductor.
  - `'unsafe-inline'` en `style-src` es inevitable: Tailwind y React inyectan estilos en línea.
  - `img-src`/`media-src`/`connect-src` admiten cualquier `https:` porque las fotos de locales
    y las emisoras de radio son URLs que mete el administrador.
  - Si algún día falla un pago o un vídeo: mirar la consola. Si sale un mensaje de CSP, añadir
    ese dominio o borrar la línea para volver atrás al instante.

## Reglas de arquitectura (no deducibles leyendo el código)
- Supabase directo (ENOTFOUND en Postgres): toda migración SQL usa el Management API REST `/v1/projects/{ref}/database/query`
- Con el MCP de Supabase conectado se puede aplicar SQL y desplegar Edge Functions sin pasos manuales en el panel (`execute_sql`, `deploy_edge_function`). Al redesplegar una función hay que conservar su `verify_jwt` actual: `send-email` y `moderar-cuenta` van con `verify_jwt: false`.
- Probar RLS sin dejar datos: bloque `do $$ ... $$` que simula al usuario con `set_config('request.jwt.claims', ...)` y termina en `raise exception 'RESULTADO >>> %'` — el mensaje devuelve los resultados y la excepción deshace todo. `auth.users` ordenado por `created_at` empieza por el superadmin, así que para probar reglas hay que coger usuarios cuyo `role` no sea admin ni superadmin, o `is_admin()` falsea la prueba.
- `ref` del proyecto Supabase: `lpwwdjujxwxdvyoznehp`
- RLS: la función `public.is_admin()` verifica `role IN ('admin','superadmin')` — usarla en TODAS las políticas admin
- Admin multi-rol: superadmin y admin comparten las mismas políticas RLS
- PowerShell es el shell principal (Bash pierde grep/cat/node esporádicamente en este entorno Windows)
- Commits: mensajes simples `-m "..."` — los here-strings PS con `@'...'@` rompen si el mensaje contiene paréntesis o comillas

## Cobros: el precio NUNCA viaja del cliente
Regla que no se negocia: **el navegador dice QUÉ se compra, el servidor decide CUÁNTO cuesta.**

Hasta noviembre de 2026 tres funciones hacían `Number(body.price)` y cobraban eso. Cualquiera
con las herramientas del navegador abiertas podía suscribirse al plan de 22 € por un céntimo,
comprar un módulo por nada, o pagar 0,50 € por un servicio de 500 €. En el carrito, además,
el **vendedor** venía del cliente: se podía desviar la comisión a otra cuenta.

- `plan_prices` (plan_id, name, price, currency, active) — precios oficiales de TODOS los
  planes. Los de negocio van con prefijo `negocio_` porque el id `premium` ya existía en los
  de usuario con otro precio. Cambiar un precio aquí cambia lo que se cobra; los ficheros
  `src/data/dancePlans.ts`, `mockData.ts` y `adPlans.ts` son solo lo que se enseña.
- `create-subscription-checkout` y `create-module-checkout` leen el precio de la BD
  (`plan_prices` / `module_catalog` + `module_overrides`) con la clave de servicio.
- `create-payment-intent` busca cada `serviceId` en `services`, suma el total él mismo y saca
  el vendedor de la BD.
- **Las donaciones sí aceptan el importe del cliente**, y debe ser así: ahí lo elige quien dona.
- Cobrar un plan de negocio: `src/lib/businessPlans.ts`. Crea la fila en `subscriptions` como
  `pending`; el webhook de Stripe la pasa a `active` por `client_reference_id`, y también
  gestiona renovaciones y bajas sin código adicional.
- Comisiones en `DEFAULT_COMMISSIONS` (15% general, 20% cursos, 10% propinas). No es el margen:
  Stripe se lleva ~1,5% + 0,25 € de cada cobro.

## El muro (feed social tipo Instagram, `/muro`)
Se **extendió `posts`**, que ya existía vacía y sin usar, en vez de crear otra tabla. Sus
columnas heredadas se conservan: `content` es el texto, `city` el lugar, `likes` el contador.
No confundir con `community_posts`, que es el tablón de anuncios de texto con moderación previa.

Su política `Users can insert posts` tenía `with check (true)`: cualquiera podía publicar a
nombre de otra persona, incluso sin sesión.

- Contadores guardados en la fila y mantenidos por triggers. Contarlos al vuelo obliga a una
  consulta por publicación en cada carga del feed.
- Un negocio publica desde la cuenta de quien lo gestiona, con `venue_id`. La autoría personal
  no se pierde nunca: si hay que moderar, se sabe qué persona lo subió.
- El bloqueo corta en todo: publicaciones, comentarios, likes y seguimientos, en los dos sentidos.
- El dueño de una publicación puede retirar comentarios ajenos en ella.
- Los comentarios se retiran marcando `deleted_at`, no borrando la fila: el contador se mantiene
  solo y queda rastro para moderación.
- Paginación por fecha, no por número de página: en un feed que crece por arriba, saltar de
  página repite o se salta publicaciones.

Tablas: `posts`, `post_likes`, `post_comments`, `user_follows` · SQL: `supabase/feed-social.sql`

## Módulo social de locales (presencia, match, chat, reputación)
Resuelve un caso concreto: bailas con alguien toda la noche y te vas sin saber su nombre.

**Las reglas viven en el RLS de Postgres, no en el cliente.** Un cliente que llame a la
API a mano no las salta. No mover ninguna de estas comprobaciones al frontend.

- **Reciprocidad** — solo ve quién estuvo en un local quien también estuvo allí, y solo
  mientras las dos presencias siguen vigentes (ventana móvil de 12 h, no día de
  calendario, para que una noche que cruza la medianoche siga contando). Sin esto la
  lista sería el historial de ubicación de personas reales, abierto a cualquiera.
- **Presencia verificada** — los hombres (y quien no declara género) necesitan que el
  local confirme que estuvieron, por QR de entrada o a mano desde su panel, Y seguir el
  local con un margen de antelación (`site_config.checkin_margen_seguir_minutos`, 120 por
  defecto). Sin cumplirlo no aparecen NI ven la lista.
- **Segunda capa que no depende del género declarado** — `profiles.solo_verificados`
  (activado por defecto): cada persona puede exigir que solo le aparezca gente
  verificada. La regla por género se puede rodear marcando "mujer"; esta no.
- **Caducidad** — la presencia caduca sola y `limpiar_checkins()` borra lo caducado a los
  7 días (pg_cron, `bailanow-limpiar-checkins`). Nunca hacer permanente este registro.
- **Chat solo con match** — `messages` exige like mutuo y ausencia de bloqueo. Antes su
  política era `auth.uid() = sender_id`: cualquiera podía escribir a cualquiera.
- **Reputación solo con elogio** — sin estrellas ni nota. Puntuar personas del 1 al 5 en
  contexto de ligue acaba en rankings de gente y en castigo por rechazar a alguien. Lo
  malo va por `user_reports`, que lo lee el equipo. Solo reseña quien coincidió.
- **Suspensión en dos mitades** — `suspender_usuario()` corta lo social (BD) y la Edge
  Function `moderar-cuenta` cierra el acceso en `auth` y sus sesiones abiertas. Si la
  segunda falla hay que decirlo, no dar la cuenta por cerrada.

Tablas: `venue_checkins`, `venue_follows`, `user_blocks`, `user_reports`,
`dance_reviews`, `moderation_actions` · se reutilizan `partner_likes` y `messages`.

Funciones clave: `presencia_valida`, `estuve_en`, `exijo_verificados`, `hay_bloqueo`,
`hay_match`, `puede_resenar`, `quien_estuvo`, `mi_estado_en_local`,
`presencias_del_local`, `confirmar_presencia`, `mis_conversaciones`, `mis_matches`,
`reportes_admin`, `suspender_usuario`, `esta_suspendido`, `config_num`.

Una política RLS que consulta su propia tabla recursa sin fin: por eso `estuve_en()` va
con `security definer`.

SQL en `supabase/`: `quien-estuvo-aqui.sql`, `chat-con-match.sql`,
`presencia-verificada.sql`, `moderacion-y-automatismos.sql`, `reputacion-de-baile.sql`,
`cierre-disputas-resenas-acceso.sql`.

Pendiente: avisos push de mensaje nuevo (necesita Firebase); resumen diario de reportes
en vez de un correo por cada uno.

## Pendiente de producto (no bloquea nada)
- **Play Store**: contraseña del keystore, logo real (los iconos son un cuadrado naranja con
  un emoji), 5-8 capturas. Y decidir lo del **Google Play Billing**: vender las suscripciones
  dentro de la app Android cuesta un 15% de comisión; venderlas en la web y entrar en la app
  con la cuenta ya activa está permitido y lo evita.
- **AdMob** con consentimiento GDPR (SDK UMP, obligatorio en España) y exclusión de
  suscriptores: los tres planes prometen "Sin anuncios". El pre-roll VAST/IMA ya lo respeta.
- **BailaNow TV fase 1**: activar Cloudflare Stream y sus dos secretos.
- Antes de vender el primer plan de negocio: compra de prueba con tarjeta de test de Stripe,
  comprobando que la fila de `subscriptions` pasa de `pending` a `active`.

## Estructura crítica
- `src/pages/AdminPage.tsx` — panel superadmin (~3500 líneas), cada sección es un componente separado
- `src/components/VenueCheckIn.tsx` — presencia en un local, lista, match, bloqueo, reporte
- `src/components/VenuePresencePanel.tsx` — el dueño del local confirma quién estuvo
- `src/components/DirectThread.tsx` — chat uno a uno (solo con match)
- `src/components/DanceReviews.tsx` — reputación de baile + `ReputacionResumen`
- `src/components/ReportsAdminSection.tsx` — panel de reportes, suspensión y margen
- `src/pages/FeedPage.tsx` · `PostCard.tsx` · `PostComposer.tsx` · `ProfilePostsGrid.tsx` — el muro
- `src/lib/feed.ts` — capa de datos del muro (traduce las columnas heredadas de `posts`)
- `src/lib/businessPlans.ts` — contratar un plan de negocio (100/200/400 €)
- `supabase/functions/moderar-cuenta/` — bloquea el acceso en `auth` y cierra sus sesiones.
  Suspender tiene dos mitades: lo social en la BD y el acceso aquí. Si la segunda falla hay
  que decirlo, no dar la cuenta por cerrada.
- `src/store/appStore.ts` — stores Zustand (auth, UI, cart, wallet, siteConfig)
- `src/lib/supabase.ts` — cliente Supabase singleton
- `src/data/mockData.ts` — datos mock de fallback (reducir su uso progresivamente)
- `src/components/AdminEditModal.tsx` — modal edición genérica con `KEY_ALIASES` para mapear camelCase→snake_case

## Carpetas que NUNCA se deben tocar
- `node_modules/`, `dist/`, `.wrangler/`, `.vercel/` (heredada, ya sin uso), `android/` (Capacitor, solo tocar con comandos específicos)

## Convenciones de código
- Componentes: PascalCase, en `src/components/` o `src/pages/`
- Sin comentarios de código salvo WHY no obvio
- Sin datos mock nuevos — si una sección necesita datos, cargarlos de Supabase con estado loading + empty state honesto
- Antes de marcar tarea completa: `npx tsc --noEmit` y `npm run build` deben pasar sin errores

## Identidad visual
- Colores: brand-orange (#F97316), grays oscuros, fondo blanco/gris-50
- Fuente display: Nunito (font-display font-black)
- NO cambiar paleta de colores ni estructura de layout sin instrucción explícita

## Idioma
- Comunicación siempre en español
- Código y comentarios en inglés

## Compact Instructions
Cuando resumas esta conversación conserva:
- Todos los cambios de esquema de BD y su razón
- Errores de RLS y sus soluciones aplicadas
- Lista de archivos modificados en la sesión
- Estado de secciones admin: cuáles usan datos reales vs mock
- Credenciales y referencias mencionadas (PAT Supabase, ref proyecto)
- Decisiones de arquitectura y por qué se tomaron
