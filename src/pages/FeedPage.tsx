import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Images } from 'lucide-react';
import { useAuthStore } from '../store/appStore';
import { usePageMeta } from '../hooks/usePageMeta';
import PostCard from '../components/PostCard';
import PostComposer from '../components/PostComposer';
import { cargarFeed, type Post } from '../lib/feed';

// ── El muro ─────────────────────────────────────────────────────────────────
// Dos pestañas: todo lo publicado, o solo de quien sigues. La paginación va
// por fecha y no por número de página: en un feed que crece por arriba, saltar
// de página repite publicaciones o se salta otras.

const FeedPage: React.FC = () => {
  usePageMeta({
    title: 'Comunidad en imágenes',
    description: 'Fotos y vídeos de la comunidad de danza latina: bailarines, locales y eventos.',
  });

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [pestana, setPestana] = useState<'todo' | 'siguiendo'>('todo');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [componer, setComponer] = useState(false);
  const [noInstalado, setNoInstalado] = useState(false);
  const centinela = useRef<HTMLDivElement>(null);

  const primeraCarga = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await cargarFeed({ miId: user?.id, soloSeguidos: pestana === 'siguiendo' });
      setPosts(lista);
      setHayMas(lista.length >= 12);
      setNoInstalado(false);
    } catch (e) {
      // 42P01 / 42703: faltan las tablas o columnas del módulo. Se avisa en vez
      // de dejar una pantalla en blanco sin explicación.
      const code = (e as any)?.code;
      if (code === '42P01' || code === '42703') setNoInstalado(true);
      setPosts([]);
      setHayMas(false);
    }
    setCargando(false);
  }, [user?.id, pestana]);

  useEffect(() => { primeraCarga(); }, [primeraCarga]);

  const cargarMas = useCallback(async () => {
    if (masCargando || !hayMas || posts.length === 0) return;
    setMasCargando(true);
    try {
      const ultimo = posts[posts.length - 1];
      const lista = await cargarFeed({
        miId: user?.id,
        soloSeguidos: pestana === 'siguiendo',
        antesDe: ultimo.creado,
      });
      // Se filtra por id porque dos publicaciones pueden compartir el mismo
      // instante y colarse repetidas en el borde de la página.
      setPosts(prev => {
        const vistos = new Set(prev.map(p => p.id));
        return [...prev, ...lista.filter(p => !vistos.has(p.id))];
      });
      setHayMas(lista.length >= 12);
    } catch { setHayMas(false); }
    setMasCargando(false);
  }, [masCargando, hayMas, posts, user?.id, pestana]);

  // Scroll infinito. Se observa un div al final en lugar de escuchar el scroll:
  // no dispara en cada píxel y el navegador lo resuelve solo.
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) cargarMas(); }, { rootMargin: '600px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [cargarMas, hayMas]);

  const quitarDeLaLista = (id: string) => setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* ── Cabecera ── */}
      <div className="sticky top-14 z-30 bg-surface-elevated border-b border-hairline/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="font-display font-black text-xl text-ink-primary">Comunidad</h1>
          {isAuthenticated && (
            <button onClick={() => setComponer(true)}
              className="btn-orange text-sm px-4 py-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Publicar
            </button>
          )}
        </div>
        <div className="max-w-xl mx-auto px-4 flex gap-1">
          {([['todo', 'Todo'], ['siguiendo', 'Siguiendo']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setPestana(id)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                pestana === id
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {noInstalado ? (
          <div className="card-white rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">🛠️</p>
            <p className="font-bold text-ink-primary text-sm">El muro todavía no está activado</p>
            <p className="text-ink-tertiary text-xs mt-1">
              Falta aplicar <code>supabase/feed-social.sql</code> en la base de datos.
            </p>
          </div>
        ) : cargando ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>
        ) : posts.length === 0 ? (
          <div className="card-white rounded-2xl p-8 text-center">
            <Images className="w-12 h-12 text-ink-tertiary/40 mx-auto mb-3" />
            <p className="font-bold text-ink-primary">
              {pestana === 'siguiendo' ? 'Aún no sigues a nadie que haya publicado' : 'Todavía no hay publicaciones'}
            </p>
            <p className="text-ink-tertiary text-sm mt-1 max-w-xs mx-auto">
              {pestana === 'siguiendo'
                ? 'Sigue a bailarines y locales y sus fotos aparecerán aquí.'
                : 'Sé quien empieza: sube una foto de la última noche de baile.'}
            </p>
            {isAuthenticated ? (
              pestana === 'todo' && (
                <button onClick={() => setComponer(true)} className="btn-orange px-6 py-2.5 text-sm mt-4">
                  Publicar la primera
                </button>
              )
            ) : (
              <button onClick={() => navigate('/auth')} className="btn-orange px-6 py-2.5 text-sm mt-4">
                Entrar para publicar
              </button>
            )}
          </div>
        ) : (
          <>
            {posts.map(p => <PostCard key={p.id} post={p} onBorrado={quitarDeLaLista} />)}
            <div ref={centinela} className="h-4" />
            {masCargando && (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-brand-orange" /></div>
            )}
            {!hayMas && posts.length > 6 && (
              <p className="text-center text-xs text-ink-tertiary py-4">Has llegado al final</p>
            )}
          </>
        )}
      </div>

      {/* Botón flotante en móvil, donde el de arriba queda lejos del pulgar */}
      {isAuthenticated && !componer && (
        <button onClick={() => setComponer(true)}
          className="sm:hidden fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-brand-orange text-white shadow-lg shadow-brand/40 flex items-center justify-center active:scale-95 transition-transform"
          title="Publicar">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {componer && (
        <PostComposer
          onClose={() => setComponer(false)}
          onPublicado={() => { setComponer(false); primeraCarga(); }}
        />
      )}
    </div>
  );
};

export default FeedPage;
