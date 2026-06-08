/**
 * DanceSyncCamera — Cámara del usuario con detección de pose y overlay de sincronización
 *
 * Sustituye a DanceStage en el modo clase activo.
 * Combina: getUserMedia + MediaPipe pose + DanceSyncOverlay.
 * El hook useDanceGameLoop maneja la lógica del juego externamente;
 * este componente solo captura video y muestra el overlay.
 */
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Camera, CameraOff, Loader2, AlertCircle, SwitchCamera, FlipHorizontal2 } from 'lucide-react';
import DanceSyncOverlay from './DanceSyncOverlay';
import type { GamePhase } from '../hooks/useDanceGameLoop';
import type { SyncScore } from '../lib/poseSync';
import type { Landmark } from '../lib/poseSync';

export interface DanceSyncCameraHandle {
  videoEl: HTMLVideoElement | null;
}

interface Props {
  phase: GamePhase;
  countdown: number;
  attemptProgress: number;
  syncScore: SyncScore | null;
  landmarks: Landmark[] | null;
  label?: string;
  onCamReady?: (video: HTMLVideoElement) => void;
  onCamOff?: () => void;
  camOn: boolean;
  setCamOn: (v: boolean) => void;
}

const DanceSyncCamera = forwardRef<DanceSyncCameraHandle, Props>((
  { phase, countdown, attemptProgress, syncScore, landmarks, label, onCamReady, onCamOff, camOn, setCamOn },
  ref,
) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mirror, setMirror] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultiple, setHasMultiple] = useState(false);
  const [dims, setDims] = useState({ w: 320, h: 180 });

  useImperativeHandle(ref, () => ({ videoEl: videoRef.current }));

  // Actualizar dims cuando cambia el contenedor
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      setDims({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    setLoading(true);
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        onCamReady?.(videoRef.current);
      }
      setCamOn(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasMultiple(devices.filter(d => d.kind === 'videoinput').length > 1);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívalo en ajustes del navegador.'
        : 'No se pudo acceder a la cámara.';
      setError(msg); setCamOn(false);
    } finally { setLoading(false); }
  }, [facingMode, stopStream, setCamOn, onCamReady]);

  const switchCamera = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const toggleCamera = useCallback(() => {
    if (camOn) { stopStream(); setCamOn(false); onCamOff?.(); }
    else startCamera();
  }, [camOn, stopStream, setCamOn, onCamOff, startCamera]);

  useEffect(() => () => stopStream(), [stopStream]);

  const isSyncing = phase === 'attempt' || phase === 'prepare';

  return (
    <div ref={containerRef} className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#0a0a12]">
      {/* Etiqueta */}
      {label && (
        <div className="absolute top-2 left-2 z-20">
          <span className="bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">{label}</span>
        </div>
      )}

      {camOn ? (
        <>
          {/* Video del usuario (espejo) */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
          />

          {/* Overlay de pose + score */}
          <DanceSyncOverlay
            landmarks={landmarks}
            syncScore={syncScore}
            phase={phase}
            countdown={countdown}
            attemptProgress={attemptProgress}
            width={dims.w}
            height={dims.h}
          />

          {/* Badge LIVE / SYNC */}
          <div className="absolute top-2 right-2 z-20">
            {isSyncing ? (
              <span className="flex items-center gap-1 bg-[#ff3e6c] text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                🎯 SYNC
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
              </span>
            )}
          </div>

          {/* Controles */}
          <div className="absolute bottom-2 left-2 z-20 flex gap-1.5">
            <CtrlBtn onClick={toggleCamera} title="Apagar cámara"><CameraOff className="w-3.5 h-3.5" /></CtrlBtn>
            <CtrlBtn onClick={() => setMirror(m => !m)} title="Espejo" active={mirror}><FlipHorizontal2 className="w-3.5 h-3.5" /></CtrlBtn>
            {hasMultiple && <CtrlBtn onClick={switchCamera} title="Cambiar cámara"><SwitchCamera className="w-3.5 h-3.5" /></CtrlBtn>}
          </div>
        </>
      ) : (
        /* Pantalla de "Activa tu cámara" */
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
          {error ? (
            <>
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-red-300 text-sm mb-4 max-w-xs">{error}</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">📷</div>
              <p className="text-white/70 text-sm mb-4 max-w-xs">
                Activa tu cámara para que el sistema detecte tus movimientos y te puntúe en tiempo real
              </p>
            </>
          )}
          <button
            onClick={toggleCamera}
            disabled={loading}
            className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 text-sm hover:scale-105 active:scale-95 transition-transform shadow-xl"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Activando…</>
              : <><Camera className="w-5 h-5" /> Activar cámara y sincronizar</>}
          </button>
          <p className="text-white/30 text-[10px] mt-3">Cámara procesada localmente. Nunca se sube a internet.</p>
        </div>
      )}
    </div>
  );
});

DanceSyncCamera.displayName = 'DanceSyncCamera';

const CtrlBtn: React.FC<{ onClick: () => void; title: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
  <button onClick={onClick} title={title}
    className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all active:scale-90 ${active ? 'bg-pink-500 text-white' : 'bg-black/40 text-white'}`}>
    {children}
  </button>
);

export default DanceSyncCamera;
