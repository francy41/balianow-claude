import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bailanow.app',
  appName: 'BailaNow',
  webDir: 'dist',
  server: {
    // ✅ La APK siempre carga la web en vivo — cualquier cambio en la web
    // se refleja automáticamente en la app sin necesitar rebuild del APK
    url: 'https://bailanow-app.vercel.app',
    cleartext: false,
  },
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
