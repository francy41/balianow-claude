/**
 * DanceSyncOverlay — Canvas de pose + score adaptado a todos los dispositivos
 * mobile / tablet / desktop / smart TV
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { LM, type Landmark, type SyncScore } from '../lib/poseSync';
import type { DeviceType } from '../lib/deviceDetect';

interface Props {
  landmarks: Landmark[] | null;
  syncScore: SyncScore | null;
  phase: 'idle' | 'demo' | 'prepare' | 'attempt' | 'pass' | 'fail' | 'gameover';
  countdown: number;
  attemptProgress: number;
  width: number;
  height: number;
  device?: DeviceType;
}

const CONNECTIONS: [number, number][] = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],   [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW], [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],     [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],   [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE], [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT], [LM.RIGHT_ANKLE, LM.RIGHT_FOOT],
];

function scoreToColor(score: number, alpha = 1): string {
  if (score >= 75) return `rgba(52,211,153,${alpha})`;
  if (score >= 50) return `rgba(251,191,36,${alpha})`;
  return `rgba(239,68,68,${alpha})`;
}

const PHASE_LABELS: Record<string, string> = {
  idle: '', demo: '👀 MÍRAME', prepare: '¡PREPÁRATE!',
  attempt: '🎯 ¡HAZLO TÚ!', pass: '✅ ¡SUPERADO!', fail: '🔄 ¡INTÉNTALO DE NUEVO!',
};

// Escalas por dispositivo
const SCALE: Record<string, { lineW: number; dotR: number; fontSize: number; scoreFont: number; labelFont: number; cdFont: number; barH: number }> = {
  mobile:  { lineW: 2.5, dotR: 4,  fontSize: 11, scoreFont: 22, labelFont: 13, cdFont: 60,  barH: 5  },
  tablet:  { lineW: 3,   dotR: 5,  fontSize: 13, scoreFont: 28, labelFont: 15, cdFont: 72,  barH: 7  },
  desktop: { lineW: 3,   dotR: 5,  fontSize: 13, scoreFont: 28, labelFont: 15, cdFont: 72,  barH: 7  },
  tv:      { lineW: 5,   dotR: 10, fontSize: 24, scoreFont: 64, labelFont: 32, cdFont: 160, barH: 14 },
};

const DanceSyncOverlay: React.FC<Props> = ({
  landmarks, syncScore, phase, countdown, attemptProgress, width, height, device = 'mobile',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sc = SCALE[device] || SCALE.mobile;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const score = syncScore?.score ?? 0;
    const color = scoreToColor(score);

    // ── Esqueleto ──
    if (landmarks != null && landmarks.length >= 33) {
      ctx.lineWidth = sc.lineW;
      ctx.strokeStyle = scoreToColor(score, 0.75);
      for (const [a, b] of CONNECTIONS) {
        const la = landmarks[a], lb = landmarks[b];
        if (!la || !lb) continue;
        if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue;
        ctx.beginPath();
        ctx.moveTo(la.x * width, la.y * height);
        ctx.lineTo(lb.x * width, lb.y * height);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      for (const lm of landmarks) {
        if ((lm.visibility ?? 1) < 0.3) continue;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, sc.dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Barra de progreso ──
    if (phase === 'attempt' && attemptProgress > 0) {
      const bH = sc.barH, bY = height - bH - 6, bW = width - 24;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.roundRect(12, bY, bW, bH, 4);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.roundRect(12, bY, bW * attemptProgress, bH, 4);
      ctx.fill();
    }

    // ── Score (esquina superior derecha) ──
    if (phase === 'attempt' && syncScore) {
      const boxW = sc.scoreFont * 2.2, boxH = sc.scoreFont * 1.8;
      const bx = width - boxW - 12, by = 10;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.roundRect(bx, by, boxW, boxH, 10);
      ctx.fill();
      ctx.font = `bold ${sc.scoreFont}px system-ui`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(`${syncScore.score}`, bx + boxW / 2, by + sc.scoreFont * 1.1);
      ctx.font = `bold ${sc.fontSize}px system-ui`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(syncScore.feedback, bx + boxW / 2, by + sc.scoreFont * 1.55);
    }

    // ── Etiqueta de fase ──
    const label = PHASE_LABELS[phase];
    if (label) {
      ctx.font = `bold ${sc.labelFont}px system-ui`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width;
      const pad = sc.labelFont * 0.6;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.roundRect(width / 2 - tw / 2 - pad, 10, tw + pad * 2, sc.labelFont * 1.8, 8);
      ctx.fill();
      ctx.fillStyle = phase === 'pass' ? '#34d399' : phase === 'fail' ? '#f87171' : '#fff';
      ctx.fillText(label, width / 2, 10 + sc.labelFont * 1.3);
    }

    // ── Cuenta atrás ──
    if ((phase === 'prepare' || phase === 'attempt') && countdown > 0) {
      const fontSize = phase === 'prepare' ? sc.cdFont : sc.cdFont * 0.5;
      const cy = phase === 'prepare' ? height / 2 + fontSize * 0.3 : sc.labelFont * 3.5;
      ctx.font = `bold ${fontSize}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = phase === 'prepare' ? '#fbbf24' : 'rgba(255,255,255,0.85)';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 12;
      ctx.fillText(String(countdown), width / 2, cy);
      ctx.shadowBlur = 0;
    }

    // ── Flash PASS ──
    if (phase === 'pass') {
      ctx.fillStyle = 'rgba(52,211,153,0.18)';
      ctx.fillRect(0, 0, width, height);
    }
    // ── Flash FAIL ──
    if (phase === 'fail') {
      ctx.fillStyle = 'rgba(239,68,68,0.12)';
      ctx.fillRect(0, 0, width, height);
    }
  }, [landmarks, syncScore, phase, countdown, attemptProgress, width, height, sc]);

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
