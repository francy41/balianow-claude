/**
 * useRemoteCamera — Gestiona el enlace de cámara remota (móvil como webcam)
 * desde el lado de la PANTALLA (TV/PC).
 *
 * - Genera el código de emparejamiento
 * - Crea el canal Realtime host
 * - Expone los landmarks recibidos (ref, sin re-render por frame)
 * - Expone la miniatura y el estado de conexión
 *
 * El enlace vive mientras `active` sea true, sobreviviendo a cambios de
 * pantalla (setup → clase) porque el hook está en el componente modal.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { createDanceLink, generatePairCode, type DanceLink } from '../lib/danceLink';
import type { PoseResult } from '../lib/poseSync';

export function useRemoteCamera(active: boolean) {
  const [code] = useState(() => generatePairCode());
  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
  const landmarksRef = useRef<PoseResult>(null);
  const linkRef = useRef<DanceLink | null>(null);
  const lastPoseTs = useRef(0);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const link = createDanceLink('host', code, {
      onPose: (lm) => {
        landmarksRef.current = lm;
        lastPoseTs.current = Date.now();
        if (!connectedRef.current) { connectedRef.current = true; setConnected(true); }
      },
      onFrame: (dataUrl) => setFrame(dataUrl),
      onCameraJoin: () => {
        connectedRef.current = true;
        setConnected(true);
        link.announceReady();
      },
      onCameraLeave: () => {
        connectedRef.current = false;
        setConnected(false);
        landmarksRef.current = null;
      },
    });
    linkRef.current = link;

    // Watchdog: si no llegan poses en 3s, marcar desconectado
    const watchdog = setInterval(() => {
      if (connectedRef.current && Date.now() - lastPoseTs.current > 3000) {
        connectedRef.current = false;
        setConnected(false);
        landmarksRef.current = null;
      }
    }, 1000);

    return () => {
      clearInterval(watchdog);
      link.close();
      linkRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, code]);

  const camUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/baila-camara?code=${code}`;

  const reset = useCallback(() => {
    connectedRef.current = false;
    setConnected(false);
    landmarksRef.current = null;
    setFrame(null);
  }, []);

  return { code, camUrl, connected, frame, landmarksRef, reset };
}
