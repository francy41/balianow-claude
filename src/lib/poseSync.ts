/**
 * poseSync — Motor de detección de pose y scoring de sincronización
 *
 * Nivel A: Sync de movimiento + ritmo (fiable en cualquier dispositivo)
 *   - Detecta que te mueves, con energía y AL RITMO del conteo
 *   - Detecta la parte del cuerpo correcta por género (caderas, pies, etc.)
 *
 * Nivel B: Matching exacto de pose vs bailarín (preciso, requiere buena luz)
 *   - Compara ángulos articulares de tu esqueleto contra el de referencia
 *   - Disponible como fase 2 cuando se activa `exactMode: true`
 *
 * Todo corre en el navegador. La cámara NUNCA se sube a internet.
 *
 * Usa @mediapipe/tasks-vision (PoseLandmarker) cargado via CDN del modelo.
 */

// Landmarks de MediaPipe Pose (33 puntos)
export const LM = {
  NOSE: 0, LEFT_EYE: 2, RIGHT_EYE: 5,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_FOOT: 31, RIGHT_FOOT: 32,
} as const;

export interface Landmark { x: number; y: number; z: number; visibility?: number; }
export type PoseResult = Landmark[] | null;

// ── Loader del PoseLandmarker (lazy, singleton) ────────────────────
let _landmarker: any = null;
let _loading = false;
let _loadPromise: Promise<any> | null = null;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export async function loadPoseLandmarker(): Promise<any> {
  if (_landmarker) return _landmarker;
  if (_loadPromise) return _loadPromise;

  _loading = true;
  _loadPromise = (async () => {
    const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    _landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    _loading = false;
    return _landmarker;
  })();
  return _loadPromise;
}

export function isPoseLandmarkerReady() { return !!_landmarker; }
export function isPoseLandmarkerLoading() { return _loading; }

// ── Detección de un frame ──────────────────────────────────────────
let _lastTs = -1;
export function detectPose(video: HTMLVideoElement): PoseResult {
  if (!_landmarker || video.readyState < 2) return null;
  const ts = performance.now();
  if (ts === _lastTs) return null;
  _lastTs = ts;
  try {
    const result = _landmarker.detectForVideo(video, ts);
    return result?.landmarks?.[0] ?? null;
  } catch { return null; }
}

// ── Ángulo entre 3 landmarks (para matching exacto) ───────────────
export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAb = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCb = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAb === 0 || magCb === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (magAb * magCb)))) * (180 / Math.PI);
}

// ── Extrae ángulos clave del esqueleto ────────────────────────────
export interface PoseAngles {
  leftKnee: number; rightKnee: number;
  leftHip: number; rightHip: number;
  leftElbow: number; rightElbow: number;
  rightElbow2: number;
  spine: number; // ángulo de la columna (hombros vs caderas)
  hipShift: number; // desplazamiento lateral de caderas (0-1) para detectar peso
}

export function extractAngles(lm: Landmark[]): PoseAngles {
  const get = (i: number) => lm[i] || { x: 0.5, y: 0.5, z: 0 };
  return {
    leftKnee:   angle(get(LM.LEFT_HIP),   get(LM.LEFT_KNEE),  get(LM.LEFT_ANKLE)),
    rightKnee:  angle(get(LM.RIGHT_HIP),  get(LM.RIGHT_KNEE), get(LM.RIGHT_ANKLE)),
    leftHip:    angle(get(LM.LEFT_SHOULDER), get(LM.LEFT_HIP), get(LM.LEFT_KNEE)),
    rightHip:   angle(get(LM.RIGHT_SHOULDER),get(LM.RIGHT_HIP),get(LM.RIGHT_KNEE)),
    leftElbow:  angle(get(LM.LEFT_SHOULDER), get(LM.LEFT_ELBOW), get(LM.LEFT_WRIST)),
    rightElbow2:angle(get(LM.RIGHT_SHOULDER),get(LM.RIGHT_ELBOW),get(LM.RIGHT_WRIST)),
    rightElbow: angle(get(LM.RIGHT_SHOULDER),get(LM.RIGHT_ELBOW),get(LM.RIGHT_WRIST)),
    spine:      angle(get(LM.LEFT_SHOULDER), get(LM.LEFT_HIP), get(LM.LEFT_KNEE)),
    hipShift: Math.abs(
      ((get(LM.LEFT_HIP).x + get(LM.RIGHT_HIP).x) / 2) -
      ((get(LM.LEFT_SHOULDER).x + get(LM.RIGHT_SHOULDER).x) / 2)
    ),
  };
}

