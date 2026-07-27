import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import { I18nProvider } from './lib/i18n';

// Sentry: captura errores reales en producción (no-op en DEV o si falta DSN)
initSentry();
// Google Analytics 4 (no-op si no hay VITE_GA_ID)
initAnalytics();

// ── Production log suppression + Anti-tampering ────────────────────────────
if (!import.meta.env.DEV) {
  // 1) Silenciar logs internos
  // eslint-disable-next-line no-console
  console.log = () => {};
  // eslint-disable-next-line no-console
  console.warn = () => {};
  // eslint-disable-next-line no-console
  console.debug = () => {};
  // eslint-disable-next-line no-console
  console.info = () => {};

  // 2) Mensaje anti-hacker en consola
  setTimeout(() => {
    const styleTitle = 'color:#fff;background:linear-gradient(135deg,#ec4899,#a855f7);font-size:24px;font-weight:900;padding:10px 20px;border-radius:8px;';
    const styleWarn  = 'color:#ef4444;font-size:14px;font-weight:700;';
    const styleNorm  = 'color:#666;font-size:12px;';
    // eslint-disable-next-line no-console
    console.error('%c🛑 ¡DETENTE!', styleTitle);
    // eslint-disable-next-line no-console
    console.error('%c⚠️ Esta consola es para desarrolladores.', styleWarn);
    // eslint-disable-next-line no-console
    console.error('%cSi alguien te dijo que copies/pegues algo aquí, es un INTENTO DE FRAUDE. Podrías comprometer tu cuenta de BailaNow.', styleNorm);
    // eslint-disable-next-line no-console
    console.error('%c→ Más info: https://bailanow-app.vercel.app/legal/seguridad', styleNorm);
  }, 1000);

  // 3) Desactivar React DevTools en producción
  if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    try {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      for (const key in hook) {
        hook[key] = typeof hook[key] === 'function' ? () => {} : null;
      }
    } catch {}
  }

  // 4) Detectar/disuadir DevTools abierto
  const devToolsCheck = () => {
    const threshold = 160;
    const opened = window.outerWidth - window.innerWidth > threshold
                || window.outerHeight - window.innerHeight > threshold;
    if (opened) {
      // No bloqueamos pero registramos intento (analytics)
      try { (window as any).__bn_devtools_detected = true; } catch {}
    }
  };
  setInterval(devToolsCheck, 5000);

  // 5) Deshabilitar clic derecho en producción (opcional, comentar si molesta)
  // document.addEventListener('contextmenu', e => e.preventDefault());
}

// ── Clear legacy localStorage keys ─────────────────────────────────────────
if (typeof window !== 'undefined') {
  const oldKeys = [
    'ritmolatino-site-config',
    'bailanow-site-config-v1',
  ];
  oldKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
