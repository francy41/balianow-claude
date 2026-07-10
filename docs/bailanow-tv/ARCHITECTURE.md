# BailaNow TV — Arquitectura

_El Netflix del baile latino: streaming por suscripción + economía de creadores, como módulo dentro del ecosistema BailaNow._

Documento de diseño previo a construcción. Estado: **v1 (diseño)**.

---

## 0. Decisión de arquitectura clave

**Construir BailaNow TV como un módulo sobre el backend Supabase + Stripe que YA existe, NO como un stack Node/Next paralelo.**

El brief sugiere Next.js + Node + PostgreSQL. Pero BailaNow ya corre sobre Supabase (PostgreSQL + Auth + RLS + Realtime) con Stripe integrado, wallet, suscripciones y directos (Jitsi). Un backend Node separado fragmentaría el ecosistema, duplicaría auth/pagos y multiplicaría el coste.

**Reutilizar:** Auth (email/Google), Postgres + RLS, Stripe (PaymentIntents + Billing), wallet/comisiones/escrow, directos (Jitsi) + PPV.

**Añadir nuevo:** proveedor de vídeo gestionado (Mux o Cloudflare Stream), motor de regalías (job mensual + tablas), Stripe Connect (pagos a creadores con KYC), catálogo tipo Netflix + recomendaciones, ingesta de eventos de reproducción (heartbeats).

---

## 1. Arquitectura del sistema

```
Cliente (React/Next) → Supabase Auth → Edge Functions → PostgreSQL + RLS
Reproductor → URL firmada (Edge Function valida suscripción) → Mux/CF Stream (CDN) → heartbeats → watch_events
```

- **Frontend:** React (ya existe) o Next.js si se quiere SSR/SEO del catálogo. Mobile-first, PWA + Capacitor.
- **Backend:** Supabase (Postgres, Auth, RLS, Realtime, Storage). Lógica sensible en Edge Functions (regalías, firma de vídeo, webhooks Stripe).
- **Vídeo:** Mux o Cloudflare Stream (transcodificación, HLS adaptativo, CDN, URLs firmadas, DRM). Nunca servir vídeo desde el propio servidor.
- **Pagos:** Stripe Billing (suscripciones) + Stripe Connect (pagos a creadores).
- **Datos/eventos:** heartbeats → agregados diarios (vistas materializadas) → cálculo mensual de regalías.
- **Buscador/Reco:** Postgres full-text al inicio; recomendación por reglas → ML con datos.

---

## 2. Modelo de datos (tablas núcleo, todas con RLS)

Además de las existentes (`profiles`, `subscriptions`, `live_sessions`, `payments`, `live_access`, `content_access`…).

| Dominio | Tabla | Campos clave |
|---|---|---|
| Creadores | `creators` | user_id, tipo (profe/bailarín/academia), bio, verificado, stripe_connect_id, país, estado_kyc |
| Creadores | `academies` | owner_id, nombre, plan |
| Creadores | `academy_members` | academy_id, creator_id, rol |
| Catálogo | `titles` | id, creator_id, tipo (clase/curso/programa/masterclass), estilo, nivel, portada, estado (borrador/revisión/publicado), acceso (free/basico/premium) |
| Catálogo | `seasons` | title_id, nº, nombre |
| Catálogo | `lessons` | title_id, season_id, orden, mux_asset_id, duración_seg, acceso |
| Catálogo | `categories` | slug, tipo (estilo/nivel/formato), nombre |
| Consumo | `watch_events` | user_id, lesson_id, segundos_validados, ts, device, session_id |
| Consumo | `watch_progress` | user_id, lesson_id, posición_seg, completado, updated_at |
| Consumo | `favorites` / `lists` / `follows` / `reviews` | user_id, title_id/creator_id, rating… |
| Economía | `plans` | id, nombre, precio, stripe_price_id, features |
| Economía | `royalty_periods` | mes, ingresos_netos, pool_creadores, estado |
| Economía | `royalty_shares` | period_id, creator_id, score, minutos_validados, importe |
| Economía | `payouts` | creator_id, period_id, importe, estado, stripe_transfer_id |

---

## 3. Tipos de usuario y permisos (RLS)

Un usuario puede ser alumno y creador a la vez.

- **Alumno:** perfil, suscripción, ver clases, favoritos, listas, continuar viendo, seguir profes, valorar, comunidad.
- **Creador (profe/bailarín):** perfil profesional + verificación, subir vídeos, crear cursos/temporadas/niveles, estadísticas, finanzas, regalías.
- **Academia:** perfil empresarial, varios profesores, programas completos, gestión de alumnos, estadísticas avanzadas.
- **Superadmin:** aprobar contenido/creadores, configurar %, ver ingresos y regalías, categorías/colecciones/promociones.

---

## 4. Planes de suscripción (Stripe Billing)

El plan define el nivel de acceso del contenido (columna `acceso`).

| Plan | Precio (ejemplo) | Incluye |
|---|---|---|
| Gratis | 0 € | Contenido gratuito, clases básicas, vista limitada |
| Básico | 9,99 €/mes | Catálogo completo, sin publicidad, clases ilimitadas |
| Premium | 17,99 €/mes | Todo + exclusivas + directos + comunidad privada |
| Academia | desde 49 €/mes | Varias cuentas, gestión de alumnos, estadísticas avanzadas |

Precios de ejemplo — validar con mercado. Anual con descuento.

