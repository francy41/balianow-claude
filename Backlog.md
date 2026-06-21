# Backlog.md — BailaNow
_Actualizado: 2026-06-20 — Solo pendientes activos. Lo completado va a PROJECT_STATE.md._

## Alta prioridad

### ~~#1 — Stripe checkout recurrente (suscripciones)~~ ✅ 2026-06-21
Edge Function `create-subscription-checkout` (modo subscription, price_data inline). Webhook actualiza la tabla `subscriptions` (checkout.session.completed / invoice.paid / payment_failed / subscription.deleted). SubscriptionsPage redirige a Stripe Checkout y cae a flujo manual si Stripe no responde. STRIPE_SECRET_KEY ya está en los secrets del proyecto. NOTA: deploy de Edge Functions SOLO con Supabase CLI (el script Node rompe el bundling).

### ~~#2 — Notificación in-app de escrow liberado/reembolsado~~ ✅ 2026-06-21
Tabla `notifications` + RLS. MercadoSection notifica al payee (liberado) / payer (reembolsado). Componente `NotificationsBell` real en el Navbar (contador no leídas, dropdown, marcar leídas).
PENDIENTE (requiere pasarela real): mover fondos de verdad en el reembolso — hoy solo cambia estado + notifica.

### ~~#3 — ServiceDetailPage carga mock~~ ✅ 2026-06-20
### ~~#4 — ArtistProfilePage carga mock~~ ✅ 2026-06-20

## Media prioridad

### ~~#5 — NearMePage fallback a mock~~ ✅ 2026-06-21 (import huérfano eliminado; ya cargaba solo de Supabase)

### #6 — Android build actualización
El APK existe (keystore BailaNow#Key2026). Verificar que el build de Capacitor incluye los últimos cambios.
Comando: `npm run build && npx cap sync android && npx cap open android`

### ~~#7 — VendedoresPage mock~~ ✅ 2026-06-20

### ~~#8 — PromocionatePage mock~~ ✅ 2026-06-21
Tablas `promo_sellers` + `promo_services` (JSONB platforms/tags/includes/extras/social_proof) con RLS. Catálogo curado migrado a BD (5 sellers, 7 servicios). Página carga real con loading/empty states. Sección admin "Promociónate" con CRUD completo (añadir/editar/aprobar/ocultar/eliminar).

## Baja prioridad / mejoras

### ~~#9 — LiveNowPage streams schedule mock~~ ✅ 2026-06-21 (carga de live_sessions_enriched, empty states honestos, chat sin mensajes falsos)
### ~~#10 — MapPage fallback a mock~~ ✅ 2026-06-21 (bloque fallback eliminado)

### #11 — Tipificación: reducir `as any`
23 ocurrencias en src/pages/. No crítico pero mejora DX y detecta bugs en typecheck.

### #12 — CI/CD automático
Actualmente deploy es manual. Considerar GitHub Action que haga build+deploy en push a master.

---
_Al completar un ítem: moverlo a PROJECT_STATE.md con fecha y decisiones tomadas. Mantener este archivo corto._
