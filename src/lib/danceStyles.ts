// Estilos de baile centralizados (tabla `dance_styles`) — reemplaza los
// arrays GENRES/STYLES que antes vivían duplicados y desalineados en
// ArtistsPage.tsx y ClassesPage.tsx.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

let cache: string[] | null = null;

/** Etiquetas de estilos de baile activos, en el orden de `sort_order`. */
export function useDanceStyles(): string[] {
  const [styles, setStyles] = useState<string[]>(cache || []);
  useEffect(() => {
    if (cache) { setStyles(cache); return; }
    let cancelled = false;
    supabase.from('dance_styles').select('label').eq('active', true).order('sort_order')
      .then(({ data }) => {
        if (cancelled) return;
        const labels = (data || []).map((s: any) => s.label);
        cache = labels;
        setStyles(labels);
      }, () => {});
    return () => { cancelled = true; };
  }, []);
  return styles;
}
