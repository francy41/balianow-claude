import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Star, Pencil, Trash2, Flag, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar } from './ui';

// ── Reputación de baile ─────────────────────────────────────────────────────
// "Me encantó bailar con él, baila muy bien."
//
// Dos reglas sostienen que esto valga algo y no se convierta en un arma:
//
//  · SOLO RESEÑA QUIEN COINCIDIÓ en el mismo local la misma noche, con la
//    presencia verificada si se la exigen. Lo comprueba el RLS, no este
//    archivo. Sin eso habría reseñas falsas y acoso por comentario.
//
//  · SOLO HAY ELOGIO. No hay estrellas ni nota. Puntuar personas del 1 al 5 en
//    un contexto de ligue acaba en rankings de gente y en castigo por haber
//    rechazado a alguien. Lo malo va por el sistema de reportes, que lo lee el
//    equipo y no el público.

export const CUALIDADES = [
  'Baila muy bien',
  'Buen ritmo',
  'Buena conexión',
  'Respetuoso/a',
  'Buen liderazgo',
  'Sigue muy bien',
  'Muy divertido/a',
  'Paciente enseñando',
];

type Resena = {
  id: string;
  autor_id: string;
  autor: string | null;
  autor_avatar: string | null;
  tags: string[];
  comment: string | null;
  cuando: string;
  es_mia: boolean;
};

const fecha = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
};

// ── Resumen compacto para la cabecera de un perfil ──
export const ReputacionResumen: React.FC<{ userId: string }> = ({ userId }) => {
  const [datos, setDatos] = useState<{ total: number; top_tags: string[] } | null>(null);

  useEffect(() => {
    supabase.rpc('reputacion_de', { p_user: userId }).then(({ data }) => {
      const d = Array.isArray(data) ? data[0] : data;
      setDatos(d ?? null);
    }, () => {});
  }, [userId]);

  if (!datos || datos.total === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange rounded-full px-2.5 py-1 text-xs font-black">
        <Star className="w-3.5 h-3.5 fill-current" />
        {datos.total} {datos.total === 1 ? 'reseña' : 'reseñas'} de baile
      </span>
      {(datos.top_tags || []).map(t => (
        <span key={t} className="bg-surface-elevated-2 text-ink-secondary rounded-full px-2.5 py-1 text-xs font-bold">
          {t}
        </span>
      ))}
    </div>
  );
};

