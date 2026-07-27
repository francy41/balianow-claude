# BailaNow · Checklist de lanzamiento

## 1) Base de datos (una sola vez)
Supabase → SQL Editor → pega **`supabase/MASTER-setup.sql`** (8 bloques) → Run.
Incluye el nuevo **Bloque 8 · Notificaciones en tiempo real** (tabla `notifications`,
Realtime y triggers de ventas/consultas/retiros).

> El bloque 8 ya añade `notifications` a la publicación `supabase_realtime`. Si en el
> panel de Supabase → Database → Replication no aparece activa, actívala a mano.

## 2) Desplegar (Vercel)
Push a `master` → Vercel construye producción. Verifica en **Deployments** que el
último commit quede en "Ready" (o "Promote to Production").

## 3) SEO / indexación en Google
1. **Google Search Console** (search.google.com/search-console):
   - Añade la propiedad `bailanow.com` y verifícala. Método fácil: copia el meta de
     verificación y pégalo en `index.html` donde dice
     `<!-- <meta name="google-site-verification" ... -->` (quita los comentarios), push.
   - O verifica por DNS/registro TXT.
2. En Search Console → **Sitemaps** → envía `https://bailanow.com/sitemap.xml`.
   (Ya está enrutado en `vercel.json` y ahora incluye TV, rutas, comunidad,
   captación de partner y las páginas de ciudad de cada partner.)
3. Pide indexación de las URLs clave con **"Inspección de URL" → Solicitar indexación**
   (home, /eventos, /artistas, /partner/aplicar).
4. Ya incluido en el código: `<title>`/description por página (hook `useSeo`),
   Open Graph + Twitter Cards, **JSON-LD** (Organization + WebSite con SearchAction),
   `robots.txt` (permite público, bloquea privado) y canonical.
5. (Opcional) Da de alta también **Bing Webmaster Tools** y envía el mismo sitemap.

## 4) Notificaciones en tiempo real — ya integradas
- La **campana** del menú superior es tiempo real para TODOS (creadores, vendedores,
  partners): al llegar una venta/consulta/retiro aparece al instante + aviso emergente.
- El **panel del partner** se refresca en vivo (nuevas consultas, gestiones y retiros).
- Se alimenta de la tabla `notifications` mediante triggers del bloque 8.

## Notas
- App Android: build en pausa (manual) hasta corregir el secreto del keystore
  (`ANDROID_KEYSTORE_PASSWORD`). No afecta a la web.
- Conexión de redes del partner: se gestiona en central (GHL). Ver
  `supabase/functions/GHL-INTEGRATION.md`.
