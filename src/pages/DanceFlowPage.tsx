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
import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, Star, X, Send, Trophy, Globe, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import { useUIStore } from '../store/appStore';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { countryFlag, COUNTRIES } from '../lib/countries';
import WorldLeaderboard from '../components/WorldLeaderboard';
import LanguageSelector from '../components/LanguageSelector';

interface Choreographer {
  id: string; name: string; mode: string; age_range: string; specialty: string[];
  personality: string; avatar_emoji: string; gradient: string; rating: number;
  review_count: number; bio: string;
}

const DanceFlowPage: React.FC = () => {
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuthStore();
  const addToast = useUIStore(s => s.addToast);
  usePageMeta({ title: t('df.title'), description: t('df.subtitle') });

  const [choreos, setChoreos] = useState<Choreographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<'all' | 'solo' | 'pareja'>('all');
  const [activeSession, setActiveSession] = useState<Choreographer | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('dance_choreographers')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      setChoreos((data as Choreographer[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = choreos.filter(c => modeFilter === 'all' || c.mode === modeFilter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060608] pb-24">
      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0033] via-[#330066] to-[#060608] text-white">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 20%, #ff3e6c 0%, transparent 50%), radial-gradient(circle at 70% 60%, #a855f7 0%, transparent 50%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> AI · BETA
              </div>
              <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight mb-2">
                {t('df.title')}
              </h1>
              <p className="text-white/70 text-sm sm:text-base max-w-xl">{t('df.subtitle')}</p>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* CHOREOGRAPHERS */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display font-black text-xl text-gray-900 dark:text-white">{t('df.choose')}</h2>
            <div className="flex gap-1.5">
              {(['all', 'solo', 'pareja'] as const).map(m => (
                <button key={m} onClick={() => setModeFilter(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${modeFilter === m ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                  {m === 'all' ? t('df.all') : m === 'solo' ? t('df.solo') : t('df.pair')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin text-pink-500 mx-auto" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(c => (
                <button key={c.id} onClick={() => setActiveSession(c)}
                  className="group bg-white dark:bg-[#0e0e14] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left">
                  <div className={`relative h-28 bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                    <span className="text-5xl drop-shadow-lg group-hover:scale-110 transition-transform">{c.avatar_emoji}</span>
                    <span className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${c.mode === 'pareja' ? 'bg-purple-500' : 'bg-pink-500'} text-white`}>
                      {c.mode === 'pareja' ? t('df.pair') : t('df.solo')}
                    </span>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-[10px] font-bold">{c.rating}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-black text-sm text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.age_range} · {c.review_count} ⭐</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(c.specialty || []).slice(0, 2).map(s => (
                        <span key={s} className="text-[9px] bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 px-1.5 py-0.5 rounded-full font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* RANKING */}
        <section className="mt-12">
          <h2 className="font-display font-black text-xl text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" /> {t('df.topDancers')}
          </h2>
          <WorldLeaderboard variant="full" />
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
        setSending(false);
        return;
      }
      setMessages(m => [...m, { role: 'assistant', content: json.reply }]);
      // Sumar puntos por interacción
      setSessionPoints(p => p + 25);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `¡Vamos ${userName || 'crack'}! Sigamos bailando 🔥` }]);
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setSending(true);
    await sendToAI(newHistory);
  };

  const endSession = async () => {
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
      <div className="bg-white dark:bg-[#0e0e14] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`relative bg-gradient-to-br ${choreographer.gradient} text-white p-4 flex items-center gap-3`}>
          <span className="text-4xl">{choreographer.avatar_emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg">{choreographer.name}</h3>
              {started && <span className="flex items-center gap-1 text-[10px] bg-green-500 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> {t('df.live')}</span>}
            </div>
            <p className="text-white/80 text-xs">{choreographer.personality}</p>
          </div>
          {started && sessionPoints > 0 && (
            <div className="text-right">
              <p className="text-2xl font-black">{sessionPoints}</p>
              <p className="text-[9px] opacity-80">{t('df.points')}</p>
            </div>
          )}
          <button onClick={started ? endSession : onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {!started ? (
          /* SETUP */
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">{t('df.specialty')}</label>
              <div className="flex flex-wrap gap-2">
                {(choreographer.specialty || []).map(s => (
                  <button key={s} onClick={() => setGenre(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border ${genre === s ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">🏳️ País (para el ranking)</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="input-field">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>)}
              </select>
            </div>
            <button onClick={startSession} className="btn-orange w-full flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> {t('df.start')}
            </button>
            {!isAuthenticated && <p className="text-[11px] text-center text-orange-500">{t('df.loginToCompete')}</p>}
          </div>
        ) : (
          /* CHAT */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex gap-2">
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Escribe a tu coreógrafo..."
                className="input-field flex-1"
              />
              <button onClick={send} disabled={sending} className="btn-orange px-4">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DanceFlowPage;
