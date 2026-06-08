/**
 * MoveRecorder — Graba un movimiento real con la cámara para la coreografía
 *
 * Reutiliza el motor de pose (MediaPipe) para dibujar el esqueleto mientras
 * grabas, captura la pista de pose y guarda el clip de vídeo en Supabase Storage.
 * El movimiento resultante se asigna a un bailarín en el Estudio Coreográfico.
 *
 * El procesamiento de pose es local; el vídeo se sube solo al pulsar "Guardar".
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Circle, Square, Loader2, X, Check, RotateCcw, SwitchCamera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadPoseLandmarker, detectPose, isPoseLandmarkerReady, LM, type Landmark } from '../lib/poseSync';
import { packLandmarks } from '../lib/danceLink';
import type { Move } from '../lib/choreo';

interface Props {
  userId?: string;
  onSave: (move: Move) => void;
  onClose: () => void;
}

const MAX_SECONDS = 15;

const CONNECTIONS: [number, number][] = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER], [LM.LEFT_SHOULDER, LM.LEFT_ELBOW], [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW], [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP], [LM.RIGHT_SHOULDER, LM.RIGHT_HIP], [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE], [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE], [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT], [LM.RIGHT_ANKLE, LM.RIGHT_FOOT],
];

type Phase = 'ready' | 'recording' | 'preview' | 'saving';

const MoveRecorder: React.FC<Props> = ({ userId, onSave, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const poseTrackRef = useRef<number[][]>([]);
  const rafRef = useRef<number>(0);
  const startTsRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('ready');
  const [poseReady, setPoseReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [thumb, setThumb] = useState<string>('');
  const [name, setName] = useState('');

  useEffect(() => { loadPoseLandmarker().then(() => setPoseReady(true)).catch(console.warn); }, []);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = facing) => {
    setCamError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      drawLoop();
    } catch (e: any) {
      setCamError(e?.name === 'NotAllowedError' ? 'Permiso de cámara denegado.' : 'No se pudo acceder a la cámara.');
    }
  }, [facing, stopStream]);

  useEffect(() => { startCamera(); return () => stopStream(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loop de dibujo de esqueleto
  const drawLoop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (video && canvas && isPoseLandmarkerReady() && video.readyState >= 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 360; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const lm = detectPose(video);
        if (lm) {
          drawSkeleton(ctx, lm, canvas.width, canvas.height);
          if (recorderRef.current?.state === 'recording') poseTrackRef.current.push(packLandmarks(lm));
        }
      }
    }
    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const drawSkeleton = (ctx: CanvasRenderingContext2D, lm: Landmark[], w: number, h: number) => {
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,62,108,0.85)';
    for (const [a, b] of CONNECTIONS) {
      const la = lm[a], lb = lm[b];
      if (!la || !lb || (la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue;
      ctx.beginPath(); ctx.moveTo(la.x * w, la.y * h); ctx.lineTo(lb.x * w, lb.y * h); ctx.stroke();
    }
    ctx.fillStyle = '#ffd23f';
    for (const p of lm) { if ((p.visibility ?? 1) < 0.3) continue; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2); ctx.fill(); }
  };

  // ── Grabar ──
  const startRec = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = []; poseTrackRef.current = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: 'video/webm' });
      setBlob(b);
      captureThumb();
      setPhase('preview');
    };
    recorderRef.current = rec;
    rec.start();
    startTsRef.current = Date.now();
    setElapsed(0);
    setPhase('recording');
    tickTimer();
  };

  const tickTimer = () => {
    const t = (Date.now() - startTsRef.current) / 1000;
    setElapsed(t);
    if (t >= MAX_SECONDS) { stopRec(); return; }
    if (recorderRef.current?.state === 'recording') setTimeout(tickTimer, 100);
  };

  const stopRec = () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); };

  const captureThumb = () => {
    const video = videoRef.current;
    if (!video) return;
    const c = document.createElement('canvas'); c.width = 160; c.height = 90;
    const ctx = c.getContext('2d');
    if (ctx) { try { ctx.drawImage(video, 0, 0, 160, 90); setThumb(c.toDataURL('image/jpeg', 0.5)); } catch { /* noop */ } }
  };

  const retake = () => { setBlob(null); setThumb(''); setElapsed(0); setPhase('ready'); };

  const save = async () => {
    if (!blob) return;
    setPhase('saving');
    const id = `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const path = `${userId || 'anon'}/${id}.webm`;
    const { error } = await supabase.storage.from('choreo-moves').upload(path, blob, { contentType: 'video/webm', upsert: true });
    let url = '';
    if (!error) url = supabase.storage.from('choreo-moves').getPublicUrl(path).data.publicUrl;
    const move: Move = {
      id, name: name.trim() || 'Movimiento', videoUrl: url, durationSec: Math.round(elapsed * 10) / 10,
      thumb, poseTrack: poseTrackRef.current.length ? poseTrackRef.current : undefined, createdAt: Date.now(),
    };
    stopStream();
    onSave(move);
  };

  const switchCam = () => { const n = facing === 'user' ? 'environment' : 'user'; setFacing(n); startCamera(n); };

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-[#0e0e1a] rounded-3xl overflow-hidden w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <Camera className="w-5 h-5 text-pink-400" />
          <h3 className="font-black text-white flex-1">Grabar movimiento</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Vídeo */}
        <div className="relative bg-black aspect-video">
          {phase === 'preview' && blob ? (
            <video ref={previewRef} src={URL.createObjectURL(blob)} className="absolute inset-0 w-full h-full object-cover"
              controls autoPlay loop style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
            </>
          )}

          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6 bg-black/80">
              <CameraOff className="w-10 h-10 text-red-400" />
              <p className="text-red-300 text-sm">{camError}</p>
              <button onClick={() => startCamera()} className="bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold">Reintentar</button>
            </div>
          )}

          {/* Estado IA */}
          {!poseReady && !camError && phase !== 'preview' && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando IA…
            </div>
          )}

          {/* Tiempo de grabación */}
          {phase === 'recording' && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> {elapsed.toFixed(1)}s
            </div>
          )}
          {/* Barra de progreso */}
          {phase === 'recording' && (
            <div className="absolute bottom-0 left-0 h-1 bg-red-500" style={{ width: `${(elapsed / MAX_SECONDS) * 100}%` }} />
          )}

          {/* Switch cámara */}
          {phase !== 'preview' && !camError && (
            <button onClick={switchCam} className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur">
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controles */}
        <div className="p-4 space-y-3">
          {phase === 'preview' && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del movimiento (ej: giro, paso lateral)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500" />
          )}

          <div className="flex items-center justify-center gap-3">
            {phase === 'ready' && (
              <button onClick={startRec} disabled={!!camError}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-2xl disabled:opacity-40">
                <Circle className="w-5 h-5 fill-white" /> Grabar (máx {MAX_SECONDS}s)
              </button>
            )}
            {phase === 'recording' && (
              <button onClick={stopRec} className="flex items-center gap-2 bg-white text-black font-black px-6 py-3 rounded-2xl">
                <Square className="w-5 h-5 fill-black" /> Detener
              </button>
            )}
            {phase === 'preview' && (
              <>
                <button onClick={retake} className="flex items-center gap-2 bg-white/10 text-white font-bold px-4 py-3 rounded-2xl">
                  <RotateCcw className="w-4 h-4" /> Repetir
                </button>
                <button onClick={save} className="flex items-center gap-2 bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-black px-6 py-3 rounded-2xl">
                  <Check className="w-5 h-5" /> Guardar movimiento
                </button>
              </>
            )}
            {phase === 'saving' && (
              <div className="flex items-center gap-2 text-white font-bold py-3"><Loader2 className="w-5 h-5 animate-spin" /> Subiendo…</div>
            )}
          </div>
          <p className="text-[11px] text-white/40 text-center">
            🔒 El vídeo solo se sube al pulsar Guardar. El esqueleto se calcula en tu dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoveRecorder;
