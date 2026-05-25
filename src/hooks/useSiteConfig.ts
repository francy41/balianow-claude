/**
 * useSiteConfig — sync site_config + categories tables ↔ useSiteConfigStore
 *
 * On app load: reads all keys from site_config + categories table and hydrates the Zustand store.
 * On admin save: upserts to the respective table.
 */
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSiteConfigStore, type HomeCategory } from '../store/appStore';

// ── Load config from Supabase on mount ────────────────────────────────────
export function useSiteConfigLoader() {
  const { setHeroSliderImages, setHeroMedia, setSiteLogo, setHomeCategories } = useSiteConfigStore();

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
        }
      } catch (e) { console.warn('[siteConfig] load', e); }

      // categories (tabla independiente) — fuente de la verdad para el home
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, icon, route, section, display_order, active, image_url')
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
          }));
          setHomeCategories(cats);
        }
      } catch (e) { console.warn('[siteConfig] categories load', e); }
    };

    load();
  }, []);
}

// ── Persiste categorias del home en la tabla categories ──────────────────
export async function saveCategoriesToDb(cats: HomeCategory[]): Promise<{ error?: string }> {
  try {
    // Reemplazo total: borra las que no estén y upserta las actuales
    const ids = cats.map(c => c.id);
    if (ids.length > 0) {
      await supabase.from('categories').delete().not('id', 'in', `(${ids.map(i => `'${i}'`).join(',')})`);
    } else {
      await supabase.from('categories').delete().neq('id', '__noop__');
    }
    const rows = cats.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon || '🎉',
      slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      route: c.route || '/',
      section: c.section || 'main',
      display_order: c.display_order ?? 99,
      active: c.active !== false,
      image_url: (c as any).image_url ?? null,
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
