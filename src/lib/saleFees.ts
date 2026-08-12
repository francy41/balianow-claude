/**
 * Tarifa FIJA de plataforma por venta (lo que gana BailaNow por cada operación),
 * independiente del % de comisión. Se cobra por:
 *   - cada reserva de local
 *   - cada venta de entrada (ticket)
 * Fuente de la verdad: site_config key 'platform_sale_fees' = { reservation, ticket }.
 * Editable desde el panel superadmin → Comisiones.
 */
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const KEY = 'platform_sale_fees';
const DEFAULTS: SaleFees = { reservation: 1.5, ticket: 1.5 };

export interface SaleFees {
  reservation: number; // € fijos por reserva
  ticket: number;      // € fijos por entrada vendida
}

let cached: SaleFees | null = null;

const clean = (n: any, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : fallback;
};

export async function fetchSaleFees(): Promise<SaleFees> {
  try {
    const { data } = await supabase.from('site_config').select('value').eq('key', KEY).maybeSingle();
    const v = (data?.value as any) || {};
    cached = {
      reservation: clean(v.reservation, DEFAULTS.reservation),
      ticket: clean(v.ticket, DEFAULTS.ticket),
    };
  } catch {
    cached = { ...DEFAULTS };
  }
  return cached;
}

export function getCachedSaleFees(): SaleFees {
  return cached ?? DEFAULTS;
}

export async function setSaleFees(fees: Partial<SaleFees>): Promise<{ error?: string }> {
  const next: SaleFees = {
    reservation: clean(fees.reservation ?? getCachedSaleFees().reservation, DEFAULTS.reservation),
    ticket: clean(fees.ticket ?? getCachedSaleFees().ticket, DEFAULTS.ticket),
  };
  const { error } = await supabase
    .from('site_config')
    .upsert({ key: KEY, value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { error: error.message };
  cached = next;
  return {};
}

/** Hook React: devuelve las tarifas fijas actuales (carga de la BD al montar). */
export function useSaleFees(): SaleFees {
  const [fees, setFees] = useState<SaleFees>(getCachedSaleFees());
  useEffect(() => { fetchSaleFees().then(setFees); }, []);
  return fees;
}
