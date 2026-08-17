// Ciudades centralizadas (tabla `cities`) — reemplaza los arrays BASE_CITIES
// que antes vivían duplicados y desalineados en EventsPage.tsx y VenuesPage.tsx.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

let cache: string[] | null = null;

/** Nombres de ciudad activas, en el orden de `sort_order`. Usado para priorizar
 *  qué ciudades aparecen primero en los filtros cuando tienen datos reales. */
export function useCityOrder(): string[] {
  const [cities, setCities] = useState<string[]>(cache || []);
  useEffect(() => {
    if (cache) { setCities(cache); return; }
    let cancelled = false;
    supabase.from('cities').select('name').eq('active', true).order('sort_order')
      .then(({ data }) => {
        if (cancelled) return;
        const names = (data || []).map((c: any) => c.name);
        cache = names;
        setCities(names);
      }, () => {});
    return () => { cancelled = true; };
  }, []);
  return cities;
}