// ── NIVEL A: Sync de movimiento + ritmo ───────────────────────────
// Detecta velocidad de movimiento, partes del cuerpo activas y ritmo

export type GenreBodyFocus = 'hips' | 'feet' | 'arms' | 'whole' | 'upper';

export const GENRE_FOCUS: Record<string, GenreBodyFocus> = {
  'bachata': 'hips', 'salsa': 'feet', 'kizomba': 'hips', 'reggaeton': 'hips',
  'regueton': 'hips', 'merengue': 'feet', 'cumbia': 'feet', 'hip-hop': 'whole',
  'hip hop': 'whole', 'dancehall': 'whole', 'afrobeats': 'whole', 'tango': 'upper',
  'flamenco': 'arms', 'default': 'whole',
};

export function getBodyFocus(genre: string): GenreBodyFocus {
  const g = genre.toLowerCase();
  for (const [k, v] of Object.entries(GENRE_FOCUS)) {
    if (g.includes(k)) return v;
  }
  return 'whole';
}

// Historia de posiciones para calcular movimiento
const _history: { lm: Landmark[]; ts: number }[] = [];
const HISTORY_MS = 500;

export function pushHistory(lm: Landmark[]) {
  const ts = Date.now();
  _history.push({ lm, ts });
  // Limpia entradas > 1s
  while (_history.length > 0 && ts - _history[0].ts > 1000) _history.shift();
}

export function clearHistory() { _history.length = 0; }

/** Velocidad de movimiento (0-1) de un landmark específico respecto al pasado reciente */
function landmarkSpeed(idx: number): number {
  if (_history.length < 2) return 0;
  const recent = _history[_history.length - 1]?.lm[idx];
  const old = _history[0]?.lm[idx];
  if (!recent || !old) return 0;
  const dx = recent.x - old.x;
  const dy = recent.y - old.y;
  return Math.min(1, Math.sqrt(dx * dx + dy * dy) * 10);
}

export interface MovementScore {
  overall: number;   // 0-100
  bodyFocus: number; // 0-100, la parte del cuerpo que importa al género
  rhythm: number;    // 0-100, consistencia rítmica
  breakdown: Record<string, number>; // por parte del cuerpo
}

export function scoreMovementLevel(lm: Landmark[], focus: GenreBodyFocus, beatActive: boolean): MovementScore {
  const hipSpeed = Math.max(landmarkSpeed(LM.LEFT_HIP), landmarkSpeed(LM.RIGHT_HIP));
  const feetSpeed = Math.max(landmarkSpeed(LM.LEFT_ANKLE), landmarkSpeed(LM.RIGHT_ANKLE));
  const shoulderSpeed = Math.max(landmarkSpeed(LM.LEFT_SHOULDER), landmarkSpeed(LM.RIGHT_SHOULDER));
  const wristSpeed = Math.max(landmarkSpeed(LM.LEFT_WRIST), landmarkSpeed(LM.RIGHT_WRIST));

  const bodyFocusScore = {
    hips:  hipSpeed * 100,
    feet:  feetSpeed * 100,
    arms:  wristSpeed * 100,
    upper: Math.max(shoulderSpeed, wristSpeed) * 100,
    whole: Math.max(hipSpeed, feetSpeed, shoulderSpeed) * 100,
  }[focus];

  const overall = Math.min(100,
    hipSpeed * 35 + feetSpeed * 35 + shoulderSpeed * 20 + wristSpeed * 10
  ) * 100;

  // Ritmo: si el beat está activo, esperamos pico de movimiento
  const peakSpeed = Math.max(hipSpeed, feetSpeed);
  const rhythm = beatActive
    ? Math.min(100, peakSpeed * 150)  // si hay beat esperamos movimiento
    : Math.min(100, 100 - peakSpeed * 50); // si no hay beat, penaliza moverse

  return {
    overall: Math.min(100, overall),
    bodyFocus: Math.min(100, bodyFocusScore),
    rhythm: Math.min(100, rhythm),
    breakdown: {
      caderas: Math.round(hipSpeed * 100),
      pies: Math.round(feetSpeed * 100),
      hombros: Math.round(shoulderSpeed * 100),
      brazos: Math.round(wristSpeed * 100),
    },
  };
}

