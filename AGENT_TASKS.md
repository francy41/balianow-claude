# AGENT_TASKS.md — BailaNow
_Sesión: 2026-06-20 — Auditoría general del sistema_

## Tarea completada en esta sesión
Auditoría completa del sistema: identificar y corregir secciones con datos mock, rutas rotas y flujos de edición defectuosos.

## Archivos modificados
- `src/pages/AdminPage.tsx` — LocalidadesSection y EventosSection reescritas con carga real de Supabase
- `src/pages/MarketplacePage.tsx` — reescrita para cargar `services` de Supabase (con estado loading/empty honesto)
- `src/pages/DashboardPage.tsx` — performerId = user.id (antes hardcodeado a 'a1')
- `src/components/layout/Sidebar.tsx` — ruta `/academia` → `/clases`
- `src/pages/SubscriptionsPage.tsx` — solicitud real a tabla `subscriptions` en lugar de fingir premium gratis
- Supabase: RLS policies añadidas para venues, events, services (admin + public read)
- Supabase: tabla `subscriptions` creada con RLS

## Archivos creados en esta sesión
- `CLAUDE.md` — contexto persistente del proyecto
- `PROJECT_STATE.md` — snapshot del estado actual
- `AGENT_TASKS.md` — este archivo
- `Backlog.md` — pendientes activos
- `.claudeignore` — carpetas a ignorar

## Próxima tarea sugerida
Ver Backlog.md — ítem #1 (Stripe checkout) o ítem #2 (Android build update)