// ── Bloque completo: lista + escribir/editar ──
const DanceReviews: React.FC<{ userId: string; nombre?: string }> = ({ userId, nombre }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [disponible, setDisponible] = useState(true);
  const [puedo, setPuedo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const esMiPerfil = user?.id === userId;

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('resenas_de', { p_user: userId });
    // 42883: la función no existe todavía — falta aplicar el SQL.
    if (error && (error as any).code === '42883') { setDisponible(false); setCargando(false); return; }
    const lista = (data || []) as Resena[];
    setResenas(lista);

    if (user && !esMiPerfil) {
      const { data: ok } = await supabase.rpc('puede_resenar', { p_autor: user.id, p_destino: userId });
      setPuedo(ok === true);
      const mia = lista.find(r => r.es_mia);
      if (mia) { setTags(mia.tags || []); setTexto(mia.comment || ''); }
    }
    setCargando(false);
  }, [userId, user, esMiPerfil]);

  useEffect(() => { setCargando(true); cargar().catch(() => setCargando(false)); }, [cargar]);

  const miResena = resenas.find(r => r.es_mia);

  const guardar = async () => {
    if (!user) return;
    if (tags.length === 0 && !texto.trim()) {
      addToast({ message: 'Elige al menos una cualidad o escribe algo', type: 'warning' });
      return;
    }
    setGuardando(true);
    const fila = { author_id: user.id, target_id: userId, tags, comment: texto.trim() || null };
    const { error } = miResena
      ? await supabase.from('dance_reviews').update({ tags, comment: texto.trim() || null }).eq('id', miResena.id)
      : await supabase.from('dance_reviews').insert(fila);
    setGuardando(false);
    if (error) {
      addToast({
        message: (error as any).code === '42501' || (error as any).code === '23514'
          ? 'Solo puedes reseñar a alguien con quien coincidiste en un local'
          : 'No se pudo guardar la reseña',
        type: 'error',
      });
      return;
    }
    setEditando(false);
    addToast({ message: miResena ? 'Reseña actualizada' : '¡Gracias! Tu reseña ya está en su perfil', type: 'success' });
    cargar();
  };

  const borrar = async () => {
    if (!miResena) return;
    setGuardando(true);
    await supabase.from('dance_reviews').delete().eq('id', miResena.id);
    setGuardando(false);
    setTags([]); setTexto(''); setEditando(false);
    addToast({ message: 'Reseña retirada', type: 'success' });
    cargar();
  };

  const reportar = async (r: Resena) => {
    if (!user) return;
    await supabase.from('user_reports').insert({
      reporter_id: user.id, reported_id: r.autor_id,
      reason: 'Reseña inapropiada', context: 'review',
    });
    addToast({ message: 'Gracias. El equipo revisará esa reseña.', type: 'success' });
    supabase.functions.invoke('send-email', {
      body: { type: 'admin_reporte', data: { reason: 'Reseña inapropiada', context: 'reseña', reported_id: r.autor_id } },
    }).catch(() => {});
  };

  if (!disponible) return null;

  if (cargando) {
    return (
      <section className="card-white rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display font-black text-lg text-ink-primary flex items-center gap-2">
          <Star className="w-4 h-4 text-brand-orange fill-current" />
          Reputación de baile
          {resenas.length > 0 && <span className="text-ink-tertiary font-bold text-sm">({resenas.length})</span>}
        </h3>
        {puedo && !editando && (
          <button onClick={() => setEditando(true)} className="btn-orange text-xs px-4 py-2">
            {miResena ? 'Editar mi reseña' : 'Escribir una reseña'}
          </button>
        )}
      </div>

      {/* ── Formulario ── */}
      {editando && (
        <div className="card-white rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-ink-secondary uppercase tracking-wide">
            ¿Qué tal fue bailar con {nombre || 'esta persona'}?
          </p>
          <div className="flex flex-wrap gap-2">
            {CUALIDADES.map(c => (
              <button key={c} type="button"
                onClick={() => setTags(t => (t.includes(c) ? t.filter(x => x !== c) : [...t, c]))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  tags.includes(c)
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-surface-elevated text-ink-secondary border-hairline/30 hover:border-brand-orange/50'
                }`}>
                {tags.includes(c) && <Check className="w-3 h-3 inline mr-1" />}{c}
              </button>
            ))}
          </div>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} maxLength={400}
            placeholder="Me encantó bailar con ella, lleva muy bien el ritmo…"
            className="input-field resize-none" />
          <p className="text-[11px] text-ink-tertiary">
            Solo elogios. Si algo fue mal, no lo escribas aquí: repórtalo y lo verá el equipo,
            no el público.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setEditando(false)} className="flex-1 btn-outline text-sm py-2">Cancelar</button>
            {miResena && (
              <button onClick={borrar} disabled={guardando}
                className="px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={guardar} disabled={guardando} className="flex-[2] btn-orange text-sm py-2 disabled:opacity-50">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Publicar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Lista ── */}
      {resenas.length === 0 ? (
        <div className="card-white rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">💃</p>
          <p className="font-bold text-ink-primary text-sm">
            {esMiPerfil ? 'Todavía no tienes reseñas' : 'Todavía no tiene reseñas'}
          </p>
          <p className="text-ink-tertiary text-xs mt-1">
            {esMiPerfil
              ? 'Cuando bailes con alguien y coincidáis en un local, podrá dejarte una.'
              : 'Las reseñas solo las puede escribir quien coincidió con esta persona en un local.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {resenas.map(r => (
            <div key={r.id} className="card-white rounded-2xl p-3.5">
              <div className="flex items-start gap-3">
                <Avatar src={r.autor_avatar || ''} name={r.autor || 'Bailarín/a'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-ink-primary">{r.autor || 'Bailarín/a'}</p>
                    {r.es_mia && (
                      <span className="text-[10px] font-black bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded">
                        TU RESEÑA
                      </span>
                    )}
                    <span className="text-[11px] text-ink-tertiary">{fecha(r.cuando)}</span>
                  </div>
                  {r.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {r.tags.map(t => (
                        <span key={t} className="bg-surface-elevated-2 text-ink-secondary rounded-full px-2 py-0.5 text-[11px] font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.comment && (
                    <p className="text-sm text-ink-secondary mt-2 leading-relaxed whitespace-pre-wrap break-words">
                      {r.comment}
                    </p>
                  )}
                </div>
                {r.es_mia ? (
                  <button onClick={() => setEditando(true)} title="Editar"
                    className="p-1.5 rounded-lg text-ink-tertiary hover:bg-hairline/10 flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                ) : isAuthenticated && (
                  <button onClick={() => reportar(r)} title="Reportar esta reseña"
                    className="p-1.5 rounded-lg text-ink-tertiary hover:bg-hairline/10 flex-shrink-0">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default DanceReviews;
