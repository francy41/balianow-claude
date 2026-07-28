# 🚀 BailaNow · Checklist de lanzamiento (una página)

Marca cada paso. Orden recomendado de arriba abajo.

## 1) Base de datos (Supabase → SQL Editor)
- [ ] **`supabase/fix-partner-role.sql`** — pégalo **SOLO/aparte** y Run. (Añade el rol `partner` al enum. Sin esto, los partners no funcionan.)
- [ ] **`supabase/MASTER-setup.sql`** — pégalo completo y Run. (16 bloques: partner, TV, membresías, módulos, donaciones, publicidad, notificaciones, monetización, traducciones…)
- [ ] **`supabase/security-fixes.sql`** — pégalo y Run. (Cierra escalada de privilegios, fuga de PII, tokens de invitación.)
- [ ] En **Database → Replication**: confirma que la tabla `notifications` está activa (tiempo real).
- [ ] Verifica que la tabla `escrows` tenga RLS activado (pagos).

## 2) Variables en Vercel (Settings → Environment Variables) + **Redeploy**
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` (pk_live_…)
- [ ] `VITE_PAYPAL_CLIENT_ID`
- [ ] `VITE_GA_ID` (G-XXXX de Google Analytics)

## 3) Edge Functions (con la CLI de Supabase en tu PC)
```bash
# Pagos
supabase functions deploy stripe-webhook
supabase functions deploy create-subscription-checkout
supabase functions deploy create-donation-checkout
supabase functions deploy donation-paypal
supabase functions deploy create-module-checkout
# Correos e idiomas
supabase functions deploy send-email
supabase functions deploy translate
# SEO
supabase functions deploy sitemap --no-verify-jwt
```

## 4) Secrets en Supabase (`supabase secrets set NOMBRE=valor`)
- [ ] `STRIPE_SECRET_KEY` = sk_live_…
- [ ] `STRIPE_WEBHOOK_SECRET` = whsec_… (paso 5)
- [ ] `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=production`
- [ ] `APP_URL=https://bailanow.com`
- [ ] `RESEND_API_KEY` = re_… + `EMAIL_FROM="BailaNow <hola@bailanow.com>"` (correos)
- [ ] `DEEPL_API_KEY` (o `GOOGLE_TRANSLATE_KEY`) — traducir vídeos/cursos

## 5) Stripe (dashboard.stripe.com → Webhooks)
- [ ] Endpoint: `https://lpwwdjujxwxdvyoznehp.supabase.co/functions/v1/stripe-webhook`
- [ ] Eventos: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.deleted`, `charge.refunded`
- [ ] Copia el signing secret → `STRIPE_WEBHOOK_SECRET` (paso 4)

## 6) Correos (Resend)
- [ ] Crea cuenta en **resend.com** y **verifica tu dominio** bailanow.com.
- [ ] Pon `RESEND_API_KEY` y `EMAIL_FROM` (paso 4).

## 7) SEO / Analytics
- [ ] Crea la propiedad **GA4** → `VITE_GA_ID` (paso 2).
- [ ] **Google Search Console**: verifica `bailanow.com` (pega el meta en `index.html`), envía `bailanow.com/sitemap.xml`, y "Solicitar indexación" de home + `/eventos` + `/unete`.

## 8) Verificación final (tras desplegar)
- [ ] Vercel → Deployments: último commit en "Ready".
- [ ] Regístrate → llega el **correo de bienvenida**.
- [ ] Prueba una **donación** (tarjeta test 4242 4242 4242 4242 si usas Stripe test).
- [ ] Entra en `/tv`, `/membresias`, `/unete`, `/partner/aplicar`, `/modulos`.
- [ ] Panel superadmin `/admin`: aprueba una solicitud, revisa Monetización TV / Módulos.

## Opcional (cuando quieras)
- **Redes del partner (GHL):** deploy `ghl-inbound --no-verify-jwt` + `ghl-send`; secret `GHL_WEBHOOK_SECRET`; Workflow en GHL.
- **Anuncios Google (VAST):** pega la etiqueta VAST en Publicidad; para ingresos, cuenta Ad Manager + tu línea en `public/ads.txt`.
- **App Android:** corregir el secreto `ANDROID_KEYSTORE_PASSWORD`.

---
Con los pasos **1–8** el sistema queda 100% operativo para el lanzamiento. 💃
