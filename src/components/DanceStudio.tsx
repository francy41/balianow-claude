/**
 * DanceStudio — Experiencia interactiva de baile REUTILIZABLE
 *
 * El mismo "estudio" que usa DanceFlow, empaquetado para incrustarse en
 * cualquier sección: clases/aula, directos, perfiles de bailarines, etc.
 *
 * Contiene:
 *   - Panel del profe (vídeo de lección grabada, stream en vivo, o avatar)
 *   - Cámara del usuario con sincronización de pose + esqueleto
 *   - Game loop estilo videojuego (vidas, combo, estrellas, XP, puntos)
 *   - Voz del profe (TTS multiidioma) + preguntas por voz (STT)
 *   - Móvil como webcam (para TV/PC sin cámara) vía Realtime
 *
 * "Ambos según el tipo":
 *   - Si recibe `liveStreamNode` → lo muestra en el panel del profe (directo real)
 *   - Si no → usa las lecciones grabadas (autoguiado)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, X, Mic, MicOff, Volume2, VolumeX, Loader2, RotateCcw, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import DanceSyncCamera from './DanceSyncCamera';
import GameHUD from './GameHUD';
import RemoteCameraPairing from './RemoteCameraPairing';
import { useDanceGameLoop } from '../hooks/useDanceGameLoop';
import { useRemoteCamera } from '../hooks/useRemoteCamera';
import { useDeviceType, textSizes, btnSizes } from '../lib/deviceDetect';
import { speak, stopSpeaking, createRecognizer, isRecognitionSupported, type Recognizer } from '../lib/speech';

export interface StudioLesson {
  id: string;
  genre?: string | null;
  sub_style?: string | null;
  level?: string | null;
  step_number: number;
  step_name: string;
  description?: string | null;
  count_cue?: string | null;
  video_url?: string | null;
}

interface Props {
  genre: string;
  level?: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  teacherEmoji?: string;
  gradient?: string;
  personality?: string;
  /** Lecciones grabadas. Si no se pasan y hay choreographerId, se cargan solas. */
  lessons?: StudioLesson[];
  choreographerId?: string;
  /** Stream en vivo (Jitsi/iframe/video) para el panel del profe — modo directo */
  liveStreamNode?: React.ReactNode;
  userId?: string;
  userName?: string;
  country?: string;
  onPoints?: (pts: number, genre: string) => void;
  onClose?: () => void;
  /** Si true (por defecto) ocupa toda la pantalla; si false, se incrusta */
  fullscreen?: boolean;
  /** Habilitar chat por voz con el profe IA (default true) */
  enableAI?: boolean;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const DanceStudio: React.FC<Props> = ({
  genre, level = 'principiante', teacherName, teacherAvatarUrl, teacherEmoji = '🕺',
  gradient = 'from-pink-500 to-fuchsia-600', personality = 'Profe motivador',
  lessons: lessonsProp, choreographerId, liveStreamNode,
  userId, userName = 'crack', country = 'ES', onPoints, onClose,
  fullscreen = true, enableAI = true,
}) => {
  const { lang } = useI18n();
  const device = useDeviceType();
  const ts = textSizes[device];
  const bs = btnSizes[device];
  const isTV = device === 'tv';
  const isMobile = device === 'mobile';

  const [started, setStarted] = useState(false);
  const [lessons, setLessons] = useState<StudioLesson[]>(lessonsProp || []);
  const [lessonIdx, setLessonIdx] = useState(0);

  // Voz / chat
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const recognizerRef = useRef<Recognizer | null>(null);
  const micSupported = isRecognitionSupported();

  // Cámara
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const [userCamOn, setUserCamOn] = useState(false);
  const [camSource, setCamSource] = useState<'local' | 'remote'>('local');
  const remoteCam = useRemoteCamera(camSource === 'remote');
  const remoteActive = camSource === 'remote';
  useEffect(() => { if (device === 'tv') setCamSource('remote'); }, [device]);

  // ── Cargar lecciones si no se pasaron ──
  useEffect(() => {
    if (lessonsProp && lessonsProp.length) { setLessons(lessonsProp); return; }
    (async () => {
      let q = supabase.from('dance_lessons').select('*').eq('active', true);
      if (choreographerId) q = q.eq('choreographer_id', choreographerId);
      else if (genre) q = q.ilike('genre', `%${genre}%`);
      const { data } = await q.order('step_number').limit(50);
      setLessons((data as StudioLesson[]) || []);
    })();
  }, [lessonsProp, choreographerId, genre]);

  const lessonList = lessons.filter(l =>
    (!l.level || l.level === level) &&
    (!genre || !l.genre || l.genre.toLowerCase().includes(genre.toLowerCase()))
  );
  const finalLessons = lessonList.length ? lessonList : lessons;
  const currentLesson = finalLessons[lessonIdx];
  const profeVideoUrl = currentLesson?.video_url || null;

  // ── Voz ──
  const speakReply = useCallback((text: string) => {
    if (!voiceOn) return;
    speak(text, {
      lang: lang as any,
      female: /a$|Valentina|Isabela|Sof|Elena|Carmen|Rosa|Valeria|Sara/.test(teacherName),
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, [voiceOn, lang, teacherName]);

  const voiceEnabledRef = useRef(voiceOn);
  useEffect(() => { voiceEnabledRef.current = voiceOn; }, [voiceOn]);

  useEffect(() => () => { stopSpeaking(); recognizerRef.current?.stop(); }, []);

  // ── Game loop ──
  const game = useDanceGameLoop({
    videoRef: userVideoRef,
    camOn: remoteActive ? remoteCam.connected : userCamOn,
    remote: remoteActive,
    remoteLandmarksRef: remoteCam.landmarksRef,
    genre,
    lang,
    userName,
    choreographerName: teacherName,
    stepCount: finalLessons.length || 1,
    stepName: (i) => finalLessons[i]?.step_name || `Paso ${i + 1}`,
    stepDescription: (i) => finalLessons[i]?.description || '',
    stepCountCue: (i) => finalLessons[i]?.count_cue || '',
    voiceEnabledRef,
    onStepPass: (idx, pts) => {
      onPoints?.(pts, genre);
      if (userId) {
        void supabase.rpc('dance_add_points', {
          p_user_id: userId, p_points: pts, p_genre: genre, p_country_code: country, p_level: level,
        });
      }
    },
    onClassComplete: () => {},
  });

  useEffect(() => {
    if (game.phase === 'demo' || game.phase === 'prepare') setLessonIdx(game.stepIdx);
  }, [game.stepIdx, game.phase]);

  const goToStep = (idx: number) => {
    if (idx < 0 || idx >= finalLessons.length) return;
    setLessonIdx(idx);
    const l = finalLessons[idx];
    if (!l) return;
    stopSpeaking();
    const cue = [`Paso ${l.step_number}: ${l.step_name}.`, l.count_cue ? `Cuenta: ${l.count_cue}.` : '', l.description || ''].filter(Boolean).join(' ');
    speakReply(cue);
  };

  // ── AI chat ──
  const sendToAI = useCallback(async (history: Msg[], isStart = false) => {
    if (!enableAI) { setSending(false); return; }
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/danceflow-chat`;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${session?.access_token || anon}` },
        body: JSON.stringify({ messages: history, choreographer: teacherName, personality, genre, lang, level, mode: 'class' }),
      });
      const json = await res.json();
      const reply = json.reply || `¡Vamos ${userName}! Sigamos bailando 🔥`;
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
      speakReply(reply);
    } catch {
      const fb = `¡Vamos ${userName}! Sigamos bailando 🔥`;
      setMessages(m => [...m, { role: 'assistant', content: fb }]);
      speakReply(fb);
    } finally { setSending(false); }
  }, [enableAI, teacherName, personality, genre, lang, level, userName, speakReply]);

  const send = useCallback((text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    void sendToAI(next);
  }, [input, sending, messages, sendToAI]);

  const toggleMic = useCallback(() => {
    if (listening) { recognizerRef.current?.stop(); setListening(false); return; }
    if (!micSupported) return;
    const rec = createRecognizer(lang as any, {
      onResult: (text) => { setListening(false); send(text); },
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (rec) { recognizerRef.current = rec; rec.start(); }
  }, [listening, micSupported, lang, send]);

  // ── Iniciar ──
  const startSession = () => {
    setStarted(true);
    setLessonIdx(0);
    if (finalLessons.length > 0) game.startGame();
    if (enableAI) { setSending(true); void sendToAI([], true); }
  };

  const endSession = () => {
    game.stopGame();
    stopSpeaking();
    setStarted(false);
    onClose?.();
  };

  const wrapCls = fullscreen
    ? (isTV ? 'fixed inset-0 z-[100] bg-[#060608] flex flex-col' : 'fixed inset-0 z-[100] bg-[#060608] flex flex-col')
    : 'relative w-full h-full bg-[#060608] flex flex-col rounded-2xl overflow-hidden';

  // ── SETUP ──
  if (!started) {
    return (
      <div className={wrapCls}>
        <div className={`relative bg-gradient-to-br ${gradient} text-white flex items-center gap-3 flex-shrink-0 ${isTV ? 'p-6' : 'p-4'}`}>
          {teacherAvatarUrl
            ? <img src={teacherAvatarUrl} alt={teacherName} className={`rounded-full object-cover border-2 border-white/40 ${isTV ? 'w-20 h-20' : 'w-12 h-12'}`} />
            : <span className={isTV ? 'text-6xl' : 'text-4xl'}>{teacherEmoji}</span>}
          <div className="flex-1 min-w-0">
            <h3 className={`font-black truncate ${isTV ? 'text-4xl' : 'text-lg'}`}>{teacherName}</h3>
            <p className={`text-white/80 truncate ${isTV ? 'text-xl' : 'text-xs'}`}>Práctica interactiva · {genre}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className={`hover:bg-white/20 rounded-xl flex items-center justify-center ${isTV ? 'w-16 h-16' : 'p-1.5'}`}>
              <X className={isTV ? 'w-10 h-10' : 'w-5 h-5'} />
            </button>
          )}
        </div>

        <div className={`overflow-y-auto flex-1 ${isTV ? 'p-12 space-y-8' : 'p-5 space-y-5'}`}>
          <div className="text-center">
            <p className={`text-white font-black ${isTV ? 'text-3xl' : 'text-xl'}`}>🕺 ¿List@ para bailar {genre}?</p>
            <p className={`text-white/50 mt-1 ${ts.small}`}>
              {finalLessons.length > 0 ? `${finalLessons.length} pasos preparados` : 'Práctica libre con sincronización en tiempo real'}
            </p>
          </div>

          {/* Fuente de cámara */}
          <div>
            <label className={`font-bold text-white/50 uppercase block mb-3 ${ts.small}`}>📷 ¿Qué cámara usar?</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCamSource('local')}
                className={`rounded-xl font-bold border transition-all flex flex-col items-center gap-1 ${isTV ? 'py-6 text-xl' : 'py-3 text-xs'} ${camSource === 'local' ? 'bg-pink-500 text-white border-pink-500' : 'border-white/20 text-white/70'}`}>
                <span className={isTV ? 'text-3xl' : 'text-xl'}>💻</span> Esta cámara / webcam
              </button>
              <button onClick={() => setCamSource('remote')}
                className={`rounded-xl font-bold border transition-all flex flex-col items-center gap-1 ${isTV ? 'py-6 text-xl' : 'py-3 text-xs'} ${camSource === 'remote' ? 'bg-pink-500 text-white border-pink-500' : 'border-white/20 text-white/70'}`}>
                <span className={isTV ? 'text-3xl' : 'text-xl'}>📱</span> Mi móvil como cámara
              </button>
            </div>
          </div>

          {remoteActive && (
            <div className="bg-[#0a0a18] border border-pink-500/20 rounded-2xl p-5">
              <RemoteCameraPairing code={remoteCam.code} camUrl={remoteCam.camUrl} connected={remoteCam.connected}
                device={isTV ? 'tv' : 'mobile'} onCancel={() => setCamSource('local')} />
            </div>
          )}

          <button onClick={startSession} disabled={remoteActive && !remoteCam.connected}
            className={`w-full flex items-center justify-center gap-3 font-black bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white hover:scale-[1.02] transition-transform disabled:opacity-40 ${bs}`}>
            <Play className={isTV ? 'w-10 h-10' : 'w-5 h-5'} />
            {remoteActive && !remoteCam.connected ? 'Conecta tu móvil para empezar' : 'Empezar a bailar'}
          </button>
        </div>
      </div>
    );
  }

  // ── ESTUDIO INTERACTIVO ──
  return (
    <div className={wrapCls}>
      {/* Header */}
      <div className={`relative bg-gradient-to-br ${gradient} text-white flex items-center gap-3 flex-shrink-0 ${isTV ? 'p-6' : 'p-3'}`}>
        {teacherAvatarUrl
          ? <img src={teacherAvatarUrl} alt={teacherName} className={`rounded-full object-cover border-2 border-white/40 ${isTV ? 'w-16 h-16' : 'w-10 h-10'}`} />
          : <span className={isTV ? 'text-5xl' : 'text-3xl'}>{teacherEmoji}</span>}
        <div className="flex-1 min-w-0">
          <h3 className={`font-black truncate ${isTV ? 'text-3xl' : 'text-base'}`}>{teacherName}</h3>
          <p className={`text-white/80 truncate ${isTV ? 'text-lg' : 'text-[11px]'}`}>{genre}</p>
        </div>
        {game.sessionScore > 0 && (
          <div className="text-right flex-shrink-0">
            <p className={`font-black leading-none ${isTV ? 'text-4xl' : 'text-xl'}`}>{game.sessionScore}</p>
            <p className={`opacity-80 ${isTV ? 'text-base' : 'text-[9px]'}`}>pts</p>
          </div>
        )}
        <button onClick={endSession} className={`hover:bg-white/20 rounded-xl flex items-center justify-center ${isTV ? 'w-14 h-14' : 'p-1.5'}`}>
          <X className={isTV ? 'w-8 h-8' : 'w-5 h-5'} />
        </button>
      </div>

      {/* Paneles */}
      <div className={`flex-1 grid gap-2 p-2 min-h-0 ${isTV ? 'grid-cols-[60%_40%]' : 'grid-cols-2'}`}>
        {/* PROFE */}
        <div className="flex flex-col gap-1 min-h-0">
          <p className={`font-bold text-white/70 px-1 flex items-center gap-2 flex-shrink-0 ${ts.small}`}>
            <span className="w-2 h-2 rounded-full bg-[#ff8c42]" /> EL PROFE
            {currentLesson && <span className="text-white/40 truncate">· {currentLesson.step_name}</span>}
          </p>
          <div className="relative rounded-2xl overflow-hidden bg-black flex-1 min-h-0">
            {liveStreamNode ? (
              liveStreamNode
            ) : profeVideoUrl ? (
              isYouTube(profeVideoUrl)
                ? <iframe key={profeVideoUrl} src={ytEmbed(profeVideoUrl)} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={teacherName} />
                : <video key={profeVideoUrl} src={profeVideoUrl} className="w-full h-full object-cover" autoPlay loop playsInline controls />
            ) : teacherAvatarUrl ? (
              <img src={teacherAvatarUrl} alt={teacherName} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className={`${speaking ? 'animate-bounce' : ''} ${isTV ? 'text-[12rem]' : 'text-7xl'}`}>{teacherEmoji}</span>
              </div>
            )}
            <span className={`absolute top-2 left-2 bg-black/70 text-white font-bold px-2.5 py-1 rounded-full z-10 ${isTV ? 'text-xl px-5 py-2' : 'text-[11px]'}`}>👨‍🏫 {teacherName}</span>
            {currentLesson?.count_cue && (
              <span className={`absolute bottom-2 right-2 bg-black/70 text-[#ff8c42] font-bold px-2 py-1 rounded-full z-10 ${isTV ? 'text-xl px-5 py-2' : 'text-[10px]'}`}>🎵 {currentLesson.count_cue}</span>
            )}
            {speaking && (
              <span className={`absolute bottom-2 left-2 flex items-center gap-1 bg-[#ff3e6c] text-white font-bold px-2 py-1 rounded-full animate-pulse z-10 ${isTV ? 'text-xl px-5 py-2' : 'text-[10px]'}`}>
                <Volume2 className={isTV ? 'w-6 h-6' : 'w-3 h-3'} /> Hablando
              </span>
            )}
          </div>
          {finalLessons.length > 0 && (
            <div className={`flex items-center gap-2 flex-shrink-0 ${isTV ? 'gap-4' : ''}`}>
              <button onClick={() => goToStep(lessonIdx - 1)} disabled={lessonIdx === 0}
                className={`bg-white/10 text-white font-bold rounded-xl disabled:opacity-30 ${isTV ? 'px-8 py-4 text-xl' : 'px-3 py-2 text-xs'}`}>← Anterior</button>
              <span className={`flex-1 text-center text-white/60 font-bold ${isTV ? 'text-2xl' : 'text-[11px]'}`}>Paso {lessonIdx + 1}/{finalLessons.length}</span>
              <button onClick={() => goToStep(lessonIdx + 1)} disabled={lessonIdx >= finalLessons.length - 1}
                className={`bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold rounded-xl disabled:opacity-30 ${isTV ? 'px-8 py-4 text-xl' : 'px-3 py-2 text-xs'}`}>Siguiente →</button>
            </div>
          )}
        </div>

        {/* TÚ */}
        <div className="flex flex-col gap-1 min-h-0">
          <p className={`font-bold text-white/70 px-1 flex items-center gap-2 flex-shrink-0 ${ts.small}`}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> TÚ — sigue los pasos
            {remoteActive && <span className={`text-pink-400 font-bold ${isTV ? 'text-base' : 'text-[9px]'}`}>📱 móvil</span>}
            {game.poseLandmarkerReady && <span className={`text-green-400 font-bold ${isTV ? 'text-base' : 'text-[9px]'}`}>● SYNC</span>}
          </p>
          <div className="flex-1 min-h-0 relative">
            <DanceSyncCamera
              phase={game.phase} countdown={game.countdown}
              attemptProgress={game.attemptProgress} syncScore={game.syncScore}
              landmarks={game.landmarks} label="🟢 TÚ"
              camOn={userCamOn} setCamOn={setUserCamOn}
              onCamReady={(video) => { (userVideoRef as any).current = video; }}
              device={device}
              remote={remoteActive} remoteConnected={remoteCam.connected} remoteFrame={remoteCam.frame}
            />
            <GameHUD
              phase={game.phase} lives={game.lives} combo={game.combo} comboMultiplier={game.comboMultiplier}
              stepStars={game.stepStars} totalStars={game.totalStars} sessionScore={game.sessionScore}
              stepIdx={game.stepIdx} stepCount={finalLessons.length || 1} syncScore={game.syncScore?.score ?? null}
              device={device} userName={userName} onRestart={() => game.resetGame()}
            />
          </div>
        </div>
      </div>

      {/* Controles de voz */}
      <div className={`bg-[#0e0e14] border-t border-white/10 flex-shrink-0 ${isTV ? 'p-6' : 'p-3'}`}>
        <div className={`flex items-center ${isTV ? 'gap-6' : 'gap-2'}`}>
          {(game.gameOver || game.completed) && (
            <button onClick={() => game.resetGame()}
              className={`flex items-center justify-center gap-2 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 ${isTV ? 'px-8 py-6 text-2xl rounded-3xl' : 'px-4 py-3 text-sm'}`}>
              <RotateCcw className={isTV ? 'w-8 h-8' : 'w-4 h-4'} /> {isMobile ? '' : 'Reiniciar'}
            </button>
          )}
          {enableAI && (
            <button onClick={toggleMic} disabled={sending}
              className={`flex-1 flex items-center justify-center gap-2 font-bold transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white hover:scale-[1.02]'} ${isTV ? 'py-6 rounded-3xl text-2xl gap-4' : 'py-3 rounded-2xl text-sm'}`}>
              {listening ? <><MicOff className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> Escuchando…</>
                : sending ? <><Loader2 className={`${isTV ? 'w-8 h-8' : 'w-5 h-5'} animate-spin`} /> El profe responde…</>
                : <><Mic className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> {isTV ? 'Pregúntale al profe' : 'Habla con el profe'}</>}
            </button>
          )}
          {!enableAI && (
            <div className={`flex-1 flex items-center justify-center gap-2 text-white/60 font-bold ${isTV ? 'text-2xl' : 'text-sm'}`}>
              <Zap className={isTV ? 'w-7 h-7 text-[#ff8c42]' : 'w-4 h-4 text-[#ff8c42]'} /> {game.sessionScore} pts
            </div>
          )}
          <button onClick={() => { setVoiceOn(v => { if (v) stopSpeaking(); return !v; }); }}
            className={`flex items-center justify-center rounded-2xl ${voiceOn ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'} ${isTV ? 'w-20 h-20 rounded-3xl' : 'w-12 h-12'}`}>
            {voiceOn ? <Volume2 className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> : <VolumeX className={isTV ? 'w-8 h-8' : 'w-5 h-5'} />}
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Helpers YouTube ──
function isYouTube(url: string): boolean { return /youtube\.com|youtu\.be/.test(url || ''); }
function ytEmbed(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const id = m?.[1] || '';
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=0&loop=1&playlist=${id}&controls=1`;
}

export default DanceStudio;
