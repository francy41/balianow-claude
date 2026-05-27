# 📋 Auditoría Técnica — BailaNow

> **Realizada:** 2025-11-25 · **Auditor:** Claude (rol: arquitecto senior SaaS)
> **Comparativa:** Booking.com / Ticketmaster / Eventbrite
> **Veredicto:** Listo para **soft launch** (beta) — necesita 2-3 semanas más para "production-ready" real

---

## ✅ Lo que tienes BIEN

| Capa | Estado | Nota |
|---|---|---|
| Stack moderno | ✅ React 18 + Vite 6 + TS 5 + Supabase 2 | Top tier |
| 37 tablas + RLS en TODAS | ✅ Buena cobertura | Mejor que muchos SaaS en producción |
| 47 FKs + 86 índices + 11 triggers | ✅ Integridad de datos OK | |
| 7 Edge Functions con CORS estricto | ✅ Bien arquitectadas | |
| Sentry + replays activo | ✅ Configurado | |
| 3 pasarelas pago (Stripe + PayPal + Escrow) | ✅ Operativas | |
| OAuth Google + email/password + magic links | ✅ Auth robusta | |
| Sistema lockout + honeypot + rate limit cliente | ✅ Anti-brute force | |
| GHL integrado (chat, social, newsletter) | ✅ Único en el mercado | |
| Dark mode | ✅ Soportado | |
| Responsive móvil | ✅ Buen UX | |

---

## 🔴 Crítico — Bloqueadores de launch SaaS

| # | Issue | Impacto | Solución |
|---|---|---|---|
| 1 | **10 páginas con mockData** | Datos falsos en prod | Migrar a BD real (ya empezado, falta MarketplacePage, ExplorePage, PromocionatePage, etc.) |
| 2 | **0 tests automáticos** | Cada cambio puede romper | Mínimo: Playwright 5 E2E críticos |
| 3 | **165 usos de `any`** | Type-safety perdida | `supabase gen types` + reemplazar |
| 4 | **108 console.log** en src | Posible fuga info | Aunque silenciados en prod, mejor limpiar |
| 5 | **Sin audit log admin** | Imposible saber quién hizo qué | Tabla `audit_logs` (lo añado ahora) |
| 6 | **Hard deletes (sin papelera)** | Datos perdidos = drama legal | `deleted_at` columns (lo añado ahora) |
| 7 | **Sin idempotency keys en payments** | Doble cobro posible | Header `Idempotency-Key` en webhooks |
| 8 | **Sin sitemap.xml** | SEO = 0 indexación profunda | Generar dinámico (lo añado ahora) |
| 9 | **Sin robots.txt** | Crawlers sin guía | Generar dinámico (lo añado ahora) |
| 10 | **Sin health check endpoint** | No se puede monitorear | `/api/health` (lo añado ahora) |

---

## 🟡 Importante — Para escala (post-launch)

| # | Issue | Solución sugerida |
|---|---|---|
| 1 | Sin tests E2E | Playwright + 5 flujos críticos (login, signup, búsqueda, booking, pago) |
| 2 | Sin tipos auto-generados | `npx supabase gen types typescript --project-id lpwwdjujxwxdvyoznehp > src/types/db.ts` |
| 3 | Bundle 760KB (210KB gz) | Code-splitting agresivo + lazy load de Sentry replay |
| 4 | Sin i18n (multi-idioma) | `i18next` (latam = español/inglés/portugués) |
| 5 | Sin notificaciones push web | Service Worker + Web Push API + VAPID keys |
| 6 | Sin email transaccional templates | Postmark / Resend con templates (welcome, booking, refund) |
| 7 | Sin refund flow completo | Stripe refund API + UI admin |
| 8 | Sin dispute resolution | Tabla disputes existe pero sin UI dedicada |
| 9 | Sin loyalty program | Sistema de puntos / tier system |
| 10 | Sin multi-currency | Tabla `exchange_rates` + conversión |
| 11 | Sin sistema de afiliados | Tracking codes + comisiones split |
| 12 | Sin search avanzado (Algolia/Typesense) | Postgres full-text search como mínimo |
| 13 | Sin analytics de producto | PostHog (free hasta 1M events/mes) |
| 14 | Sin a11y validado | Lighthouse score + ARIA labels |
| 15 | Sin documentación API pública | Si quieres ser plataforma → docs.bailanow.com |

