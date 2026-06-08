/**
 * DanceCameraPage — /baila-camara
 *
 * Convierte el MÓVIL en la webcam de la pantalla (Smart TV / PC).
 *
 * Flujo:
 *   1. El usuario abre esta página en el móvil (escaneando el QR de la TV o
 *      escribiendo bailanow.com/baila-camara).
 *   2. Introduce el código de 6 dígitos que aparece en la pantalla.
 *   3. Activa la cámara → el móvil detecta la pose localmente y la transmite.
 *   4. Baila mirando la pantalla grande; el móvil es solo el "ojo".
 *
 * El vídeo NUNCA sale del móvil: solo se envían los 33 puntos del esqueleto
 * y, opcionalmente, una miniatura de baja resolución.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Camera, CameraOff, Loader2, Wifi, WifiOff, SwitchCamera, CheckCircle2, Smartphone, Tv2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/appStore';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  loadPoseLandmarker, detectPose, isPoseLandmarkerReady,
} from '../lib/poseSync';
import { createDanceLink, type DanceLink } from '../lib/danceLink';

type Phase = 'enter-code' | 'connecting' | 'streaming';

const DanceCameraPage: React.FC = () => {
  usePageMeta({ title: 'Cámara · BailaNow', description: 'Usa tu móvil como cámara para bailar en la pantalla grande.' });
  const { user, isAuthenticated } = useAuthStore();
  const [params] = useSearchParams();

  const [phase, setPhase] = useState<Phase>('enter-code');
  const [code, setCode] = useState(params.get('code') || '');
  const [linkStatus, setLinkStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [hostLinked, setHostLinked] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [poseReady, setPoseReady] = useState(false);
  const [fps, setFps] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const linkRef = useRef<DanceLink | null>(null);
  const rafRef = useRef<number>(0);
  const lastFrameSentRef = useRef(0);
  const fpsCounterRef = useRef({ count: 0, ts: Date.now() });

  // Cargar MediaPipe al montar
  useEffect(() => {
    loadPoseLandmarker().then(() => setPoseReady(true)).catch(console.warn);
  }, []);

  // ── Iniciar cámara + transmisión ──────────────────────────────
  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    linkRef.current?.close();
    linkRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const startStreaming = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    setCamError(null);
    try {
      // 1. Cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 2. Enlace Realtime con la pantalla
      const link = createDanceLink('camera', code, {
        onHostReady: () => setHostLinked(true),
        onHostBye: () => { setHostLinked(false); },
        onStatus: setLinkStatus,
      });
      linkRef.current = link;

      // El móvil anuncia su conexión
      setTimeout(() => {
        // pequeño delay para asegurar subscribe
        import('../lib/danceLink').then(({ announceCameraJoin }) =>
          announceCameraJoin(code, user?.name || 'Bailarín'),
        );
      }, 600);

      setPhase('streaming');

      // 3. Loop de detección + envío
      const loop = () => {
        const video = videoRef.current;
        if (video && isPoseLandmarkerReady() && video.readyState >= 2) {
          const lm = detectPose(video);
          if (lm) {
            linkRef.current?.sendPose(lm);
            // FPS
            const fc = fpsCounterRef.current;
            fc.count++;
            const now = Date.now();
            if (now - fc.ts >= 1000) { setFps(fc.count); fc.count = 0; fc.ts = now; }
          }
          // Miniatura cada ~700ms
          const now = Date.now();
          if (now - lastFrameSentRef.current > 700) {
            lastFrameSentRef.current = now;
            const canvas = frameCanvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                try {
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.45);
                  linkRef.current?.sendFrame(dataUrl);
                } catch { /* tainted canvas */ }
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívalo en los ajustes del navegador.'
        : 'No se pudo acceder a la cámara.';
      setCamError(msg);
    }
  }, [code, facingMode, user?.name]);

  const switchCam = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    streamRef.current?.getTracks().forEach(t => t.stop());
    startStreaming(next);
  }, [facingMode, startStreaming]);

  const handleConnect = () => {
    if (code.length !== 6) return;
    setPhase('connecting');
    startStreaming();
  };

  const handleDisconnect = () => {
    stopAll();
    setPhase('enter-code');
    setHostLinked(false);
  };

  // ── No autenticado ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 gap-5">
        <Smartphone className="w-16 h-16 text-pink-500" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Inicia sesión para usar tu móvil como cámara</h1>
        <p className="text-gray-500 max-w-sm">Conéctate con la misma cuenta que usas en la pantalla grande.</p>
        <Link to={`/auth?redirect=/baila-camara${code ? '?code=' + code : ''}`}
          className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold px-8 py-3 rounded-2xl">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#070710] text-white flex flex-col">
      <canvas ref={frameCanvasRef} width={160} height={90} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Link to="/baila-ia" className="p-2 hover:bg-white/10 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-pink-400" />
          <span className="font-black">Móvil-Cámara</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {phase === 'streaming' && (
            hostLinked
              ? <span className="flex items-center gap-1 text-green-400"><Wifi className="w-4 h-4" /> Enlazado</span>
              : <span className="flex items-center gap-1 text-yellow-400"><Loader2 className="w-4 h-4 animate-spin" /> Buscando pantalla…</span>
          )}
        </div>
      </div>

      {/* ── PASO 1: introducir código ── */}
      {phase === 'enter-code' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <Tv2 className="w-20 h-20 text-pink-500" />
          <div className="text-center">
            <h1 className="text-2xl font-black mb-2">Conecta con tu pantalla</h1>
            <p className="text-white/50 max-w-xs text-sm">
              Escribe el código de 6 dígitos que aparece en tu Smart TV o PC.
            </p>
          </div>

          <input
            inputMode="numeric"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-56 text-center text-4xl font-black tracking-[0.4em] bg-white/5 border-2 border-white/20 rounded-2xl py-4 focus:outline-none focus:border-pink-500"
          />

          <button
            onClick={handleConnect}
            disabled={code.length !== 6 || !poseReady}
            className="w-56 bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-black py-4 rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {!poseReady
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Cargando IA…</>
              : <><Camera className="w-5 h-5" /> Conectar cámara</>}
          </button>

          <p className="text-white/30 text-xs text-center max-w-xs">
            🔒 Tu vídeo nunca sale del móvil. Solo se envían los puntos de tu esqueleto a tu propia pantalla.
          </p>
        </div>
      )}

      {/* ── PASO 2/3: transmitiendo ── */}
      {(phase === 'connecting' || phase === 'streaming') && (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 bg-black">
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
                <CameraOff className="w-12 h-12 text-red-400" />
                <p className="text-red-300">{camError}</p>
                <button onClick={() => startStreaming()} className="bg-white/10 px-6 py-2 rounded-xl font-bold">Reintentar</button>
              </div>
            )}

            {/* Estado de conexión */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md ${
                hostLinked ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'
              }`}>
                {hostLinked ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                {hostLinked ? 'Conectado a la pantalla' : 'Buscando pantalla…'}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-white/60 bg-black/40 px-2 py-1 rounded-full">
                {fps > 0 ? `${fps} fps` : '...'}
              </span>
            </div>

            {/* Mensaje guía */}
            {hostLinked && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center px-6">
                <p className="text-lg font-black drop-shadow-lg">👀 ¡Mira tu pantalla grande!</p>
                <p className="text-sm text-white/70">Coloca el móvil donde te vea de cuerpo entero</p>
              </div>
            )}
          </div>

          {/* Controles inferiores */}
          <div className="flex items-center justify-center gap-4 p-4 bg-[#0e0e14]">
            <button onClick={switchCam} className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <SwitchCamera className="w-6 h-6" />
            </button>
            <button onClick={handleDisconnect} className="flex-1 max-w-xs bg-red-500/90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <WifiOff className="w-5 h-5" /> Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DanceCameraPage;
