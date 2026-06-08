/**
 * choreo — Modelo de datos y motor de interpolación del Estudio Coreográfico
 *
 * Una producción tiene:
 *   - escenario (forma + color)
 *   - bailarines (ficha + color + género)
 *   - keyframes: posición (x,y 0-1 sobre la pista) de cada bailarín en un tiempo T
 *   - música (referencias de YouTube/pista en la línea de tiempo)
 *   - duración total
 *
 * La reproducción interpola la posición de cada bailarín entre sus keyframes
 * (easing suave), de modo que se "deslizan" por la pista como en un ensayo.
 */

export type Gender = 'F' | 'M' | 'N';
export type StageShape = 'rect' | 'circle' | 'diamond';

export interface Dancer {
  id: string;
  name: string;
  gender: Gender;
  color: string;
}

export interface Keyframe {
  dancerId: string;
  t: number;        // segundos
  x: number;        // 0-1 (ancho de pista)
  y: number;        // 0-1 (alto de pista)
  move?: string;    // etiqueta del movimiento en ese instante (opcional)
  videoUrl?: string;// vídeo de movimiento asignado (opcional)
}

export interface MusicTrack {
  id: string;
  label: string;
  youtubeUrl?: string;
  start: number;    // segundos en la línea de tiempo
}

/** Movimiento grabado con la cámara (vídeo real + pista de pose opcional) */
export interface Move {
  id: string;
  name: string;
  videoUrl: string;        // clip grabado (Supabase Storage)
  durationSec: number;
  thumb?: string;          // miniatura (dataURL)
  poseTrack?: number[][];  // secuencia de landmarks empaquetados (opcional)
  createdAt: number;
}

export interface StageConfig {
  shape: StageShape;
  color: string;     // color de la pista
  grid: boolean;     // mostrar cuadrícula
}

export interface ProductionData {
  stage: StageConfig;
  dancers: Dancer[];
  keyframes: Keyframe[];
  music: MusicTrack[];
  moves: Move[];     // biblioteca de movimientos grabados
  duration: number;  // segundos
}

export const DANCER_PALETTE = [
  '#ff3e6c', '#ff8c42', '#ffd23f', '#06d6a0', '#118ab2',
  '#7b2ff7', '#f72585', '#4cc9f0', '#80ed99', '#f9844a',
];

export function emptyProduction(): ProductionData {
  return {
    stage: { shape: 'rect', color: '#1a1030', grid: true },
    dancers: [],
    keyframes: [],
    music: [],
    moves: [],
    duration: 60,
  };
}

export function newDancer(index: number, gender: Gender = index % 2 === 0 ? 'F' : 'M'): Dancer {
  return {
    id: `d_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${gender === 'F' ? 'Bailarina' : gender === 'M' ? 'Bailarín' : 'Bailarín'} ${index + 1}`,
    gender,
    color: DANCER_PALETTE[index % DANCER_PALETTE.length],
  };
}

// ── Interpolación ────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Posición interpolada de un bailarín en el tiempo `t` */
export function positionAt(keyframes: Keyframe[], dancerId: string, t: number): { x: number; y: number } {
  const kfs = keyframes.filter(k => k.dancerId === dancerId).sort((a, b) => a.t - b.t);
  if (kfs.length === 0) return { x: 0.5, y: 0.5 };
  if (t <= kfs[0].t) return { x: kfs[0].x, y: kfs[0].y };
  if (t >= kfs[kfs.length - 1].t) {
    const last = kfs[kfs.length - 1];
    return { x: last.x, y: last.y };
  }
  // Encontrar el par de keyframes que rodean t
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const p = easeInOut((t - a.t) / span);
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
  }
  return { x: kfs[0].x, y: kfs[0].y };
}

/** Movimiento/etiqueta activo de un bailarín en el tiempo `t` (último keyframe pasado con move) */
export function moveAt(keyframes: Keyframe[], dancerId: string, t: number): Keyframe | null {
  const kfs = keyframes.filter(k => k.dancerId === dancerId && k.t <= t).sort((a, b) => b.t - a.t);
  return kfs.find(k => k.move || k.videoUrl) || null;
}

// ── Formaciones (devuelven posiciones normalizadas 0-1) ───────────
export type Formation = 'line' | 'circle' | 'vshape' | 'grid' | 'wedge' | 'diagonal' | 'twolines';

export const FORMATION_LABELS: Record<Formation, string> = {
  line: 'Línea', circle: 'Círculo', vshape: 'V', grid: 'Cuadrícula',
  wedge: 'Cuña', diagonal: 'Diagonal', twolines: 'Dos filas',
};

export function formationPositions(formation: Formation, count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const cx = 0.5, cy = 0.5;
  switch (formation) {
    case 'line': {
      for (let i = 0; i < count; i++) {
        const x = count === 1 ? 0.5 : 0.15 + (0.7 * i) / (count - 1);
        pts.push({ x, y: 0.5 });
      }
      break;
    }
    case 'twolines': {
      const half = Math.ceil(count / 2);
      for (let i = 0; i < count; i++) {
        const row = i < half ? 0 : 1;
        const idxInRow = i < half ? i : i - half;
        const n = row === 0 ? half : count - half;
        const x = n === 1 ? 0.5 : 0.2 + (0.6 * idxInRow) / (n - 1);
        pts.push({ x, y: row === 0 ? 0.35 : 0.65 });
      }
      break;
    }
    case 'circle': {
      const r = 0.32;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count - Math.PI / 2;
        pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) * 0.85 });
      }
      break;
    }
    case 'vshape':
    case 'wedge': {
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const depth = Math.floor(i / 2) + (count > 1 ? 1 : 0);
        const spread = 0.12 * depth;
        pts.push({ x: cx + side * spread, y: 0.3 + 0.1 * depth });
      }
      break;
    }
    case 'diagonal': {
      for (let i = 0; i < count; i++) {
        const p = count === 1 ? 0.5 : i / (count - 1);
        pts.push({ x: 0.2 + 0.6 * p, y: 0.25 + 0.5 * p });
      }
      break;
    }
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const x = cols === 1 ? 0.5 : 0.2 + (0.6 * c) / (cols - 1);
        const y = rows === 1 ? 0.5 : 0.25 + (0.5 * r) / (rows - 1);
        pts.push({ x, y });
      }
      break;
    }
  }
  return pts;
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function ytId(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] || '';
}
