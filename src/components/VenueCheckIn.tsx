import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Heart, Loader2, Shield, Eye, EyeOff, Flag, Ban, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

// ── "Quién estuvo aquí" ─────────────────────────────────────────────────────
// Resuelve el caso real: bailas con alguien toda la noche y te vas sin saber su
// nombre. Marcas que estás en el local y luego puedes ver a quién más estuvo.
//
// La regla que gobierna todo el módulo es la RECIPROCIDAD: solo ve quién estuvo
// quien también estuvo, y solo de la misma noche. Sin eso, la lista sería el
// historial de ubicación de personas reales, abierto a cualquiera — una
// herramienta para seguir a alguien. La reciprocidad la aplica el RLS en la base
// de datos, no este archivo: aunque alguien llame a la API a mano, no la salta.

type Persona = {
  user_id: string;
  nombre: string | null;
  avatar: string | null;
  ciudad: string | null;
  cuando: string;
  ya_le_di_like: boolean;
  es_match: boolean;
};

const MOTIVOS = [
  'Comportamiento inapropiado',
  'Acoso o insistencia',
  'Perfil falso o suplantación',
  'Fotos ofensivas',
  'Otro',
];

const horaCorta = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const VenueCheckIn: React.FC<{ venueId: string; venueName: string }> = ({ venueId, venueName }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [cargando, setCargando] = useState(true);
  // null = aún no se sabe · false = el módulo no está instalado en la BD
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [miCheckin, setMiCheckin] = useState<{ id: string; visibility: string } | null>(null);
  const [gente, setGente] = useState<Persona[]>([]);
  const [marcando, setMarcando] = useState(false);
  const [match, setMatch] = useState<Persona | null>(null);
  const [reportando, setReportando] = useState<Persona | null>(null);

  const cargar = useCallback(async () => {
    if (!user) { setCargando(false); return; }
    // Vigente = no caducada. La misma ventana móvil que aplica el RLS, para que
    // lo que veo coincida con lo que la base de datos me deja ver.
    const { data, error } = await supabase
      .from('venue_checkins')
      .select('id, visibility')
      .eq('user_id', user.id)
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    // 42P01: la tabla todavía no existe. El módulo se oculta en lugar de
    // romper la página del local, que ya funciona.
    if (error && (error as any).code === '42P01') { setDisponible(false); setCargando(false); return; }
    setDisponible(true);
    setMiCheckin(data ? { id: data.id, visibility: data.visibility } : null);

    if (data) {
      const { data: lista } = await supabase.rpc('quien_estuvo', { p_venue_id: venueId });
      setGente((lista || []) as Persona[]);
    } else {
      setGente([]);
    }
    setCargando(false);
  }, [user, venueId]);

  useEffect(() => { setCargando(true); cargar().catch(() => setCargando(false)); }, [cargar]);

  const marcar = async () => {
    if (!isAuthenticated || !user) { navigate('/auth'); return; }
    setMarcando(true);
    const { error } = await supabase.from('venue_checkins').insert({ user_id: user.id, venue_id: venueId });
    // 23505: ya hay una presencia de esta noche que caducó pero cuya fila sigue
    // ahí. Se renueva en vez de fallar — para la persona es la misma acción.
    if (error && (error as any).code === '23505') {
      await supabase.from('venue_checkins')
        .update({ expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(), visibility: 'todos' })
        .eq('user_id', user.id).eq('venue_id', venueId);
      setMarcando(false);
      addToast({ message: `Estás en ${venueName}. Caduca en 12 h.`, type: 'success' });
      cargar();
      return;
    }
    setMarcando(false);
    if (error) { addToast({ message: 'No se pudo marcar tu presencia', type: 'error' }); return; }
    addToast({ message: `Estás en ${venueName}. Caduca en 12 h.`, type: 'success' });
    cargar();
  };

  const borrarMarca = async () => {
    if (!miCheckin) return;
    setMarcando(true);
    await supabase.from('venue_checkins').delete().eq('id', miCheckin.id);
    setMarcando(false);
    addToast({ message: 'Ya no apareces en este local', type: 'success' });
    cargar();
  };

  const cambiarVisibilidad = async () => {
    if (!miCheckin) return;
    const nueva = miCheckin.visibility === 'todos' ? 'privado' : 'todos';
    await supabase.from('venue_checkins').update({ visibility: nueva }).eq('id', miCheckin.id);
    setMiCheckin({ ...miCheckin, visibility: nueva });
    addToast({
      message: nueva === 'todos' ? 'Vuelves a ser visible aquí' : 'Ahora nadie te ve en este local',
      type: 'success',
    });
  };

  const darLike = async (p: Persona) => {
    if (!user) return;
    const { error } = await supabase.from('partner_likes').insert({ from_user: user.id, to_user: p.user_id });
    if (error) return;
    // Si ya me había dado like, es match. Lo confirma la recarga, pero el aviso
    // se muestra al momento: el servidor ya devolvió si existe el like inverso.
    const recibido = gente.find(x => x.user_id === p.user_id);
    setGente(g => g.map(x => (x.user_id === p.user_id ? { ...x, ya_le_di_like: true } : x)));
    const { data: inverso } = await supabase
      .from('partner_likes').select('from_user')
      .eq('from_user', p.user_id).eq('to_user', user.id).maybeSingle();
    if (inverso) {
      setGente(g => g.map(x => (x.user_id === p.user_id ? { ...x, es_match: true } : x)));
      setMatch(recibido || p);
    } else {
      addToast({ message: 'Le has dado like. Si te corresponde, haréis match.', type: 'success' });
    }
  };

  const bloquear = async (p: Persona) => {
    if (!user) return;
    await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: p.user_id });
    setGente(g => g.filter(x => x.user_id !== p.user_id));
    addToast({ message: 'Bloqueado. No volveréis a veros.', type: 'success' });
  };

  const enviarReporte = async (p: Persona, motivo: string) => {
    if (!user) return;
    await supabase.from('user_reports').insert({
      reporter_id: user.id, reported_id: p.user_id, reason: motivo, context: `venue:${venueId}`,
    });
    setReportando(null);
    addToast({ message: 'Gracias. El equipo lo revisará.', type: 'success' });
  };

  // El módulo aún no está instalado en la base de datos: no se muestra nada.
  if (disponible === false) return null;

  if (!isAuthenticated) {
    return (
      <section className="card-white rounded-2xl p-5 text-center">
        <p className="text-3xl mb-2">💃</p>
        <h3 className="font-display font-black text-lg text-ink-primary">¿Bailaste con alguien aquí?</h3>
        <p className="text-ink-tertiary text-sm mt-1 mb-4 max-w-sm mx-auto">
          Marca que estás en {venueName} y podrás ver a quién más estuvo esta noche.
        </p>
        <button onClick={() => navigate('/auth')} className="btn-orange px-6 py-2.5 text-sm">Entrar</button>
      </section>
    );
  }

  if (cargando) {
    return (
      <section className="card-white rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* ── Marcar presencia ── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand via-brand-secondary to-fuchsia-700 p-5 text-white">
        {!miCheckin ? (
          <>
            <h3 className="font-display font-black text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Estoy aquí
            </h3>
            <p className="text-white/85 text-sm mt-1.5 max-w-md">
              Marca tu presencia en {venueName} y verás a quién más estuvo esta noche. Solo te
              ven las personas que también se han marcado aquí.
            </p>
            <button onClick={marcar} disabled={marcando}
              className="mt-4 bg-white text-brand font-black rounded-xl px-6 py-2.5 text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-60">
              {marcando ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Marcar que estoy aquí'}
            </button>
          </>
        ) : (
          <>
            <h3 className="font-display font-black text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Estás en {venueName}
            </h3>
            <p className="text-white/85 text-sm mt-1.5">
              {miCheckin.visibility === 'todos'
                ? 'Apareces para las demás personas que se han marcado aquí hoy.'
                : 'Estás en modo invisible: ves la lista, pero nadie te ve a ti.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={cambiarVisibilidad}
                className="bg-white/15 hover:bg-white/25 backdrop-blur text-white font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-colors">
                {miCheckin.visibility === 'todos'
                  ? <><EyeOff className="w-3.5 h-3.5" /> Hacerme invisible</>
                  : <><Eye className="w-3.5 h-3.5" /> Volver a ser visible</>}
              </button>
              <button onClick={borrarMarca} disabled={marcando}
                className="bg-white/15 hover:bg-white/25 backdrop-blur text-white font-bold rounded-xl px-4 py-2 text-xs transition-colors disabled:opacity-60">
                Ya no estoy aquí
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Nota de privacidad: visible siempre, no escondida en los ajustes ── */}
      <div className="flex gap-2.5 rounded-xl bg-surface-elevated-2 p-3.5 text-xs text-ink-tertiary">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-ink-secondary" />
        <p>
          Tu presencia caduca a las 12 horas y solo la ven quienes también se marcaron en este
          local hoy. Puedes borrarla cuando quieras. BailaNow no usa tu ubicación: solo apareces
          si lo marcas tú.
        </p>
      </div>

      {/* ── Quién estuvo ── */}
      {miCheckin && (
        <div>
          <h4 className="font-display font-black text-lg text-ink-primary mb-3">
            Quién estuvo aquí hoy {gente.length > 0 && <span className="text-ink-tertiary font-bold text-sm">({gente.length})</span>}
          </h4>

          {gente.length === 0 ? (
            <div className="card-white rounded-2xl p-6 text-center">
              <p className="text-3xl mb-2">🕺</p>
              <p className="font-bold text-ink-primary text-sm">Todavía no hay nadie más</p>
              <p className="text-ink-tertiary text-xs mt-1">
                Eres la primera persona en marcarse hoy. Vuelve más tarde.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gente.map(p => (
                <div key={p.user_id} className="card-white rounded-2xl overflow-hidden group">
                  <div className="relative aspect-square bg-surface-elevated-2">
                    {p.avatar
                      ? <img src={p.avatar} alt={p.nombre || ''} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">💃</div>}
                    {p.es_match && (
                      <span className="absolute top-2 left-2 bg-brand-orange text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Match
                      </span>
                    )}
                    <span className="absolute bottom-2 right-2 bg-black/55 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {horaCorta(p.cuando)}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="font-bold text-sm text-ink-primary truncate">{p.nombre || 'Bailarín/a'}</p>
                    {p.ciudad && <p className="text-[11px] text-ink-tertiary truncate">{p.ciudad}</p>}

                    <div className="flex items-center gap-1.5 mt-2">
                      {p.es_match ? (
                        <button onClick={() => navigate(`/chat?con=${p.user_id}`)}
                          className="flex-1 bg-brand-orange text-white font-bold rounded-lg py-1.5 text-xs">
                          Escribir
                        </button>
                      ) : (
                        <button onClick={() => darLike(p)} disabled={p.ya_le_di_like}
                          className={`flex-1 font-bold rounded-lg py-1.5 text-xs flex items-center justify-center gap-1 transition-colors ${
                            p.ya_le_di_like
                              ? 'bg-surface-elevated-2 text-ink-tertiary'
                              : 'bg-brand-orange text-white hover:opacity-90'
                          }`}>
                          <Heart className={`w-3.5 h-3.5 ${p.ya_le_di_like ? '' : 'fill-current'}`} />
                          {p.ya_le_di_like ? 'Enviado' : 'Me interesa'}
                        </button>
                      )}
                      <button onClick={() => setReportando(p)} title="Reportar"
                        className="p-1.5 rounded-lg text-ink-tertiary hover:bg-hairline/10 hover:text-ink-secondary transition-colors">
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => bloquear(p)} title="Bloquear"
                        className="p-1.5 rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Match ── */}
      {match && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setMatch(null)}>
          <div className="card-white rounded-3xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <p className="text-5xl mb-2">💞</p>
            <h3 className="font-display font-black text-2xl text-ink-primary">¡Match!</h3>
            <p className="text-ink-tertiary text-sm mt-1">
              A {match.nombre || 'esta persona'} también le interesas. Coincidisteis en {venueName}.
            </p>
            <button onClick={() => { setMatch(null); navigate(`/chat?con=${match.user_id}`); }}
              className="btn-orange w-full mt-4 py-2.5 text-sm">Escribirle ahora</button>
            <button onClick={() => setMatch(null)}
              className="w-full mt-2 py-2 text-xs font-bold text-ink-tertiary">Seguir mirando</button>
          </div>
        </div>
      )}

      {/* ── Reportar ── */}
      {reportando && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setReportando(null)}>
          <div className="card-white rounded-3xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display font-black text-lg text-ink-primary">
                Reportar a {reportando.nombre || 'esta persona'}
              </h3>
              <button onClick={() => setReportando(null)} className="text-ink-tertiary hover:text-ink-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-ink-tertiary text-xs mt-1">
              Solo lo verá el equipo de BailaNow. La persona reportada no recibe aviso.
            </p>
            <div className="mt-3 space-y-1.5">
              {MOTIVOS.map(m => (
                <button key={m} onClick={() => enviarReporte(reportando, m)}
                  className="w-full text-left text-sm font-semibold text-ink-secondary bg-surface-elevated-2 hover:bg-hairline/10 rounded-xl px-3.5 py-2.5 transition-colors">
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VenueCheckIn;
