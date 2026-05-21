# 📱 Guía de Build Mobile — BailaNow

## Prerrequisitos

### Para Android
- [Android Studio](https://developer.android.com/studio) instalado
- Java JDK 17+ en el PATH
- SDK Android 33+ (se instala desde Android Studio)

### Para iOS
- Mac con Xcode 14+
- CocoaPods: `sudo gem install cocoapods`

---

## 1. Primer setup (solo una vez)

```bash
# Agregar plataformas nativas
npm run cap:add:android
npm run cap:add:ios
```

---

## 2. Build y sync (cada vez que cambias código)

```bash
npm run mobile:sync
```

Esto hace:
1. `tsc && vite build` → genera la carpeta `dist/`
2. `cap sync` → copia `dist/` al proyecto nativo y actualiza plugins

---

## 3. Abrir en Android Studio y generar APK

```bash
npm run mobile:android
```

En Android Studio:
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. El APK queda en: `android/app/build/outputs/apk/debug/app-debug.apk`

Para APK de **producción firmada**:
1. **Build → Generate Signed Bundle / APK**
2. Crear un keystore (guárdalo seguro — lo necesitas para actualizar la app)
3. Sube el `.aab` a Google Play Console

---

## 4. Abrir en Xcode (iOS)

```bash
npm run mobile:ios
```

En Xcode:
1. Selecciona tu equipo de desarrollo en **Signing & Capabilities**
2. **Product → Archive** para generar el IPA
3. Sube a App Store Connect

---

## 5. Icono y Splash Screen

Coloca tus imágenes en la carpeta `resources/`:
- `resources/icon.png` — 1024×1024 px, PNG sin transparencia
- `resources/splash.png` — 2732×2732 px, PNG (centrado)

Luego ejecuta:
```bash
npx @capacitor/assets generate
```

Esto genera automáticamente todos los tamaños para Android e iOS.

---

## 6. App ID y nombre

El bundle ID es: **com.bailanow.app**
El nombre de la app es: **BailaNow**

Para cambiar en Android:
- `android/app/build.gradle` → `applicationId`
- `android/app/src/main/res/values/strings.xml` → `app_name`

---

## 7. Configuración de deep links (OAuth Google)

En `android/app/src/main/AndroidManifest.xml` añadir dentro de `<activity>`:
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="bailanow.com" />
</intent-filter>
```

---

## 8. Variables de entorno

Las variables `VITE_*` del `.env` están embebidas en el build.
No necesitas configuración adicional.

---

## Comandos de referencia

| Comando | Descripción |
|---------|-------------|
| `npm run mobile:sync` | Build web + sync a nativo |
| `npm run mobile:android` | Abre Android Studio |
| `npm run mobile:ios` | Abre Xcode |
| `npx cap run android` | Ejecuta en dispositivo/emulador |
| `npx cap doctor` | Diagnóstico de configuración |
