/**
 * Sentry — captura de errores en producción
 *
 * Setup:
 *  1) Crear cuenta en sentry.io
 *  2) Crear proyecto React
 *  3) Pegar la DSN en VITE_SENTRY_DSN en .env.local (y en Vercel envs)
 *
 * Comportamiento:
 *  - En desarrollo: no hace nada (ahorra cuota gratuita)
 *  - En producción: captura errores JS, errores de Supabase, sesiones de replay
 */
/**
 * Sentry — lazy initialization para mantener el bundle pequeño
 *
 * El SDK pesa ~200KB. Lo cargamos con dynamic import DESPUÉS del primer paint
 * para no bloquear el critical rendering path.
 */
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
let SentryLib: typeof import('@sentry/react') | null = null;
let initPromise: Promise<void> | null = null;

async function loadSentry() {
  if (SentryLib) return SentryLib;
  const mod = await import('@sentry/react');
  SentryLib = mod;
  return mod;
}

export function initSentry() {
  if (import.meta.env.DEV || !DSN) {
    if (import.meta.env.DEV) console.log('[sentry] skipped (DEV mode)');
    return;
  }
  // Defiere la carga hasta que el navegador esté idle (no bloquea critical path)
  initPromise = new Promise<void>(resolve => {
    const start = async () => {
      const Sentry = await loadSentry();
      Sentry.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        release: 'bailanow@1.0.0',
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
            maskAllInputs: true,
          }),
        ],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.05,   // bajado a 5% para reducir cuota
        replaysOnErrorSampleRate: 1.0,
        denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i],
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          'Non-Error promise rejection captured',
          /chrome-extension/i,
          /Failed to fetch dynamically imported module/i,
        ],
      });
      console.log('[sentry] initialized (lazy)');
      resolve();
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(start, { timeout: 3000 });
    } else {
      setTimeout(start, 1500);
    }
  });
}

/** Adjunta info del usuario actual a los eventos de Sentry */
export async function setSentryUser(user: { id: string; email?: string; name?: string } | null) {
  if (import.meta.env.DEV || !DSN) return;
  if (initPromise) await initPromise;
  const Sentry = await loadSentry();
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.name });
  } else {
    Sentry.setUser(null);
  }
}

/** Captura manualmente un error */
export async function captureError(error: unknown, context?: Record<string, any>) {
  if (import.meta.env.DEV || !DSN) {
    console.error('[sentry-dev]', error, context);
    return;
  }
  if (initPromise) await initPromise;
  const Sentry = await loadSentry();
  Sentry.captureException(error, { extra: context });
}
