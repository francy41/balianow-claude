/**
 * useDanceGameLoop — Loop de juego con modo VIDEOJUEGO
 *
 * Fases por paso:
 *   DEMO     → el profe baila el paso (el usuario lo mira)   ~8 s
 *   PREPARE  → cuenta atrás "5,6,7,8…"                       ~4 s
 *   ATTEMPT  → el usuario baila, se mide y puntúa             ~10 s
 *   PASS/FAIL → resultado, voz del profe, puntos
 *
 * Sistema de juego:
 *   - 3 vidas ❤️ — se pierde una en cada FAIL
 *   - Combo 🔥 — multiplicador por pasos consecutivos superados (×1 → ×2 → ×3)
 *   - Estrellas ⭐ — 1/2/3 por paso según score
 *   - XP — acumula a lo largo de la sesión
 *   - GAME OVER cuando las vidas llegan a 0
 *   - PASS: +50 pts × multiplicador; BONUS +200 al completar clase
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadPoseLandmarker, detectPose, detectPoseFull, pushHistory, clearHistory,
  extractAngles, scoreMovementLevel, scoreExactMatch, combinedScore,
  getBodyFocus, isPoseLandmarkerReady, angleVector, scoreDTW,
  type PoseResult, type SyncScore, type PoseAngles, type Landmark,
} from '../lib/poseSync';
import { speak, stopSpeaking } from '../lib/speech';
import {
  playPassSound, playFailSound, playComboSound,
  playGameOver, playLevelUp, playCountdown, playHeartLost, playDemoStart,
} from '../lib/gameAudio';

export type GamePhase = 'idle' | 'demo' | 'prepare' | 'attempt' | 'pass' | 'fail' | 'gameover';

export interface StepResult {
  stepName: string;
  score: number;
  stars: number;
  attempts: number;
  passed: boolean;
}

export interface GameState {
  phase: GamePhase;
  stepIdx: number;
  attemptCount: number;
  countdown: number;
  attemptProgress: number;
  sessionScore: number;
  lives: number;
  combo: number;
  comboMultiplier: number;
  stepStars: number;          // estrellas del último paso
  totalStars: number;         // estrellas acumuladas
  landmarks: PoseResult;
  worldLandmarks: Landmark[] | null;
  syncScore: SyncScore | null;
  liveMatch: number;       // % de sincronía DTW en vivo (-1 si no hay referencia)
  lastBreakdown: { sync: number; rhythm: number } | null; // desglose del último paso superado
  stepResults: StepResult[];
  completed: boolean;
  gameOver: boolean;
  poseLandmarkerReady: boolean;
}

interface Options {
  videoRef: React.RefObject<HTMLVideoElement>;
  camOn: boolean;
  // ── Modo cámara remota (móvil como webcam) ──
  remote?: boolean;                                       // si true, usa landmarks remotos
  remoteLandmarksRef?: React.MutableRefObject<PoseResult>; // landmarks recibidos por Realtime
  // Vídeo del profe (MP4) para extraer la referencia de pose y comparar con DTW
  profeVideoRef?: React.RefObject<HTMLVideoElement>;
  genre: string;
  lang: string;
  userName: string;
  choreographerName: string;
  stepCount: number;
  stepName: (idx: number) => string;
  stepDescription: (idx: number) => string;
  stepCountCue: (idx: number) => string;
  refAngles?: (idx: number) => PoseAngles | null;
  refTrack?: (idx: number) => number[][] | null;   // ADN del paso grabado (pista de pose del avatar)
  voiceEnabledRef: React.MutableRefObject<boolean>; // respeta el toggle del usuario
  onStepPass: (idx: number, pts: number, isBonus: boolean) => void;
  onClassComplete: (totalScore: number, results: StepResult[]) => void;
  onGameOver?: (score: number, results: StepResult[]) => void;
  startLives?: number;        // default 3
  demoDuration?: number;      // default 8
  prepareDuration?: number;   // default 4
  attemptDuration?: number;   // default 10
}

const POINTS_PER_STEP = 50;
const BONUS_COMPLETE = 200;
const PASS_THRESHOLD = 65;

// ── Mensajes multiidioma ─────────────────────────────────────────

const PASS_MSGS = (name: string, combo: number, lang: string) => {
  const comboStr = combo > 1 ? ` ¡Combo ×${combo}!` : '';
  return ({
    es: `¡Bien, ${name}! Vamos a por más.${comboStr}`,
    en: `Nice, ${name}! Let's go for more.${comboStr}`,
    pt: `Isso, ${name}! Vamos por mais.${comboStr}`,
    fr: `Bravo, ${name}! On continue.${comboStr}`,
    zh: `太棒了！继续！${comboStr}`,
    hi: `शाबाश! आगे चलते हैं।${comboStr}`,
    ar: `أحسنت! هيا نكمل.${comboStr}`,
    ru: `Отлично! Вперёд.${comboStr}`,
  }[lang] || `¡Bien, ${name}! Vamos.${comboStr}`);
};

const FAIL_MSGS = (name: string, livesLeft: number, lang: string) => {
  const warn = livesLeft === 1 ? ' ¡Última oportunidad!' : '';
  return ({
    es: `¡Tú puedes, ${name}!${warn} Volvemos a empezar… ¡go!`,
    en: `You've got this, ${name}!${warn} Let's start again… go!`,
    pt: `Você consegue, ${name}!${warn} Vamos de novo… vai!`,
    fr: `Tu peux, ${name}!${warn} On recommence… allez!`,
    zh: `你能做到的！${warn}再来一次…冲！`,
    hi: `तुम कर सकते हो!${warn} फिर से शुरू करते हैं… जाओ!`,
    ar: `يمكنك ذلك!${warn} لنبدأ من جديد… هيا!`,
    ru: `Ты можешь!${warn} Начинаем снова… давай!`,
  }[lang] || `¡Tú puedes, ${name}!${warn} Go!`);
};

const GAMEOVER_MSGS = (name: string, lang: string) => ({
  es: `¡No te rindas, ${name}! El baile se aprende paso a paso. ¡Vuelve y lo superas!`,
  en: `Don't give up, ${name}! Dance is learned step by step. Come back and crush it!`,
  pt: `Não desista, ${name}! A dança se aprende passo a passo. Volte e supere!`,
  fr: `N'abandonne pas, ${name}! La danse s'apprend pas à pas. Reviens et tu vas y arriver!`,
  zh: `不要放弃！舞蹈是一步一步学的。回来继续！`,
  hi: `हार मत मानो! नृत्य कदम दर कदम सीखा जाता है।`,
  ar: `لا تستسلم! الرقص يُتعلم خطوة خطوة.`,
  ru: `Не сдавайся! Танец учится шаг за шагом.`,
}[lang] || `¡No te rindas, ${name}! ¡Vuelve y lo superas!`);

const DEMO_MSGS = (name: string, step: string, cue: string, lang: string) => ({
  es: `Mírame, ${name}. Esto es ${step}.${cue ? ' Cuenta: ' + cue + '.' : ''} Observa bien.`,
  en: `Watch me, ${name}. This is ${step}.${cue ? ' Count: ' + cue + '.' : ''} Watch carefully.`,
  pt: `Me veja, ${name}. Isso é ${step}.${cue ? ' Contagem: ' + cue + '.' : ''} Observe bem.`,
  fr: `Regarde-moi, ${name}. C'est ${step}.${cue ? ' Compte: ' + cue + '.' : ''} Regarde bien.`,
  zh: `看我，${name}。这是${step}。${cue ? '节拍：' + cue + '。' : ''}仔细看。`,
  hi: `मुझे देखो। यह है ${step}।${cue ? ' गिनती: ' + cue + '।' : ''} ध्यान से देखो।`,
  ar: `انظر إليّ. هذه ${step}.${cue ? ' العدّ: ' + cue + '.' : ''} شاهد بعناية.`,
  ru: `Смотри на меня. Это ${step}.${cue ? ' Счёт: ' + cue + '.' : ''} Наблюдай внимательно.`,
}[lang] || `Mírame, ${name}. Esto es ${step}.`);

const PREPARE_MSGS = (lang: string) => ({
  es: 'Ahora tú… cinco, seis, siete, ocho.',
  en: 'Now you… five, six, seven, eight.',
  pt: 'Agora você… cinco, seis, sete, oito.',
  fr: 'À toi… cinq, six, sept, huit.',
  zh: '现在你来… 五六七八。',
  hi: 'अब तुम… पाँच छह सात आठ।',
  ar: 'الآن أنت… خمسة ستة سبعة ثمانية.',
  ru: 'Теперь ты… пять, шесть, семь, восемь.',
}[lang] || 'Ahora tú… cinco, seis, siete, ocho.');

const COMPLETE_MSGS = (name: string, stars: number, lang: string) => ({
  es: `¡Increíble, ${name}! Clase completada con ${stars} estrellas. ¡Eres una estrella del baile!`,
  en: `Incredible, ${name}! Class complete with ${stars} stars. You're a dance star!`,
  pt: `Incrível, ${name}! Aula completa com ${stars} estrelas. Você é uma estrela!`,
  fr: `Incroyable, ${name}! Cours terminé avec ${stars} étoiles. Tu es une star!`,
  zh: `太厉害了！课程完成，获得${stars}星。你是舞蹈明星！`,
  hi: `शानदार! ${stars} सितारों के साथ कक्षा पूरी हुई।`,
  ar: `رائع! اكتمل الدرس بـ ${stars} نجوم.`,
  ru: `Невероятно! Класс завершён с ${stars} звёздами.`,
}[lang] || `¡Increíble, ${name}! ${stars} estrellas.`);

// Coaching por voz en vivo durante el intento (según el % de sincronía)
const GENRE_FIX: Record<string, Record<string, string>> = {
  bachata:   { es: 'marca mas la cadera', en: 'move your hips more', pt: 'marque mais o quadril' },
  salsa:     { es: 'marca bien el uno y el cinco', en: 'hit the one and the five', pt: 'marque o um e o cinco' },
  reggaeton: { es: 'suelta mas la cadera', en: 'loosen your hips', pt: 'solte mais o quadril' },
  regueton:  { es: 'suelta mas la cadera', en: 'loosen your hips', pt: 'solte mais o quadril' },
  kizomba:   { es: 'mas suave y conectado', en: 'softer and connected', pt: 'mais suave e conectado' },
  default:   { es: 'sigue el conteo', en: 'follow the count', pt: 'siga a contagem' },
};
function coachLine(score: number, genre: string, name: string, lang: string): string {
  const L = (lang as string) in { es: 1, en: 1, pt: 1 } ? lang : 'es';
  if (score >= 80) {
    return ({ es: `eso es ${name}, sigue asi`, en: `that's it ${name}, keep going`, pt: `isso ${name}, continua` } as any)[L];
  }
  if (score >= 55) {
    return ({ es: 'casi, siente el ritmo', en: 'almost, feel the rhythm', pt: 'quase, sinta o ritmo' } as any)[L];
  }
  const g = genre.toLowerCase();
  let key = 'default';
  for (const k of Object.keys(GENRE_FIX)) if (g.includes(k)) { key = k; break; }
  return (GENRE_FIX[key] as any)[L] || GENRE_FIX.default.es;
}

function starsForScore(score: number): number {
  if (score >= 88) return 3;
  if (score >= 75) return 2;
  if (score >= 65) return 1;
  return 0;
}

function comboMultiplierFor(combo: number): number {
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  if (combo >= 2) return 1.5;
  return 1;
}

// ── Hook principal ───────────────────────────────────────────────
export function useDanceGameLoop(opts: Options): GameState & {
  startStep: (idx: number) => void;
  startGame: () => void;
  stopGame: () => void;
  resetGame: () => void;
} {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [attemptProgress, setAttemptProgress] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [lives, setLives] = useState(opts.startLives ?? 3);
  const [combo, setCombo] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [stepStars, setStepStars] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [landmarks, setLandmarks] = useState<PoseResult>(null);
  const [worldLandmarks, setWorldLandmarks] = useState<Landmark[] | null>(null);
  const [syncScore, setSyncScore] = useState<SyncScore | null>(null);
  const [liveMatch, setLiveMatch] = useState(-1);
  const [lastBreakdown, setLastBreakdown] = useState<{ sync: number; rhythm: number } | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [completed, setCompleted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [poseLandmarkerReady, setPoseLandmarkerReady] = useState(false);

  const scoresRef = useRef<number[]>([]);
  const userTrackRef = useRef<number[][]>([]);   // ángulos del usuario durante el intento
  const refTrackRef = useRef<number[][]>([]);    // ángulos del avatar durante la demo
  const lastDtwRef = useRef(0);                  // throttle del cálculo DTW en vivo
  const lastCoachRef = useRef(0);                // throttle del coaching por voz
  const phaseRef = useRef<GamePhase>('idle');
  const stepIdxRef = useRef(0);
  const attemptCountRef = useRef(0);
  const livesRef = useRef(opts.startLives ?? 3);
  const comboRef = useRef(0);
  const sessionScoreRef = useRef(0);
  const totalStarsRef = useRef(0);
  const stepResultsRef = useRef<StepResult[]>([]);
  const runningRef = useRef(false);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  phaseRef.current = phase;
  stepIdxRef.current = stepIdx;
  attemptCountRef.current = attemptCount;

  const { demoDuration = 8, prepareDuration = 4, attemptDuration = 10 } = opts;

  // Cargar MediaPipe al montar
  useEffect(() => {
    loadPoseLandmarker().then(() => setPoseLandmarkerReady(true)).catch(console.warn);
  }, []);

  // TTS con respeto a voiceEnabled
  const say = useCallback((text: string) => {
    if (!opts.voiceEnabledRef.current) return;
    stopSpeaking();
    speak(text, { lang: opts.lang as any, female: false, rate: 0.98 });
  }, [opts.lang, opts.voiceEnabledRef]);

  // Loop de pose (RAF) — soporta cámara local o remota (móvil)
  // Comparte el detector en el tiempo: DEMO → muestrea al avatar (referencia),
  // ATTEMPT → muestrea al usuario (y puntúa). Así evitamos 2 detectores a la vez.
  const runPoseLoop = useCallback(() => {
    if (!runningRef.current) return;
    const phase = phaseRef.current;

    // ── DEMO: si NO hay ADN grabado, capturar referencia del avatar en vivo (MP4) ──
    if (phase === 'demo') {
      if (refTrackRef.current.length < 5 && opts.profeVideoRef?.current && isPoseLandmarkerReady()) {
        const pv = opts.profeVideoRef.current;
        if (pv.readyState >= 2 && !pv.paused) {
          const plm = detectPose(pv);
          if (plm) refTrackRef.current.push(angleVector(plm));
        }
      }
      rafRef.current = requestAnimationFrame(runPoseLoop);
      return; // durante la demo no procesamos al usuario
    }

    // ── Resto de fases: usuario (cámara local o móvil remoto) ──
    let lm: PoseResult = null;
    if (opts.remote) {
      lm = opts.remoteLandmarksRef?.current ?? null;
    } else {
      const video = opts.videoRef.current;
      if (video && opts.camOn && isPoseLandmarkerReady()) {
        const full = detectPoseFull(video);
        if (full) {
          lm = full.landmarks;
          setWorldLandmarks(full.worldLandmarks);
        }
      }
    }

    if (lm) {
      pushHistory(lm);
      setLandmarks(lm);
      if (phase === 'attempt') {
        const focus = getBodyFocus(opts.genre);
        const movement = scoreMovementLevel(lm, focus, true);
        const refA = opts.refAngles?.(stepIdxRef.current);
        const exact = refA ? scoreExactMatch(extractAngles(lm), refA) : null;
        const result = combinedScore(movement, exact);
        setSyncScore(result);
        scoresRef.current.push(result.score);
        userTrackRef.current.push(angleVector(lm)); // para DTW
        // Sincronía DTW en vivo (cada ~300ms si hay referencia del avatar)
        const now = Date.now();
        if (refTrackRef.current.length >= 5 && now - lastDtwRef.current > 300) {
          lastDtwRef.current = now;
          const live = scoreDTW(userTrackRef.current, refTrackRef.current);
          if (live >= 0) {
            setLiveMatch(live);
            // 🗣️ Coaching por voz en vivo (el avatar te corrige), cada ~4.5s
            if (now - lastCoachRef.current > 4500 && userTrackRef.current.length >= 12) {
              lastCoachRef.current = now;
              say(coachLine(live, opts.genre, opts.userName, opts.lang));
            }
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(runPoseLoop);
  }, [opts.videoRef, opts.camOn, opts.remote, opts.remoteLandmarksRef, opts.profeVideoRef, opts.genre, opts.refAngles, opts.userName, opts.lang, say]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearHistory();
    scoresRef.current = [];
  }, []);

  const countdownTick = useCallback((secs: number, onDone: () => void) => {
    setCountdown(secs);
    const tick = (remaining: number) => {
      if (!runningRef.current) return;
      setCountdown(remaining);
      if (remaining > 0) playCountdown(remaining);
      if (remaining <= 0) { onDone(); return; }
      timerRef.current = setTimeout(() => tick(remaining - 1), 1000);
    };
    timerRef.current = setTimeout(() => tick(secs - 1), 1000);
  }, []);

  // ── PASS ────────────────────────────────────────────────────────
  const runPass = useCallback((idx: number, avgScore: number, breakdown?: { sync: number; rhythm: number }) => {
    setPhase('pass');
    setLastBreakdown(breakdown ?? null);
    const stars = starsForScore(avgScore);
    setStepStars(stars);
    totalStarsRef.current += stars;
    setTotalStars(totalStarsRef.current);

    const newCombo = comboRef.current + 1;
    comboRef.current = newCombo;
    setCombo(newCombo);
    const mult = comboMultiplierFor(newCombo);
    setComboMultiplier(mult);

    const isLast = idx >= opts.stepCount - 1;
    const base = POINTS_PER_STEP + (isLast ? BONUS_COMPLETE : 0);
    const pts = Math.round(base * mult);
    sessionScoreRef.current += pts;
    setSessionScore(sessionScoreRef.current);

    const res: StepResult = {
      stepName: opts.stepName(idx),
      score: Math.round(avgScore),
      stars,
      attempts: attemptCountRef.current + 1,
      passed: true,
    };
    stepResultsRef.current = [...stepResultsRef.current, res];
    setStepResults([...stepResultsRef.current]);

    playPassSound();
    if (newCombo > 1) setTimeout(() => playComboSound(newCombo), 350);
    say(PASS_MSGS(opts.userName, newCombo, opts.lang));
    opts.onStepPass(idx, pts, isLast);

    timerRef.current = setTimeout(() => {
      if (!runningRef.current) return;
      if (isLast) {
        playLevelUp();
        setCompleted(true);
        setPhase('idle');
        say(COMPLETE_MSGS(opts.userName, totalStarsRef.current, opts.lang));
        opts.onClassComplete(sessionScoreRef.current, [...stepResultsRef.current]);
      } else {
        startStep(idx + 1);
      }
    }, 2800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, say]);

  // ── FAIL ────────────────────────────────────────────────────────
  const runFail = useCallback((idx: number) => {
    setPhase('fail');

    // Romper combo
    comboRef.current = 0;
    setCombo(0);
    setComboMultiplier(1);

    // Restar vida
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);
    playHeartLost();

    if (newLives <= 0) {
      // GAME OVER
      setTimeout(() => {
        if (!runningRef.current) return;
        playGameOver();
        setPhase('gameover');
        setGameOver(true);
        say(GAMEOVER_MSGS(opts.userName, opts.lang));
        opts.onGameOver?.(sessionScoreRef.current, [...stepResultsRef.current]);
      }, 1500);
      return;
    }

    say(FAIL_MSGS(opts.userName, newLives, opts.lang));
    timerRef.current = setTimeout(() => {
      if (!runningRef.current) return;
      setAttemptCount(c => c + 1);
      runAttempt(idx);
    }, 2800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, say]);

  // ── ATTEMPT ─────────────────────────────────────────────────────
  const runAttempt = useCallback((idx: number) => {
    setPhase('attempt');
    scoresRef.current = [];
    userTrackRef.current = [];   // reiniciar pista de pose del usuario
    lastDtwRef.current = 0;
    setLiveMatch(-1);
    setSyncScore(null);
    setAttemptProgress(0);
    const total = attemptDuration * 1000;
    const start = Date.now();
    const tick = () => {
      if (!runningRef.current || phaseRef.current !== 'attempt') return;
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / total);
      setAttemptProgress(progress);
      setCountdown(Math.ceil((total - elapsed) / 1000));
      if (progress < 1) {
        timerRef.current = setTimeout(tick, 100);
      } else {
        const scores = scoresRef.current;
        const movementAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        // Sincronía temporal con el avatar (DTW). -1 si no hay referencia suficiente.
        const dtw = scoreDTW(userTrackRef.current, refTrackRef.current);
        // Si hay referencia del avatar: 70% sincronía DTW + 30% ritmo/movimiento.
        // Si no: usamos solo ritmo/movimiento (como antes).
        const avg = dtw >= 0 ? Math.round(dtw * 0.7 + movementAvg * 0.3) : Math.round(movementAvg);
        const breakdown = { sync: dtw, rhythm: Math.round(movementAvg) };
        if (avg >= PASS_THRESHOLD) runPass(idx, avg, breakdown);
        else runFail(idx);
      }
    };
    timerRef.current = setTimeout(tick, 100);
  }, [attemptDuration, runPass, runFail]);

  // ── PREPARE ─────────────────────────────────────────────────────
  const runPrepare = useCallback((idx: number) => {
    setPhase('prepare');
    say(PREPARE_MSGS(opts.lang));
    countdownTick(prepareDuration, () => runAttempt(idx));
  }, [opts.lang, prepareDuration, countdownTick, runAttempt, say]);

  // ── DEMO ────────────────────────────────────────────────────────
  const runDemo = useCallback((idx: number) => {
    setPhase('demo');
    setAttemptCount(0);
    clearHistory();
    scoresRef.current = [];
    // ADN del paso grabado (precargado). Si existe, se usa como referencia DTW directa.
    const stored = opts.refTrack?.(idx);
    refTrackRef.current = (stored && stored.length >= 5) ? stored.slice() : [];
    lastCoachRef.current = 0;
    setLiveMatch(-1);
    playDemoStart();
    const msg = DEMO_MSGS(opts.userName, opts.stepName(idx), opts.stepCountCue(idx), opts.lang);
    // Pequeño delay para que el AudioContext esté desbloqueado tras el click
    setTimeout(() => say(msg), 300);
    countdownTick(demoDuration, () => runPrepare(idx));
  }, [opts, demoDuration, countdownTick, runPrepare, say]);

  // ── startStep ──────────────────────────────────────────────────
  const startStep = useCallback((idx: number) => {
    clear();
    setStepIdx(idx);
    stepIdxRef.current = idx;
    setSyncScore(null);
    setLandmarks(null);
    setStepStars(0);
    runDemo(idx);
  }, [clear, runDemo]);

  // ── startGame ─────────────────────────────────────────────────
  const startGame = useCallback(() => {
    runningRef.current = true;
    livesRef.current = opts.startLives ?? 3;
    comboRef.current = 0;
    sessionScoreRef.current = 0;
    totalStarsRef.current = 0;
    stepResultsRef.current = [];
    setLives(opts.startLives ?? 3);
    setCombo(0);
    setComboMultiplier(1);
    setSessionScore(0);
    setTotalStars(0);
    setStepResults([]);
    setCompleted(false);
    setGameOver(false);
    setStepStars(0);
    rafRef.current = requestAnimationFrame(runPoseLoop);
    startStep(0);
  }, [opts.startLives, runPoseLoop, startStep]);

  // ── stopGame ──────────────────────────────────────────────────
  const stopGame = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    stopSpeaking();
    clear();
    setPhase('idle');
    setLandmarks(null);
    setSyncScore(null);
  }, [clear]);

  // ── resetGame ─────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    stopGame();
    setTimeout(() => startGame(), 100);
  }, [stopGame, startGame]);

  // Arrancar RAF cuando cámara se enciende
  useEffect(() => {
    if (opts.camOn && runningRef.current) {
      rafRef.current = requestAnimationFrame(runPoseLoop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [opts.camOn, runPoseLoop]);

  useEffect(() => () => { stopGame(); }, [stopGame]);

  return {
    phase, stepIdx, attemptCount, countdown, attemptProgress,
    sessionScore, lives, combo, comboMultiplier, stepStars, totalStars,
    landmarks, worldLandmarks, syncScore, liveMatch, lastBreakdown, stepResults, completed, gameOver, poseLandmarkerReady,
    startStep, startGame, stopGame, resetGame,
  };
}
