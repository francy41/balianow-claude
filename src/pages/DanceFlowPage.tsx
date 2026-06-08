/**
 * DanceFlowPage — /baila-ia
 * Módulo de baile con avatares IA + ranking mundial
 *
 * Secciones:
 *  - Hero
 *  - Selector de coreógrafos (solo / pareja)
 *  - Modal de sesión con el coreógrafo (chat IA — vía edge function danceflow-chat)
 *  - Ranking mundial (WorldLeaderboard)
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, Star, X, Trophy, Globe, Play, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import { useUIStore } from '../store/appStore';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { countryFlag, COUNTRIES } from '../lib/countries';
import WorldLeaderboard from '../components/WorldLeaderboard';
import LanguageSelector from '../components/LanguageSelector';
import DanceSyncCamera from '../components/DanceSyncCamera';
import GameHUD from '../components/GameHUD';
import RemoteCameraPairing from '../components/RemoteCameraPairing';
import { useDanceGameLoop } from '../hooks/useDanceGameLoop';
import { useRemoteCamera } from '../hooks/useRemoteCamera';
import { useDeviceType, btnSizes, textSizes } from '../lib/deviceDetect';
import { speak, stopSpeaking, createRecognizer, isRecognitionSupported, type Recognizer } from '../lib/speech';
import { unlockAudio } from '../lib/gameAudio';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Maximize2, Minimize2, Scan } from 'lucide-react';

interface Choreographer {
  id: string; name: string; mode: string; age_range: string; specialty: string[];
  personality: string; avatar_emoji: string; avatar_url?: string | null; video_url?: string | null;
  gallery?: string[]; gradient: string; rating: number; review_count: number; bio: string;
}
interface Scenario {
  id: string; name: string; emoji: string; gradient: string; vibe: string; premium: boolean; bg_image_url?: string | null;
}
interface Lesson {
  id: string; choreographer_id: string; genre: string; sub_style?: string | null;
  level: string; step_number: number; step_name: string; description?: string | null;
  count_cue?: string | null; video_url: string; active: boolean;
}

const DanceFlowPage: React.FC = () => {
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuthStore();
  const addToast = useUIStore(s => s.addToast);
  usePageMeta({ title: t('df.title'), description: t('df.subtitle') });

  const [choreos, setChoreos] = useState<Choreographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<Choreographer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('dance_choreographers')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        if (error) console.warn('[danceflow] choreos', error);
        if (!cancelled) setChoreos((data as Choreographer[]) || []);
      } catch (e) {
        console.warn('[danceflow] choreos fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  const solo = choreos.filter(c => c.mode === 'solo');
  const pareja = choreos.filter(c => c.mode === 'pareja');

  const AvatarRow: React.FC<{ title: string; emoji: string; list: Choreographer[] }> = ({ title, emoji, list }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2 px-1">
        <span className="text-lg">{emoji}</span> {title}
        <span className="text-[10px] text-white/40 font-normal">({list.length})</span>
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
        {list.map(c => (
          <button key={c.id} onClick={() => setActiveSession(c)}
            className="group flex-shrink-0 w-32 sm:w-36 rounded-2xl overflow-hidden bg-[#0e0e14] border border-white/5 hover:border-[#ff3e6c]/50 hover:-translate-y-1 transition-all duration-300 text-left"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            <div className={`relative h-32 bg-gradient-to-br ${c.gradient} flex items-center justify-center overflow-hidden`}>
              {c.video_url
                ? <video src={c.video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                : c.avatar_url
                ? <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                : <span className="text-5xl drop-shadow-lg group-hover:scale-110 transition-transform">{c.avatar_emoji}</span>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white text-[10px] font-bold">{c.rating}</span>
              </div>
              {(c.avatar_url || c.video_url) && <span className="absolute top-2 left-2 text-[7px] bg-green-500 text-white px-1 rounded font-bold">REAL</span>}
              {/* Play overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-[#ff3e6c] flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>
            <div className="p-2.5">
              <p className="font-bold text-xs text-white truncate">{c.name}</p>
              <p className="text-[10px] text-white/40 truncate">{(c.specialty || []).slice(0, 2).join(' · ')}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060608] text-[#f0eeff] pb-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* HERO — clase virtual inmersiva */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0033] via-[#2d0052] to-[#060608]" />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 25% 15%, #ff3e6c 0%, transparent 45%), radial-gradient(circle at 75% 50%, #a855f7 0%, transparent 45%), radial-gradient(circle at 50% 90%, #ff8c42 0%, transparent 40%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-16">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold mb-4 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-[#ff3e6c]" /> ACADEMIA IA · BETA
              </div>
              <h1 className="font-display font-black text-4xl sm:text-6xl leading-[0.95] mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                <span className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] bg-clip-text text-transparent">DANCEFLOW</span>
              </h1>
              <p className="text-white/60 text-base sm:text-lg max-w-xl">{t('df.subtitle')}</p>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* AVATARES EN FILAS */}
        <section className="mt-6">
          <h2 className="font-display font-black text-xl text-white mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.5px' }}>
            {t('df.choose')}
          </h2>
          <p className="text-white/40 text-xs mb-5">Elige tu coreógrafo y prepárate para tu clase virtual 💃</p>

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin text-[#ff3e6c] mx-auto" /></div>
          ) : (
            <>
              <AvatarRow title={t('df.solo')} emoji="🕺" list={solo} />
              <AvatarRow title={t('df.pair')} emoji="💑" list={pareja} />
            </>
          )}
        </section>

        {/* RANKING DE USUARIOS (no avatares) */}
        <section className="mt-10">
          <div className="bg-[#0e0e14] border border-white/5 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-6 h-6 text-[#f5c542]" />
              <h2 className="font-display font-black text-xl text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.5px' }}>
                {t('df.topDancers')}
              </h2>
            </div>
            <p className="text-white/40 text-xs mb-5">Los bailarines que más avanzan en el mundo 🌍 — ¡compite y sube!</p>
            <WorldLeaderboard variant="full" />
          </div>
        </section>
      </div>

      {/* SESSION MODAL */}
      {activeSession && (
        <DanceSessionModal
          choreographer={activeSession}
          onClose={() => setActiveSession(null)}
          isAuthenticated={isAuthenticated}
          userId={user?.id}
          userName={user?.name}
          userCountry={(user as any)?.country}
          addToast={addToast}
        />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Modal de sesión de baile con chat IA
// ════════════════════════════════════════════════════════════════
interface Msg { role: 'user' | 'assistant'; content: string }

const DanceSessionModal: React.FC<{
  choreographer: Choreographer;
  onClose: () => void;
  isAuthenticated: boolean;
  userId?: string;
  userName?: string;
  userCountry?: string;
  addToast: (t: any) => void;
}> = ({ choreographer, onClose, isAuthenticated, userId, userName, userCountry, addToast }) => {
  const { t, lang } = useI18n();
  // Detección de dispositivo
  const device = useDeviceType();
  const ts = textSizes[device];
  const bs = btnSizes[device];
  const isTV = device === 'tv';
  const isMobile = device === 'mobile';

  const [genre, setGenre] = useState(choreographer.specialty?.[0] || 'Salsa');
  const [level, setLevel] = useState<'principiante' | 'intermedio' | 'avanzado'>('principiante');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [country, setCountry] = useState(userCountry && COUNTRIES.find(c => c.name === userCountry)?.code || 'ES');
  const [sessionPoints, setSessionPoints] = useState(0);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  // Lecciones (pasos con videos reales en secuencia)
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonIdx, setLessonIdx] = useState(0);
  // Voz
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceEnabledRef = useRef(true);           // ref para el game loop (sin re-renders)
  useEffect(() => { voiceEnabledRef.current = voiceOn; }, [voiceOn]);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<Recognizer | null>(null);
  const micSupported = isRecognitionSupported();
  // Cámara del usuario (para el game loop)
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const profeVideoElRef = useRef<HTMLVideoElement>(null); // vídeo del avatar (para referencia DTW)
  const [userCamOn, setUserCamOn] = useState(false);

  // ── Pantalla completa + ajuste de vídeo ──
  const rootRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen?.();
        setFit('contain'); // en pantalla completa, mostrar todo el cuerpo
      } else {
        await document.exitFullscreen?.();
      }
    } catch { /* algunos navegadores móviles lo limitan */ }
  };
  useEffect(() => {
    const onFs = () => setExpanded(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ── Fuente de cámara: este dispositivo o el móvil como webcam ──
  // En TV sugerimos el móvil por defecto; en el resto, la cámara local.
  const [camSource, setCamSource] = useState<'local' | 'remote'>('local');
  const remoteCam = useRemoteCamera(camSource === 'remote');
  const remoteActive = camSource === 'remote';
  // Pre-seleccionar móvil como cámara en Smart TV (no suele tener webcam)
  useEffect(() => { if (device === 'tv') setCamSource('remote'); }, [device]);

  // Cargar escenarios
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('dance_scenarios').select('*').eq('active', true).order('display_order');
      const list = (data as Scenario[]) || [];
      setScenarios(list);
      if (list.length) setScenario(list[0]);
    })();
  }, []);

  // Cargar lecciones (pasos) de este bailarín
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('dance_lessons').select('*')
        .eq('choreographer_id', choreographer.id).eq('active', true)
        .order('step_number');
      setLessons((data as Lesson[]) || []);
    })();
  }, [choreographer.id]);

  // Pasos del nivel/género elegido (si no hay, usamos todos)
  const activeLessons = lessons.filter(l =>
    (!l.level || l.level === level) &&
    (!genre || !l.genre || l.genre.toLowerCase() === genre.toLowerCase())
  );
  const lessonList = activeLessons.length ? activeLessons : lessons;
  const currentLesson: Lesson | undefined = lessonList[lessonIdx];
  // Video que se muestra en el panel del profe (paso actual > video del avatar)
  const profeVideoUrl = currentLesson?.video_url || choreographer.video_url || null;

  // Limpiar voz al cerrar
  useEffect(() => () => { stopSpeaking(); recognizerRef.current?.stop(); }, []);

  // El avatar HABLA una respuesta
  const speakReply = (text: string) => {
    if (!voiceOn) return;
    speak(text, {
      lang: lang as any,
      female: choreographer.name.match(/Valentina|Isabela|Sof|Luc|Amara|Elena|Carmen|Pilar|Rosa|Nadia|Valeria|Sara|Fatima|Aisha/) ? true : false,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  };

  // ── GAME LOOP DE SINCRONIZACIÓN ───────────────────────────────
  const game = useDanceGameLoop({
    videoRef: userVideoRef,
    camOn: remoteActive ? remoteCam.connected : userCamOn,
    remote: remoteActive,
    remoteLandmarksRef: remoteCam.landmarksRef,
    profeVideoRef: profeVideoElRef,
    genre,
    lang,
    userName: userName || 'crack',
    choreographerName: choreographer.name,
    stepCount: lessonList.length || 1,
    stepName: (i) => lessonList[i]?.step_name || `Paso ${i + 1}`,
    stepDescription: (i) => lessonList[i]?.description || '',
    stepCountCue: (i) => lessonList[i]?.count_cue || '',
    voiceEnabledRef,                                // ✅ FIX: conecta voiceOn al game loop
    onStepPass: (idx, pts) => {
      setSessionPoints(p => p + pts);
      if (userId) {
        void supabase.rpc('dance_add_points', {
          p_user_id: userId, p_points: pts, p_genre: genre,
          p_country_code: country, p_level: level,
        });
      }
    },
    onClassComplete: (total, results) => {
      addToast({ type: 'success', message: `🏆 ¡Clase completa! +${total} puntos` });
    },
    onGameOver: (score) => {
      addToast({ type: 'error', message: `💀 Game Over — ${score} puntos acumulados` });
    },
  });

  // Sincronizar el paso actual del game loop con el video del profe
  useEffect(() => {
    if (game.phase === 'demo' || game.phase === 'prepare') {
      setLessonIdx(game.stepIdx);
    }
  }, [game.stepIdx, game.phase]);

  // Cambiar de paso: el profe lo anuncia por voz y reproduce el video del paso
  const goToStep = (idx: number) => {
    if (idx < 0 || idx >= lessonList.length) return;
    setLessonIdx(idx);
    const l = lessonList[idx];
    if (!l) return;
    stopSpeaking();
    const cue = [
      `Paso ${l.step_number}: ${l.step_name}.`,
      l.count_cue ? `Cuenta: ${l.count_cue}.` : '',
      l.description || '',
    ].filter(Boolean).join(' ');
    speakReply(cue);
  };

  const startSession = async () => {
    if (!isAuthenticated) { addToast({ type: 'warning', message: t('df.loginToCompete') }); return; }
    // ✅ Desbloquear AudioContext Y pre-calentar speechSynthesis ANTES de cualquier async
    unlockAudio();
    if ('speechSynthesis' in window) {
      const warm = new SpeechSynthesisUtterance('');
      warm.volume = 0;
      speechSynthesis.speak(warm);
    }
    setStarted(true);
    setLessonIdx(0);
    // Arrancar el game loop si hay lecciones (pasos reales)
    if (lessonList.length > 0) {
      game.startGame();
    }
    setSending(true);
    await sendToAI([], true);
  };

  const sendToAI = async (history: Msg[], isStart = false) => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/danceflow-chat`;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${session?.access_token || anon}` },
        body: JSON.stringify({
          messages: history,
          choreographer: choreographer.name,
          personality: choreographer.personality,
          genre, lang,
          level,
          mode: 'solo',
          scenario: scenario?.name || '',
          userName: userName || 'amigo',
          isStart,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Fallback si la edge function no está configurada aún
        const fallback = isStart
          ? `¡Hola ${userName || 'crack'}! Soy ${choreographer.name} 💃 ¿List@ para bailar ${genre}? Empecemos con un calentamiento suave... ¿cómo te sientes hoy?`
          : 'Buenísimo, sigue así. (⚠ Configura ANTHROPIC_API_KEY en Supabase para respuestas IA completas)';
        setMessages(m => [...m, { role: 'assistant', content: fallback }]);
        speakReply(fallback);
        setSending(false);
        return;
      }
      setMessages(m => [...m, { role: 'assistant', content: json.reply }]);
      speakReply(json.reply);           // 🔊 el avatar habla la respuesta
      setSessionPoints(p => p + 25);
    } catch (e: any) {
      const fb = `¡Vamos ${userName || 'crack'}! Sigamos bailando 🔥`;
      setMessages(m => [...m, { role: 'assistant', content: fb }]);
      speakReply(fb);
    } finally {
      setSending(false);
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    stopSpeaking();
    const userMsg: Msg = { role: 'user', content };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setSending(true);
    await sendToAI(newHistory);
  };

  // 🎤 El usuario habla por micrófono → pregunta al profe
  const toggleMic = () => {
    if (listening) { recognizerRef.current?.stop(); setListening(false); return; }
    stopSpeaking();
    const rec = createRecognizer(lang as any, {
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
      onResult: (text) => { setListening(false); send(text); },
    });
    if (!rec) { addToast({ type: 'warning', message: 'Tu navegador no soporta micrófono de voz. Usa el teclado.' }); return; }
    recognizerRef.current = rec;
    rec.start();
  };

  const endSession = async () => {
    stopSpeaking();
    recognizerRef.current?.stop();
    if (userId && sessionPoints > 0) {
      const cc = country;
      const cn = COUNTRIES.find(c => c.code === cc)?.name || 'España';
      try {
        await supabase.rpc('dance_add_points', {
          p_user_id: userId, p_points: sessionPoints, p_genre: genre,
          p_name: userName, p_country_code: cc, p_country_name: cn,
        });
        addToast({ type: 'success', message: `+${sessionPoints} ${t('df.points')} 🏆` });
      } catch (e) { console.warn('add points', e); }
    }
    onClose();
  };

  // ── Layout adaptado a dispositivo ──────────────────────────────
  // TV: fullscreen, texto enorme, botones grandes navegables con mando
  // Desktop: modal grande 55/45 sin scroll
  // Tablet: modal, lado a lado 50/50
  // Mobile: fullscreen, stack vertical

  const fullView = isTV || expanded;
  const wrapCls = fullView
    ? 'fixed inset-0 z-[100] bg-[#060608] flex flex-col'
    : 'fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4';

  const innerCls = fullView
    ? 'flex-1 flex flex-col w-full h-full overflow-hidden bg-[#060608]'
    : `bg-white dark:bg-[#0e0e14] w-full ${started ? 'sm:max-w-5xl' : 'sm:max-w-lg'} rounded-t-3xl sm:rounded-3xl max-h-[96vh] flex flex-col overflow-hidden transition-all`;

  return (
    <div className={wrapCls}>
      <div ref={rootRef} className={innerCls}>

        {/* ── HEADER ── */}
        <div className={`relative bg-gradient-to-br ${choreographer.gradient} text-white flex items-center gap-3 flex-shrink-0 ${isTV ? 'p-6' : 'p-4'}`}>
          {choreographer.avatar_url
            ? <img src={choreographer.avatar_url} alt={choreographer.name} className={`rounded-full object-cover border-2 border-white/40 ${isTV ? 'w-20 h-20' : 'w-12 h-12'}`} />
            : <span className={isTV ? 'text-6xl' : 'text-4xl'}>{choreographer.avatar_emoji}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-black truncate ${isTV ? 'text-4xl' : 'text-lg'}`}>{choreographer.name}</h3>
              {started && (
                <span className={`flex items-center gap-1 bg-green-500 rounded-full flex-shrink-0 ${isTV ? 'text-base px-4 py-1' : 'text-[10px] px-2 py-0.5'}`}>
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> {t('df.live')}
                </span>
              )}
            </div>
            <p className={`text-white/80 truncate ${isTV ? 'text-xl' : 'text-xs'}`}>{choreographer.personality}</p>
          </div>
          {!isTV && <LanguageSelector compact />}
          {started && game.lives > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-sm transition-all ${i < game.lives ? '' : 'opacity-20'}`}>
                  {i < game.lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          )}
          {/* Ajuste de vídeo (recortar / ver completo) */}
          {started && (
            <button
              onClick={() => setFit(f => f === 'cover' ? 'contain' : 'cover')}
              title={fit === 'cover' ? 'Ver completo (sin recortar)' : 'Rellenar pantalla'}
              className={`hover:bg-white/20 rounded-xl flex-shrink-0 flex items-center justify-center focus:ring-2 focus:ring-white focus:outline-none ${isTV ? 'w-14 h-14' : 'p-1.5'} ${fit === 'contain' ? 'bg-white/20' : ''}`}
            >
              <Scan className={isTV ? 'w-8 h-8' : 'w-5 h-5'} />
            </button>
          )}
          {/* Pantalla completa */}
          {started && (
            <button
              onClick={toggleFullscreen}
              title={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className={`hover:bg-white/20 rounded-xl flex-shrink-0 flex items-center justify-center focus:ring-2 focus:ring-white focus:outline-none ${isTV ? 'w-14 h-14' : 'p-1.5'}`}
            >
              {expanded ? <Minimize2 className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> : <Maximize2 className={isTV ? 'w-8 h-8' : 'w-5 h-5'} />}
            </button>
          )}
          <button
            onClick={started ? endSession : onClose}
            className={`hover:bg-white/20 rounded-xl flex-shrink-0 flex items-center justify-center focus:ring-2 focus:ring-white focus:outline-none ${isTV ? 'w-16 h-16' : 'p-1.5'}`}
          >
            <X className={isTV ? 'w-10 h-10' : 'w-5 h-5'} />
          </button>
        </div>

        {/* ── SETUP (antes de iniciar) ── */}
        {!started ? (
          <div className={`overflow-y-auto ${isTV ? 'flex-1 p-12 space-y-10' : 'p-5 space-y-4'}`}>

            {/* Género */}
            <div>
              <label className={`font-bold text-gray-500 uppercase block mb-3 ${ts.small}`}>{t('df.specialty')}</label>
              <div className="flex flex-wrap gap-3">
                {(choreographer.specialty || []).map(s => (
                  <button key={s} onClick={() => setGenre(s)}
                    className={`rounded-full font-bold border transition-all focus:ring-2 focus:ring-pink-500 focus:outline-none ${isTV ? 'px-8 py-4 text-2xl' : 'px-3 py-1.5 text-xs'} ${genre === s ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel */}
            <div>
              <label className={`font-bold text-gray-500 uppercase block mb-3 ${ts.small}`}>📊 Tu nivel</label>
              <div className="flex gap-3">
                {(['principiante', 'intermedio', 'avanzado'] as const).map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`flex-1 rounded-xl font-bold border capitalize transition-all focus:ring-2 focus:ring-pink-500 focus:outline-none ${isTV ? 'py-6 text-2xl' : 'px-3 py-2 text-xs'} ${level === l ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Escenario */}
            <div>
              <label className={`font-bold text-gray-500 uppercase block mb-3 ${ts.small}`}>🪩 Pista de baile</label>
              <div className={`grid gap-3 ${isTV ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'}`}>
                {scenarios.map(s => (
                  <button key={s.id} onClick={() => setScenario(s)}
                    className={`relative rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all focus:ring-2 focus:ring-pink-500 focus:outline-none ${isTV ? 'h-32' : 'h-16'} ${scenario?.id === s.id ? 'ring-2 ring-pink-500 scale-105' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundImage: `linear-gradient(${s.gradient})` }}>
                    <span className={isTV ? 'text-5xl' : 'text-2xl'}>{s.emoji}</span>
                    <span className={`text-white font-bold text-center px-1 leading-tight drop-shadow ${isTV ? 'text-lg' : 'text-[8px]'}`}>{s.name}</span>
                    {s.premium && <span className={`absolute top-1 right-1 bg-yellow-400 text-yellow-900 px-1 rounded font-bold ${isTV ? 'text-sm' : 'text-[7px]'}`}>PRO</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuente de cámara */}
            <div>
              <label className={`font-bold text-gray-500 uppercase block mb-3 ${ts.small}`}>📷 ¿Qué cámara usar?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCamSource('local')}
                  className={`rounded-xl font-bold border transition-all focus:ring-2 focus:ring-pink-500 focus:outline-none flex flex-col items-center gap-1 ${isTV ? 'py-6 text-xl' : 'py-3 text-xs'} ${camSource === 'local' ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  <span className={isTV ? 'text-3xl' : 'text-xl'}>💻</span>
                  Esta cámara / webcam
                </button>
                <button
                  onClick={() => setCamSource('remote')}
                  className={`rounded-xl font-bold border transition-all focus:ring-2 focus:ring-pink-500 focus:outline-none flex flex-col items-center gap-1 ${isTV ? 'py-6 text-xl' : 'py-3 text-xs'} ${camSource === 'remote' ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  <span className={isTV ? 'text-3xl' : 'text-xl'}>📱</span>
                  Mi móvil como cámara
                </button>
              </div>
            </div>

            {/* Emparejamiento del móvil (si se eligió esa fuente) */}
            {remoteActive && (
              <div className="bg-[#0a0a18] border border-pink-500/20 rounded-2xl p-5">
                <RemoteCameraPairing
                  code={remoteCam.code}
                  camUrl={remoteCam.camUrl}
                  connected={remoteCam.connected}
                  device={isTV ? 'tv' : 'mobile'}
                  onCancel={() => setCamSource('local')}
                />
              </div>
            )}

            {/* País */}
            {!isTV && (
              <div>
                <label className={`font-bold text-gray-500 uppercase block mb-2 ${ts.small}`}>🏳️ {t('df.yourRank')} — País</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className="input-field">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>)}
                </select>
              </div>
            )}

            {/* Botón iniciar */}
            <button
              onClick={startSession}
              disabled={!scenario || (remoteActive && !remoteCam.connected)}
              className={`w-full flex items-center justify-center gap-3 font-black bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-40 focus:ring-4 focus:ring-white focus:outline-none ${bs}`}
            >
              <Play className={isTV ? 'w-10 h-10' : 'w-5 h-5'} />
              {remoteActive && !remoteCam.connected ? 'Conecta tu móvil para empezar' : t('df.start')}
            </button>
            {!isAuthenticated && (
              <p className={`text-center text-orange-500 ${ts.small}`}>{t('df.loginToCompete')}</p>
            )}
          </div>

        ) : (
          /* ── CLASE VIRTUAL ── */
          <div className="flex-1 overflow-hidden bg-[#060608] flex flex-col">

            {/* Paneles profe + cámara — SIEMPRE ambos visibles (lado a lado) */}
            <div className={`flex-1 grid gap-2 p-2 min-h-0 ${
              isTV ? 'grid-cols-[60%_40%]' : 'grid-cols-2'
            }`}>

              {/* ── PROFE ── */}
              <div className="flex flex-col gap-1 min-h-0">
                <p className={`font-bold text-white/70 px-1 flex items-center gap-2 flex-shrink-0 ${ts.small}`}>
                  <span className="w-2 h-2 rounded-full bg-[#ff8c42]" /> EL PROFE
                  {currentLesson && <span className="text-white/40 truncate">· {currentLesson.step_name}</span>}
                </p>
                <div className="relative rounded-2xl overflow-hidden bg-black flex-1 min-h-0">
                  {profeVideoUrl ? (
                    isYouTube(profeVideoUrl) ? (
                      <iframe key={profeVideoUrl} src={ytEmbed(profeVideoUrl)}
                        className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={choreographer.name} />
                    ) : (
                      <video ref={profeVideoElRef} key={profeVideoUrl} src={profeVideoUrl} className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} autoPlay loop playsInline controls crossOrigin="anonymous" />
                    )
                  ) : choreographer.avatar_url ? (
                    <img src={choreographer.avatar_url} alt={choreographer.name} className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${choreographer.gradient} flex items-center justify-center`}>
                      <span className={`${speaking ? 'animate-bounce' : ''} ${isTV ? 'text-[12rem]' : 'text-7xl'}`}>{choreographer.avatar_emoji}</span>
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 bg-black/70 text-white font-bold px-2.5 py-1 rounded-full z-10 ${isTV ? 'text-xl px-5 py-2' : 'text-[11px]'}`}>
                    👨‍🏫 {choreographer.name}
                  </span>
                  {currentLesson?.count_cue && (
                    <span className={`absolute bottom-2 right-2 bg-black/70 text-[#ff8c42] font-bold px-2 py-1 rounded-full z-10 ${isTV ? 'text-xl px-5 py-2' : 'text-[10px]'}`}>
                      🎵 {currentLesson.count_cue}
                    </span>
                  )}
                  {speaking && (
                    <span className={`absolute bottom-2 left-2 flex items-center gap-1 bg-[#ff3e6c] text-white font-bold px-2 py-1 rounded-full animate-pulse z-10 ${isTV ? 'text-xl px-5 py-2' : 'text-[10px]'}`}>
                      <Volume2 className={isTV ? 'w-6 h-6' : 'w-3 h-3'} /> Hablando
                    </span>
                  )}
                </div>
                {/* Navegación de pasos */}
                {lessonList.length > 0 && (
                  <div className={`flex items-center gap-2 flex-shrink-0 ${isTV ? 'gap-4' : ''}`}>
                    <button onClick={() => goToStep(lessonIdx - 1)} disabled={lessonIdx === 0}
                      className={`bg-white/10 text-white font-bold rounded-xl disabled:opacity-30 focus:ring-2 focus:ring-white focus:outline-none ${isTV ? 'px-8 py-4 text-xl' : 'px-3 py-2 text-xs'}`}>
                      ← Anterior
                    </button>
                    <span className={`flex-1 text-center text-white/60 font-bold ${isTV ? 'text-2xl' : 'text-[11px]'}`}>
                      Paso {lessonIdx + 1}/{lessonList.length}
                    </span>
                    <button onClick={() => goToStep(lessonIdx + 1)} disabled={lessonIdx >= lessonList.length - 1}
                      className={`bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold rounded-xl disabled:opacity-30 focus:ring-2 focus:ring-white focus:outline-none ${isTV ? 'px-8 py-4 text-xl' : 'px-3 py-2 text-xs'}`}>
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>

              {/* ── TÚ — cámara con sync + GameHUD ── */}
              {scenario && (
                <div className="flex flex-col gap-1 min-h-0">
                  <p className={`font-bold text-white/70 px-1 flex items-center gap-2 flex-shrink-0 ${ts.small}`}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> TÚ — sigue los pasos
                    {remoteActive && <span className={`text-pink-400 font-bold ${isTV ? 'text-base' : 'text-[9px]'}`}>📱 móvil</span>}
                    {game.poseLandmarkerReady && (
                      <span className={`text-green-400 font-bold ${isTV ? 'text-base' : 'text-[9px]'}`}>● SYNC</span>
                    )}
                  </p>
                  {/* Contenedor relativo para cámara + HUD encima */}
                  <div className="flex-1 min-h-0 relative">
                    <DanceSyncCamera
                      phase={game.phase} countdown={game.countdown}
                      attemptProgress={game.attemptProgress} syncScore={game.syncScore}
                      landmarks={game.landmarks} label="🟢 TÚ"
                      camOn={userCamOn} setCamOn={setUserCamOn}
                      onCamReady={(video) => { (userVideoRef as any).current = video; }}
                      device={device}
                      objectFit={fit}
                      remote={remoteActive}
                      remoteConnected={remoteCam.connected}
                      remoteFrame={remoteCam.frame}
                    />
                    {/* 🎮 HUD superpuesto sobre la cámara */}
                    <GameHUD
                      phase={game.phase}
                      lives={game.lives}
                      combo={game.combo}
                      comboMultiplier={game.comboMultiplier}
                      stepStars={game.stepStars}
                      totalStars={game.totalStars}
                      sessionScore={game.sessionScore}
                      stepIdx={game.stepIdx}
                      stepCount={lessonList.length || 1}
                      syncScore={game.syncScore?.score ?? null}
                      liveMatch={game.liveMatch}
                      device={device}
                      userName={userName}
                      onRestart={() => game.resetGame()}
                    />
                  </div>
                  {/* Intento actual (subtítulo pequeño) */}
                  {game.attemptCount > 0 && (
                    <p className={`text-center text-white/50 flex-shrink-0 ${isTV ? 'text-lg' : 'text-[10px]'}`}>
                      Intento {game.attemptCount + 1}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── CONTROLES DE VOZ ── */}
            <div className={`bg-[#0e0e14] border-t border-white/10 flex-shrink-0 ${isTV ? 'p-6' : 'p-3'}`}>
              <div className={`flex items-center ${isTV ? 'gap-6' : 'gap-2'}`}>
                {/* Reiniciar juego */}
                {(game.gameOver || game.completed) && (
                  <button
                    onClick={() => game.resetGame()}
                    className={`flex items-center justify-center gap-2 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 focus:ring-2 focus:ring-white focus:outline-none transition-all ${isTV ? 'px-8 py-6 text-2xl rounded-3xl' : 'px-4 py-3 text-sm'}`}
                  >
                    <RotateCcw className={isTV ? 'w-8 h-8' : 'w-4 h-4'} /> {isMobile ? '' : 'Reiniciar'}
                  </button>
                )}
                <button
                  onClick={toggleMic} disabled={sending}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold transition-all focus:ring-2 focus:ring-white focus:outline-none ${
                    listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white hover:scale-[1.02]'
                  } ${isTV ? 'py-6 rounded-3xl text-2xl gap-4' : 'py-3 rounded-2xl text-sm'}`}
                >
                  {listening
                    ? <><MicOff className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> Escuchando…</>
                    : sending
                    ? <><Loader2 className={`${isTV ? 'w-8 h-8' : 'w-5 h-5'} animate-spin`} /> El profe responde…</>
                    : <><Mic className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> {isTV ? 'Pregúntale al profe' : 'Habla con el profe'}</>}
                </button>
                <button
                  onClick={() => { setVoiceOn(v => { if (v) stopSpeaking(); return !v; }); }}
                  className={`flex items-center justify-center rounded-2xl focus:ring-2 focus:ring-white focus:outline-none ${voiceOn ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'} ${isTV ? 'w-20 h-20 rounded-3xl' : 'w-12 h-12'}`}
                  title={voiceOn ? 'Silenciar voz del profe' : 'Activar voz del profe'}
                >
                  {voiceOn ? <Volume2 className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> : <VolumeX className={isTV ? 'w-8 h-8' : 'w-5 h-5'} />}
                </button>
              </div>

              {!micSupported && (
                <p className="text-[10px] text-white/40 text-center mt-1.5">
                  Para hablar con el profe usa Chrome o Edge.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers YouTube (para videos de clase) ──────────────────────
function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url || '');
}
function ytEmbed(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const id = m?.[1] || '';
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=0&loop=1&playlist=${id}&controls=1`;
}

export default DanceFlowPage;
