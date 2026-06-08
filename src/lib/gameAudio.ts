/**
 * gameAudio — Efectos de sonido para el modo videojuego de DanceFlow
 * Web Audio API puro — sin dependencias externas
 */

let _ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Reanudar si el navegador lo suspendió (política de autoplay)
  if (_ctx.state === 'suspended') void _ctx.resume();
  return _ctx;
}

/** Tono sintético básico */
function tone(
  freq: number,
  duration: number,
  gain = 0.28,
  type: OscillatorType = 'sine',
  delay = 0,
) {
  try {
    const ctx = ac();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(gain, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.02);
  } catch { /* AudioContext no disponible en SSR o modo test */ }
}

// ── EFECTOS ─────────────────────────────────────────────────────

/** ✅ Paso superado — acorde mayor ascendente */
export function playPassSound() {
  tone(523, 0.12, 0.30, 'sine');          // C5
  tone(659, 0.12, 0.30, 'sine', 0.12);   // E5
  tone(784, 0.22, 0.32, 'sine', 0.24);   // G5
  tone(1046, 0.18, 0.25, 'sine', 0.38);  // C6
}

/** ❌ Fallo — descenso disonante */
export function playFailSound() {
  tone(440, 0.14, 0.30, 'sawtooth');
  tone(392, 0.14, 0.28, 'sawtooth', 0.15);
  tone(330, 0.30, 0.25, 'sawtooth', 0.30);
}

/** 🔥 Combo alcanzado — acorde vibrante proporcional al combo */
export function playComboSound(combo: number) {
  const base = 440 + combo * 80;
  tone(base, 0.08, 0.38, 'triangle');
  tone(base * 1.26, 0.12, 0.32, 'triangle', 0.09);
  tone(base * 1.5, 0.15, 0.28, 'triangle', 0.18);
}

/** 💀 Game Over — melodía dramática descendente */
export function playGameOver() {
  [392, 370, 330, 294, 262, 247, 220].forEach((f, i) =>
    tone(f, 0.28, 0.35, 'sawtooth', i * 0.22),
  );
}

/** 🏆 Clase completa — fanfarria */
export function playLevelUp() {
  [523, 587, 659, 698, 784, 880, 1046].forEach((f, i) =>
    tone(f, 0.14, 0.38, 'sine', i * 0.09),
  );
}

/** ⏱️ Cuenta atrás — beep metronómico */
export function playCountdown(n: number) {
  tone(n === 0 ? 880 : 440, 0.12, 0.4, 'square');
}

/** ❤️ Vida perdida — crujido */
export function playHeartLost() {
  tone(260, 0.18, 0.5, 'sawtooth');
  tone(180, 0.35, 0.3, 'sawtooth', 0.20);
}

/** 🎵 Inicio de demo — tono suave de alerta */
export function playDemoStart() {
  tone(660, 0.10, 0.20, 'sine');
  tone(880, 0.15, 0.20, 'sine', 0.12);
}

/** Desbloquea AudioContext en el primer gesto del usuario */
export function unlockAudio() {
  try { ac(); } catch { /* noop */ }
}
