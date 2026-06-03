# 💃 BailaNow

> **El ecosistema latino #1** — DJs, bailarines, artistas, eventos, venues, marketplace y livestreams 100% latino.

[![Status](https://img.shields.io/badge/status-beta-pink)](https://bailanow.com)
[![Build](https://img.shields.io/badge/build-passing-success)](https://vercel.com)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black)](https://bailanow.com)

🌐 **Production:** https://bailanow.com
🩺 **Health:** https://bailanow.com/api/health
🗺️ **Sitemap:** https://bailanow.com/sitemap.xml

---

## 🚀 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus claves (ver sección Variables abajo)

# 3. Arrancar dev server
npm run dev          # → http://localhost:3000

# 4. Build de producción
npm run build
npm run preview      # previsualizar build local
```

---

## 🏗️ Stack técnico

| Capa | Tech | Versión |
|---|---|---|
| **Frontend** | React + TypeScript + Vite | 18 / 5 / 6 |
| **Styling** | Tailwind CSS | 3 |
| **State** | Zustand + persist | 4 |
| **Routing** | React Router | 6 |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) | 2 |
| **Pagos** | Stripe + PayPal + escrow propio | — |
| **Hosting** | Vercel (edge network) | — |
| **Móvil** | Capacitor (iOS + Android) | 6 |
| **Errores** | Sentry (replays + user context) | 10 |
| **Social** | GoHighLevel (chat, newsletter, multi-marca posting) | — |

---

## 📁 Estructura

```
.
├── src/
│   ├── pages/           # 32 páginas (Home, /artistas, /eventos, /admin/*, etc.)
│   ├── components/      # 38+ componentes reusables
│   ├── lib/             # supabase, payments, security, sentry, audit, uploadHelper, geo
│   ├── hooks/           # useSupabaseAuth, useSiteConfig, usePageMeta
│   ├── store/           # Zustand stores (auth, UI, CMS, site config, performers, ...)
│   ├── data/            # mockData (legacy fallback - se está migrando todo a BD)
│   ├── App.tsx          # Router + Error Boundary + chat widget global
│   └── main.tsx         # Sentry init + prod hardening
│
├── supabase/
│   ├── functions/       # 9 Edge Functions (pagos, GHL, health, sitemap, ...)
│   ├── migrate.mjs      # Sistema de migraciones automático con tracking sha256
│   ├── deploy-functions-v2.mjs   # Deploy Edge Functions via Management API
│   └── *.sql            # 17 migraciones aplicadas
│
├── public/
│   ├── robots.txt       # Bloquea /admin + GPTBot/CCBot
│   ├── logo.svg
│   └── manifest.webmanifest    # PWA
│
├── tests/e2e/           # 5 Playwright specs críticos
├── playwright.config.ts
├── AUDIT.md             # Auditoría técnica completa
└── README.md            # este archivo
```

---

## 🔑 Variables de entorno

### Cliente (expuesto al browser - prefijo `VITE_`)

```bash
# Supabase — Dashboard → Settings → API
VITE_SUPABASE_URL=https://lpwwdjujxwxdvyoznehp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx

# Stripe — dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# PayPal — developer.paypal.com
VITE_PAYPAL_CLIENT_ID=xxx

# Plataforma
VITE_PLATFORM_COMMISSION=0.15      # 15% comisión por defecto
VITE_APP_NAME=BailaNow
VITE_APP_URL=https://bailanow.com

# Sentry (opcional) — sentry.io
VITE_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
```

### Servidor / Scripts (NO se exponen al browser)

```bash
# Postgres directo (para npm run db:migrate)
DB_HOST=db.lpwwdjujxwxdvyoznehp.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=xxx

# Stripe secret + webhook (Edge Functions)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal secret (Edge Functions)
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_ENV=sandbox                  # 'production' en prod

# Supabase Management API (deploy de Edge Functions)
SUPABASE_ACCESS_TOKEN=sbp_xxx       # sentry.io/account/tokens

# GHL (server-side, para bulk-post)
GHL_API_TOKEN=pit-xxx               # Guardado en Supabase secrets, no aquí
```

Copia `.env.example` → `.env.local` y rellena los valores.

---

## 🛠️ Scripts disponibles

```bash
# Desarrollo
npm run dev                # vite dev server
npm run build              # tsc + vite build
npm run preview            # preview build local

# Linting
npm run lint               # eslint

# Base de datos
npm run db:migrate         # aplica migraciones nuevas en supabase/*.sql
npm run db:migrate:dry     # ver qué se aplicaría sin ejecutar
npm run db:migrate -- --force file.sql   # re-aplicar una concreta

# Testing E2E
npx playwright test        # todos los tests
npx playwright test --ui   # modo interactivo
npx playwright show-report # ver reporte HTML

# Móvil (Capacitor)
npm run mobile:build       # build + sync
npm run mobile:android     # abrir Android Studio
npm run mobile:ios         # abrir Xcode

# Deploy
npx vercel --prod          # deploy a producción
npx vercel alias set <url> bailanow.com    # promover deploy al dominio
```

---

## 🚢 Despliegue

### Vercel (auto-deploy desde GitHub)

```bash
git push origin master     # → Vercel detecta + build automático
```

⚠️ **Importante:** Vercel **NO** mueve automáticamente el alias `bailanow.com` al último deploy. Después de cada push:

```bash
npx vercel ls --prod | head -3 | tail -1   # ver último deploy URL
npx vercel alias set <ese-url> bailanow.com
```

Para automatizar esto, considera marcar **"Auto-promote main branch"** en Vercel → Settings → Domains.

### Edge Functions (Supabase)

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx node supabase/deploy-functions-v2.mjs [fn1 fn2 ...]
# Si no se pasan args, despliega TODAS las funciones de supabase/functions/
```

### Migraciones SQL

```bash
npm run db:migrate
# Tracking automático en tabla _migrations (hash sha256)
# Solo aplica las pendientes
```

---

## 🔐 Seguridad

### En producción ya implementado
- ✅ RLS habilitado en **37 tablas** (Row Level Security)
- ✅ Anti-brute force: lockout 10 intentos / 5 min
- ✅ Honeypot anti-bot en formularios
- ✅ Rate limit cliente para acciones costosas
- ✅ Rate limit Supabase (60 req/min anon)
- ✅ Tokens secret en Edge Functions (server-side)
- ✅ JWT con expiración 1 año (configurable)
- ✅ HTTPS forzado (Vercel + HSTS)
- ✅ CSP estricto (script-src restringido)
- ✅ Audit log de acciones admin
- ✅ Soft deletes (deleted_at) en tablas críticas
- ✅ Idempotency keys (anti doble cobro)
- ✅ Sentry con replays (inputs ocultos por defecto)

### Para hacer post-launch
- ⚠️ 2FA opcional para admins
- ⚠️ CAPTCHAv3 para signups masivos
- ⚠️ Rotation automática de tokens GHL/Sentry cada 90 días
- ⚠️ Backups DB offsite (Supabase tiene point-in-time, considerar export S3)

---

## 📊 Monitoreo

| Servicio | Para qué | URL |
|---|---|---|
| **Vercel Analytics** | Tráfico, Web Vitals | dashboard.vercel.com |
| **Supabase Dashboard** | DB, Auth, logs | supabase.com/dashboard |
| **Sentry** | Errores frontend + replays | sentry.io |
| **Health check** | Uptime + KPIs | bailanow.com/api/health |
| **GHL** | Chat, social, contacts | app.gohighlevel.com |
| **Stripe** | Pagos, refunds | dashboard.stripe.com |

### Métricas a vigilar día 1
- **Sentry**: errores < 1% sesiones
- **Health**: response_time_ms < 500ms
- **Bounce rate** `/artistas`: < 60%
- **Time-to-first-purchase**: < 5 min
- **DB queries** > 1s: investigar

---

## 🧪 Testing

```bash
# Smoke tests contra producción
npx playwright test --project=chromium

# Tests locales contra dev server
npm run dev                                              # terminal 1
E2E_BASE_URL=http://localhost:3000 npx playwright test  # terminal 2

# Reporte visual
npx playwright show-report
```

**Tests cubiertos:**
- API endpoints (health, sitemap, robots)
- Home page (carga, navegación)
- /artistas (datos cargados desde BD)
- Super buscador (Ctrl+K + click)
- Navegación 10 rutas principales + 404

---

## 🎯 Features principales

### Para usuarios
- 🔍 **Super buscador** global (Ctrl+K) — venues, artistas, eventos, ciudades, profiles, lives
- 📍 **Cerca de mí** — geolocalización + radio configurable + lives en tiempo real
- 🎭 **Perfiles públicos** compartibles (`/p/:id` + Open Graph)
- 🔴 **Lives** con preview de 60s + 4 modos: gratis / pago / reserva / donación
- 💃 **Categorías** dinámicas (configurables desde admin)
- 🗺️ **Mapa interactivo** (Leaflet + clustering)
- 💬 **Chat soporte** automatizado (GHL widget global)
- 📬 **Newsletter** con webhook a GHL workflows
- 🛒 **Marketplace** con escrow + comisiones split
- 🎟️ **Eventos** con tickets QR

### Para admins / superadmins
- 📊 **Panel admin completo** con 23+ secciones
- 🏷️ **Gestión categorías** con drag/drop + input numérico de posición
- 📤 **Importador de perfiles** (JSON/CSV + UPSERT por email)
- 💸 **Comisiones configurables** por fuente + premium
- 🎨 **CMS visual** (drag/drop módulos del home)
- 👥 **Sistema de invitación** de admins por email
- 📺 **Radio online** + estadísticas
- ⚙️ **Integraciones GHL** (chat, newsletter, multi-marca bulk-post)
- 🔐 **Audit log** completo de acciones
- 🗑️ **Soft delete** (papelera)

---

## 📱 Apps móviles

```bash
# Primer setup
npm run cap:add:android
npm run cap:add:ios

# Build + abrir IDE
npm run mobile:android    # → Android Studio
npm run mobile:ios        # → Xcode (solo macOS)
```

Capacitor 6 con plugins:
- Geolocation, Camera, Filesystem, Haptics, Share, Status Bar, Splash Screen

---

## 🆘 Troubleshooting

### "Vercel deployó pero bailanow.com sigue viejo"
Vercel no auto-promociona. Después de cada push:
```bash
npx vercel ls --prod | head -3 | tail -1
npx vercel alias set <url> bailanow.com
```

### "Edge function da BOOT_ERROR"
Verifica que el código no use `import` de esm.sh — usar `fetch` directo a la REST API de Supabase es más fiable.

### "0 artistas en /artistas"
- Caché del navegador → `Ctrl+Shift+R`
- Pulsa el botón 🔍 **Debug** que aparece (solo si la lista está vacía) → te muestra el error exacto

### "La migración falla con foreign key"
Las migraciones son idempotentes pero algunas referencias dependen de tipos (uuid vs text). Revisa el error exacto y ajusta el SQL.

### "JWT expired" en navegador del usuario
La sesión dura 1 año, pero el access_token se refresca cada hora. Si falla, usuario hace logout/login.

---

## 📖 Documentación adicional

- **`AUDIT.md`** — auditoría técnica completa (gaps vs Booking/Ticketmaster)
- **`supabase/*.sql`** — 17 migraciones con descripción en comentarios
- **Comentarios JSDoc** en cada componente clave

---

## 🛣️ Roadmap

### Sprint 1 (próximas 2 semanas) - Pre-lanzamiento público
- [ ] 5 tests E2E adicionales (auth, booking, pago)
- [ ] Email templates transaccionales (welcome, booking, refund)
- [ ] Refund flow Stripe automático
- [ ] Documentación pública API (si será plataforma)

### Sprint 2 (mes 2)
- [ ] i18n (es / en / pt)
- [ ] Multi-currency (EUR / USD / MXN / COP)
- [ ] Notificaciones web push (Service Worker)
- [ ] Bundle splitting agresivo (objetivo <500KB main)
- [ ] Apple Pay / Google Pay
- [ ] Generar tipos auto de Supabase → eliminar 165 `any`

### Sprint 3 (mes 3)
- [ ] Stripe Connect para split-payments automáticos
- [ ] Sistema reviews con moderación
- [ ] Loyalty program
- [ ] Dispute resolution UI
- [ ] Mobile native (release Play Store + App Store)
- [ ] Status page público (status.bailanow.com)

### Idea / explorar
- [ ] White-label para escuelas / promotoras
- [ ] API pública con rate limiting + API keys
- [ ] Recomendaciones ML (artistas similares)
- [ ] QR scanner integrado para validar tickets en puerta

---

## 🤝 Contribuir

```bash
git checkout -b feat/nombre-de-feature
npm test
git commit -m "feat: descripción clara"
git push origin feat/nombre-de-feature
# Crear PR en GitHub
```

**Convenciones:**
- Conventional Commits (feat:, fix:, chore:, docs:, refactor:, test:)
- Prettier + ESLint deben pasar antes de mergear
- Cualquier feature nueva debe tener al menos 1 test E2E

---

## 📞 Soporte

- 🌐 https://bailanow.com
- 📧 hola@bailanow.com
- 🐛 Errores en producción: Sentry alertará automáticamente

---

## 📄 Licencia

Propietario · BailaNow © 2025-2026 · Todos los derechos reservados
