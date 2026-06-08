/**
 * DanceSyncOverlay — Canvas superpuesto a la cámara del usuario
 *
 * Dibuja:
 *  - Esqueleto de MediaPipe (33 landmarks conectados)
 *  - Score de sincronización en tiempo real con color (rojo→verde)
 *  - Barra de progreso del intento
 *  - Estado del loop de juego (DEMO / PREPARA / INTENTO / JUICIO)
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { LM, type Landmark, type SyncScore } from '../lib/poseSync';

interface Props {
  landmarks: Landmark[] | null;
  syncScore: SyncScore | null;
  phase: 'idle' | 'demo' | 'prepare' | 'attempt' | 'pass' | 'fail';
  countdown: number;         // segundos restantes en la fase actual
  attemptProgress: number;   // 0-1, progreso del intento actual
  width: number;
  height: number;
}

// Conexiones del esqueleto MediaPipe Pose (33 landmarks)
const CONNECTIONS: [number, number][] = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW], [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW], [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP], [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE], [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE], [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT], [LM.RIGHT_ANKLE, LM.RIGHT_FOOT],
];

function scoreToColor(score: number, alpha = 1): string {
  if (score >= 75) return `rgba(52,211,153,${alpha})`;   // verde
  if (score >= 50) return `rgba(251,191,36,${alpha})`;   // amarillo
  return `rgba(239,68,68,${alpha})`;                     // rojo
}

const PHASE_LABELS: Record<string, string> = {
  idle: '', demo: '👀 MÍRAME', prepare: '¡PREPÁRATE!', attempt: '🎯 ¡HAZLO TÚ!',
  pass: '✅ ¡SUPERADO!', fail: '🔄 ¡VUELVE A INTENTARLO!',
};

const DanceSyncOverlay: React.FC<Props> = ({
  landmarks, syncScore, phase, countdown, attemptProgress, width, height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const score = syncScore?.score ?? 0;
    const color = scoreToColor(score);

    // ── Esqueleto ──
    if (landmarks && landmarks.length >= 33) {
      // Conexiones
      ctx.lineWidth = 3;
      ctx.strokeStyle = scoreToColor(score, 0.7);
      for (const [a, b] of CONNECTIONS) {
        const la = landmarks[a], lb = landmarks[b];
        if (!la || !lb) continue;
        if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue;
        ctx.beginPath();
        ctx.moveTo(la.x * width, la.y * height);
        ctx.lineTo(lb.x * width, lb.y * height);
        ctx.stroke();
      }
      // Puntos (articulaciones)
      ctx.fillStyle = color;
      for (const lm of landmarks) {
        if ((lm.visibility ?? 1) < 0.3) continue;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Barra de progreso del intento (fondo oscuro) ──
    if (phase === 'attempt' && attemptProgress > 0) {
      const barH = 6, barY = height - barH - 4, barW = width - 16;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.roundRect(8, barY, barW, barH, 3);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.roundRect(8, barY, barW * attemptProgress, barH, 3);
      ctx.fill();
    }

    // ── Score en tiempo real (esquina superior derecha) ──
    if (phase === 'attempt' && syncScore) {
      const s = syncScore.score;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.roundRect(width - 70, 8, 62, 38, 8);
      ctx.fill();
      ctx.font = 'bold 22px system-ui';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(`${s}`, width - 39, 36);
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(syncScore.feedback, width - 39, 46);
      ctx.restore();
    }

    // ── Etiqueta de fase (centro superior) ──
    const label = PHASE_LABELS[phase];
    if (label) {
      ctx.save();
      ctx.font = 'bold 15px system-ui';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.roundRect(width / 2 - tw / 2 - 10, 8, tw + 20, 30, 6);
      ctx.fill();
      ctx.fillStyle = phase === 'pass' ? '#34d399' : phase === 'fail' ? '#f87171' : '#fff';
      ctx.fillText(label, width / 2, 29);
      ctx.restore();
    }

    // ── Cuenta atrás (en PREPARE y ATTEMPT) ──
    if ((phase === 'prepare' || phase === 'attempt') && countdown > 0) {
      ctx.save();
      ctx.font = `bold ${phase === 'prepare' ? 64 : 28}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = phase === 'prepare' ? '#fbbf24' : 'rgba(255,255,255,0.8)';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 8;
      ctx.fillText(String(countdown), width / 2, phase === 'prepare' ? height / 2 + 20 : 72);
      ctx.restore();
    }

    // ── PASS: flash verde ──
    if (phase === 'pass') {
      ctx.fillStyle = 'rgba(52,211,153,0.18)';
      ctx.fillRect(0, 0, width, height);
    }

    // ── FAIL: flash rojo suave ──
    if (phase === 'fail') {
      ctx.fillStyle = 'rgba(239,68,68,0.12)';
      ctx.fillRect(0, 0, width, height);
    }
  }, [landmarks, syncScore, phase, countdown, attemptProgress, width, height]);

  useEffect(() => {
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default DanceSyncOverlay;
