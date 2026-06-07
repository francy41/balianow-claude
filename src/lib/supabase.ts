import { createClient } from '@supabase/supabase-js';

// Env vars must be set in .env.local (dev) and Vercel/hosting env (prod)
// Never hardcode these values here — they would be bundled into the public JS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[BailaNow] Missing Supabase env vars — check .env.local');
}

export const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      // Persistir sesión en localStorage para que editar/crear funcione tras recargar
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// ── AUTH HELPERS ─────────────────────────────────────────────
export const authService = {
  // ── Email / password ──────────────────────────────────────
  signUp: async (
    email: string,
    password: string,
    meta?: { name?: string; role?: string; city?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // ── OAuth ─────────────────────────────────────────────────
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { data, error };
  },

  // ── Password reset ────────────────────────────────────────
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return { data, error };
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  },

  // ── Email verification ────────────────────────────────────
  resendVerification: async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { data, error };
  },

  // ── Session ───────────────────────────────────────────────
  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  getProfile: async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return { data, error };
  },

  updateProfile: async (userId: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId);
    return { data, error };
  },

  onAuthChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ── CRUD HELPERS ─────────────────────────────────────────────
type Table = 'artists' | 'venues' | 'events' | 'services' | 'bookings' | 'reviews' | 'tickets' | 'messages' | 'favorites' | 'site_config' | 'profiles' | 'categories';

export const db = {
  // Read all rows (optionally filter)
  getAll: async <T = any>(table: Table, options?: { column?: string; value?: any; orderBy?: string; ascending?: boolean; limit?: number }) => {
    let q = supabase.from(table).select('*');
    if (options?.column && options.value !== undefined) q = q.eq(options.column, options.value);
    if (options?.orderBy) q = q.order(options.orderBy, { ascending: options?.ascending ?? false });
    if (options?.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    return { data: (data ?? []) as T[], error };
  },

  // Read one by id
  getById: async <T = any>(table: Table, id: string) => {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    return { data: data as T | null, error };
  },

  // Create
  insert: async <T = any>(table: Table, row: Record<string, unknown>) => {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    return { data: data as T | null, error };
  },

  // Update
  update: async <T = any>(table: Table, id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
    return { data: data as T | null, error };
  },

  // Delete
  remove: async (table: Table, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    return { error };
  },

  // Search (ilike on a column)
  search: async <T = any>(table: Table, column: string, query: string, limit = 20) => {
    const { data, error } = await supabase.from(table).select('*').ilike(column, `%${query}%`).limit(limit);
    return { data: (data ?? []) as T[], error };
  },

  // Count
  count: async (table: Table, column?: string, value?: any) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (column && value !== undefined) q = q.eq(column, value);
    const { count, error } = await q;
    return { count: count ?? 0, error };
  },
};

// ── REALTIME ─────────────────────────────────────────────────
export const realtime = {
  subscribe: (table: Table, event: 'INSERT' | 'UPDATE' | 'DELETE' | '*', callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event, schema: 'public', table }, callback)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};

// ── STORAGE ──────────────────────────────────────────────────
export const storage = {
  upload: async (bucket: string, path: string, file: File) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) return { url: null, error };
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, error: null };
  },

  getUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  remove: async (bucket: string, paths: string[]) => {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    return { error };
  },
};
