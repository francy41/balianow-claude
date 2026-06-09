# 🚀 Publicar BailaNow en Google Play — Checklist

> Marca cada casilla. Lo que empieza con ✅ ya está hecho en el proyecto.

## 0) Antes de empezar
- [ ] Cuenta de **Google Play Console** creada → https://play.google.com/console (pago único 25 USD + verificación de identidad).
- [ ] Decidir tipo de cuenta: **Personal** (requiere prueba cerrada con 12+ testers 14 días antes de producción) o **Organización/Empresa** (sin ese requisito; recomendado si puedes).

## 1) Generar el AAB firmado (en la nube) ✅ preparado
- [ ] En GitHub → **Settings → Secrets and variables → Actions** → añade:
  - [ ] `KEYSTORE_BASE64`  → contenido de `android/KEYSTORE_BASE64.txt` (generado en tu PC)
  - [ ] `KEYSTORE_PASSWORD` → `BailaNow#Key2026`
  - [ ] `KEY_ALIAS` → `bailanow`
  - [ ] `KEY_PASSWORD` → `BailaNow#Key2026`
  - [ ] `VITE_SUPABASE_URL` → (tu valor de .env.local)
  - [ ] `VITE_SUPABASE_ANON_KEY` → (tu valor de .env.local)
- [ ] Pestaña **Actions → "Android Release" → Run workflow**.
- [ ] Descargar **`app-release.aab`** desde *Artifacts*.

## 2) Crear la app en Play Console
- [ ] **Crear app**: nombre `BailaNow: Baila con IA`, idioma Español, App, Gratis.
- [ ] Aceptar declaraciones.

## 3) Ficha de Play Store (textos en `PLAY-STORE-LISTING.md`) ✅
- [ ] Nombre, descripción breve y completa (copiar/pegar).
- [ ] Subir **icono** `store-assets/icon-512.png` ✅
- [ ] Subir **gráfico destacado** `store-assets/feature-1024x500.png` ✅
- [ ] Subir **capturas** (2–8): usa `store-assets/screenshot-1/2/3.png` ✅ o, mejor, capturas reales del móvil.

## 4) Contenido de la app (cuestionarios obligatorios)
- [ ] **Política de privacidad**: `https://bailanow.com/legal/privacidad` ✅
- [ ] **Seguridad de los datos**: cámara/mic se procesan en el dispositivo, NO se sube vídeo; email/nombre para login y ranking; cifrado en tránsito; no se venden datos.
- [ ] **Clasificación de contenido**: apta para todos (PEGI 3 / Everyone).
- [ ] **Público objetivo y contenido**.
- [ ] **Anuncios**: No.
- [ ] **Permisos** (cámara/micrófono): justificados por las clases de baile interactivas.

## 5) Versión (release)
- [ ] **Pruebas internas** primero: subir `app-release.aab`, añadir tu email como tester, instalar y probar.
- [ ] Aceptar **Play App Signing** (tu keystore queda como *clave de subida*).
- [ ] (Cuenta personal) Configurar **prueba cerrada** 12+ testers, 14 días.

## 6) Producción
- [ ] Promover la versión probada a **Producción**.
- [ ] **Enviar a revisión** (de horas a varios días).
- [ ] ¡Publicada! 🎉

---

## 🔐 GUARDA SIEMPRE (copia de seguridad fuera del PC)
- `android/bailanow-release.keystore`  (la llave para actualizar la app)
- Contraseña: `BailaNow#Key2026` · alias `bailanow`
- Si pierdes el keystore, con Play App Signing puedes pedir reseteo de la clave de subida a Google (con la final ya en su poder).

## 🔁 Para futuras actualizaciones
1. Sube cambios a la web (se reflejan solos en la app, que carga bailanow.com en vivo).
2. Solo necesitas un AAB nuevo si cambias icono, permisos, versión o config nativa:
   - Sube `versionCode` y `versionName` en `android/app/build.gradle`.
   - Corre el workflow → nuevo AAB → súbelo a Play.
