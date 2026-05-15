# INSTRUCCIONES COMPLETAS — BACHASALSEROS PLATFORM
## Para: Antigravity AI Studio / Go High Level (GHL)
## Versión: 1.0 — Mayo 2026

---

## ¿QUÉ ES ESTE PROYECTO?

BachaSalseros es un **ecosistema completo de entretenimiento latino** que combina:

- **Upwork + Fiverr** → Marketplace de servicios de artistas
- **Ticketmaster + Eventbrite** → Sistema de tickets y eventos
- **Yelp + Google Maps** → Descubrimiento geolocalizado de venues
- **Airbnb Experiences** → Experiencias de entretenimiento
- **Twitch Live** → Streaming en vivo de DJs, bailarines, artistas
- **TikTok Discovery** → Feed social de contenido latino

**Enfocado en:** Salsa, Bachata, DJ Latinos, Bailarines, Músicos, Venues y Eventos.

---

## REGLA #1 — MÁS IMPORTANTE

**NO DESTRUYAS LO EXISTENTE.**

- No rediseñes la plataforma.
- No cambies el branding.
- No elimines módulos existentes.
- No cambies la identidad visual.
- Solo repara, conecta, optimiza y completa.

---

## STACK TÉCNICO DEL PROYECTO

```
Frontend:   React 18 + TypeScript + Vite 5
Estilos:    Tailwind CSS 3 (dark theme custom)
Estado:     Zustand
Router:     React Router v6
Animaciones: Framer Motion
Iconos:     Lucide React
Fuentes:    Inter + Montserrat (Google Fonts)
```

**Tema visual:**
- Fondo: `#050507` (negro casi puro)
- Acento 1: Purple `#7C3AED`
- Acento 2: Pink `#EC4899`
- Acento 3: Gold `#F59E0B`
- Estética: Glassmorphism + Neon borders + Dark luxury

---

## ESTRUCTURA DE ARCHIVOS

```
src/
├── main.tsx                    ← Entry point
├── App.tsx                     ← Router principal con lazy loading
├── index.css                   ← Tailwind + custom CSS
├── data/
│   └── mockData.ts             ← Datos mock: Artists, Events, Venues, Services
├── store/
│   └── appStore.ts             ← Zustand: Auth, UI, Chat stores
├── components/
│   ├── ui/index.tsx            ← Componentes UI reutilizables
│   └── layout/
│       ├── Navbar.tsx          ← Navbar superior
│       └── BottomNav.tsx       ← Navegación inferior mobile
└── pages/
    ├── HomePage.tsx            ← Home con todas las secciones
    ├── ExplorePage.tsx         ← Búsqueda global
    ├── ArtistsPage.tsx         ← Lista de artistas con filtros
    ├── ArtistProfilePage.tsx   ← Perfil completo de artista
    ├── EventsPage.tsx          ← Lista de eventos
    ├── MarketplacePage.tsx     ← Marketplace estilo Fiverr
    ├── ServiceDetailPage.tsx   ← Detalle de servicio con checkout
    ├── LiveNowPage.tsx         ← Live streaming
    ├── VenuesPage.tsx          ← Venues + detalle
    ├── ChatPage.tsx            ← Chat interno
    ├── DashboardPage.tsx       ← Dashboard usuario/artista
    ├── WalletPage.tsx          ← Wallet + transacciones
    ├── SubscriptionsPage.tsx   ← Planes premium
    ├── MapPage.tsx             ← Mapa geolocalizado
    └── AuthPage.tsx            ← Login + Registro
```

---

## RUTAS CONFIGURADAS

