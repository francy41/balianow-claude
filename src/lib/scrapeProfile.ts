/**
 * scrapeProfile — cliente para la Edge Function `scrape-profile`
 *
 * Llama al endpoint server-side que fetcha una URL, parsea OpenGraph /
 * JSON-LD / sociales y devuelve un perfil listo para insertar en `profiles`.
 *
 * Uso:
 *   const profile = await scrapeProfile('https://instagram.com/djmambo');
 */
import { supabase } from './supabase';

export interface ScrapedProfile {
  url: string;
  name: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  cover_photo?: string;
  city?: string | null;
  country?: string | null;
  role_hint?: string | null;
  instagram_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  facebook_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
  twitch_url?: string;
  website_url?: string;
  raw_meta?: any;
}

export async function scrapeProfile(url: string): Promise<{ ok: true; profile: ScrapedProfile } | { ok: false; error: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Inicia sesión para usar el extractor' };

    const { data, error } = await supabase.functions.invoke('scrape-profile', {
      body: { url },
    });

    if (error) return { ok: false, error: error.message || 'Error en edge function' };
    if (data?.error) return { ok: false, error: data.error };
    if (!data?.name) return { ok: false, error: 'No se pudo extraer ningún nombre del URL' };

    return { ok: true, profile: data as ScrapedProfile };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Error desconocido' };
  }
}

/** Convierte un perfil scrapeado en el formato del ProfileImporter */
export function scrapedToImport(p: ScrapedProfile, defaultRole: string = 'artist'): any {
  return {
    name:           p.name,
    full_name:      p.full_name || p.name,
    bio:            p.bio,
    role:           p.role_hint || defaultRole,
    avatar_url:     p.avatar_url,
    cover_photo:    p.cover_photo,
    city:           p.city,
    location:       p.city,
    country:        p.country,
    instagram_url:  p.instagram_url,
    tiktok_url:     p.tiktok_url,
    youtube_url:    p.youtube_url,
    facebook_url:   p.facebook_url,
    spotify_url:    p.spotify_url,
    soundcloud_url: p.soundcloud_url,
    twitch_url:     p.twitch_url,
    website_url:    p.website_url,
  };
}
