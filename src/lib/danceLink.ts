/**
 * danceLink — Enlace de cámara entre dispositivos (móvil ↔ TV/PC)
 *
 * Concepto "Cámara Companion":
 *   - La PANTALLA (Smart TV / PC) muestra la clase en grande y genera un CÓDIGO.
 *   - El MÓVIL abre /baila-camara, introduce el código y se convierte en webcam.
 *   - El móvil detecta la pose LOCALMENTE (MediaPipe) y transmite solo los
 *     33 puntos del esqueleto (no el vídeo) por Supabase Realtime Broadcast.
 *   - La pantalla recibe los landmarks y los usa en el game loop.
 *
 * Ventajas:
 *   ✅ Privacidad — el vídeo nunca sale del móvil, solo coordenadas
 *   ✅ Ligero — ~130 números a 15 fps, sin WebRTC ni TURN/STUN
 *   ✅ Funciona detrás de cualquier NAT / red móvil
 *
 * Opcionalmente el móvil envía un fotograma JPEG de baja resolución (~160px)
 * cada ~700 ms para que la pantalla muestre un "espejo" del usuario.
 */
import { supabase } from './supabase';
import type { Landmark, PoseResult } from './poseSync';

export type LinkRole = 'host' | 'camera';

export interface LinkHandlers {
  onPose?: (lm: PoseResult) => void;          // host: recibe pose del móvil
  onFrame?: (dataUrl: string) => void;        // host: recibe miniatura del móvil
  onCameraJoin?: (info: { name?: string }) => void; // host: el móvil se conectó
  onCameraLeave?: () => void;                  // host: el móvil se desconectó
  onHostReady?: () => void;                    // camera: la pantalla confirma enlace
  onHostBye?: () => void;                      // camera: la pantalla cerró sesión
  onStatus?: (s: 'connecting' | 'open' | 'closed' | 'error') => void;
}

export interface DanceLink {
  role: LinkRole;
  code: string;
  sendPose: (lm: Landmark[]) => void;
  sendFrame: (dataUrl: string) => void;
  announceReady: () => void;       // host → confirma al móvil que está enlazado
  close: () => void;
}

// ── Código de emparejamiento (6 dígitos legibles) ─────────────────
export function generatePairCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Empaquetado compacto de landmarks ─────────────────────────────
// 33 puntos × {x,y,z,vis} → array plano de números redondeados
export function packLandmarks(lm: Landmark[]): number[] {
  const out: number[] = [];
  for (const p of lm) {
    out.push(
      Math.round(p.x * 1000) / 1000,
      Math.round(p.y * 1000) / 1000,
      Math.round(p.z * 1000) / 1000,
      Math.round((p.visibility ?? 1) * 100) / 100,
    );
  }
  return out;
}

export function unpackLandmarks(arr: number[]): Landmark[] {
  const out: Landmark[] = [];
  for (let i = 0; i + 3 < arr.length; i += 4) {
    out.push({ x: arr[i], y: arr[i + 1], z: arr[i + 2], visibility: arr[i + 3] });
  }
  return out;
}

const channelName = (code: string) => `dance-link-${code}`;

/**
 * Crea el enlace. `role: 'host'` para la pantalla, `'camera'` para el móvil.
 */
export function createDanceLink(
  role: LinkRole,
  code: string,
  handlers: LinkHandlers,
): DanceLink {
  handlers.onStatus?.('connecting');

  const channel = supabase.channel(channelName(code), {
    config: { broadcast: { self: false, ack: false } },
  });

  // ── HOST (pantalla) escucha al móvil ──
  if (role === 'host') {
    channel
      .on('broadcast', { event: 'pose' }, ({ payload }) => {
        if (payload?.p) handlers.onPose?.(unpackLandmarks(payload.p));
      })
      .on('broadcast', { event: 'frame' }, ({ payload }) => {
        if (payload?.f) handlers.onFrame?.(payload.f);
      })
      .on('broadcast', { event: 'cam-join' }, ({ payload }) => {
        handlers.onCameraJoin?.({ name: payload?.name });
      })
      .on('broadcast', { event: 'cam-leave' }, () => {
        handlers.onCameraLeave?.();
      });
  }

  // ── CAMERA (móvil) escucha a la pantalla ──
  if (role === 'camera') {
    channel
      .on('broadcast', { event: 'host-ready' }, () => handlers.onHostReady?.())
      .on('broadcast', { event: 'host-bye' }, () => handlers.onHostBye?.());
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') handlers.onStatus?.('open');
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handlers.onStatus?.('error');
    else if (status === 'CLOSED') handlers.onStatus?.('closed');
  });

  // Throttle de envíos de pose (~15 fps)
  let lastPose = 0;
  const POSE_INTERVAL = 66;

  return {
    role,
    code,
    sendPose: (lm: Landmark[]) => {
      const now = Date.now();
      if (now - lastPose < POSE_INTERVAL) return;
      lastPose = now;
      void channel.send({ type: 'broadcast', event: 'pose', payload: { p: packLandmarks(lm) } });
    },
    sendFrame: (dataUrl: string) => {
      void channel.send({ type: 'broadcast', event: 'frame', payload: { f: dataUrl } });
    },
    announceReady: () => {
      void channel.send({ type: 'broadcast', event: 'host-ready', payload: {} });
    },
    close: () => {
      try {
        if (role === 'camera') void channel.send({ type: 'broadcast', event: 'cam-leave', payload: {} });
        else void channel.send({ type: 'broadcast', event: 'host-bye', payload: {} });
      } catch { /* noop */ }
      supabase.removeChannel(channel);
      handlers.onStatus?.('closed');
    },
  };
}

/** El móvil anuncia su conexión al host (tras suscribirse) */
export function announceCameraJoin(code: string, name?: string) {
  const ch = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void ch.send({ type: 'broadcast', event: 'cam-join', payload: { name } });
      setTimeout(() => supabase.removeChannel(ch), 500);
    }
  });
}