```
/                   → HomePage
/explorar           → ExplorePage (búsqueda global)
/artistas           → ArtistsPage
/artistas/:id       → ArtistProfilePage
/eventos            → EventsPage
/eventos/:id        → EventDetail (dentro de EventsPage)
/marketplace        → MarketplacePage
/marketplace/:id    → ServiceDetailPage
/live               → LiveNowPage
/live/:id           → StreamViewer (dentro de LiveNowPage)
/venues             → VenuesPage
/venues/:id         → VenueDetail (dentro de VenuesPage)
/mapa               → MapPage
/chat               → ChatPage
/dashboard          → DashboardPage
/wallet             → WalletPage
/subscripciones     → SubscriptionsPage
/auth               → AuthPage
/admin              → AdminPanel
```

---

## MÓDULOS IMPLEMENTADOS

### 1. AUTENTICACIÓN
- Login / Registro completo
- Roles: user, artist, dj, dancer, venue, admin
- JWT ready (implementar en backend)
- Demo mode funcional (cualquier email entra)
- Selección de rol en registro

### 2. MARKETPLACE (Fiverr/Upwork style)
- Listado de servicios con filtros
- Detalle de servicio con checkout
- Sistema de precios + comisión 15% automática
- Escrow simulado
- Reviews y ratings

### 3. ARTISTAS / DJs / BAILARINES
- Perfiles completos tipo "website profesional"
- Portfolio, galería, videos, redes sociales
- Sistema de booking con formulario
- Calendario de disponibilidad
- Reviews + ratings
- Sistema de chat interno para negociación

### 4. LIVE STREAMING
- Lista de streams en vivo con contador de viewers
- Viewer de stream con chat en tiempo real
- Viewers counter dinámico (simula fluctuación)
- Sistema de reacciones y compartir

### 5. VENUES
- Lista con filtros por tipo, ciudad, estado (abierto/cerrado)
- Detalle completo: info, eventos, fotos
- Sistema de reserva de espacio
- Solo venues ABIERTOS visibles (filtro activo)

### 6. EVENTOS Y TICKETS
- Lista con filtros: próximos, destacados, online
- Compra de tickets con validación de capacidad
- Barra de capacidad visual
- Eventos agotados bloqueados

### 7. CHAT INTERNO
- Conversaciones entre usuarios/artistas
- Mensajería en tiempo real (simulada)
- SIN emails ni teléfonos públicos externos
- Todo el contacto es interno y cifrado

### 8. WALLET
- Saldo del usuario
- Historial de transacciones
- Sistema de recarga (Stripe ready)
- Retiro de fondos
- Escrow para pagos pendientes

### 9. SUSCRIPCIONES PREMIUM
- Plan Básico: €9/mes
- Plan Estándar: €20/mes (4 flyers)
- Plan Pro: €50/mes (8 flyers + 4 vídeos)
- Plan Elite: €150/mes (filming + campañas)
- Descuento anual del 20%

### 10. MAPA GEOLOCALIZADO
- Vista de mapa con pins de venues y eventos
- Lista inferior con todos los resultados
- Integración preparada para Google Maps API

---

## REGLAS DE NEGOCIO CRÍTICAS

### Comisión de plataforma
```
Comisión = 15% de CADA transacción
Se aplica automáticamente en checkout
Se muestra transparentemente al usuario
```

### Solo chat interno
```
NO se muestran emails públicos
NO se muestran teléfonos en perfiles
TODO el contacto va por el chat interno de la plataforma
```

### Venues abiertos
```
Solo aparecen venues con isOpen = true en la sección "Abiertos Ahora"
El filtro se calcula en tiempo real según openHours
```

### Escrow
```
El dinero no se libera hasta que el servicio se confirma completado
Sistema de disputas disponible
```

---

## INTEGRACIONES A CONECTAR EN PRODUCCIÓN

### Pagos
```javascript
// Stripe Connect (pagos divididos)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_WEBHOOK_SECRET=whsec_...

// PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
```

### Mapas
```javascript
// Google Maps
VITE_GOOGLE_MAPS_KEY=AIza...
```

### Email (verificación / notificaciones)
```javascript
// SendGrid / Resend
SENDGRID_API_KEY=SG...
```