---

## 5. Modelo económico y regalías (30/70)

- **30% BailaNow TV:** tecnología, servidores, streaming, marketing, desarrollo, operaciones, soporte.
- **70% fondo de creadores:** se reparte por rendimiento (no a partes iguales). Métrica principal: minutos vistos validados.

### Algoritmo

```
Fondo = 0,70 × Ingresos_netos
Score(c) = 0,70·%min_validados(c) + 0,10·%finalizaciones(c)
         + 0,10·%altas_atribuidas(c) + 0,05·valoración(c) + 0,05·engagement(c)
Pago(c) = Fondo × Score(c) / Σ Score(todos)
```

**Ejemplo:** 100.000 € ingresos → plataforma 30.000 €, fondo creadores 70.000 €. Un creador con el 5% del score recibe 3.500 €.

### Anti-fraude (imprescindible desde el día 1)

Solo cuentan **minutos validados**: heartbeats cada ~15s + evento real de play, tope por usuario/clase/mes, exclusión de auto-vistas, detección de velocidad/patrones, reserva de retención ante reembolsos. Pagos con umbral mínimo (p. ej. 50 €) vía Stripe Connect.

---

## 6. Arquitectura de vídeo

- **Subida:** creador sube → Mux/CF transcodifica a múltiples calidades (HLS).
- **Acceso:** cliente pide URL de reproducción **firmada** a una Edge Function que valida la suscripción antes de emitirla.
- **Protección:** tokens de corta duración, signed URLs, DRM opcional, marca de agua en premium.
- **Reproducción:** bitrate adaptativo, continuar viendo (`watch_progress`), historial y heartbeats.

**Riesgo legal — música con derechos:** el baile latino usa música protegida. Política de audio (libre de derechos / licencias / audio propio) + revisión de copyright en la aprobación.

---

## 7. Experiencia tipo Netflix

Mobile-first, visual. Inspiración: Netflix + Spotify + YouTube.

- **Home:** tendencias, más vistos, nuevos lanzamientos, recomendados, continuar viendo.
- **Categorías:** por estilo (salsa, bachata…), por nivel (principiante→pro), por formato (clase, curso, programa 30 días, masterclass, directo).
- **Ficha:** portada, tráiler, temporadas, profesor + seguir, valoraciones, favoritos, listas.
- **Recomendación:** reglas al inicio → ML colaborativo con volumen de datos.

---

## 8. Paneles

**Creador:** contenido (subir/crear cursos/temporadas/niveles), estadísticas (visualizaciones, minutos, seguidores, países, ranking), finanzas (ingresos acumulados, regalías, historial y próximos pagos).

**Superadmin:** contenido (aprobar/editar/eliminar/destacar/categorías), creadores (aprobar, revisar, contratos/KYC), economía (ingresos, configurar %, pagos, regalías), catálogo (colecciones, promociones, curación).

---

## 9. Integración con el ecosistema BailaNow

El diferencial vs Netflix: cerrar el círculo **aprender → bailar → asistir → contratar**.

- Mismo login, perfil y wallet en todo el ecosistema.
- Un profe de TV es contratable en el Marketplace y puede hacer directos PPV (ya existe).
- Cross-selling: "¿Te gustó esta clase de bachata? Hay un social esta noche cerca de ti."

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Coste de streaming | Alto | Proveedor gestionado + bitrate adaptativo (escala con ingresos) |
| Fraude en regalías | Alto | Minutos validados, topes, anti-bot, reserva de retención |
| Derechos de música | Legal/alto | Política de audio + revisión de copyright |
| Cold start (catálogo vacío) | Alto | Fichar 20-50 profes ancla antes de abrir; contenido semilla |
| Pagos a creadores (fiscal/KYC) | Medio | Stripe Connect (KYC, impuestos, transferencias por país) |
| Piratería de vídeo | Medio | Signed URLs, DRM, marca de agua premium |
| Churn de suscripción | Medio | Programas 30 días, rachas, retos, comunidad |

---

## 11. Flujos clave

- **Alumno:** Registro → elige plan → Stripe → catálogo → ve clase → continuar viendo.
- **Creador:** Alta creador → KYC (Connect) → sube curso → revisión admin → publicado → regalía mensual.

---

## 12. Escalabilidad (millones de usuarios)

- **Vídeo:** proveedor + CDN absorben el tráfico global.
- **BD:** réplicas de lectura, índices, vistas materializadas para agregados de visionado.
- **Regalías:** job mensual por lotes sobre agregados diarios.
- **Caché:** catálogo/home cacheados (CDN/edge).
- **Serverless:** Edge Functions escalan solas.

---

## 13. Roadmap por fases

1. **MVP** — Catálogo + suscripción + reproducción segura. Subida (Mux), planes Stripe, home simple, ver clase con acceso por plan, continuar viendo, favoritos. Regalías calculadas, pago manual. 20 profes ancla.
2. **Creadores** — Panel de creador + regalías automáticas. Stripe Connect + KYC, estadísticas, job mensual con anti-fraude, pagos automáticos, cursos/temporadas/niveles.
3. **Experiencia** — Recomendaciones + comunidad + directos. Recomendador, retos, seguir/comentar, BailaNow Live de pago, programas 30 días.
4. **Escala** — Academias multi-cuenta, i18n, ML, DRM, apps nativas, expansión de mercados.
