import { useEffect } from 'react';

interface SeoInput { title?: string; description?: string; path?: string; image?: string }
const BASE = 'https://bailanow.com';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

/**
 * SEO por página en el SPA: actualiza <title>, description, canonical y OG/Twitter
 * al cambiar de ruta. Google renderiza JS, así que esto mejora el indexado de cada
 * landing (páginas de ciudad, captación de partner, etc.).
 */
export function useSeo({ title, description, path, image }: SeoInput) {
  useEffect(() => {
    if (title) { document.title = title; setMeta('property', 'og:title', title); setMeta('name', 'twitter:title', title); }
    if (description) { setMeta('name', 'description', description); setMeta('property', 'og:description', description); setMeta('name', 'twitter:description', description); }
    const url = BASE + (path ?? (typeof location !== 'undefined' ? location.pathname : ''));
    setMeta('property', 'og:url', url);
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = url;
    if (image) { setMeta('property', 'og:image', image); setMeta('name', 'twitter:image', image); }
  }, [title, description, path, image]);
}
