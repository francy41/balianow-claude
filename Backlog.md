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

### #3 — ServiceDetailPage carga mock
`src/pages/ServiceDetailPage.tsx` usa mockData SERVICES para mostrar el detalle de un servicio.
Fix: cargar por `id` desde tabla `services` de Supabase.

### #4 — ArtistProfilePage carga mock
`src/pages/ArtistProfilePage.tsx` usa ARTISTS/LIVE_STREAMS mock.
Fix: cargar por `id` desde tablas `artists` + `live_sessions`.

## Media prioridad

### #5 — NearMePage fallback a mock
`src/pages/NearMePage.tsx` carga de Supabase primero pero cae a mockData si no hay resultados.
Fix: eliminar fallback, mostrar empty state honesto.

### #6 — Android build actualización
El APK existe (keystore BailaNow#Key2026). Verificar que el build de Capacitor incluye los últimos cambios.
Comando: `npm run build && npx cap sync android && npx cap open android`

### #7 — VendedoresPage mock
`src/pages/VendedoresPage.tsx` muestra ARTISTS y SERVICES mock.
Fix: cargar de Supabase (artists + services).

### #8 — PromocionatePage mock
`src/pages/PromocionatePage.tsx` usa PROMO_SERVICES/PROMO_SELLERS mock.
Fix: crear tabla `promo_services` o reutilizar `services` con un tipo especial.

## Baja prioridad / mejoras

### #9 — LiveNowPage streams schedule mock
`src/pages/LiveNowPage.tsx` usa LIVE_STREAMS / SCHEDULED_STREAMS mock.
Fix: conectar a `live_sessions` con status='scheduled'.

### #10 — MapPage fallback a mock
`src/pages/MapPage.tsx` intenta Supabase pero cae a mock.
Fix: eliminar fallback.

### #11 — Tipificación: reducir `as any`
23 ocurrencias en src/pages/. No crítico pero mejora DX y detecta bugs en typecheck.

### #12 — CI/CD automático
Actualmente deploy es manual. Considerar GitHub Action que haga build+deploy en push a master.

---
_Al completar un ítem: moverlo a PROJECT_STATE.md con fecha y decisiones tomadas. Mantener este archivo corto._
