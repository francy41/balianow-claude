# Auditoría general de BailaNow

Fecha: 2026-08-26 · Alcance: 60.358 líneas · 203 ficheros TS/TSX · 52 páginas · 94 componentes · 70 rutas · 61 migraciones SQL · 77 tablas.

**No se ha modificado nada.** Esto es la FASE 1 (auditoría) y la FASE 2 (informe). El plan de corrección está al final.

---

## 0. Qué NO he podido auditar

Digo esto primero porque condiciona todo lo demás.

| Área | Motivo |
|---|---|
| Contenido real de la base de datos (duplicados, huérfanos, categorías mezcladas, perfiles sin dueño) | El conector de Supabase se desconectó a mitad de sesión. Sin credenciales no puedo consultar producción. |
| Flujos en ejecución (registro, pago, reserva, reclamación) | El navegador del entorno no alcanza Supabase: fallan las peticiones a **todas** las tablas. Verificado. |
| Estado real de RLS en producción | El repositorio no es fuente de verdad del esquema (ver hallazgo #1). |

Todo lo que sigue está verificado **sobre el código y las migraciones del repositorio**, con referencia de fichero y línea. Los puntos que dependen de producción están marcados como **[verificar en producción]**.

---

## 1. Problemas críticos

### C1 · El repositorio no puede reconstruir la base de datos

La aplicación consulta **92 tablas**. Las migraciones del repo crean **75**. Hay **29 tablas y vistas que ninguna migración crea**:

```
affiliate_referrals  affiliates  availability_slots  cities  class_bookings
class_offerings  class_reviews  courses  dance_country_ranking
dance_progress_summary  dance_scenarios  dance_styles  dance_world_leaderboard
disputes  escrows  live_sessions_enriched  media  page_views  partner_followers
profile_claims  profiles_admin  profiles_self  promo_sellers  promo_services
radio_stations  social_posts  subscriptions  support_messages  user_roles
```

Varias son centrales: `profile_claims` (reclamaciones), `escrows` y `disputes` (dinero), `user_roles` (permisos), `class_offerings` (clases), `subscriptions` (suscripciones), `cities` y `dance_styles` (catálogos que alimentan filtros).

**Consecuencias reales:**
- No hay entorno de pruebas reproducible. No se puede clonar producción para probar sin tocarla.
- No hay vuelta atrás documentada si una migración sale mal.
- Nadie sabe qué políticas RLS tienen esas 29 tablas. `profile_claims` y `escrows` guardan datos sensibles.
- Un desarrollador nuevo no puede levantar el proyecto.

Esto es lo que separa «una web que funciona» de «un producto lanzable». Es el hallazgo número uno.

### C2 · El modelo multi-rol está construido a medias, y la mitad que falta es la de seguridad

El frontend lee todos los roles de la cuenta desde `user_roles`:

- `src/hooks/useSupabaseAuth.ts:48` → `supabase.from('user_roles').select('role')`
- `src/components/ProtectedRoute.tsx:46-48` → concede acceso si el rol está en `user.role` **o** en `user.roles[]`

Pero **toda la autorización del servidor ignora `user_roles`**. La función `public.is_admin()`, usada en más de 100 políticas RLS, solo mira la columna única:

```sql
select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
```

Y el resto del frontend tampoco la usa: `Navbar.tsx:79`, `AdminPage.tsx:216`, `HomePage.tsx:2240`, `StreamingAds.tsx:24` y `GlobalSearch.tsx:95` comprueban únicamente `user.role`.

**Efecto concreto:** un usuario con `admin` en `user_roles` pero con `profiles.role = 'user'` **entra en `/admin`** (ProtectedRoute lo deja pasar), ve el panel renderizado como no-superadmin, y cada acción que intente falla en silencio porque RLS la rechaza. Es el peor de los mundos: parece que tiene permiso y no lo tiene.

### C3 · La definición del rol se contradice entre migraciones

- `supabase/schema.sql:15` → `role TEXT ... CHECK (role IN ('user','artist','dj','dancer','venue','admin'))` — **sin `superadmin`**, que es justo el rol que `is_admin()` necesita.
- `supabase/fix-partner-role.sql:11` → afirma que es un enum `public.user_role` y añade `superadmin` y `partner` con `ALTER TYPE`.

Las dos cosas no pueden ser ciertas. Además el frontend usa roles que no aparecen en ninguna de las dos listas: `promoter`, `business`, `instructor`, `moderator`, `assistant`. Si alguien intenta asignarlos, el `UPDATE` falla.

**[verificar en producción]** Hay que mirar el tipo real de `profiles.role` y su lista de valores admitidos antes de tocar nada.

### C4 · `idempotency_keys` está sin RLS y guarda respuestas de API

`supabase/add-audit-soft-delete.sql:59`:

```sql
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY, actor_id uuid, endpoint text,
  request_hash text, response jsonb, status integer, ...
);
```

Es la **única** tabla creada en el repo sin `enable row level security`, y no tiene ninguna política. Al vivir en el esquema `public`, PostgREST la expone: cualquiera con la clave anónima —que es pública y va en el bundle por diseño— puede leer `actor_id`, `endpoint` y el `response` completo de operaciones de pago, y potencialmente escribir claves para bloquear o repetir cobros.

### C5 · La protección anti-spam vive en el navegador

`src/lib/security.ts:154` → `checkClientRateLimit(action, maxPerMinute)`. Se usa en `AuthPage.tsx:167` junto a un honeypot.

Un límite en el cliente no es una protección: se salta abriendo la consola, o llamando a la API de Supabase directamente sin pasar por la web. No hay CAPTCHA, ni límite por IP en servidor, ni verificación de correo obligatoria antes de publicar.

Para un lanzamiento internacional esto es una invitación a registros masivos y perfiles falsos.

---

## 2. Problemas importantes

### I1 · Escrow y disputas: interfaz sin esquema, y sin retención configurable

`AdminPage.tsx:204-205, 2318, 2930, 3130` consulta `escrows` y `disputes`. Ninguna migración las crea (ver C1). Y no existe en ningún sitio del código o del SQL un campo de retención de fondos: `hold_days`, `release_after` o equivalente no aparecen.

O sea: el flujo de dinero que describes —retener, liberar a los 7/15 días, o en fecha de evento + X— **no está implementado**. Hay pantallas que leen tablas cuyo contrato nadie ha escrito.

### I2 · Un usuario no puede tener varios perfiles

`profiles` tiene una sola fila por usuario y un solo `role`. La arquitectura que pides —usuario → varios perfiles, cada perfil con su tipo y sus campos propios— **no existe**. Hoy los tipos se reparten así:

- `artists.type` ∈ `('dj','dancer','singer','band','instructor')` — DJ, bailarín, cantante, banda e instructor comparten tabla.
- `venues.type` ∈ `('club','bar','studio','restaurant','rooftop','lounge')`
- `events` es tabla aparte.

La separación entre bailarín y DJ **sí existe** a nivel de dato (`artists.type`). Lo que no existe es que un mismo usuario tenga a la vez un perfil de bailarín y otro de academia, con campos distintos cada uno.

### I3 · No hay slugs únicos: las URLs públicas van por id

`artists`, `venues` y `events` no tienen columna `slug`. Las rutas son `/artistas/:id`, `/venues/:id`, `/eventos/:id`. Existen `/u/:slug` y `/p/:slug`, pero no cubren el catálogo.

Para SEO internacional esto es un lastre: `bailanow.com/venues/8f3a-...` no posiciona; `bailanow.com/venues/madrid/sala-caracol` sí.

### I4 · El catch-all `/:city` se traga los enlaces mal escritos

`src/App.tsx:246` declara `/:city` justo antes del `*` de la línea 249. Cualquier ruta de **un solo segmento** que no esté declarada —un enlace con una errata, una URL antigua compartida— no da 404: aterriza en `CityPartnerPage` mostrando una ciudad inexistente. Los usuarios ven una página rota en vez de un 404 honesto, y Google indexa basura.

### I5 · 120 consultas sin límite

120 llamadas `.select('*')` sin `.limit()`. Hoy con 139 locales y 66 eventos no se nota. Con miles de filas, cada carga se arrastra la tabla entera al navegador. Ejemplos: `ModulesAdminSection.tsx:22`, `DanceChoreoAdmin.tsx:39`, `VenueReservationsManager.tsx:63`.

### I6 · Peso del cliente

- Mayor chunk: **720 kB** (184 kB comprimido). El build avisa de que supera los 500 kB.
- `AdminPage.tsx`: **5.985 líneas** en un solo fichero. `HomePage.tsx`: 3.077.

En móvil, con 3G, ese chunk es la diferencia entre entrar y abandonar.

### I7 · La validación de subida se fía del navegador

`src/lib/uploadHelper.ts:60,97` valida por `file.type`, que lo declara el propio navegador y se puede falsear. El límite de tamaño (`:92`) sí es efectivo. La validación real debe estar en la política del bucket.

---

## 3. Problemas menores

- **`is_admin()` se redefine 15+ veces** con `create or replace` en `MASTER-setup.sql` y otros. Todas idénticas, así que no rompe nada, pero cualquier cambio futuro hay que hacerlo en 15 sitios.
- **`partner_profiles` se crea en 4 ficheros distintos** (`MASTER-setup.sql:108`, `setup-all.sql:90`, `community-tv-all.sql:65`, `parejas-schema.sql:3`). Idempotente por `if not exists`, pero es deuda.
- **`console.log` con respuesta de envío de correo** en `ClassBookingModal.tsx:233`.

---

## 4. Lo que está bien y no hay que tocar

Lo digo explícitamente para que ninguna corrección lo rompa:

| Comprobación | Resultado |
|---|---|
| Enlaces internos rotos | **0 de 41** navegaciones. Todas tienen ruta declarada. |
| Botones muertos en el menú del admin | **0**. 50 entradas de menú, 50 componentes. Correspondencia exacta en ambos sentidos. |
| Claves secretas en el cliente | **Ninguna**. No hay `service_role` ni claves de Stripe secretas. La JWT del bundle es la clave anónima, pública por diseño. |
| `.env` versionado | Solo `.env.example`, sin valores. |
| RLS | **76 de 77** tablas del repo lo tienen activado. |
| Captura de errores | Sentry cableado en `main.tsx`, `App.tsx` y `RouteErrorBoundary.tsx`. |
| Subida de ficheros | Límite de tamaño efectivo y lista de tipos permitidos. |
| Borrado suave | `deleted_at` presente y filtrado en las páginas públicas. |
| Registro de acciones admin | `admin_audit_log` y `audit_logs` existen. |

---

## 5. Plan de corrección (FASE 3)

Ordenado por riesgo, no por facilidad. Cada bloque es independiente y desplegable por separado.

### Bloque 1 — Recuperar el control del esquema *(bloquea a todos los demás)*
1. Volcar el esquema real de producción a `supabase/schema-actual.sql`: las 29 tablas ausentes, con sus columnas, índices, claves y políticas RLS.
2. Comparar con el repo y documentar cada diferencia.
3. Consolidar las migraciones dispersas en un histórico ordenado y numerado.
4. Auditar el RLS de esas 29 tablas, empezando por `profile_claims`, `escrows`, `disputes` y `user_roles`.

**Necesito acceso a Supabase para esto.** Sin él, el resto del plan se apoya en suposiciones.

### Bloque 2 — Cerrar los agujeros de seguridad
5. Activar RLS y políticas en `idempotency_keys` (C4).
6. Unificar la autorización en una sola fuente de verdad (C2): o `is_admin()` pasa a mirar también `user_roles`, o el frontend deja de mirarlo. Recomiendo lo primero, con una función `public.has_role(text)`.
7. Igualar todas las comprobaciones del frontend a esa misma función.
8. Resolver la contradicción del tipo de `role` (C3) y añadir los roles que el frontend ya usa.

### Bloque 3 — Anti-spam real
9. Rate limit en servidor (Edge Function o política) para registro, publicación y mensajes.
10. CAPTCHA en registro y en formularios públicos.
11. Verificación de correo obligatoria antes de publicar contenido.

### Bloque 4 — Arquitectura de perfiles
12. Diseñar `profiles` → `user_profiles` (varios por usuario) con `type`, campos comunes centralizados y campos específicos en JSONB o tablas satélite.
13. Añadir `slug` único a artistas, locales y eventos, con redirección desde las URLs por id.
14. Migrar los datos existentes sin perder nada.

### Bloque 5 — Dinero
15. Escribir el esquema de `escrows` y `disputes`.
16. Implementar la retención configurable desde SuperAdmin (inmediata / 7 / 15 días / fecha de evento + X / manual).
17. Cerrar el flujo de disputas: abrir, pruebas, respuesta, mediación, resolución, reembolso total o parcial.

### Bloque 6 — Escala y rendimiento
18. Paginación y `limit()` en las 120 consultas abiertas.
19. Trocear `AdminPage.tsx` y cargar sus secciones bajo demanda.
20. Reducir el chunk de 720 kB.

### Bloque 7 — Higiene
21. Cambiar `/:city` por una lista blanca de ciudades, para que las rutas desconocidas den 404.
22. Dejar `is_admin()` y `partner_profiles` definidas en un solo sitio.
23. Quitar el `console.log` de `ClassBookingModal.tsx:233`.

---

## 6. Qué necesito de ti para seguir

1. **Reconectar Supabase**, o darme otra vía de acceso. El Bloque 1 no se puede hacer sin ello, y es el que desbloquea el resto.
2. **Decidir sobre el Bloque 4.** Rehacer la arquitectura de perfiles es la corrección más profunda y la que más riesgo tiene de romper lo que ya funciona. Se puede hacer, pero quiero tu visto bueno explícito antes de tocar datos existentes.
3. **Confirmar prioridad.** Mi recomendación: Bloques 1 y 2 antes de cualquier otra cosa. Son los que impiden lanzar con tranquilidad.
