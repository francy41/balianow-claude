/**
 * useDanceGameLoop — Hook del loop de juego de sincronización de baile
 *
 * Fases por paso:
 *   DEMO     → el profe baila el paso (el usuario lo mira)  ~8s
 *   PREPARE  → cuenta atrás "5,6,7,8…"                      ~4s
 *   ATTEMPT  → el usuario baila, se mide y puntúa            ~8s
 *   PASS/FAIL → juicio, voz del profe, puntos
 *
 * Si PASS → siguiente paso (+puntos por paso + bonus si completa clase)
 * Si FAIL → repite el mismo paso (el profe anima: "¡Tú puedes, go!")
 *
 * Scoring:
 *   - Nivel A siempre activo (movimiento + ritmo)
 *   - Nivel B (exactMatch) activo si se pasan referencias de pose del bailarín
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadPoseLandmarker, detectPose, pushHistory, clearHistory,
  extractAngles, scoreMovementLevel, scoreExactMatch, combinedScore,
  getBodyFocus, isPoseLandmarkerReady,
  type PoseResult, type SyncScore, type PoseAngles,
} from '../lib/poseSync';
import { speak, stopSpeaking } from '../lib/speech';

export type GamePhase = 'idle' | 'demo' | 'prepare' | 'attempt' | 'pass' | 'fail';

export interface StepResult {
  stepName: string;
  score: number;
  attempts: number;
  passed: boolean;
}

export interface GameState {
  phase: GamePhase;
  stepIdx: number;
  attemptCount: number;   // intentos en el paso actual
  countdown: number;      // segundos restantes en la fase
  attemptProgress: number; // 0-1 progreso del intento
  sessionScore: number;   // puntos acumulados en la sesión
  landmarks: PoseResult;
  syncScore: SyncScore | null;
  stepResults: StepResult[];
  completed: boolean;     // clase completa
  poseLandmarkerReady: boolean;
}

interface Options {
  videoRef: React.RefObject<HTMLVideoElement>;
  camOn: boolean;
  genre: string;
  lang: string;
  userName: string;
  choreographerName: string;
  stepCount: number;       // total de pasos en la clase
  stepName: (idx: number) => string;
  stepDescription: (idx: number) => string;
  stepCountCue: (idx: number) => string;
  refAngles?: (idx: number) => PoseAngles | null; // para nivel B (exacto)
  onStepPass: (idx: number, score: number, isBonus: boolean) => void; // sumar puntos a Supabase
  onClassComplete: (totalScore: number, results: StepResult[]) => void;
  demoDuration?: number;   // segundos de demo (default 8)
  prepareDuration?: number;// segundos de cuenta atrás (default 4)
  attemptDuration?: number;// segundos de intento (default 10)
}

const POINTS_PER_STEP = 50;
const BONUS_COMPLETE = 200;

// Mensajes del profe por fase
const PASS_MSGS = (name: string, step: string, lang: string) => ({
  es: `¡Bien, ${name}! Vamos a por más 🔥`,
  en: `Nice, ${name}! Let's go for more 🔥`,
  pt: `Isso, ${name}! Vamos por mais 🔥`,
  fr: `Bravo, ${name}! On continue 🔥`,
  zh: `太棒了，${name}！继续！🔥`,
  hi: `शाबाश ${name}! आगे चलते हैं 🔥`,
  ar: `أحسنت ${name}! هيا نكمل 🔥`,
  ru: `Отлично, ${name}! Вперёд 🔥`,
}[lang] || `¡Bien, ${name}! Vamos a por más 🔥`);

const FAIL_MSGS = (name: string, lang: string) => ({
  es: `¡Tú puedes, ${name}! Volvemos a empezar… ¡go!`,
  en: `You've got this, ${name}! Let's start again… go!`,
  pt: `Você consegue, ${name}! Vamos de novo… vai!`,
  fr: `Tu peux, ${name}! On recommence… allez!`,
  zh: `你能做到的，${name}！再来一次…冲！`,
  hi: `तुम कर सकते हो ${name}! फिर से शुरू करते हैं… जाओ!`,
  ar: `يمكنك ذلك ${name}! لنبدأ من جديد… هيا!`,
  ru: `Ты можешь, ${name}! Начинаем снова… давай!`,
}[lang] || `¡Tú puedes, ${name}! Volvemos a empezar… ¡go!`);

const DEMO_MSGS = (name: string, step: string, cue: string, lang: string) => ({
  es: `Mírame, ${name}. Esto es ${step}. ${cue ? 'Cuenta: ' + cue + '.' : ''} Observa bien.`,
  en: `Watch me, ${name}. This is ${step}. ${cue ? 'Count: ' + cue + '.' : ''} Watch carefully.`,
  pt: `Me veja, ${name}. Isso é ${step}. ${cue ? 'Contagem: ' + cue + '.' : ''} Observe bem.`,
  fr: `Regarde-moi, ${name}. C'est ${step}. ${cue ? 'Compte: ' + cue + '.' : ''} Regarde bien.`,
  zh: `看我，${name}。这是${step}。${cue ? '节拍：' + cue + '。' : ''}仔细看。`,
  hi: `मुझे देखो, ${name}। यह है ${step}। ${cue ? 'गिनती: ' + cue + '।' : ''} ध्यान से देखो।`,
  ar: `انظر إليّ، ${name}. هذه ${step}. ${cue ? 'العدّ: ' + cue + '.' : ''} شاهد بعناية.`,
  ru: `Смотри на меня, ${name}. Это ${step}. ${cue ? 'Счёт: ' + cue + '.' : ''} Наблюдай внимательно.`,
}[lang] || `Mírame, ${name}. Esto es ${step}.`);

const PREPARE_MSGS = (lang: string) => ({
  es: 'Ahora tú… 5, 6, 7, 8…',
  en: 'Now you… 5, 6, 7, 8…',
  pt: 'Agora você… 5, 6, 7, 8…',
  fr: 'À toi… 5, 6, 7, 8…',
  zh: '现在你来… 5, 6, 7, 8…',
  hi: 'अब तुम… 5, 6, 7, 8…',
  ar: 'الآن أنت… 5, 6, 7, 8…',
  ru: 'Теперь ты… 5, 6, 7, 8…',
}[lang] || 'Ahora tú… 5, 6, 7, 8…');

const COMPLETE_MSGS = (name: string, lang: string) => ({
  es: `¡Increíble, ${name}! Completaste la clase. ¡Eres un crack! 🏆`,
  en: `Incredible, ${name}! Class complete. You're amazing! 🏆`,
  pt: `Incrível, ${name}! Aula completa. Você é incrível! 🏆`,
  fr: `Incroyable, ${name}! Cours terminé. Tu es fantastique! 🏆`,
  zh: `太厉害了，${name}！课程完成。你真棒！🏆`,
  hi: `शानदार, ${name}! कक्षा पूरी हुई। आप अद्भुत हैं! 🏆`,
  ar: `رائع، ${name}! اكتملت الفصل. أنت مذهل! 🏆`,
  ru: `Невероятно, ${name}! Класс завершён. Ты крутой! 🏆`,
}[lang] || `¡Increíble, ${name}! Completaste la clase. 🏆`);

export function useDanceGameLoop(opts: Options): GameState & {
  startStep: (idx: number) => void;
  startGame: () => void;
  stopGame: () => void;
} {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [attemptProgress, setAttemptProgress] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [landmarks, setLandmarks] = useState<PoseResult>(null);
  const [syncScore, setSyncScore] = useState<SyncScore | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [completed, setCompleted] = useState(false);
  const [poseLandmarkerReady, setPoseLandmarkerReady] = useState(false);

  // Scoring acumulado durante el intento
  const scoresRef = useRef<number[]>([]);
  const phaseRef = useRef<GamePhase>('idle');
  const stepIdxRef = useRef(0);
  const attemptCountRef = useRef(0);
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

  // Loop de detección de pose (RAF)
  const runPoseLoop = useCallback(() => {
    if (!runningRef.current) return;
    const video = opts.videoRef.current;
    if (video && opts.camOn && isPoseLandmarkerReady()) {
      const lm = detectPose(video);
      if (lm) {
        pushHistory(lm);
        setLandmarks(lm);
        if (phaseRef.current === 'attempt') {
          const focus = getBodyFocus(opts.genre);
          const beatActive = true; // simplificado; en v2 podemos sincronizar con el BPM exacto
          const movement = scoreMovementLevel(lm, focus, beatActive);
          const refA = opts.refAngles?.(stepIdxRef.current);
          const exact = refA ? scoreExactMatch(extractAngles(lm), refA) : null;
          const result = combinedScore(movement, exact);
          setSyncScore(result);
          scoresRef.current.push(result.score);
        }
      }
    }
    rafRef.current = requestAnimationFrame(runPoseLoop);
  }, [opts.videoRef, opts.camOn, opts.genre, opts.refAngles]);

  // Utilidad: hablar sin bloquear
  const say = useCallback((text: string) => {
    stopSpeaking();
    speak(text, { lang: opts.lang as any, female: false, rate: 1.0 });
  }, [opts.lang]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearHistory();
    scoresRef.current = [];
  }, []);

  // Tick de cuenta atrás de la fase
  const countdownTick = useCallback((secs: number, onDone: () => void) => {
    setCountdown(secs);
    const tick = (remaining: number) => {
      if (!runningRef.current) return;
      setCountdown(remaining);
      if (remaining <= 0) { onDone(); return; }
      timerRef.current = setTimeout(() => tick(remaining - 1), 1000);
    };
    timerRef.current = setTimeout(() => tick(secs - 1), 1000);
  }, []);

  // ── Phases ─────────────────────────────────────────────────────
  const runPass = useCallback((idx: number, avgScore: number) => {
    setPhase('pass');
    const isLast = idx >= opts.stepCount - 1;
    const pts = POINTS_PER_STEP + (isLast ? BONUS_COMPLETE : 0);
    setSessionScore(s => s + pts);
    opts.onStepPass(idx, pts, isLast);
    const res: StepResult = {
      stepName: opts.stepName(idx), score: avgScore,
      attempts: attemptCountRef.current + 1, passed: true,
    };
    setStepResults(r => [...r, res]);

    say(PASS_MSGS(opts.userName, opts.stepName(idx), opts.lang));

    timerRef.current = setTimeout(() => {
      if (!runningRef.current) return;
      if (isLast) {
        setCompleted(true);
        setPhase('idle');
        say(COMPLETE_MSGS(opts.userName, opts.lang));
        opts.onClassComplete(sessionScore + pts, [...stepResults, res]);
      } else {
        startStep(idx + 1);
      }
    }, 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, sessionScore, stepResults, say]);

  const runFail = useCallback((idx: number) => {
    setPhase('fail');
    say(FAIL_MSGS(opts.userName, opts.lang));
    timerRef.current = setTimeout(() => {
      if (!runningRef.current) return;
      setAttemptCount(c => c + 1);
      runAttempt(idx);
    }, 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, say]);

  const runAttempt = useCallback((idx: number) => {
    setPhase('attempt');
    scoresRef.current = [];
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
        // Juicio
        const scores = scoresRef.current;
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        if (avg >= 65) {
          runPass(idx, Math.round(avg));
        } else {
          runFail(idx);
        }
      }
    };
    timerRef.current = setTimeout(tick, 100);
  }, [attemptDuration, runPass, runFail]);

  const runPrepare = useCallback((idx: number) => {
    setPhase('prepare');
    say(PREPARE_MSGS(opts.lang));
    countdownTick(prepareDuration, () => runAttempt(idx));
  }, [opts.lang, prepareDuration, countdownTick, runAttempt, say]);

  const runDemo = useCallback((idx: number) => {
    setPhase('demo');
    setAttemptCount(0);
    clearHistory();
    scoresRef.current = [];
    const msg = DEMO_MSGS(opts.userName, opts.stepName(idx), opts.stepCountCue(idx), opts.lang);
    say(msg);
    countdownTick(demoDuration, () => runPrepare(idx));
  }, [opts, demoDuration, countdownTick, runPrepare, say]);

  const startStep = useCallback((idx: number) => {
    clear();
    setStepIdx(idx);
    stepIdxRef.current = idx;
    setSyncScore(null);
    setLandmarks(null);
    runDemo(idx);
  }, [clear, runDemo]);

  const startGame = useCallback(() => {
    runningRef.current = true;
    setCompleted(false);
    setSessionScore(0);
    setStepResults([]);
    rafRef.current = requestAnimationFrame(runPoseLoop);
    startStep(0);
  }, [runPoseLoop, startStep]);

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

  // Arrancar RAF cuando la cámara se enciende y el juego está corriendo
  useEffect(() => {
    if (opts.camOn && runningRef.current) {
      rafRef.current = requestAnimationFrame(runPoseLoop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [opts.camOn, runPoseLoop]);

  useEffect(() => () => { stopGame(); }, [stopGame]);

  return {
    phase, stepIdx, attemptCount, countdown, attemptProgress,
    sessionScore, landmarks, syncScore, stepResults, completed,
    poseLandmarkerReady,
    startStep, startGame, stopGame,
  };
}