// ── NIVEL B: Matching exacto de pose ──────────────────────────────
export interface ExactMatchScore {
  similarity: number;  // 0-100
  worstJoint: string;  // articulación más desincronizada
  jointScores: Record<string, number>; // por articulación
}

const JOINT_LABELS: Record<string, string> = {
  leftKnee: 'rodilla izq.', rightKnee: 'rodilla der.',
  leftHip: 'cadera izq.', rightHip: 'cadera der.',
  leftElbow: 'codo izq.', rightElbow: 'codo der.',
};

/** Compara los ángulos del usuario contra los ángulos de referencia (del bailarín) */
export function scoreExactMatch(user: PoseAngles, ref: PoseAngles, tolerance = 25): ExactMatchScore {
  const keys: (keyof PoseAngles)[] = ['leftKnee', 'rightKnee', 'leftHip', 'rightHip', 'leftElbow', 'rightElbow'];
  const jointScores: Record<string, number> = {};
  let worst = keys[0] as string;
  let worstDiff = 0;

  for (const k of keys) {
    const diff = Math.abs((user[k] as number) - (ref[k] as number));
    const score = Math.max(0, 100 - (diff / tolerance) * 100);
    jointScores[JOINT_LABELS[k] || k] = Math.round(score);
    if (diff > worstDiff) { worstDiff = diff; worst = JOINT_LABELS[k] || k; }
  }

  const similarity = Object.values(jointScores).reduce((a, b) => a + b, 0) / keys.length;
  return { similarity: Math.round(similarity), worstJoint: worst, jointScores };
}

// ── Score combinado final (A + B si está disponible) ──────────────
export interface SyncScore {
  score: number;          // 0-100, el score final que ve el usuario
  passed: boolean;        // ≥ umbral para superar el paso
  level: 'A' | 'B' | 'AB';
  movement: MovementScore;
  exact?: ExactMatchScore;
  feedback: string;       // texto de retroalimentación rápida
}

const PASS_THRESHOLD = 65; // % mínimo para superar un paso

export function combinedScore(
  movement: MovementScore,
  exact: ExactMatchScore | null,
): SyncScore {
  let score: number;
  let level: 'A' | 'B' | 'AB';

  if (exact) {
    // AB: 40% movimiento + 60% exactitud
    score = movement.bodyFocus * 0.40 + exact.similarity * 0.60;
    level = 'AB';
  } else {
    // Solo A: 60% movimiento en zona correcta + 40% ritmo
    score = movement.bodyFocus * 0.60 + movement.rhythm * 0.40;
    level = 'A';
  }

  score = Math.min(100, Math.max(0, score));
  const passed = score >= PASS_THRESHOLD;

  let feedback = '';
  if (score >= 90) feedback = '¡Perfecto! 🔥';
  else if (score >= 75) feedback = '¡Muy bien! 💪';
  else if (score >= PASS_THRESHOLD) feedback = '¡Lo tienes! 👊';
  else if (movement.bodyFocus < 30) feedback = '¡Mueve más el cuerpo!';
  else if (exact && exact.similarity < 50) feedback = `Fíjate en ${exact.worstJoint}`;
  else feedback = '¡Sigue el ritmo!';

  return { score: Math.round(score), passed, level, movement, exact: exact ?? undefined, feedback };
}

export { PASS_THRESHOLD };
