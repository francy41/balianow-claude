/**
 * useSiteConfig — sync site_config table ↔ useSiteConfigStore
 *
 * On app load: reads all keys from site_config and hydrates the Zustand store.
 * On admin save: upserts a single key to site_config.
 */
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSiteConfigStore } from '../store/appStore';

// ── Load config from Supabase on mount ────────────────────────────────────
export function useSiteConfigLoader() {
  const { setHeroSliderImages, setHeroMedia } = useSiteConfigStore();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('site_config')
        .select('key, value');

      if (error || !data) return;

      for (const row of data) {
        if (row.key === 'hero_slider_images' && Array.isArray(row.value) && row.value.length > 0) {
          setHeroSliderImages(row.value);
        }
        if (row.key === 'hero_media' && row.value?.url) {
          setHeroMedia(row.value);
        }
      }
    };

    load();
  }, []);
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
