import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Detect if running inside a Capacitor native shell
export const isNative = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform();
};

export const getPlatform = (): 'android' | 'ios' | 'web' => {
  if (typeof (window as any).Capacitor === 'undefined') return 'web';
  return (window as any).Capacitor.getPlatform() ?? 'web';
};

/**
 * Call this once in App.tsx — handles:
 * - Android hardware back button
 * - StatusBar color
 * - SplashScreen hide
 */
export function useCapacitorApp() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    let App: any, StatusBar: any, SplashScreen: any;

    const setup = async () => {
      try {
        // Dynamic imports — only load if on native platform
        [{ App }, { StatusBar }, { SplashScreen }] = await Promise.all([
          import('@capacitor/app'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
        ]);

        // Set status bar style
        await StatusBar.setBackgroundColor({ color: '#FF6B35' });
        await StatusBar.setStyle({ style: 'LIGHT' });

        // Hide splash after app is ready
        await SplashScreen.hide({ fadeOutDuration: 300 });

        // Handle Android back button
        App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            navigate(-1);
          } else {
            // At root — ask to exit (optional: could show confirm dialog)
            App.exitApp();
          }
        });

        // Handle app state changes (foreground/background)
        App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            // App came to foreground — could refresh data here
            console.log('[Capacitor] App resumed');
          }
        });

      } catch (err) {
        console.warn('[Capacitor] Plugin setup error:', err);
      }
    };

    setup();

    return () => {
      App?.removeAllListeners?.();
    };
  }, []);
}
