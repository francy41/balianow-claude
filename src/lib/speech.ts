/**
 * speech — motor de voz para DanceFlow (Web Speech API, sin dependencias)
 *
 *  - speak(text, lang): el avatar HABLA en voz alta (TTS / speechSynthesis)
 *  - listen(lang): el usuario HABLA, devuelve el texto (STT / SpeechRecognition)
 *
 * Gratis, nativo del navegador, multi-idioma. Funciona en Chrome/Edge/Safari.
 */

type LangCode = 'es' | 'en' | 'pt' | 'fr' | 'zh' | 'hi' | 'ar' | 'ru';

const BCP47: Record<LangCode, string> = {
  es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR',
  zh: 'zh-CN', hi: 'hi-IN', ar: 'ar-SA', ru: 'ru-RU',
};

// ── TEXT-TO-SPEECH (el avatar habla) ──────────────────────────
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const v = speechSynthesis.getVoices();
    if (v.length) { cachedVoices = v; resolve(v); return; }
    speechSynthesis.onvoiceschanged = () => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    // fallback timeout
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: LangCode, preferFemale = true): SpeechSynthesisVoice | null {
  const bcp = BCP47[lang];
  const prefix = bcp.split('-')[0];
  // Coincidencia exacta primero, luego por prefijo de idioma
  const matches = voices.filter(v => v.lang === bcp || v.lang.startsWith(prefix));
  if (!matches.length) return null;
  // Preferir voz femenina (los nombres varían por OS)
  if (preferFemale) {
    const female = matches.find(v => /female|mujer|mónica|monica|paulina|helena|google.*español|samantha|female/i.test(v.name));
    if (female) return female;
  }
  return matches[0];
}

export interface SpeakOptions {
  lang?: LangCode;
  female?: boolean;
  rate?: number;     // velocidad 0.1-10 (1 normal)
  pitch?: number;    // tono 0-2 (1 normal)
  onEnd?: () => void;
  onStart?: () => void;
}

export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const { lang = 'es', female = true, rate = 1.02, pitch = 1.05, onEnd, onStart } = opts;

  // Cancelar lo anterior
  speechSynthesis.cancel();

  const voices = cachedVoices.length ? cachedVoices : await loadVoices();
  const voice = pickVoice(voices, lang, female);

  // Limpiar emojis del texto para que no los pronuncie raro
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
  if (!clean) { onEnd?.(); return; }

  const utter = new SpeechSynthesisUtterance(clean);
  if (voice) utter.voice = voice;
  utter.lang = BCP47[lang];
  utter.rate = rate;
  utter.pitch = pitch;
  if (onStart) utter.onstart = onStart;
  if (onEnd) utter.onend = onEnd;
  utter.onerror = () => onEnd?.();

  speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ── SPEECH-TO-TEXT (el usuario habla) ──────────────────────────
export function isRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
}

/**
 * Crea un reconocedor de voz. Devuelve null si el navegador no lo soporta.
 * onResult se llama con el texto final reconocido.
 */
export function createRecognizer(
  lang: LangCode,
  handlers: { onResult: (text: string) => void; onStart?: () => void; onEnd?: () => void; onError?: (e: string) => void }
): Recognizer | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = BCP47[lang];
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => handlers.onStart?.();
  rec.onend = () => handlers.onEnd?.();
  rec.onerror = (e: any) => handlers.onError?.(e?.error || 'error');
  rec.onresult = (e: any) => {
    const text = e.results?.[0]?.[0]?.transcript || '';
    if (text) handlers.onResult(text);
  };

  return {
    start: () => { try { rec.start(); } catch { /* already started */ } },
    stop: () => { try { rec.stop(); } catch { /* noop */ } },
  };
}
