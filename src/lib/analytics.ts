// Google Analytics 4 — se activa solo si defines VITE_GA_ID (p. ej. G-XXXXXXX).
// Sin esa variable, todo es no-op (no carga nada, no rastrea).

import { supabase } from './supabase';

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

// ── Analítica propia (first-party) ──────────────────────────────
// Registra cada visita en la tabla `page_views` de Supabase para que el
// superadmin vea las visitas dentro de su propio panel, sin depender de
// Google Analytics ni de servicios externos. Es "fire-and-forget": nunca
// bloquea la navegación ni lanza errores visibles (si la tabla aún no existe
// o RLS lo rechaza, simplemente se ignora).
function getSessionId(): string {
  try {
    let sid = localStorage.getItem('bn_sid');
    if (!sid) {
      sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('bn_sid', sid);
    }
    return sid;
  } catch {
    return 'anon';
  }
}

function trackPageviewSupabase(path: string) {
  try {
    supabase
      .from('page_views')
      .insert({
        path: path.slice(0, 300),
        referrer: (document.referrer || '').slice(0, 300) || null,
        session_id: getSessionId(),
      })
      .then(() => {}, () => {}); // ignora éxito y error: nunca debe romper la navegación
  } catch {
    /* noop */
  }
}

export function trackPageview(path: string) {
  // 1) Analítica propia (siempre activa → alimenta el panel de superadmin)
  trackPageviewSupabase(path);

  // 2) Google Analytics (solo si VITE_GA_ID está definido)
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