### Live Streaming
```javascript
// Agora.io (recomendado para streams)
VITE_AGORA_APP_ID=...

// O Mux.com
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
```

### Base de datos
```javascript
// Supabase (recomendado)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

// O PostgreSQL directo
DATABASE_URL=postgresql://...
```

---

## CÓMO TRABAJAR CON ESTE PROYECTO

### Para añadir un nuevo artista al catálogo:
Edita `src/data/mockData.ts` → array `ARTISTS`

### Para añadir una nueva ruta/página:
1. Crea el archivo en `src/pages/NuevaPagina.tsx`
2. Impórtalo lazy en `src/App.tsx`
3. Añade la `<Route>` en el router

### Para modificar los planes de suscripción:
Edita `src/data/mockData.ts` → array `SUBSCRIPTION_PLANS`

### Para cambiar colores del tema:
Edita `tailwind.config.js` → sección `colors.brand` y `colors.dark`

### Para añadir endpoints de backend:
Crea `src/api/client.ts` con axios/fetch y reemplaza los datos mock en las páginas

---

## PRÓXIMOS PASOS PARA PRODUCCIÓN

1. **Backend API** — Conectar endpoints reales (Supabase/Node.js)
2. **Stripe Connect** — Implementar pagos reales con escrow
3. **Google Maps** — API key real para mapa interactivo
4. **Agora.io** — Live streaming real
5. **Push Notifications** — Firebase Cloud Messaging
6. **Email Verification** — Verificación de cuenta en registro
7. **CI/CD** — Deploy en Vercel/Netlify
8. **Admin Panel** — Dashboard completo de administración
9. **Analytics** — Integrar Mixpanel o Amplitude
10. **SEO** — Meta tags dinámicos, sitemap, robots.txt

---

## VARIABLES DE ENTORNO REQUERIDAS

Crea un archivo `.env` en la raíz con:

```env
VITE_APP_NAME=BachaSalseros
VITE_API_URL=https://api.bachasalseros.com
VITE_GOOGLE_MAPS_KEY=tu_key_aqui
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_AGORA_APP_ID=tu_agora_id
```

---

## COMANDOS

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Type check
npx tsc --noEmit
```

---

## IDENTIDAD DE MARCA

- **Nombre:** BachaSalseros
- **Claim:** "El ecosistema de entretenimiento latino #1"
- **Colores primarios:** Púrpura (#7C3AED) + Rosa (#EC4899) + Dorado (#F59E0B)
- **Tipografía:** Montserrat (display) + Inter (body)
- **Estética:** Dark luxury, glassmorphism, neon accents
- **Tono:** Vibrante, nocturno, premium, latino, social
- **Emoji mascota:** 🎵 💃 🎧

---

## INSTRUCCIONES PARA EL AI DE GHL (ANTIGRAVITY)

Cuando trabajes sobre este proyecto:

1. **LEE PRIMERO** el archivo `src/data/mockData.ts` para entender la estructura de datos
2. **LEE** `src/store/appStore.ts` para entender el estado global
3. **LEE** `src/App.tsx` para entender el sistema de rutas
4. **PRESERVA** la identidad visual: colores, fuentes, estilos glassmorphism
5. **NO ELIMINES** ningún módulo existente — solo añade o mejora
6. **MANTÉN** la comisión del 15% en todas las transacciones
7. **MANTÉN** el sistema de chat interno (sin emails/teléfonos públicos)
8. **AÑADE** error boundaries en cualquier componente nuevo
9. **USA** los componentes UI de `src/components/ui/index.tsx`
10. **SIGUE** el patrón de TypeScript estricto del proyecto

---

*Instrucciones generadas el 15 de Mayo 2026*
*Proyecto: BachaSalseros — Ecosistema Latino*
*Archivo guardado en: F:\BACHASALSEROS APP WEB\PROYEC LATINO CLAUDE\*
