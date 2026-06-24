/**
 * Comisión global de plataforma (la que gana el superadmin).
 * Fuente de la verdad: site_config key 'platform_commission' = { percent: 15 }.
 * Editable desde el panel superadmin → afecta a TODAS las reservas de clases nuevas.
 */
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const KEY = 'platform_commission';
const DEFAULT_PERCENT = 15;
let cached: number | null = null;

export async function fetchCommissionPercent(): Promise<number> {
  try {
    const { data } = await supabase.from('site_config').select('value').eq('key', KEY).maybeSingle();
    const p = Number((data?.value as any)?.percent);
    cached = Number.isFinite(p) && p >= 0 ? p : DEFAULT_PERCENT;
  } catch {
    cached = DEFAULT_PERCENT;
  }
  return cached;
}

export function getCachedCommissionPercent(): number {
  return cached ?? DEFAULT_PERCENT;
}

export async function setCommissionPercent(percent: number): Promise<{ error?: string }> {
  const clean = Math.max(0, Math.min(100, Number(percent) || 0));
  const { error } = await supabase
    .from('site_config')
    .upsert({ key: KEY, value: { percent: clean }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { error: error.message };
  cached = clean;
  return {};
}

/** Hook React: devuelve el % de comisión actual (carga de la BD al montar). */
export function useCommissionPercent(): number {
  const [pct, setPct] = useState<number>(getCachedCommissionPercent());
  useEffect(() => { fetchCommissionPercent().then(setPct); }, []);
  return pct;
}

/** Calcula el desglose de un importe con la comisión dada. */
export function splitAmount(total: number, percent: number) {
  const fee = +(total * (percent / 100)).toFixed(2);
  const net = +(total - fee).toFixed(2);
  return { total: +total.toFixed(2), fee, net, percent };
}
