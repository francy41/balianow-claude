import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, MapPin, Loader2, Sparkles, MessageCircle, Settings, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

const STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Merengue', 'Cha-cha-chá', 'Reggaeton', 'Cumbia', 'Zouk'];
const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional'];

interface Profile {
  user_id: string; name: string | null; avatar: string | null; city: string | null;
  level: string | null; styles: string[]; bio: string | null;
}

const norm = (r: any): Profile => ({
  user_id: r.user_id, name: r.name || null, avatar: r.avatar || null, city: r.city || null,
  level: r.level || null, styles: Array.isArray(r.styles) ? r.styles : [], bio: r.bio || null,
});

/* ── Formulario de perfil de baile ── */
const ProfileForm: React.FC<{ initial: Profile | null; onSaved: () => void; onCancel?: () => void }> = ({ initial, onSaved, onCancel }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [city, setCity] = useState(initial?.city || user?.city || '');
  const [level, setLevel] = useState(initial?.level || 'Intermedio');
  const [styles, setStyles] = useState<string[]>(initial?.styles || []);
  const [bio, setBio] = useState(initial?.bio || '');
  const [avatar, setAvatar] = useState(initial?.avatar || user?.avatar || '');
  const [saving, setSaving] = useState(false);

  const toggle = (s: string) => setStyles(v => v.includes(s) ? v.filter(x => x !== s) : [...v, s]);

  const save = async () => {
    if (!user) return;
    if (!city.trim() || styles.length === 0) { addToast({ message: 'Pon tu ciudad y al menos un estilo', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('partner_profiles').upsert({
      user_id: user.id, name: user.name, avatar: avatar.trim() || user.avatar, city: city.trim(),
      level, styles, bio: bio.trim() || null, active: true,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Perfil de baile guardado 💃', type: 'success' });
    onSaved();
  };

  return (
    <div className="card-white rounded-2xl p-5 max-w-md mx-auto">
      <h2 className="font-black text-lg text-gray-900 dark:text-white mb-3">Tu perfil de baile</h2>
      <div className="space-y-3">
        <input className="input-field" placeholder="URL de tu foto (opcional)" value={avatar} onChange={e => setAvatar(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input-field" placeholder="Ciudad" value={city} onChange={e => setCity(e.target.value)} />
          <select className="input-field" value={level} onChange={e => setLevel(e.target.value)}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Estilos que bailas</p>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map(s => (
              <button key={s} type="button" onClick={() => toggle(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${styles.includes(s) ? 'bg-pink-500 text-white border-pink-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <textarea className="input-field" rows={2} placeholder="Sobre ti como bailarín/a (opcional)" value={bio} onChange={e => setBio(e.target.value)} />
        <div className="flex gap-2">
          {onCancel && <button onClick={onCancel} className="flex-1 btn-outline text-sm">Cancelar</button>}
          <button onClick={save} disabled={saving} className="flex-[2] bg-brand-orange text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Guardar y empezar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ParejasPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [likesToMe, setLikesToMe] = useState<Set<string>>(new Set());
  const [matches, setMatches] = useState<Profile[]>([]);
  const [matchPopup, setMatchPopup] = useState<Profile | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const uid = user.id;
    // Mi perfil
    const { data: mine } = await supabase.from('partner_profiles').select('*').eq('user_id', uid).maybeSingle();
    setMyProfile(mine ? norm(mine) : null);
    if (!mine) { setEditing(true); setLoading(false); return; }

    // Likes que doy y que recibo
    const [{ data: myLikes }, { data: toMe }] = await Promise.all([
      supabase.from('partner_likes').select('to_user').eq('from_user', uid),
      supabase.from('partner_likes').select('from_user').eq('to_user', uid),
    ]);
    const likedSet = new Set((myLikes || []).map((l: any) => l.to_user));
    const toMeSet = new Set((toMe || []).map((l: any) => l.from_user));
    setLikesToMe(toMeSet);

    // Perfiles activos (no yo)
    const { data: profs } = await supabase.from('partner_profiles').select('*').eq('active', true).neq('user_id', uid);
    const all = (profs || []).map(norm);
    // Deck: los que aún no he likeado
    setDeck(all.filter(p => !likedSet.has(p.user_id)));
    setIdx(0);
    // Matches: like mutuo
    const matchIds = [...likedSet].filter(id => toMeSet.has(id));
    setMatches(all.filter(p => matchIds.includes(p.user_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    loadAll().catch(() => setLoading(false));
  }, [isAuthenticated, loadAll]);

  const current = deck[idx] || null;

  const like = async () => {
    if (!user || !current) return;
    const target = current;
    setIdx(i => i + 1);
    const { error } = await supabase.from('partner_likes').insert({ from_user: user.id, to_user: target.user_id });
    if (error) return;
    if (likesToMe.has(target.user_id)) {
      // ¡Match!
      setMatches(m => (m.some(x => x.user_id === target.user_id) ? m : [...m, target]));
      setMatchPopup(target);
    }
  };
  const pass = () => setIdx(i => i + 1);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Heart className="w-12 h-12 text-pink-500" />
        <h1 className="font-display font-black text-2xl text-gray-900 dark:text-white">Encuentra tu pareja de baile</h1>
        <p className="text-gray-500 text-sm max-w-xs">Inicia sesión para descubrir bailarines de tu ciudad y hacer match.</p>
        <button onClick={() => navigate('/auth')} className="bg-brand-orange text-white font-bold rounded-xl px-6 py-3">Entrar</button>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      <div className="bg-gradient-to-br from-pink-600 via-fuchsia-600 to-purple-700 px-4 py-5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="font-display font-black text-xl text-white flex items-center gap-2">💃 Pareja de baile</h1>
          {myProfile && <button onClick={() => setEditing(true)} className="text-white/80 hover:text-white"><Settings className="w-5 h-5" /></button>}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-4">
        {editing ? (
          <ProfileForm initial={myProfile} onSaved={() => { setEditing(false); setLoading(true); loadAll(); }} onCancel={myProfile ? () => setEditing(false) : undefined} />
        ) : (
          <>
            {/* Matches */}
            {matches.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tus matches ({matches.length})</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {matches.map(m => (
                    <button key={m.user_id} onClick={() => navigate('/chat')} className="flex-shrink-0 text-center">
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-pink-500 mx-auto">
                        {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center">💃</div>}
                      </div>
                      <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1 max-w-[56px] truncate">{m.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Deck */}
            {current ? (
              <div className="card-white rounded-3xl overflow-hidden">
                <div className="relative aspect-[3/4] bg-gray-200 dark:bg-gray-800">
                  {current.avatar ? <img src={current.avatar} alt={current.name || ''} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-6xl">💃</div>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <p className="font-display font-black text-2xl">{current.name}</p>
                    <p className="text-white/80 text-sm flex items-center gap-2">
                      {current.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {current.city}</span>}
                      {current.level && <span>· {current.level}</span>}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {current.styles.map(s => <span key={s} className="text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">{s}</span>)}
                    </div>
                  </div>
                </div>
                {current.bio && <p className="text-sm text-gray-600 dark:text-gray-300 p-4">{current.bio}</p>}
                <div className="flex items-center justify-center gap-6 p-4">
                  <button onClick={pass} className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:border-gray-400 active:scale-95 transition-all">
                    <X className="w-7 h-7" />
                  </button>
                  <button onClick={like} className="w-16 h-16 rounded-full bg-brand-orange flex items-center justify-center text-white shadow-lg shadow-pink-500/30 active:scale-95 transition-all">
                    <Heart className="w-8 h-8" fill="currentColor" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Sparkles className="w-10 h-10 mx-auto text-pink-400 mb-2" />
                <p className="text-gray-900 dark:text-white font-bold">No hay más perfiles por ahora</p>
                <p className="text-gray-400 text-sm mt-1">Vuelve pronto: cada día se suman más bailarines.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Popup de match */}
      {matchPopup && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setMatchPopup(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <p className="font-display font-black text-3xl bg-brand-orange bg-clip-text text-transparent">¡Es un match!</p>
            <p className="text-gray-500 text-sm mt-1">A ti y a {matchPopup.name} os gusta bailar juntos 💃🕺</p>
            <div className="flex justify-center gap-3 my-4">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-pink-500">
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center">💃</div>}
              </div>
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-fuchsia-500">
                {matchPopup.avatar ? <img src={matchPopup.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center">🕺</div>}
              </div>
            </div>
            <button onClick={() => { setMatchPopup(null); navigate('/chat'); }} className="w-full bg-brand-orange text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Enviar mensaje
            </button>
            <button onClick={() => setMatchPopup(null)} className="w-full text-gray-400 text-xs mt-2">Seguir buscando</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParejasPage;
