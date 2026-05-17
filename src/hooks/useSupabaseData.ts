import { useState, useEffect, useCallback } from 'react';
import { db, realtime } from '../lib/supabase';

/**
 * Generic hook to fetch data from a Supabase table with loading/error state.
 * Falls back gracefully if Supabase is unavailable.
 */
export function useSupabaseTable<T = any>(
  table: 'artists' | 'venues' | 'events' | 'services' | 'bookings' | 'reviews' | 'tickets' | 'messages' | 'favorites' | 'site_config',
  options?: {
    column?: string;
    value?: any;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    realtime?: boolean;
    fallbackData?: T[];
  }
) {
  const [data, setData] = useState<T[]>(options?.fallbackData ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await db.getAll<T>(table, options);
      if (err) throw err;
      if (rows.length > 0) {
        setData(rows);
      }
      // If no rows, keep fallback data
      setError(null);
    } catch (e: any) {
      console.warn(`[Supabase] ${table} fetch failed, using fallback:`, e?.message);
      setError(e?.message || 'Error');
      // Keep fallback data
    } finally {
      setLoading(false);
    }
  }, [table, options?.column, options?.value]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Optional realtime subscription
  useEffect(() => {
    if (!options?.realtime) return;
    const unsub = realtime.subscribe(table, '*', () => { fetch(); });
    return unsub;
  }, [table, options?.realtime, fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Fetch a single record by ID.
 */
export function useSupabaseRecord<T = any>(
  table: 'artists' | 'venues' | 'events' | 'services',
  id: string | undefined,
  fallbackData?: T
) {
  const [data, setData] = useState<T | null>(fallbackData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data: row, error: err } = await db.getById<T>(table, id);
        if (err) throw err;
        if (row) setData(row);
        setError(null);
      } catch (e: any) {
        console.warn(`[Supabase] ${table}/${id} fetch failed:`, e?.message);
        setError(e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [table, id]);

  return { data, loading, error };
}
