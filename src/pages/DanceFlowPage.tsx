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
import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Loader2, Star, X, Send, Trophy, Globe, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import { useUIStore } from '../store/appStore';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { countryFlag, COUNTRIES } from '../lib/countries';
import WorldLeaderboard from '../components/WorldLeaderboard';
import LanguageSelector from '../components/LanguageSelector';
import DanceStage from '../components/DanceStage';
import { speak, stopSpeaking, createRecognizer, isRecognitionSupported, type Recognizer } from '../lib/speech';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface Choreographer {
  id: string; name: string; mode: string; age_range: string; specialty: string[];
  personality: string; avatar_emoji: string; avatar_url?: string | null; video_url?: string | null;
  gallery?: string[]; gradient: string; rating: number; review_count: number; bio: string;
}
interface Scenario {
  id: string; name: string; emoji: string; gradient: string; vibe: string; premium: boolean; bg_image_url?: string | null;
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
  const [genre, setGenre] = useState(choreographer.specialty?.[0] || 'Salsa');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [country, setCountry] = useState(userCountry && COUNTRIES.find(c => c.name === userCountry)?.code || 'ES');
  const [sessionPoints, setSessionPoints] = useState(0);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [lastStep, setLastStep] = useState<string>('');
  // Voz
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<Recognizer | null>(null);
  const micSupported = isRecognitionSupported();

  // Cargar escenarios
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('dance_scenarios').select('*').eq('active', true).order('display_order');
      const list = (data as Scenario[]) || [];
      setScenarios(list);
      if (list.length) setScenario(list[0]);
    })();
  }, []);

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

  const startSession = async () => {
    if (!isAuthenticated) { addToast({ type: 'warning', message: t('df.loginToCompete') }); return; }
    setStarted(true);
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
        setLastStep(fallback);
        speakReply(fallback);
        setSending(false);
        return;
      }
      setMessages(m => [...m, { role: 'assistant', content: json.reply }]);
      setLastStep(json.reply);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className={`bg-white dark:bg-[#0e0e14] w-full ${started ? 'sm:max-w-4xl' : 'sm:max-w-lg'} rounded-t-3xl sm:rounded-3xl max-h-[96vh] flex flex-col overflow-hidden transition-all`}>
        {/* Header */}
        <div className={`relative bg-gradient-to-br ${choreographer.gradient} text-white p-4 flex items-center gap-3`}>
          {choreographer.avatar_url
            ? <img src={choreographer.avatar_url} alt={choreographer.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/40" />
            : <span className="text-4xl">{choreographer.avatar_emoji}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg truncate">{choreographer.name}</h3>
              {started && <span className="flex items-center gap-1 text-[10px] bg-green-500 px-2 py-0.5 rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> {t('df.live')}</span>}
            </div>
            <p className="text-white/80 text-xs truncate">{choreographer.personality}</p>
          </div>
          <LanguageSelector compact />
          {started && sessionPoints > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black leading-none">{sessionPoints}</p>
              <p className="text-[9px] opacity-80">{t('df.points')}</p>
            </div>
          )}
          <button onClick={started ? endSession : onClose} className="p-1.5 hover:bg-white/20 rounded-lg flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {!started ? (
          /* SETUP */
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">{t('df.specialty')}</label>
              <div className="flex flex-wrap gap-2">
                {(choreographer.specialty || []).map(s => (
                  <button key={s} onClick={() => setGenre(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border ${genre === s ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Escenario / pista de baile */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">🪩 Pista de baile</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {scenarios.map(s => (
                  <button key={s.id} onClick={() => setScenario(s)}
                    className={`relative rounded-xl overflow-hidden h-16 flex flex-col items-center justify-center transition-all ${scenario?.id === s.id ? 'ring-2 ring-pink-500 scale-105' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundImage: `linear-gradient(${s.gradient})` }}>
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-white text-[8px] font-bold text-center px-1 leading-tight drop-shadow">{s.name}</span>
                    {s.premium && <span className="absolute top-0.5 right-0.5 text-[7px] bg-yellow-400 text-yellow-900 px-1 rounded font-bold">PRO</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">🏳️ {t('df.yourRank')} — País</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="input-field">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>)}
              </select>
            </div>
            <button onClick={startSession} disabled={!scenario} className="btn-orange w-full flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> {t('df.start')}
            </button>
            {!isAuthenticated && <p className="text-[11px] text-center text-orange-500">{t('df.loginToCompete')}</p>}
          </div>
        ) : (
          /* CLASE VIRTUAL: profe baila + tu cámara + voz */
          <div className="flex-1 overflow-y-auto bg-[#060608]">
            {/* Layout clase: profe (video) + tu cámara */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 p-2">
              {/* PROFE — video del coreógrafo bailando */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                {choreographer.video_url ? (
                  isYouTube(choreographer.video_url) ? (
                    <iframe
                      src={ytEmbed(choreographer.video_url)}
                      className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen
                      title={choreographer.name}
                    />
                  ) : (
                    <video src={choreographer.video_url} className="w-full h-full object-cover" autoPlay loop muted={false} playsInline controls />
                  )
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${choreographer.gradient} flex flex-col items-center justify-center`}>
                    <span className={`text-7xl ${speaking ? 'animate-bounce' : ''}`}>{choreographer.avatar_emoji}</span>
                    <p className="text-white/80 text-xs mt-2 px-4 text-center">
                      {speaking ? '🔊 hablando...' : 'Tu profe te guía con la voz'}
                    </p>
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  👨‍🏫 {choreographer.name}
                </span>
                {speaking && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#ff3e6c] text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    <Volume2 className="w-3 h-3" /> Hablando
                  </span>
                )}
              </div>

              {/* TÚ — cámara en el escenario */}
              {scenario && (
                <DanceStage scenario={scenario} choreographer={choreographer} currentStep={lastStep} />
              )}
            </div>

            {/* Instrucción del profe (subtítulo grande) */}
            {lastStep && (
              <div className="mx-2 mb-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-white text-sm leading-relaxed">{lastStep}</p>
              </div>
            )}

            {/* CONTROLES DE VOZ */}
            <div className="sticky bottom-0 bg-[#0e0e14] border-t border-white/10 p-3">
              <div className="flex items-center gap-2">
                {/* Botón micrófono GRANDE (hablar al profe) */}
                <button
                  onClick={toggleMic}
                  disabled={sending}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
                    listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white hover:scale-[1.02]'
                  }`}
                >
                  {listening ? <><MicOff className="w-5 h-5" /> Escuchando... (habla)</>
                    : sending ? <><Loader2 className="w-5 h-5 animate-spin" /> El profe responde...</>
                    : <><Mic className="w-5 h-5" /> Pregúntale al profe (voz)</>}
                </button>

                {/* Toggle voz on/off */}
                <button onClick={() => { setVoiceOn(v => { if (v) stopSpeaking(); return !v; }); }}
                  title={voiceOn ? 'Silenciar voz' : 'Activar voz'}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${voiceOn ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                  {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>

              {/* Input de texto como alternativa (plegado) */}
              <div className="flex gap-2 mt-2">
                <input
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="...o escríbele por teclado"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#ff3e6c]"
                />
                <button onClick={() => send()} disabled={sending || !input.trim()} className="bg-white/10 text-white px-4 rounded-xl disabled:opacity-40"><Send className="w-4 h-4" /></button>
              </div>
              {!micSupported && (
                <p className="text-[10px] text-white/40 text-center mt-1.5">Tu navegador no soporta micrófono de voz — usa Chrome/Edge o el teclado.</p>
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
