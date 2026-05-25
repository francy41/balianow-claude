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
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  // Solo activamos en producción y si hay DSN configurada
  if (import.meta.env.DEV || !DSN) {
    if (import.meta.env.DEV) console.log('[sentry] skipped (DEV mode)');
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: 'bailanow@1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,         // muestra el texto en los replays (no es info sensible)
        blockAllMedia: false,
        maskAllInputs: true,        // OCULTA inputs (passwords, emails) por seguridad
      }),
    ],
    // % de transacciones rastreadas (10% para no consumir cuota)
    tracesSampleRate: 0.1,
    // % de sesiones con replay (10% normales + 100% de las que tienen error)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // No enviar errores que vienen de extensiones del navegador
    denyUrls: [
      /extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i,
    ],
    // No reportar errores comunes/conocidos del navegador que no son nuestros
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Errores típicos de extensiones de cripto/ads que no son nuestros
      /chrome-extension/i,
      /Failed to fetch dynamically imported module/i,
    ],
    beforeSend(event, hint) {
      // Hook para filtrar/modificar eventos antes de enviarlos
      // Por ahora: enviamos tal cual
      return event;
    },
  });

  console.log('[sentry] initialized');
}

/** Adjunta info del usuario actual a los eventos de Sentry */
export function setSentryUser(user: { id: string; email?: string; name?: string } | null) {
  if (import.meta.env.DEV || !DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.name });
  } else {
    Sentry.setUser(null);
  }
}

/** Captura manualmente un error (úsalo en catch blocks importantes) */
export function captureError(error: unknown, context?: Record<string, any>) {
  if (import.meta.env.DEV || !DSN) {
    console.error('[sentry-dev]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}
