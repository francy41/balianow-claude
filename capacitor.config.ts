import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bailanow.app',
  appName: 'BailaNow',
  webDir: 'dist',
  // La web se empaqueta DENTRO de la APK (modo standalone) — la app no
  // depende de ningún host web. Solo Supabase queda como backend externo.
  // Para volver a cargar la web en vivo, restaura el bloque `server.url`.
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#EC4899',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
