# 🚀 Plan de lanzamiento — BailaNow

> **Estrategia:** Beta cerrada (50 usuarios) → Beta abierta (500) → Lanzamiento público
> **Duración total:** 4-6 semanas
> **Inversión estimada:** 0-500€ marketing inicial (orgánico + algo paid)

---

## 📅 Timeline general

```
SEMANA 1-2: Beta cerrada (50 usuarios invitación)
   ↓
SEMANA 3-4: Iteración + 5 fixes críticos detectados
   ↓
SEMANA 5: Beta abierta (500 usuarios via redes sociales)
   ↓
SEMANA 6: 🎉 LANZAMIENTO PÚBLICO
```

---

## 🎯 SEMANA 0 — PRE-LANZAMIENTO (esta semana)

### Checklist técnico crítico

- [x] Build pasa sin errores
- [x] Endpoints públicos 200 OK
- [x] Health check verde
- [x] RLS en todas las tablas
- [x] Pagos Stripe + PayPal operativos
- [x] Sentry capturando errores con user context
- [x] Sitemap + robots desplegados
- [x] Tests E2E mínimos (5 críticos)
- [x] Error boundary por ruta
- [ ] **Rotar TODOS los tokens compartidos en chat:**
  - [ ] Supabase Personal Access Token (`sbp_...`) → ir a supabase.com/dashboard/account/tokens → revoke
  - [ ] GHL Private Integration → ir a GHL → API Keys → revoke (mantener funcional, generar nuevo)
- [ ] **Verificar URLs sociales** en `index.html` (og:image apunta a imagen real, no 404)
- [ ] **Cargar imagen og-default.jpg** (1200x630px) en `public/`
- [ ] **Páginas legales completas** (`/legal/terminos`, `/legal/privacidad`, `/legal/cookies`)

### Checklist legal/compliance

- [ ] **Términos y condiciones** revisados por abogado o template GDPR
- [ ] **Política de privacidad** con cookies + tracking + datos personales explicados
- [ ] **Aviso de cookies** funcional (CookieBanner ya existe — verificar GDPR-compliant)
- [ ] **Email DPO** activo (privacy@bailanow.com)
- [ ] **Stripe Connect Standard** o terms del marketplace si vendes para terceros

### Checklist contenido inicial

- [ ] **20+ perfiles reales** importados (no demos) — usar `/admin/importar`
- [ ] **10+ eventos próximos** con cover, fecha, precio reales
- [ ] **10+ venues** con dirección, horario, fotos
- [ ] **Newsletter** con primer email programado (welcome)
- [ ] **GHL chat widget** con horarios + auto-respuestas configuradas

### Checklist marketing pre-launch

- [ ] **Landing page** con email capture funcional (newsletter ya está en home)
- [ ] **Cuenta Instagram** @bailanowofficial creada + 3 posts de teaser
- [ ] **Cuenta TikTok** @bailanowofficial creada
- [ ] **Página Facebook** publicada
- [ ] **Lista de 50 amigos/contactos** del mundo del baile para invitar al beta

---

## 🎯 SEMANA 1-2 — BETA CERRADA

### Objetivo
Validar que **el flujo end-to-end funciona** con usuarios reales:
1. Usuario llega → ve home → entiende qué es
2. Se registra → recibe email → confirma → completa perfil
3. Busca evento/artista → ve detalles → contrata/reserva
4. Recibe confirmación → asiste / consume servicio
5. Deja review

### Distribución
- 30 invitaciones directas vía WhatsApp / email
- 10 invitaciones a creators de TikTok/IG (DJs, bailarines)
- 10 invitaciones a profesores de baile (Madrid/Barcelona)

**Template invitación WhatsApp:**
```
¡Hola [Nombre]! 🌶️

Estoy lanzando BailaNow, una app para conectar al
mundo latino del baile en España: DJs, bailarines,
eventos, venues...

Te invito al beta cerrado (50 personas):
→ https://bailanow.com

Me encantaría tu feedback honesto. ¡Si encuentras
algún bug, mándamelo directamente!

Un abrazo 💃
```

