import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Images, Play, UserPlus, UserCheck } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store/appStore';
import { cargarFeed, sigoA, alternarSeguir, contarSeguidores, type Post } from '../lib/feed';

// ── Lo que ha publicado una persona, en cuadrícula ──────────────────────────
// Se monta en el perfil público. Al tocar una foto se abre el muro filtrado
// por esa persona, que es donde están los likes y los comentarios: duplicar
// aquí toda la tarjeta sería mantener dos veces lo mismo.

export const SeguirBoton: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [sigo, setSigo] = useState(false);
  const [listo, setListo] = useState(false);
  const [cuentas, setCuentas] = useState({ seguidores: 0, siguiendo: 0 });

  const refrescar = useCallback(async () => {
    const c = await contarSeguidores(userId).catch(() => ({ seguidores: 0, siguiendo: 0 }));
    setCuentas(c);
  }, [userId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (user && user.id !== userId) {
        const s = await sigoA(user.id, userId).catch(() => false);
        if (vivo) setSigo(s);
      }
      await refrescar();
      if (vivo) setListo(true);
    })();
    return () => { vivo = false; };
  }, [user?.id, userId, refrescar]);

  const pulsar = async () => {
    if (!isAuthenticated || !user) { navigate('/auth'); return; }
    const antes = sigo;
    setSigo(!antes);
    setCuentas(c => ({ ...c, seguidores: Math.max(c.seguidores + (antes ? -1 : 1), 0) }));
    try {
      await alternarSeguir(user.id, userId, antes);
    } catch {
      setSigo(antes);
      await refrescar();
      addToast({ message: 'No se pudo guardar', type: 'error' });
    }
  };

  if (!listo) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white">{cuentas.seguidores}</strong> seguidores
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white">{cuentas.siguiendo}</strong> siguiendo
        </span>
      </div>
      {user?.id !== userId && (
        <button onClick={pulsar}
          className={`ml-auto text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
            sigo
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              : 'bg-brand-orange text-white hover:opacity-90'
          }`}>
          {sigo ? <><UserCheck className="w-3.5 h-3.5" /> Siguiendo</> : <><UserPlus className="w-3.5 h-3.5" /> Seguir</>}
        </button>
      )}
    </div>
  );
};

const ProfilePostsGrid: React.FC<{ userId: string; esMiPerfil?: boolean }> = ({ userId, esMiPerfil }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    cargarFeed({ miId: user?.id, autorId: userId, limite: 24 })
      .then(l => { if (vivo) { setPosts(l); setCargando(false); } })
      .catch(e => {
        if (!vivo) return;
        const code = (e as any)?.code;
        // Falta la migración del muro: se oculta el bloque en lugar de
        // enseñar un error en el perfil de alguien.
        if (code === '42P01' || code === '42703') setDisponible(false);
        setCargando(false);
      });
    return () => { vivo = false; };
  }, [userId, user?.id]);

  if (!disponible) return null;

  if (cargando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <Images className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {esMiPerfil ? 'Todavía no has publicado nada' : 'Todavía no ha publicado nada'}
        </p>
        {esMiPerfil && (
          <button onClick={() => navigate('/muro')} className="btn-orange text-xs px-4 py-2 mt-3">
            Publicar mi primera foto
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map(p => {
        const portada = p.media[0];
        return (
          <button key={p.id} onClick={() => navigate('/muro')}
            className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden group">
            {portada ? (
              portada.kind === 'video' ? (
                <>
                  <video src={portada.url} preload="metadata" muted
                    className="w-full h-full object-cover" />
                  <Play className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow fill-white" />
                </>
              ) : (
                <img src={portada.url} alt="" loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              )
            ) : (
              <span className="absolute inset-0 flex items-center justify-center p-2 text-[11px] text-gray-500 dark:text-gray-400 text-center line-clamp-4">
                {p.texto}
              </span>
            )}
            {p.media.length > 1 && (
              <span className="absolute top-2 right-2 text-white text-[10px] font-black drop-shadow">
                1/{p.media.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProfilePostsGrid;
