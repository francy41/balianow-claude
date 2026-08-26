/**
 * useSiteConfig — sync site_config + categories tables ↔ useSiteConfigStore
 *
 * On app load: reads all keys from site_config + categories table and hydrates the Zustand store.
 * On admin save: upserts to the respective table.
 */
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSiteConfigStore, useSponsorsStore, type HomeCategory, type ProfileModule, type CommissionConfig } from '../store/appStore';
import { useCMSStore } from '../store/cmsStore';
import { applyBrandColors, type BrandColors } from '../lib/color';

// ── Load config from Supabase on mount ────────────────────────────────────
export function useSiteConfigLoader() {
  const { setHeroSliderImages, setHeroMedia, setSiteLogo, setHomeCategories, setProfileModules, setHomeTvCards, setHomeTvHero, setHomeRadioHero, setCommissions } = useSiteConfigStore();

  useEffect(() => {
    const load = async () => {
      // site_config (key/value pairs)
      try {
        const { data } = await supabase.from('site_config').select('key, value');
        for (const row of (data || [])) {
          if (row.key === 'hero_slider_images' && Array.isArray(row.value) && row.value.length > 0) {
            setHeroSliderImages(row.value);
          }
          if (row.key === 'hero_media' && row.value?.url) {
            setHeroMedia(row.value);
          }
          if (row.key === 'site_logo' && row.value?.url) {
            setSiteLogo(row.value.url);
          }
          if (row.key === 'profile_modules' && Array.isArray(row.value) && row.value.length > 0) {
            setProfileModules(row.value as ProfileModule[]);
          }
          // Constructor Home (secciones activas/orden) — antes solo vivía en localStorage
          // del admin que lo tocara; ahora todos los visitantes cargan el mismo ajuste real.
          if (row.key === 'home_cms_modules' && Array.isArray(row.value) && row.value.length > 0) {
            useCMSStore.setState({ modules: row.value });
          }
          if (row.key === 'home_tv_cards' && Array.isArray(row.value) && row.value.length > 0) {
            setHomeTvCards(row.value);
          }
          // Ilustración del módulo de TV del home. Se acepta cadena vacía a
          // propósito: es como el admin vuelve a la silueta dibujada.
          if (row.key === 'home_tv_hero' && row.value && typeof row.value === 'object') {
            setHomeTvHero(typeof row.value.url === 'string' ? row.value.url : '');
          }
          if (row.key === 'home_radio_hero' && row.value && typeof row.value === 'object') {
            setHomeRadioHero(typeof row.value.url === 'string' ? row.value.url : '');
          }
          if (row.key === 'commission_config' && row.value && typeof row.value === 'object') {
            setCommissions(row.value as CommissionConfig);
          }
          // Color de marca — editado desde SuperAdmin → Diseño Web. Se aplica como
          // variables CSS para que TODOS los visitantes vean el mismo color, no solo el admin.
          if (row.key === 'brand_colors' && row.value && typeof row.value === 'object') {
            applyBrandColors(row.value as BrandColors);
          }
          // Sponsors/destacados: fuente de verdad = BD. Sincroniza el store público
          // (incluye lista vacía) para que los borrados del admin se reflejen y no
          // queden los INITIAL_SPONSORS de ejemplo como fantasmas.
          if (row.key === 'sponsors' && Array.isArray(row.value)) {
            useSponsorsStore.setState({ sponsors: row.value });
          }
        }
      } catch (e) { console.warn('[siteConfig] load', e); }

      // categories (tabla independiente) — fuente de la verdad para el home
      await loadCategories(setHomeCategories);
    };

    load();

    // Realtime: cualquier cambio en categorías refresca el menú/sidebar sin recargar
    const channel = supabase
      .channel('categories-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadCategories(setHomeCategories);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}

// Carga las categorías de la BD y las vuelca al store. Reutilizable (load inicial + realtime).
async function loadCategories(setHomeCategories: (cats: HomeCategory[]) => void) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon, route, section, display_order, active, image_url, parent_id, description')
      .order('section', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) {
      const cats: HomeCategory[] = data.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        icon: r.icon || '🎉',
        route: r.route || '/',
        section: (r.section || 'main') as HomeCategory['section'],
        display_order: Number(r.display_order) || 99,
        active: r.active !== false,
        image_url: r.image_url || undefined,
        parent_id: r.parent_id || null,
        description: r.description || undefined,
      }));
      setHomeCategories(cats);
    }
  } catch (e) { console.warn('[siteConfig] categories load', e); }
}

// ── Helpers ──────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: any): boolean => typeof s === 'string' && UUID_RE.test(s);

/** Convierte id de zustand (texto corto) a UUID determinista basado en slug+section.
 *  Así re-ejecutar saveCategoriesToDb no duplica filas. */
function toUuid(seed: string): string {
  // SHA-like simple hash → formateado como uuid v4
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  const hex = (Math.abs(h).toString(16) + 'a1b2c3d4e5f6').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// ── Persiste categorias del home en la tabla categories ──────────────────
export async function saveCategoriesToDb(cats: HomeCategory[]): Promise<{ error?: string }> {
  try {
    // Mapea ids no-uuid a uuids deterministas (para que vuelvan idénticos al recargar)
    const idMap = new Map<string, string>();
    cats.forEach(c => {
      const dbId = isUuid(c.id) ? c.id : toUuid(`${c.section || 'main'}|${c.name || c.id}`);
      idMap.set(c.id, dbId);
    });

    const uuids = Array.from(idMap.values());
    if (uuids.length > 0) {
      await supabase.from('categories').delete().not('id', 'in', `(${uuids.map(i => `"${i}"`).join(',')})`);
    } else {
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const rows = cats.map(c => ({
      id: idMap.get(c.id)!,
      name: c.name,
      icon: c.icon || '🎉',
      slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      route: c.route || '/',
      section: c.section || 'main',
      display_order: c.display_order ?? 99,
      active: c.active !== false,
      image_url: c.image_url ?? null,
      parent_id: c.parent_id ? (idMap.get(c.parent_id) || (isUuid(c.parent_id) ? c.parent_id : null)) : null,
      description: c.description ?? null,
    }));
    const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'id' });
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e.message || 'Error' };
  }
}

// ── Save a config key to Supabase ─────────────────────────────────────────
export async function saveSiteConfigKey(
  key: string,
  value: any
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) return { error: error.message };
  return {};
}