### Métricas a trackear día a día

| Métrica | Target | Donde ver |
|---|---|---|
| Signups | 30+ de 50 invitados (60%) | Supabase → profiles |
| Sesiones activas | 20+ diarias | Vercel Analytics |
| Errores Sentry | <5 únicos/día | sentry.io |
| Bounce rate `/` | <50% | Vercel Analytics |
| Conversión browse→signup | >5% | Cálculo manual |
| Tiempo promedio sesión | >2 min | Vercel Analytics |

### Daily standup contigo mismo (15 min)
- [ ] Revisar Sentry: ¿errores nuevos? Triage Top 3
- [ ] Revisar health: ¿response_time_ms estable?
- [ ] Revisar nuevos signups: ¿completaron perfil?
- [ ] Revisar mensajes en chat GHL: ¿feedback útil?

---

## 🎯 SEMANA 3-4 — ITERACIÓN

### Fixes críticos prioridad 1 (lo que SIEMPRE aparece en beta)

1. **Bug X de carga lenta en /cerca** → optimizar query Supabase
2. **Bug Y de imagen rota** → fallback automático
3. **Bug Z en mobile** → ajustar responsive
4. **Mensaje cuando no hay GPS** → mejorar UX
5. **Onboarding del primer perfil** → tutorial inline

### Features que pedirán los usuarios beta (preparate)

- "¿Cómo añado mi propio evento?" → guía/wizard
- "No me llega el email de confirmación" → verificar Resend/Postmark integration
- "El precio de comisión no está claro" → tooltip explicativo
- "¿Puedo cancelar una reserva?" → IMPLEMENTAR si no existe

### Tests E2E adicionales a crear

```bash
tests/e2e/
├── auth.spec.ts        # signup completo + login + reset password
├── booking.spec.ts     # ver evento → reservar → pagar (mock Stripe)
├── live.spec.ts        # iniciar live + ver preview + entrar
├── admin.spec.ts       # admin edita perfil → cambio visible público
└── mobile.spec.ts      # responsive crítico iPhone 13
```

---

## 🎯 SEMANA 5 — BETA ABIERTA (500 usuarios)

### Hooks de marketing orgánico

1. **TikTok**: 3 videos / semana con creators contratados
   - "Cómo encontrar el mejor DJ latino en Madrid"
   - "Bailé en 5 venues en 1 noche"
   - "El bailarín más viral de Bachata vive en X"

2. **Instagram Reels**: cross-post de TikTok + Stories diarias
   - Lives semanales de eventos cubiertos

3. **Facebook Groups**: post en grupos de salsa/bachata España
   - "Salsa Madrid", "Bachata España", "Bailarines Latinos"

4. **Email outreach**: 200 emails a escuelas de baile España
   - Template "ven a publicar tus clases gratis durante 3 meses"

### Paid ads inicial (50€/día)

- **Meta Ads** (FB+IG): target `intereses: salsa, bachata, kizomba` en España
  - Creative: video corto de evento + CTA "Encuentra tu próximo evento"
- **TikTok Ads** (si presupuesto): mismo creative

### Métricas a trackear semana 5

| Métrica | Target |
|---|---|
| Signups totales | 500 |
| Eventos publicados | 30+ |
| Reservas completadas | 50+ |
| Revenue total | 500€+ |
| NPS score | >7/10 |

---

## 🎯 SEMANA 6 — 🎉 LANZAMIENTO PÚBLICO

### Día del launch (martes recomendado — mejor engagement)

**08:00 — Pre-launch checklist:**
- [ ] Health check verde
- [ ] Sentry sin errores nuevos últimas 24h
- [ ] Stripe webhook funcionando (test transaction)
- [ ] Servidor de soporte (GHL chat) cubierto las próximas 12h

