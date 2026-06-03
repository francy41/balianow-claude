/**
 * usePageMeta — sets <title> + <meta description> + Open Graph dynamically per page
 *
 * Uso:
 *   usePageMeta({ title: 'Artistas latinos', description: '35+ DJs y bailarines en Madrid', image: '/og-artistas.jpg' });
 */
import { useEffect } from 'react';

interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
}

const DEFAULT_TITLE = 'BailaNow — DJs · Artistas · Eventos · Venues · Bachata · Salsa';
const DEFAULT_DESC = 'BailaNow: el ecosistema latino #1. Contrata DJs, artistas y bailarines. Descubre eventos, festivales y venues. Marketplace y livestreams 100% latino.';
const DEFAULT_IMAGE = 'https://bailanow.com/og-default.jpg';

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function usePageMeta({ title, description, image, url, type = 'website' }: PageMeta = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · BailaNow` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const img = image || DEFAULT_IMAGE;
    const u = url || (typeof window !== 'undefined' ? window.location.href : 'https://bailanow.com');

    document.title = fullTitle;
    setMeta('description', desc);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', desc, true);
    setMeta('og:image', img, true);
    setMeta('og:url', u, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', 'BailaNow', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', img);
  }, [title, description, image, url, type]);
}
