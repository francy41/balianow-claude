// Google Analytics 4 — se activa solo si defines VITE_GA_ID (p. ej. G-XXXXXXX).
// Sin esa variable, todo es no-op (no carga nada, no rastrea).

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
let inited = false;

export function initAnalytics() {
  if (inited || !GA_ID || typeof window === 'undefined') return;
  inited = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  // Enviamos las páginas vistas a mano (SPA), no automáticamente.
  w.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
}

export function trackPageview(path: string) {
  const w = window as any;
  if (!GA_ID || !w.gtag) return;
  w.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  const w = window as any;
  if (!GA_ID || !w.gtag) return;
  w.gtag('event', name, params || {});
}

export const GA_ENABLED = !!GA_ID;
