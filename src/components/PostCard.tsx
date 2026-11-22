import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreVertical, Trash2, Flag, Ban, Send, Loader2, MapPin, Store, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar } from './ui';
import {
  type Post, type Comentario,
  alternarLike, cargarComentarios, comentar, retirarComentario, borrarPost,
} from '../lib/feed';

// ── Una publicación del feed ────────────────────────────────────────────────
// El "me gusta" se pinta antes de que responda el servidor y se deshace si
// falla: esperar medio segundo a que vuelva la respuesta hace que la app
// parezca rota aunque funcione.

const MOTIVOS = [
  'Contenido inapropiado',
  'Acoso o insultos',
  'Spam o publicidad engañosa',
  'Suplantación de identidad',
  'Otro',
];

const cuando = (iso: string) => {
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'ahora';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`;
  try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
};

const PostCard: React.FC<{ post: Post; onBorrado?: (id: string) => void }> = ({ post, onBorrado }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [like, setLike] = useState(post.leDiLike);
  const [nLikes, setNLikes] = useState(post.likes);
  const [abierto, setAbierto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reportando, setReportando] = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nComentarios, setNComentarios] = useState(post.comentarios);
  const [cargandoCom, setCargandoCom] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [slide, setSlide] = useState(0);
  const tira = useRef<HTMLDivElement>(null);

  const esMio = user?.id === post.autorId;

  const pulsarLike = async () => {
    if (!isAuthenticated || !user) { navigate('/auth'); return; }
    const antes = like;
    setLike(!antes);
    setNLikes(n => n + (antes ? -1 : 1));
    try {
      await alternarLike(post.id, user.id, antes);
    } catch {
      setLike(antes);
      setNLikes(n => n + (antes ? 1 : -1));
      addToast({ message: 'No se pudo registrar tu me gusta', type: 'error' });
    }
  };

  const abrirComentarios = useCallback(async () => {
    setAbierto(a => !a);
    if (comentarios.length > 0 || cargandoCom) return;
    setCargandoCom(true);
    try { setComentarios(await cargarComentarios(post.id, user?.id)); }
    catch { /* la lista se queda vacía, sin romper la tarjeta */ }
    setCargandoCom(false);
  }, [post.id, user?.id, comentarios.length, cargandoCom]);

  const enviarComentario = async () => {
    const t = texto.trim();
    if (!t || !user) return;
    setEnviando(true);
    try {
      await comentar(post.id, user.id, t);
      setTexto('');
      setComentarios(await cargarComentarios(post.id, user.id));
      setNComentarios(n => n + 1);
    } catch {
      addToast({ message: 'No se pudo publicar el comentario', type: 'error' });
    }
    setEnviando(false);
  };

  const quitarComentario = async (c: Comentario) => {
    try {
      await retirarComentario(c.id);
      setComentarios(cs => cs.filter(x => x.id !== c.id));
      setNComentarios(n => Math.max(n - 1, 0));
    } catch {
      addToast({ message: 'No se pudo retirar', type: 'error' });
    }
  };

  const borrar = async () => {
    if (!window.confirm('¿Borrar esta publicación?')) return;
    try {
      await borrarPost(post.id);
      addToast({ message: 'Publicación borrada', type: 'success' });
      onBorrado?.(post.id);
    } catch {
      addToast({ message: 'No se pudo borrar', type: 'error' });
    }
  };

  const bloquear = async () => {
    if (!user) return;
    await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: post.autorId });
    addToast({ message: 'Bloqueado. No volveréis a veros.', type: 'success' });
    setMenu(false);
    onBorrado?.(post.id);
  };

  const reportar = async (motivo: string) => {
    if (!user) return;
    await supabase.from('user_reports').insert({
      reporter_id: user.id, reported_id: post.autorId,
      reason: motivo, context: `post:${post.id}`,
    });
    setReportando(false);
    setMenu(false);
    addToast({ message: 'Gracias. El equipo lo revisará.', type: 'success' });
    supabase.functions.invoke('send-email', {
      body: { type: 'admin_reporte', data: { reason: motivo, context: 'publicación', reported_id: post.autorId } },
    }).catch(() => {});
  };

  // El carrusel va con scroll nativo: en móvil se arrastra con el dedo sin
  // que haya que programar nada, y es lo que la gente espera.
  const alDesplazar = () => {
    const el = tira.current;
    if (!el) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <article className="card-white rounded-2xl overflow-hidden">
      {/* ── Cabecera ── */}
      <header className="flex items-center gap-3 p-3">
        <button onClick={() => navigate(post.localId ? `/venues/${post.localId}` : `/u/${post.autorId}`)}>
          <Avatar src={post.avatar} name={post.autor} size="sm" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => navigate(post.localId ? `/venues/${post.localId}` : `/u/${post.autorId}`)}
            className="block text-left">
            <span className="font-bold text-sm text-ink-primary truncate hover:text-brand-orange transition-colors">
              {post.autor}
            </span>
          </button>
          <div className="flex items-center gap-2 text-[11px] text-ink-tertiary">
            {post.esLocal && <span className="flex items-center gap-0.5"><Store className="w-3 h-3" /> Local</span>}
            {post.lugar && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {post.lugar}</span>}
            <span>{cuando(post.creado)}</span>
          </div>
        </div>
        {isAuthenticated && (
          <div className="relative">
            <button onClick={() => setMenu(m => !m)} className="p-1.5 text-ink-tertiary hover:text-ink-primary rounded-lg">
              <MoreVertical className="w-5 h-5" />
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-20 w-48 card-white rounded-xl shadow-xl overflow-hidden">
                {esMio ? (
                  <button onClick={borrar}
                    className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Borrar publicación
                  </button>
                ) : (
                  <>
                    <button onClick={() => { setMenu(false); setReportando(true); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-ink-secondary hover:bg-hairline/10 flex items-center gap-2">
                      <Flag className="w-4 h-4" /> Reportar
                    </button>
                    <button onClick={bloquear}
                      className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2">
                      <Ban className="w-4 h-4" /> Bloquear a {post.autor.split(' ')[0]}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Media ── */}
      {post.media.length > 0 && (
        <div className="relative bg-black">
          <div ref={tira} onScroll={alDesplazar}
            className="flex overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}>
            {post.media.map((m, i) => (
              <div key={i} className="min-w-full snap-center aspect-square flex items-center justify-center">
                {m.kind === 'video' ? (
                  <video src={m.url} controls playsInline preload="metadata"
                    className="w-full h-full object-contain" />
                ) : (
                  <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
          {post.media.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {post.media.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === slide ? 'bg-white' : 'bg-white/40'
                }`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Acciones ── */}
      <div className="flex items-center gap-4 px-3 pt-3">
        <button onClick={pulsarLike} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <Heart className={`w-6 h-6 ${like ? 'fill-red-500 text-red-500' : 'text-ink-secondary'}`} />
          {nLikes > 0 && <span className="text-sm font-bold text-ink-secondary">{nLikes}</span>}
        </button>
        <button onClick={abrirComentarios} className="flex items-center gap-1.5">
          <MessageCircle className="w-6 h-6 text-ink-secondary" />
          {nComentarios > 0 && <span className="text-sm font-bold text-ink-secondary">{nComentarios}</span>}
        </button>
      </div>

      {/* ── Texto ── */}
      {post.texto && (
        <p className="px-3 pt-2 pb-3 text-sm text-ink-primary whitespace-pre-wrap break-words">
          <span className="font-bold mr-1.5">{post.autor}</span>
          {post.texto}
        </p>
      )}

      {/* ── Comentarios ── */}
      {abierto && (
        <div className="border-t border-hairline/10 p-3 space-y-3">
          {cargandoCom ? (
            <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-brand-orange" /></div>
          ) : comentarios.length === 0 ? (
            <p className="text-xs text-ink-tertiary text-center py-2">Sé la primera persona en comentar.</p>
          ) : comentarios.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar src={c.avatar} name={c.autor} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-primary break-words">
                  <button onClick={() => navigate(`/u/${c.userId}`)} className="font-bold mr-1.5 hover:text-brand-orange">
                    {c.autor}
                  </button>
                  {c.texto}
                </p>
                <p className="text-[10px] text-ink-tertiary mt-0.5">{cuando(c.creado)}</p>
              </div>
              {(c.esMio || esMio) && (
                <button onClick={() => quitarComentario(c)} title="Retirar"
                  className="p-1 text-ink-tertiary hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {isAuthenticated ? (
            <div className="flex items-center gap-2 pt-1">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario(); } }}
                placeholder="Añade un comentario…" maxLength={1000}
                className="flex-1 bg-surface-elevated-2 rounded-xl px-3 py-2 text-sm text-ink-primary placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-orange/30" />
              <button onClick={enviarComentario} disabled={enviando || !texto.trim()}
                className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/auth')} className="w-full text-xs font-bold text-brand-orange py-2">
              Entra para comentar
            </button>
          )}
        </div>
      )}

      {/* ── Reportar ── */}
      {reportando && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setReportando(false)}>
          <div className="card-white rounded-3xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display font-black text-lg text-ink-primary">Reportar publicación</h3>
              <button onClick={() => setReportando(false)} className="text-ink-tertiary hover:text-ink-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-ink-tertiary text-xs mt-1">
              Solo lo verá el equipo. La persona reportada no recibe aviso.
            </p>
            <div className="mt-3 space-y-1.5">
              {MOTIVOS.map(m => (
                <button key={m} onClick={() => reportar(m)}
                  className="w-full text-left text-sm font-semibold text-ink-secondary bg-surface-elevated-2 hover:bg-hairline/10 rounded-xl px-3.5 py-2.5 transition-colors">
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
