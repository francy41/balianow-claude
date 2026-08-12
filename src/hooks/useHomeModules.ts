import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Tarjeta de módulo del Home (sección "Más para ti" y futuras).
 * Data-driven: se lee de la tabla `home_modules` de Supabase cuando existe;
 * si la tabla aún no está creada o está vacía, se usa FALLBACK_MODULES.
 * NO hay lógica por-slug en el frontend: todo sale de los datos.
 */
export interface HomeModuleCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;    // clase Tailwind, p.ej. 'bg-pink-500'
  gradient: string;  // clase Tailwind 'from-... to-...'
  glow: string;      // clase Tailwind 'hover:shadow-...'
  badge?: string | null;
  route: string;
  imageUrl?: string | null;
}

// Semilla / respaldo — idéntica al set actual. En cuanto la tabla `home_modules`
// tenga filas publicadas para la sección, éstas tienen prioridad.
export const FALLBACK_MORE_FOR_YOU: HomeModuleCard[] = [
  { id: 'f-planes',   slug: 'planes',      title: 'Planes Para Bailar',    subtitle: 'Encuentra personas para salir a bailar', icon: '❤️', iconBg: 'bg-pink-500',    gradient: 'from-rose-500 to-pink-600',      glow: 'hover:shadow-rose-500/40',    badge: 'Nuevo', route: '/rutas',        imageUrl: null },
  { id: 'f-parejas',  slug: 'parejas',     title: 'Pareja de baile',       subtitle: 'Busca compañero/a de baile',             icon: '💑', iconBg: 'bg-violet-500',  gradient: 'from-fuchsia-500 to-purple-600', glow: 'hover:shadow-fuchsia-500/40', badge: null,    route: '/parejas',      imageUrl: null },
  { id: 'f-danceflow',slug: 'danceflow',   title: 'DanceFlow IA',          subtitle: 'Entrena con inteligencia artificial',    icon: '🤖', iconBg: 'bg-blue-500',    gradient: 'from-indigo-600 to-blue-700',    glow: 'hover:shadow-blue-500/40',    badge: null,    route: '/danceflow',    imageUrl: null },
  { id: 'f-clases',   slug: 'clases',      title: 'Clases Online',         subtitle: 'Aprende desde cualquier lugar',          icon: '🎓', iconBg: 'bg-orange-500',  gradient: 'from-amber-500 to-orange-600',   glow: 'hover:shadow-amber-500/40',   badge: null,    route: '/clases',       imageUrl: null },
  { id: 'f-bailarines',slug: 'bailarines', title: 'Bailarines',            subtitle: 'Contrata bailarines · reserva clases',   icon: '🕺', iconBg: 'bg-teal-500',    gradient: 'from-emerald-500 to-teal-600',   glow: 'hover:shadow-emerald-500/40', badge: null,    route: '/artistas',     imageUrl: null },
  { id: 'f-promo',    slug: 'promocionate',title: 'Promociona tu negocio', subtitle: 'Publicidad, flyers, vídeos y más',       icon: '🎤', iconBg: 'bg-pink-500',    gradient: 'from-pink-500 to-rose-600',      glow: 'hover:shadow-pink-500/40',    badge: null,    route: '/promocionate', imageUrl: null },
];

function mapRow(r: any): HomeModuleCard {
  return {
    id: String(r.id),
    slug: r.slug || '',
    title: r.title || '',
    subtitle: r.subtitle || '',
    icon: r.icon || '✨',
    iconBg: r.icon_bg || 'bg-pink-500',
    gradient: r.gradient || 'from-pink-500 to-rose-600',
    glow: r.glow || 'hover:shadow-pink-500/40',
    badge: r.badge || null,
    route: r.route || '/',
    imageUrl: r.image_url || null,
  };
}

/**
 * Devuelve las tarjetas publicadas de una sección del Home.
 * Empieza con el fallback y, si la tabla existe y tiene filas, las sustituye.
 * Si la tabla no existe todavía, el error se ignora y se mantiene el fallback.
 */
export function useHomeModules(
  section: string,
  fallback: HomeModuleCard[] = FALLBACK_MORE_FOR_YOU,
): HomeModuleCard[] {
  const [cards, setCards] = useState<HomeModuleCard[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('home_modules')
          .select('id, slug, title, subtitle, icon, icon_bg, gradient, glow, badge, route, image_url')
          .eq('section', section)
          .eq('published', true)
          .order('sort', { ascending: true });
        if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
          setCards(data.map(mapRow));
        }
      } catch {
        /* la tabla puede no existir aún — se mantiene el fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [section]);

  return cards;
}
