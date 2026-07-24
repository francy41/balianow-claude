import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Lock, Loader2, Star, Heart, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import type { TVTitle } from './TVHomePage';

interface Lesson {
  id: string;
  position: number;
  name: string;
  video_url: string | null;
  duration_seconds: number;
  access: 'free' | 'basico' | 'premium';
}

const fmtDur = (s: number) => {
  if (!s) return '';
  const m = Math.round(s / 60);
  return `${m} min`;
};

// El vídeo puede ser un mp4 directo o un vídeo de Cloudflare Stream
// (URL de iframe/stream o un UID de 32 hex). Cloudflare se embebe por iframe.
const isCfStream = (u: string) => /cloudflarestream\.com|videodelivery\.net/i.test(u) || /^[a-f0-9]{32}$/i.test(u);
const cfEmbedUrl = (u: string) => {
  if (/^[a-f0-9]{32}$/i.test(u)) return `https://iframe.videodelivery.net/${u}`;
  return u;
};

const TVTitlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [title, setTitle] = useState<TVTitle | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: t }, { data: ls }] = await Promise.all([
          supabase.from('tv_titles').select('*').eq('id', id).maybeSingle(),
          supabase.from('tv_lessons').select('*').eq('title_id', id).order('position', { ascending: true }),
        ]);
        if (cancelled) return;
        setTitle(t ? {
          id: t.id, title: t.title || '', slug: t.slug, description: t.description,
          type: t.type || 'clase', style: t.style, level: t.level, cover_url: t.cover_url,
          access: t.access || 'basico', featured: !!t.featured, rating: Number(t.rating) || 0, views: Number(t.views) || 0,
        } : null);
        const lessonList = (ls || []) as Lesson[];
        setLessons(lessonList);
        setCurrent(lessonList[0] || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('tv_favorites').select('title_id').eq('title_id', id).eq('user_id', uid).maybeSingle();
      setFav(!!data);
    })().catch(() => {});
  }, [id, isAuthenticated]);

  const hasSub = !!user && (user.isPremium || !!user.subscriptionPlan);
  const canWatch = (access: string) => access === 'free' || hasSub;

  // Cargar la posición guardada de la clase actual (continuar viendo)
  useEffect(() => {
    setResumeAt(0);
    if (!current || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('tv_progress').select('position_seconds').eq('user_id', uid).eq('lesson_id', current.id).maybeSingle();
      if (!cancelled && data) setResumeAt(data.position_seconds || 0);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [current, isAuthenticated]);

  const saveProgress = useCallback(async (completed = false) => {
    const v = videoRef.current;
    if (!v || !current || !isAuthenticated) return;
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    const done = completed || (v.duration ? v.currentTime / v.duration > 0.95 : false);
    await supabase.from('tv_progress').upsert({
      user_id: uid, lesson_id: current.id,
      position_seconds: Math.floor(v.currentTime), completed: done,
      updated_at: new Date().toISOString(),
    }).then(() => {}, () => {});
  }, [current, isAuthenticated]);

  const onTime = () => {
    const now = Date.now();
    if (now - lastSaveRef.current > 10000) { lastSaveRef.current = now; saveProgress(); }
  };

  const toggleFav = async () => {
    if (!isAuthenticated || !id) { navigate('/auth'); return; }
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    try {
      if (fav) {
        await supabase.from('tv_favorites').delete().eq('title_id', id).eq('user_id', uid);
        setFav(false);
      } else {
        await supabase.from('tv_favorites').insert({ title_id: id, user_id: uid });
        setFav(true);
        addToast({ message: 'Añadido a favoritos', type: 'success' });
      }
    } catch { addToast({ message: 'No se pudo actualizar favoritos', type: 'error' }); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>
  );
  if (!title) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 text-white">
      <p className="text-white/60">Título no encontrado</p>
      <button onClick={() => navigate('/tv')} className="bg-white text-gray-900 font-bold rounded-xl px-5 py-2.5">Volver a BailaNow TV</button>
    </div>
  );

  const playable = current && canWatch(current.access);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20">
      {/* Player / gate */}
      <div className="relative bg-black aspect-video max-h-[70vh] w-full flex items-center justify-center">
        {playable && current?.video_url ? (
          isCfStream(current.video_url) ? (
            <iframe
              key={current.id}
              src={cfEmbedUrl(current.video_url)}
              title={current.name}
              className="w-full h-full"
              style={{ border: 'none' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              key={current.id}
              src={current.video_url}
              controls
              autoPlay
              onLoadedMetadata={() => { if (resumeAt > 5 && videoRef.current) videoRef.current.currentTime = resumeAt; }}
              onTimeUpdate={onTime}
              onPause={() => saveProgress()}
              onEnded={() => saveProgress(true)}
              className="w-full h-full object-contain bg-black"
            />
          )
        ) : current && !canWatch(current.access) ? (
          <div className="text-center px-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-fuchsia-600 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <p className="font-black text-xl">Contenido {title.access === 'premium' ? 'Premium' : 'para suscriptores'}</p>
            <p className="text-white/60 text-sm mt-1 max-w-sm mx-auto">Suscríbete a BailaNow TV para ver esta clase y todo el catálogo.</p>
            <button onClick={() => navigate('/precios')} className="mt-4 bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl px-6 py-3 hover:opacity-90 transition-all">
              Ver planes
            </button>
          </div>
        ) : (
          <div className="text-center px-6 text-white/50">
            {title.cover_url && <img src={title.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
            <p className="relative">Esta clase aún no tiene vídeo disponible.</p>
          </div>
        )}
        <button onClick={() => navigate('/tv')} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl">{title.title}</h1>
            <div className="flex items-center gap-3 text-sm text-white/60 mt-1 flex-wrap">
              {title.style && <span className="capitalize">{title.style}</span>}
              {title.level && <span className="capitalize">· {title.level}</span>}
              <span className="capitalize">· {title.type}</span>
              {title.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" /> {title.rating.toFixed(1)}</span>}
            </div>
          </div>
          <button onClick={toggleFav} className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold border transition-all ${
            fav ? 'border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/10' : 'border-white/20 text-white/80 hover:border-white/40'}`}>
            {fav ? <><Check className="w-4 h-4" /> Guardado</> : <><Heart className="w-4 h-4" /> Favorito</>}
          </button>
        </div>

        {title.description && <p className="text-white/70 text-sm mt-4 leading-relaxed">{title.description}</p>}

        {/* Lessons */}
        <h2 className="font-display font-black text-lg mt-8 mb-3">Contenido</h2>
        {lessons.length === 0 ? (
          <p className="text-white/50 text-sm">Aún no hay clases en este título.</p>
        ) : (
          <div className="space-y-2">
            {lessons.map((l, i) => {
              const active = current?.id === l.id;
              const locked = !canWatch(l.access);
              return (
                <button key={l.id} onClick={() => setCurrent(l)}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all border ${
                    active ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-sm font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{l.name}</p>
                    {l.duration_seconds > 0 && <p className="text-[11px] text-white/40">{fmtDur(l.duration_seconds)}</p>}
                  </div>
                  {locked ? <Lock className="w-4 h-4 text-white/40 flex-shrink-0" /> : <Play className="w-4 h-4 text-white/70 flex-shrink-0" fill="currentColor" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TVTitlePage;
