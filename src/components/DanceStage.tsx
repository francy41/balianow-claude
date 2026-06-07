/**
 * DanceStage — pista de baile inmersiva con cámara del usuario + avatar coreógrafo
 *
 * El usuario activa su cámara (móvil o webcam) y aparece bailando DENTRO del
 * escenario elegido, junto al avatar del coreógrafo. Efecto "espejo de baile".
 *
 * Features:
 *  - getUserMedia con selección de cámara (frontal/trasera en móvil)
 *  - Fondo de escenario (gradiente o imagen)
 *  - Avatar del coreógrafo (imagen/video real o emoji) en la esquina
 *  - Espejo horizontal (como un espejo real de estudio de baile)
 *  - Controles: cambiar cámara, espejo on/off, pantalla completa, capturar foto
 *  - Overlay de pasos / instrucciones
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, FlipHorizontal2, Maximize2, RefreshCw, Loader2, AlertCircle, ImageDown, SwitchCamera } from 'lucide-react';

interface Scenario {
  id: string; name: string; emoji: string; gradient: string; vibe?: string; bg_image_url?: string | null;
}
interface Choreo {
  name: string; avatar_emoji: string; avatar_url?: string | null; video_url?: string | null; gradient: string;
}

interface Props {
  scenario: Scenario;
  choreographer: Choreo;
  currentStep?: string;        // instrucción actual del profe
  onPhotoCaptured?: (dataUrl: string) => void;
}

const DanceStage: React.FC<Props> = ({ scenario, choreographer, currentStep, onPhotoCaptured }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camOn, setCamOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mirror, setMirror] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

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
      }
      setCamOn(true);
      // Detectar si hay más de una cámara (para el botón cambiar)
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívalo en los ajustes del navegador.'
        : e?.name === 'NotFoundError'
        ? 'No se encontró ninguna cámara.'
        : `No se pudo acceder a la cámara: ${e?.message || 'error'}`;
      setError(msg);
      setCamOn(false);
    } finally {
      setLoading(false);
    }
  }, [facingMode, stopStream]);

  const switchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  const toggleCamera = () => {
    if (camOn) { stopStream(); setCamOn(false); }
    else startCamera();
  };

  const goFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen?.().catch(() => {});
  };

  const capturePhoto = () => {
    if (!videoRef.current || !camOn) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onPhotoCaptured?.(dataUrl);
    // Descarga automática
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `bailanow-${scenario.name}-${Date.now()}.jpg`;
    a.click();
  };

  useEffect(() => () => stopStream(), [stopStream]);

  const bgStyle = scenario.bg_image_url
    ? { backgroundImage: `url(${scenario.bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(${scenario.gradient})` };

  return (
    <div ref={containerRef} className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black" style={bgStyle}>
      {/* Overlay oscuro para profundidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* Vídeo del usuario (espejo de baile) */}
      {camOn ? (
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
          <span className="text-6xl mb-3">{scenario.emoji}</span>
          <h3 className="font-display font-black text-xl mb-1">{scenario.name}</h3>
          {scenario.vibe && <p className="text-white/60 text-sm mb-4">{scenario.vibe}</p>}
          {error ? (
            <div className="bg-red-500/20 border border-red-400/40 rounded-xl p-3 max-w-sm mb-3">
              <AlertCircle className="w-5 h-5 text-red-300 mx-auto mb-1" />
              <p className="text-red-200 text-xs">{error}</p>
            </div>
          ) : (
            <p className="text-white/50 text-xs mb-4 max-w-xs">
              Activa tu cámara y aparece bailando dentro de la pista 💃
            </p>
          )}
          <button onClick={toggleCamera} disabled={loading}
            className="bg-white text-gray-900 font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            {loading ? 'Activando...' : 'Activar mi cámara'}
          </button>
        </div>
      )}

      {/* Avatar del coreógrafo (esquina inferior derecha) */}
      <div className="absolute bottom-3 right-3 z-10">
        <div className={`w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden border-2 border-white/40 shadow-2xl bg-gradient-to-br ${choreographer.gradient}`}>
          {choreographer.video_url ? (
            <video src={choreographer.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : choreographer.avatar_url ? (
            <img src={choreographer.avatar_url} alt={choreographer.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">{choreographer.avatar_emoji}</div>
          )}
        </div>
        <p className="text-white text-[10px] font-bold text-center mt-1 drop-shadow-lg bg-black/40 rounded-full px-2 py-0.5">
          {choreographer.name}
        </p>
      </div>

      {/* Instrucción actual (paso) */}
      {currentStep && camOn && (
        <div className="absolute top-3 left-3 right-28 z-10">
          <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
            <p className="text-white text-sm font-medium">{currentStep}</p>
          </div>
        </div>
      )}

      {/* Controles (cuando la cámara está activa) */}
      {camOn && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <ControlBtn onClick={toggleCamera} title="Apagar cámara"><CameraOff className="w-4 h-4" /></ControlBtn>
          <ControlBtn onClick={() => setMirror(m => !m)} title="Espejo" active={mirror}><FlipHorizontal2 className="w-4 h-4" /></ControlBtn>
          {hasMultipleCameras && <ControlBtn onClick={switchCamera} title="Cambiar cámara"><SwitchCamera className="w-4 h-4" /></ControlBtn>}
          <ControlBtn onClick={capturePhoto} title="Capturar foto"><ImageDown className="w-4 h-4" /></ControlBtn>
          <ControlBtn onClick={goFullscreen} title="Pantalla completa"><Maximize2 className="w-4 h-4" /></ControlBtn>
        </div>
      )}

      {/* Badge LIVE */}
      {camOn && (
        <div className="absolute top-3 right-3 z-20">
          <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </span>
        </div>
      )}
    </div>
  );
};

const ControlBtn: React.FC<{ onClick: () => void; title: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
  <button onClick={onClick} title={title}
    className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all active:scale-90 ${active ? 'bg-pink-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}>
    {children}
  </button>
);

export default DanceStage;
