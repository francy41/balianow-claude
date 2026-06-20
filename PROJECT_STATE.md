# PROJECT_STATE.md — BailaNow
_Última actualización: 2026-06-20_

## Estado general
La plataforma está en producción en bailanow.com. El código base es funcional y todas las secciones del panel admin están conectadas a Supabase (sin datos mock). La auditoría general del sistema quedó completada en esta sesión.

## Módulos completados (producción)

### Panel Admin (/admin)
- **Overview**: stats reales de BD (profiles, artists, events, venues, live_sessions, disputes)
- **Usuarios**: lee/edita/elimina de tabla `profiles`, cambia roles y estado
- **Roles**: gestión avanzada de roles desde `profiles`
- **Artistas**: carga real de tablas `artists` y `profiles` con roles artísticos
- **Bailarinas**: filtra `artists` por type=dancer/instructor + `profiles`
- **Localidades (venues)**: carga real de tabla `venues`, eliminar/editar persiste ✅ (corregido auditoría)
- **Eventos**: carga real de tabla `events`, eliminar/editar persiste ✅ (corregido auditoría)
- **Suscripciones**: tabla `subscriptions` real (MRR, activos/plan, Activar/Cancelar)
- **Mercado/Escrow**: tabla `escrows` real, liberar/reembolsar persiste
- **Cursos**: tabla `courses` real, CRUD completo
- **Disputas**: tabla `disputes` real, cambio de estado persiste
- **Reseñas**: tabla `reviews` real, eliminar persiste
- **Configuración**: tabla `site_config` (upsert por key), campos editables
- **Diseño/Media**: hero slider, logo desde `site_config`
- **Newsletter**: tabla `newsletter_subscribers`
- **Radio**: panel de gestión de emisoras

### Páginas públicas
- **HomePage**: directos reales, radio real (radio-browser API), ciudades sin contadores falsos
- **ArtistsPage**: datos reales de BD
- **EventsPage**: datos reales de BD
- **VenuesPage**: datos reales de BD + filtro por tipo (Discoteca, etc.)
- **MarketplacePage**: servicios reales de tabla `services` ✅ (corregido auditoría)
- **SubscriptionsPage**: registra solicitudes reales (status pending) en lugar de fingir activación

### Autenticación / Perfil
- **ProfileEditModal**: save real con retry logic, upsert si no existe fila, auto-geolocalización
- **DashboardPage**: performerId = user.id real ✅ (corregido auditoría)

### Infraestructura
- RLS `is_admin()`: aplicado en artists, categories, escrows, subscriptions, venues, events, services
- Public read RLS en venues, events, services (marketplace público)
- Tabla `subscriptions`: creada con trigger updated_at + RLS
- Sidebar: ruta `/academia` → `/clases` ✅ (corregido auditoría)
- Radio: API radio-browser `/bytag/{tag}` por género

## Tablas en Supabase
`profiles`, `artists`, `events`, `venues`, `live_sessions`, `disputes`, `reviews`, `escrows`, `courses`, `subscriptions`, `site_config`, `newsletter_subscribers`, `services`, `categories`

## Decisiones de arquitectura tomadas
- SQL vía Management API REST (no driver Postgres — ENOTFOUND en este entorno)
- RLS `is_admin()` SECURITY DEFINER unifica admin + superadmin
- Datos mock en `src/data/mockData.ts` mantenidos como fallback de tipo TypeScript, pero ninguna sección los muestra al usuario
- Deploy: Vite build → Vercel `--prod` → alias manual a bailanow.com (no CI automático por ahora)
- PowerShell como shell principal (Bash pierde herramientas esporádicamente en Windows)

## Pendientes activos
Ver Backlog.md
