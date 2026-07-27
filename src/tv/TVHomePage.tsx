import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Loader2, Tv, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';

export interface TVTitle {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  type: string;
  style: string | null;
  level: string | null;
  cover_url: string | null;
  access: 'free' | 'basico' | 'premium';
  featured: boolean;
  rating: number;
  views: number;
}

const ACCESS_LABEL: Record<string, string> = { free: 'Gratis', basico: 'Básico', premium: 'Premium' };

function normalize(r: any): TVTitle {
  return {
    id: r.id, title: r.title || '', slug: r.slug || null, description: r.description || null,
    type: r.type || 'clase', style: r.style || null, level: r.level || null,
    cover_url: r.cover_url || null, access: r.access || 'basico',
    featured: !!r.featured, rating: Number(r.rating) || 0, views: Number(r.views) || 0,
  };
}

const TitleCard: React.FC<{ t: TVTitle; onOpen: () => void }> = ({ t, onOpen }) => (
  <button onClick={onOpen} className="group flex-shrink-0 w-44 sm:w-52 text-left">
    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 ring-1 ring-white/10">
      {t.cover_url
        ? <img src={t.cover_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        : <div className="w-full h-full flex items-center justify-center text-3xl">💃</div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${
        t.access === 'premium' ? 'bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white'
        : t.access === 'free' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
        {ACCESS_LABEL[t.access]}
      </span>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center">
          <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
        </span>
      </div>
    </div>
    <p className="text-white text-sm font-bold mt-2 line-clamp-1">{t.title}</p>
    <p className="text-white/50 text-[11px] flex items-center gap-2">
      {t.style && <span className="capitalize">{t.style}</span>}
      {t.level && <span className="capitalize">· {t.level}</span>}
      {t.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" fill="currentColor" /> {t.rating.toFixed(1)}</span>}
    </p>
  </button>
);

const Row: React.FC<{ label: string; items: TVTitle[]; onOpen: (t: TVTitle) => void }> = ({ label, items, onOpen }) => {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="font-display font-black text-lg text-white mb-3 px-4 sm:px-6">{label}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 sm:px-6" style={{ scrollbarWidth: 'none' }}>
        {items.map(t => <TitleCard key={t.id} t={t} onOpen={() => onOpen(t)} />)}
      </div>
    </section>
  );
};

const TVHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [titles, setTitles] = useState<TVTitle[]>([]);
  const [continueTitles, setContinueTitles] = useState<TVTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Safety: nunca dejar el spinner colgado si la consulta falla o se demora.
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    supabase.from('tv_titles').select('*').eq('status', 'published').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setTitles((data || []).map(normalize));
        setLoading(false);
      }, () => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // Continuar viendo: títulos con progreso no completado del usuario
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('tv_progress')
        .select('updated_at, lesson:tv_lessons(title_id)')
        .eq('user_id', uid).eq('completed', false)
        .order('updated_at', { ascending: false }).limit(20);
      const ids = [...new Set((data || []).map((p: any) => p.lesson?.title_id).filter(Boolean))];
      if (cancelled || ids.length === 0) return;
      const { data: ts } = await supabase.from('tv_titles').select('*').in('id', ids).eq('status', 'published');
      const map: Record<string, TVTitle> = {};
      (ts || []).forEach((t: any) => { map[t.id] = normalize(t); });
      if (!cancelled) setContinueTitles(ids.map(id => map[id]).filter(Boolean));
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const featured = useMemo(() => titles.find(t => t.featured) || titles[0], [titles]);
  const byStyle = useMemo(() => {
    const map: Record<string, TVTitle[]> = {};
    titles.forEach(t => { const k = t.style || 'Otros'; (map[k] = map[k] || []).push(t); });
    return map;
  }, [titles]);

  const open = (t: TVTitle) => navigate(`/tv/${t.id}`);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {featured?.cover_url && (
          <img src={featured.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-[#0a0a0f]/30" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="flex items-center gap-2 mb-3">
            <Tv className="w-5 h-5 text-fuchsia-400" />
            <span className="text-fuchsia-400 font-black text-sm tracking-widest uppercase">BailaNow TV</span>
            <button onClick={() => navigate('/membresias')} className="ml-auto text-xs font-bold bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white rounded-full px-3 py-1.5">
              Planes · Pareja y Familia 👫
            </button>
          </div>
          {featured ? (
            <>
              <h1 className="font-display font-black text-3xl sm:text-5xl text-white max-w-2xl leading-tight">{featured.title}</h1>
              {featured.description && <p className="text-white/70 text-sm sm:text-base mt-3 max-w-xl line-clamp-3">{featured.description}</p>}
              <button onClick={() => open(featured)} className="mt-5 inline-flex items-center gap-2 bg-white text-gray-900 font-bold rounded-xl px-6 py-3 hover:bg-gray-100 transition-all">
                <Play className="w-4 h-4" fill="currentColor" /> Ver ahora
              </button>
            </>
          ) : (
            <h1 className="font-display font-black text-3xl sm:text-5xl text-white max-w-2xl leading-tight">
              Aprende a bailar <span className="bg-gradient-to-r from-orange-400 to-fuchsia-400 bg-clip-text text-transparent">como un profesional</span>
            </h1>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6">
        {loading ? (
          <div className="py-24 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-fuchsia-500" /></div>
        ) : titles.length === 0 ? (
          <div className="py-24 text-center px-6">
            <Sparkles className="w-10 h-10 mx-auto text-fuchsia-400 mb-3" />
            <p className="text-white font-bold text-lg">Aún no hay clases publicadas</p>
            <p className="text-white/50 text-sm mt-1 max-w-md mx-auto">Estamos incorporando profesores y coreografías. Vuelve pronto para ver el catálogo.</p>
            <button onClick={() => navigate('/precios')} className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl px-5 py-2.5 hover:opacity-90 transition-all">
              ¿Eres profe? Publica tu contenido
            </button>
          </div>
        ) : (
          <>
            <Row label="Continuar viendo" items={continueTitles} onOpen={open} />
            <Row label="Nuevos lanzamientos" items={titles.slice(0, 12)} onOpen={open} />
            <Row label="Destacados" items={titles.filter(t => t.featured)} onOpen={open} />
            {Object.entries(byStyle).map(([style, items]) => (
              <Row key={style} label={style.charAt(0).toUpperCase() + style.slice(1)} items={items} onOpen={open} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TVHomePage;
