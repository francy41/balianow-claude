/**
 * "Ahora suena" y oyentes conectados, leídos del propio servidor de la emisora.
 *
 * Las emisoras de BailaNow se sirven desde AzuraCast, que publica un endpoint
 * abierto `/api/nowplaying/{shortcode}` con la canción en curso y el número de
 * oyentes. El shortcode se deduce de la URL de escucha, así que no hace falta
 * configurar nada aparte: basta con el `stream_url` que ya guarda la tabla
 * `radio_stations`.
 *
 * Si el servidor no responde, no es AzuraCast o la URL no tiene la forma
 * esperada, se devuelve null y quien lo consuma oculta la sección. Nunca se
 * inventa una canción ni un recuento de oyentes.
 */
import { useEffect, useState } from 'react';

export interface NowPlaying {
  title: string;
  artist: string;
  art: string;
  /** Oyentes conectados. null si el servidor no lo informa. */
  listeners: number | null;
  isOnline: boolean;
}

/** `https://host/listen/mi-emisora/radio.mp3` → `https://host/api/nowplaying/mi-emisora` */
export function nowPlayingEndpoint(streamUrl?: string | null): string | null {
  if (!streamUrl) return null;
  try {
    const u = new URL(streamUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('listen');
    if (i === -1 || !parts[i + 1]) return null;
    return `${u.origin}/api/nowplaying/${encodeURIComponent(parts[i + 1])}`;
  } catch {
    return null;
  }
}

function parse(json: any): NowPlaying | null {
  const song = json?.now_playing?.song;
  if (!song) return null;
  const title = String(song.title || '').trim();
  const artist = String(song.artist || '').trim();
  // Sin título no hay nada que enseñar: algunas emisoras emiten metadatos vacíos.
  if (!title && !artist) return null;
  const l = json?.listeners;
  const raw = typeof l === 'number' ? l : (l?.current ?? l?.total ?? l?.unique);
  return {
    title: title || String(song.text || '').trim(),
    artist,
    art: String(song.art || '').trim(),
    listeners: Number.isFinite(Number(raw)) ? Number(raw) : null,
    isOnline: json?.is_online !== false,
  };
}

const REFRESH_MS = 20000;

export function useNowPlaying(streamUrl?: string | null): NowPlaying | null {
  const [data, setData] = useState<NowPlaying | null>(null);

  useEffect(() => {
    const endpoint = nowPlayingEndpoint(streamUrl);
    if (!endpoint) { setData(null); return; }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      // Con la pestaña oculta no se consulta: la emisora no cobra por nuestras
      // peticiones, pero tampoco hay a quién enseñárselo.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch(endpoint, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const parsed = parse(await res.json());
        if (!cancelled) setData(parsed);
      } catch {
        if (!cancelled) setData(null);
      }
    };

    tick();
    timer = setInterval(tick, REFRESH_MS) as unknown as ReturnType<typeof setTimeout>;
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer as any);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [streamUrl]);

  return data;
}
