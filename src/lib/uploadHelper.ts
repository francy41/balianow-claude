/**
 * uploadHelper — sistema robusto y unificado para subir archivos a Supabase Storage
 *
 * Reglas:
 *  - SIEMPRE verifica sesión antes (auth requerida)
 *  - Timeout de 60s para evitar spinners colgados
 *  - Logs detallados en consola para debug
 *  - Devuelve siempre { url, error } — nunca lanza
 *  - Fallback a base64 si está habilitado
 */
import { supabase } from './supabase';

export interface UploadOptions {
  bucket?: 'covers' | 'avatars' | 'gallery' | 'media';
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];      // ['image/*', 'video/*']
  base64Fallback?: boolean;      // si falla, devolver dataURL
  timeoutMs?: number;
}

export interface UploadResult {
  url: string | null;
  error: string | null;
  fallback?: boolean;            // true si se usó base64
}

const DEFAULTS: Required<UploadOptions> = {
  bucket: 'covers',
  folder: 'general',
  maxSizeMB: 50,
  allowedTypes: ['image/*', 'video/*'],
  base64Fallback: true,
  timeoutMs: 60000,
};

function matchesType(file: File, patterns: string[]): boolean {
  return patterns.some(p => {
    if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -1));
    return file.type === p;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)),
  ]);
}

/**
 * Sube un archivo a Supabase Storage. SIEMPRE devuelve un objeto.
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const opts = { ...DEFAULTS, ...options };

  console.log('[upload] start', { name: file.name, size: file.size, type: file.type, bucket: opts.bucket, folder: opts.folder });

  // ── Validations ──────────────────────────────────────────────
  if (!file) return { url: null, error: 'No se proporcionó archivo' };

  if (file.size > opts.maxSizeMB * 1024 * 1024) {
    return { url: null, error: `El archivo supera ${opts.maxSizeMB}MB` };
  }

  if (!matchesType(file, opts.allowedTypes)) {
    return { url: null, error: `Tipo no permitido (${file.type}). Acepta: ${opts.allowedTypes.join(', ')}` };
  }

  // ── Auth check ───────────────────────────────────────────────
  let session: any = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session;
  } catch (e) {
    console.warn('[upload] session check failed', e);
  }

  if (!session && !opts.base64Fallback) {
    return { url: null, error: 'Debes iniciar sesión para subir archivos' };
  }

  // ── Try Storage upload ───────────────────────────────────────
  if (session) {
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${opts.folder}/${safe}`;

      const uploadPromise = supabase.storage
        .from(opts.bucket)
        .upload(path, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
        });

      const { error } = await withTimeout(uploadPromise, opts.timeoutMs, 'Storage upload');
      if (error) throw error;

      const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
      console.log('[upload] success', data.publicUrl);
      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('[upload] storage error:', err);
      if (!opts.base64Fallback) {
        return { url: null, error: err.message || 'Error subiendo al servidor' };
      }
      // Continúa al fallback de base64
    }
  }

  // ── Fallback: base64 ─────────────────────────────────────────
  try {
    const dataUrl = await fileToBase64(file);
    console.log('[upload] fallback base64', `${(dataUrl.length / 1024).toFixed(0)}kb`);
    return { url: dataUrl, error: null, fallback: true };
  } catch (err: any) {
    return { url: null, error: err.message || 'No se pudo leer el archivo' };
  }
}

/**
 * Atajo para imágenes
 */
export const uploadImage = (file: File, folder = 'images') =>
  uploadFile(file, { bucket: 'covers', folder, maxSizeMB: 10, allowedTypes: ['image/*'] });

/**
 * Atajo para videos (no usa fallback porque base64 es enorme)
 */
export const uploadVideo = (file: File, folder = 'videos') =>
  uploadFile(file, { bucket: 'covers', folder, maxSizeMB: 100, allowedTypes: ['video/*'], base64Fallback: false });

/**
 * Atajo para avatares
 */
export const uploadAvatar = (file: File, userId: string) =>
  uploadFile(file, { bucket: 'avatars', folder: userId, maxSizeMB: 5, allowedTypes: ['image/*'] });
