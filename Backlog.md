# Backlog.md — BailaNow
_Actualizado: 2026-06-20 — Solo pendientes activos. Lo completado va a PROJECT_STATE.md._

## Alta prioridad

### #1 — Stripe checkout recurrente (suscripciones)
La tabla `subscriptions` existe y el admin puede activar/cancelar manualmente.
Falta: conectar botón "Contratar" en SubscriptionsPage a un Stripe Checkout real con precio recurrente.
Archivos a tocar: `src/pages/SubscriptionsPage.tsx`, nueva Edge Function Supabase para crear sesión Stripe.

### #2 — Cancelación + refund flow básico (escrow)
MercadoSection tiene Liberar y Reembolsar. Falta:
- Notificar al usuario (email o in-app) cuando su escrow es liberado/reembolsado
- Conectar con pasarela de pago real para mover fondos
Archivos a tocar: `src/pages/AdminPage.tsx` (MercadoSection)

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