**10:00 — Anuncio:**
- Post en todas las redes sociales simultáneamente
- Email a la lista de 500 beta users con código de descuento amigos
- Press release a 10 medios (Crónica, Diario AS Latino, etc.)

**12:00-22:00 — Vigilancia activa:**
- Monitor Sentry en tiempo real
- Responder cada chat de GHL en <5 min
- Capturar feedback en notion / google forms
- Si hay bug crítico → hotfix + redeploy rápido

**23:00 — Retrospectiva del día:**
- ¿Cuántos signups?
- ¿Cuántos errores?
- ¿Qué pidió la gente?
- Top 3 mejoras para mañana

---

## 📊 KPIs de éxito post-launch

### Mes 1
- 1.000 usuarios registrados
- 100+ perfiles activos (artistas/bailarines/venues)
- 100+ transacciones
- 500€+ revenue (15% comisión = ~75€ neto)
- Sentry error rate < 1%
- NPS > 7

### Mes 3
- 5.000 usuarios
- 500+ perfiles activos
- 1.000+ transacciones
- 5.000€+ revenue (750€ neto)
- Primera ronda de inversión angel preparada (si aplica)

### Mes 6
- 20.000 usuarios
- 2.000+ perfiles activos
- 5.000+ transacciones
- 30.000€+ revenue
- Expansión a México / Colombia (i18n + multi-currency)

---

## 🆘 Crisis playbook

### Caída total del sitio
1. Comprobar `bailanow.com/api/health`
2. Si 503: Supabase Dashboard → status
3. Si Vercel down: status.vercel.com
4. Mientras tanto: post en redes con `disculpa, volvemos en X min`

### Bug crítico que impide pagos
1. **Desactivar pagos**: en admin → desactivar botón compra
2. **Mensaje banner**: "Pagos temporalmente deshabilitados, contacta soporte"
3. **Hotfix**: revisar Sentry → identificar → push fix
4. **Reactivar pagos**: cuando hayan pasado 10 min sin errores

### Disputa pago grande
1. Stripe Dashboard → ver detalles
2. Responder al usuario en <2h
3. Si es válido: reembolsar
4. Si es fraude: marcar en Stripe + bloquear usuario

### Pico de tráfico (post viral)
1. Vercel auto-escala (no hacer nada)
2. Supabase: ver dashboard → si CPU >80%, considerar upgrade plan
3. Monitorear Sentry: error rate
4. Si DB se cae: contactar soporte Supabase

---

## 📞 Contactos de emergencia

| Servicio | Contacto | Para qué |
|---|---|---|
| Supabase | support@supabase.io | DB caída, RLS issues |
| Vercel | https://vercel.com/help | Deploy down, dominio |
| Stripe | https://support.stripe.com | Pagos, disputas |
| Sentry | https://sentry.io/support | Tracking issues |
| GHL | https://help.gohighlevel.com | Chat, automations |

---

## ✅ Checklist final pre-launch (24h antes)

- [ ] Health check 200 últimas 24h
- [ ] 0 errores críticos en Sentry últimas 24h
- [ ] Backup manual de BD (`pg_dump`)
- [ ] Tests E2E pasando (al menos los 5 críticos)
- [ ] Tokens rotados (Supabase PAT + GHL)
- [ ] Imagen og:image cargada y funcionando
- [ ] Páginas legales completas
- [ ] Cookie banner GDPR-compliant
- [ ] Email transaccional probado (signup recibe email)
- [ ] Stripe en MODO PRODUCCIÓN (no test)
- [ ] PayPal en MODO PRODUCCIÓN (no sandbox)
- [ ] 20+ contenido seed (perfiles + eventos + venues)
- [ ] GHL chat configurado con horarios + auto-respuesta
- [ ] Equipo de soporte avisado (tú + 1 backup)

---

🎉 **¡Mucha suerte con el lanzamiento!**

Si necesitas iterar rápido durante las primeras semanas, llámame.