---

## 🟢 Nice-to-have — Cuando tengas tracción

- Status page público (https://status.bailanow.com)
- CDN propio para media (Cloudflare R2 ahora usa Cloudinary demo)
- Feature flags (LaunchDarkly / propio)
- A/B testing framework
- Recomendaciones ML (artistas similares)
- Mobile native (Capacitor → builds App Store/Play)
- Webhook subscriptions para partners
- API pública con rate limiting + API keys
- Multi-tenancy (white-label para escuelas/promotoras)
- Sistema de reservas con asientos numerados (Ticketmaster style)
- QR scanner integrado en app para validar tickets en puerta

---

## 📊 Comparativa con Booking / Ticketmaster

| Feature | Tu app | Booking.com | Ticketmaster | Gap real |
|---|---|---|---|---|
| Búsqueda geolocalizada | ✅ | ✅ | ✅ | OK |
| Filtros avanzados | ⚠️ Básico | ✅ Múltiple | ✅ Múltiple | Faltan precio range, fechas range |
| Reservas | ✅ MVP | ✅ Asientos | ✅ Asientos | Sin selección de asiento numerado |
| Pagos múltiples | ✅ Stripe+PayPal | ✅ +PayMe + crypto | ✅ +Google/Apple Pay | Falta Apple/Google Pay |
| Tickets QR | ✅ Generación | ✅ + scan offline | ✅ + scan offline | Falta validación en puerta |
| Reviews | ⚠️ Tabla creada | ✅ Verificadas | ✅ Verificadas | Sin sistema de moderación |
| Cancelaciones | ❌ | ✅ Auto | ✅ Auto | No implementado |
| Refunds | ❌ Manual | ✅ Auto | ✅ Auto | No implementado |
| Multi-idioma | ❌ | ✅ 40+ | ✅ 30+ | Solo español |
| Multi-currency | ❌ | ✅ 70+ | ✅ 20+ | Solo EUR |
| Dashboard vendor | ⚠️ Básico | ✅ Profesional | ✅ Profesional | Falta analytics, payouts |
| Comisiones split | ⚠️ Configurable | ✅ Auto-charge | ✅ Auto-charge | Sin Stripe Connect |
| Disputes | ⚠️ Tabla solo | ✅ Mediation UI | ✅ Mediation UI | Sin UI dedicada |
| Notificaciones push | ❌ | ✅ Web+SMS+Email | ✅ Web+SMS+Email | Solo email vía GHL |

---

## 🛠️ Plan de acción 2 semanas pre-launch real

### Semana 1 (esto que estoy haciendo ahora):
- [x] Eliminar mockData de páginas críticas
- [x] Conectar admin sections a BD real
- [x] Editar inline en perfil
- [ ] Tabla `audit_logs` + soft deletes
- [ ] Sitemap + robots dinámicos
- [ ] Health check endpoint
- [ ] Generar tipos Supabase

### Semana 2:
- [ ] 5 tests E2E con Playwright
- [ ] Refund flow Stripe
- [ ] Email templates transaccionales
- [ ] Documentación README + .env vars
- [ ] Bundle splitting + lazy load
- [ ] PWA service worker básico

### Post-launch (primeros 30 días):
- [ ] Monitor Sentry diario
- [ ] Iterar según feedback usuarios
- [ ] Agregar i18n
- [ ] Multi-currency

---

## 🚨 Conclusión sincera de senior

Tu proyecto está al **75-80% de listo** para un SaaS real. Es **MUCHO más que un MVP** — comparable a una startup serie A en términos de features. Pero le falta el "**último 20% que separa producto de producto profesional**":

- **Testing** (lo más importante)
- **Refunds / cancelaciones automáticas**
- **Documentación**
- **Bundle perf**

Si lanzas hoy:
- ✅ Funcionará para los primeros 100-500 usuarios
- ⚠️ A partir de 1000+ usuarios encontrarás bugs por falta de tests
- ❌ Si tienes una disputa de pago compleja, tu sistema manual va a sufrir

**Mi recomendación:** lanza en **beta cerrada** ahora con 50 usuarios reales, mientras añades los items críticos. Lanzamiento público en 2 semanas.
