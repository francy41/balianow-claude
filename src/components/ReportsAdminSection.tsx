import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Loader2, AlertTriangle, CheckCircle, XCircle, Eye, ExternalLink, MapPin, MessageSquare, Ban, RotateCcw, Clock, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Panel de reportes ───────────────────────────────────────────────────────
// Los reportes llegan de la lista de un local y del chat. Lo que decide si hay
// que actuar casi nunca es un reporte suelto, sino la reincidencia: por eso la
// función `reportes_admin()` devuelve cuántas veces se ha reportado a esa misma
// persona, y la lista empieza por quien acumula más.

type Reporte = {
  id: string;
  reporter_id: string;
  reporter: string | null;
  reported_id: string;
  reported: string | null;
  reported_avatar: string | null;
  reason: string;
  context: string | null;
  status: 'pendiente' | 'revisado' | 'accion_tomada' | 'descartado';
  created_at: string;
  veces_reportado: number;
  reported_suspendido: boolean;
  reported_rol: string | null;
  acceso_bloqueado: boolean;
};

type Historial = { accion: string; motivo: string | null; admin: string | null; cuando: string };
type ResenaRep = {
  id: string; tags: string[]; comment: string | null;
  autor: string | null; destino: string | null; destino_id: string; cuando: string;
};

// El contexto de un reporte sobre una reseña es 'review:<id>'. El antiguo era
// solo 'review', sin decir cuál — esos no se pueden abrir desde aquí.
const idDeResena = (c: string | null) => {
  if (!c || !c.startsWith('review:')) return null;
  const id = c.slice(7);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
};

const ESTADOS = {
  pendiente:     { label: '⏳ Pendiente',   clase: 'bg-yellow-100 text-yellow-800' },
  revisado:      { label: '👁 Revisado',     clase: 'bg-blue-100 text-blue-800' },
  accion_tomada: { label: '⚠️ Acción tomada', clase: 'bg-red-100 text-red-800' },
  descartado:    { label: '✓ Descartado',   clase: 'bg-gray-100 text-gray-600' },
} as const;

interface Props {
  addToast: (opts: { message: string; type: 'success' | 'error' | 'warning' }) => void;
}

const ReportsAdminSection: React.FC<Props> = ({ addToast }) => {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | Reporte['status']>('pendiente');
  const [historial, setHistorial] = useState<Record<string, Historial[]>>({});
  const [resenas, setResenas] = useState<Record<string, ResenaRep | null>>({});
  const [margen, setMargen] = useState<string>('');
  const [margenGuardando, setMargenGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase.rpc('reportes_admin');
    if (error) {
      // 42883: la función no existe todavía — falta aplicar el SQL.
      addToast({
        message: (error as any).code === '42883'
          ? 'Falta aplicar supabase/presencia-verificada.sql'
          : `Error cargando reportes: ${error.message}`,
        type: 'error',
      });
      setReportes([]);
    } else {
      setReportes((data || []) as Reporte[]);
    }
    setCargando(false);
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    supabase.from('site_config').select('value').eq('key', 'checkin_margen_seguir_minutos').maybeSingle()
      .then(({ data }) => setMargen(String(data?.value ?? 120)), () => setMargen('120'));
  }, []);

  const guardarMargen = async () => {
    const n = Number(margen);
    if (!Number.isFinite(n) || n < 0) { addToast({ message: 'Pon un número de minutos', type: 'warning' }); return; }
    setMargenGuardando(true);
    const { error } = await supabase.from('site_config')
      .upsert({ key: 'checkin_margen_seguir_minutos', value: n as any }, { onConflict: 'key' });
    setMargenGuardando(false);
    addToast({
      message: error ? `No se pudo guardar: ${error.message}` : `Margen guardado: ${n} minutos`,
      type: error ? 'error' : 'success',
    });
  };

  // Suspender hace dos cosas que viven en sitios distintos: cortar la parte
  // social (base de datos) y cerrar el acceso (auth, por la función de borde).
  // Si la segunda falla, la primera ya está aplicada y se dice claramente —
  // callarlo dejaría al equipo creyendo que la cuenta está cerrada.
  const suspender = async (r: Reporte) => {
    const motivo = window.prompt(
      `¿Por qué suspendes a ${r.reported || 'esta persona'}?\n\n` +
      'Desaparecerá de los locales, no podrá escribir ni dar likes, y no podrá iniciar sesión.\n' +
      'Quedará registrado con tu nombre.');
    if (motivo === null) return;
    setGuardando(r.id);

    const { error } = await supabase.rpc('suspender_usuario', { p_user: r.reported_id, p_motivo: motivo });
    if (error) { setGuardando(null); addToast({ message: error.message, type: 'error' }); return; }

    const { data: acc, error: errAcc } = await supabase.functions.invoke('moderar-cuenta', {
      body: { user_id: r.reported_id, accion: 'bloquear' },
    });
    setGuardando(null);

    await supabase.from('user_reports').update({ status: 'accion_tomada' }).eq('id', r.id);
    addToast({
      message: errAcc || !acc?.ok
        ? `${r.reported || 'Cuenta'} suspendida, pero NO se pudo cerrar su acceso. Hazlo en Supabase → Authentication.`
        : `${r.reported || 'Cuenta'} suspendida y acceso cerrado`,
      type: errAcc || !acc?.ok ? 'warning' : 'success',
    });
    cargar();
  };

  const reactivar = async (r: Reporte) => {
    if (!window.confirm(`¿Reactivar la cuenta de ${r.reported || 'esta persona'} y devolverle el acceso?`)) return;
    setGuardando(r.id);
    const { error } = await supabase.rpc('reactivar_usuario', { p_user: r.reported_id });
    const { error: errAcc } = await supabase.functions.invoke('moderar-cuenta', {
      body: { user_id: r.reported_id, accion: 'desbloquear' },
    });
    setGuardando(null);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({
      message: errAcc
        ? 'Reactivada, pero su acceso sigue bloqueado. Revísalo en Supabase → Authentication.'
        : 'Cuenta reactivada y acceso devuelto',
      type: errAcc ? 'warning' : 'success',
    });
    cargar();
  };

  const verResena = async (r: Reporte) => {
    const id = idDeResena(r.context);
    if (!id) return;
    if (resenas[r.id] !== undefined) {
      setResenas(s => { const n = { ...s }; delete n[r.id]; return n; });
      return;
    }
    const { data } = await supabase.rpc('resena_reportada', { p_id: id });
    const fila = (Array.isArray(data) ? data[0] : data) as ResenaRep | undefined;
    setResenas(s => ({ ...s, [r.id]: fila ?? null }));
  };

  const retirarResena = async (r: Reporte) => {
    const id = idDeResena(r.context);
    if (!id) return;
    if (!window.confirm('¿Retirar esta reseña? Desaparecerá del perfil de quien la recibió.')) return;
    setGuardando(r.id);
    const { error } = await supabase.rpc('retirar_resena', { p_id: id, p_motivo: 'Reportada' });
    setGuardando(null);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Reseña retirada', type: 'success' });
    setResenas(s => ({ ...s, [r.id]: null }));
    await supabase.from('user_reports').update({ status: 'accion_tomada' }).eq('id', r.id);
    cargar();
  };

  const verHistorial = async (r: Reporte) => {
    if (historial[r.reported_id]) {
      setHistorial(h => { const n = { ...h }; delete n[r.reported_id]; return n; });
      return;
    }
    const { data } = await supabase.rpc('historial_moderacion', { p_user: r.reported_id });
    setHistorial(h => ({ ...h, [r.reported_id]: (data || []) as Historial[] }));
  };

  const cambiarEstado = async (r: Reporte, status: Reporte['status']) => {
    setGuardando(r.id);
    const { error } = await supabase.from('user_reports').update({ status }).eq('id', r.id);
    setGuardando(null);
    if (error) { addToast({ message: `No se pudo guardar: ${error.message}`, type: 'error' }); return; }
    setReportes(prev => prev.map(x => (x.id === r.id ? { ...x, status } : x)));
    addToast({ message: `Reporte marcado como ${ESTADOS[status].label.replace(/^\S+\s/, '')}`, type: 'success' });
  };

  // Reincidentes primero: es el dato que de verdad pide una decisión.
  const visibles = useMemo(() => {
    const lista = filtro === 'todos' ? reportes : reportes.filter(r => r.status === filtro);
    return [...lista].sort((a, b) =>
      b.veces_reportado - a.veces_reportado ||
      b.created_at.localeCompare(a.created_at));
  }, [reportes, filtro]);

  const pendientes = reportes.filter(r => r.status === 'pendiente').length;

  // Personas con 3 o más reportes acumulados.
  const reincidentes = useMemo(() => {
    const m = new Map<string, { nombre: string; veces: number }>();
    reportes.forEach(r => {
      if (r.veces_reportado >= 3) m.set(r.reported_id, { nombre: r.reported || 'Sin nombre', veces: r.veces_reportado });
    });
    return [...m.entries()];
  }, [reportes]);

  const contexto = (c: string | null) => {
    if (!c) return null;
    if (c === 'chat') return <span className="flex items-center gap-1 text-gray-500"><MessageSquare className="w-3 h-3" /> Chat</span>;
    if (c === 'review' || c.startsWith('review:')) return <span className="flex items-center gap-1 text-gray-500"><Star className="w-3 h-3" /> Reseña de baile</span>;
    if (c.startsWith('venue:')) return (
      <a href={`/venues/${c.slice(6)}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-1 text-brand hover:underline">
        <MapPin className="w-3 h-3" /> Ver local
      </a>
    );
    return <span className="text-gray-500">{c}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl text-gray-900 flex items-center gap-2">
          🚨 Reportes de usuarios
          {pendientes > 0 && (
            <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">{pendientes}</span>
          )}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Reportes enviados desde la lista de un local y desde el chat. La persona reportada nunca recibe aviso.
        </p>
      </div>

      {/* Reincidentes: lo primero que hay que ver */}
      {reincidentes.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-black text-red-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Reincidentes · 3 o más reportes
          </p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {reincidentes.map(([id, info]) => (
              <span key={id} className="bg-white border border-red-200 rounded-lg px-2.5 py-1 text-xs font-bold text-red-700">
                {info.nombre} · {info.veces}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['Pendientes',    'pendiente',     'bg-yellow-50 border-yellow-200 text-yellow-700'],
          ['Revisados',     'revisado',      'bg-blue-50 border-blue-200 text-blue-700'],
          ['Acción tomada', 'accion_tomada', 'bg-red-50 border-red-200 text-red-700'],
          ['Descartados',   'descartado',    'bg-gray-50 border-gray-200 text-gray-600'],
        ] as const).map(([label, estado, color]) => (
          <button key={estado} onClick={() => setFiltro(estado)}
            className={`rounded-xl border p-4 text-center transition-all ${color} ${
              filtro === estado ? 'ring-2 ring-offset-1 ring-gray-400' : 'hover:opacity-80'
            }`}>
            <p className="text-2xl font-black">{reportes.filter(r => r.status === estado).length}</p>
            <p className="text-xs font-bold mt-1">{label}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setFiltro('todos')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            filtro === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          Ver todos ({reportes.length})
        </button>
        <button onClick={cargar} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
          Recargar
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-gray-400 text-sm mt-2">Cargando reportes…</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-12">
          <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">
            {filtro === 'pendiente' ? 'No hay reportes pendientes' : 'No hay reportes con este estado'}
          </p>
          <p className="text-gray-400 text-sm mt-1">Buena señal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map(r => (
            <div key={r.id}
              className={`bg-white border rounded-xl p-4 ${
                r.veces_reportado >= 3 ? 'border-red-300 border-l-4 border-l-red-500' : 'border-gray-200'
              }`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex gap-3 flex-1 min-w-[260px]">
                  {r.reported_avatar
                    ? <img src={r.reported_avatar} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">💃</div>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.reported || '(sin nombre)'}</p>
                      {r.reported_suspendido && (
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black">SUSPENDIDO</span>
                      )}
                      {r.acceso_bloqueado && (
                        <span className="bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-black">SIN ACCESO</span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ESTADOS[r.status].clase}`}>
                        {ESTADOS[r.status].label}
                      </span>
                      {r.veces_reportado > 1 && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black">
                          {r.veces_reportado} reportes
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1.5 font-medium">{r.reason}</p>
                    <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
                      <span className="text-gray-500">
                        Lo reportó <strong className="text-gray-700">{r.reporter || '(sin nombre)'}</strong>
                      </span>
                      {contexto(r.context)}
                      <span className="text-gray-400">{new Date(r.created_at).toLocaleString('es-ES')}</span>
                      <a href={`/u/${r.reported_id}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-brand hover:underline">
                        <ExternalLink className="w-3 h-3" /> Ver perfil
                      </a>
                      <button onClick={() => verHistorial(r)} className="text-gray-500 hover:underline">
                        {historial[r.reported_id] ? 'Ocultar historial' : 'Historial'}
                      </button>
                      {idDeResena(r.context) && (
                        <button onClick={() => verResena(r)} className="text-brand hover:underline font-bold">
                          {resenas[r.id] !== undefined ? 'Ocultar reseña' : 'Ver la reseña'}
                        </button>
                      )}
                    </div>

                    {resenas[r.id] !== undefined && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                        {resenas[r.id] === null ? (
                          <p className="text-[11px] text-gray-500">Esta reseña ya no existe.</p>
                        ) : (
                          <>
                            <p className="text-[11px] text-gray-500">
                              De <strong>{resenas[r.id]!.autor || '—'}</strong> sobre{' '}
                              <strong>{resenas[r.id]!.destino || '—'}</strong>
                            </p>
                            {resenas[r.id]!.tags?.length > 0 && (
                              <p className="text-[11px] text-gray-600 mt-1">{resenas[r.id]!.tags.join(' · ')}</p>
                            )}
                            {resenas[r.id]!.comment && (
                              <p className="text-sm text-gray-800 mt-1.5 italic">"{resenas[r.id]!.comment}"</p>
                            )}
                            <button onClick={() => retirarResena(r)} disabled={guardando === r.id}
                              className="mt-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                              Retirar reseña
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {historial[r.reported_id] && (
                      <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                        {historial[r.reported_id].length === 0 ? (
                          <p className="text-[11px] text-gray-500">Sin acciones de moderación previas.</p>
                        ) : historial[r.reported_id].map((h, i) => (
                          <p key={i} className="text-[11px] text-gray-600">
                            <strong>{h.accion === 'suspender' ? 'Suspendido' : 'Reactivado'}</strong>
                            {h.admin ? ` por ${h.admin}` : ''} · {new Date(h.cuando).toLocaleString('es-ES')}
                            {h.motivo ? ` — ${h.motivo}` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button onClick={() => cambiarEstado(r, 'revisado')} disabled={guardando === r.id || r.status === 'revisado'}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-40">
                    {guardando === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    Revisado
                  </button>
                  <button onClick={() => cambiarEstado(r, 'accion_tomada')} disabled={guardando === r.id || r.status === 'accion_tomada'}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40">
                    <AlertTriangle className="w-3.5 h-3.5" /> Acción tomada
                  </button>
                  <button onClick={() => cambiarEstado(r, 'descartado')} disabled={guardando === r.id || r.status === 'descartado'}
                    className="flex items-center gap-1.5 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-300 disabled:opacity-40">
                    <XCircle className="w-3.5 h-3.5" /> Descartar
                  </button>
                  {/* Un administrador no puede suspender a otro: lo rechaza la
                      función en Postgres, así que aquí no se ofrece. */}
                  {r.reported_rol !== 'admin' && r.reported_rol !== 'superadmin' && (
                    r.reported_suspendido ? (
                      <button onClick={() => reactivar(r)} disabled={guardando === r.id}
                        className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40">
                        <RotateCcw className="w-3.5 h-3.5" /> Reactivar
                      </button>
                    ) : (
                      <button onClick={() => suspender(r)} disabled={guardando === r.id}
                        className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-black disabled:opacity-40">
                        <Ban className="w-3.5 h-3.5" /> Suspender cuenta
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Regla de presencia, ajustable sin tocar código ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="font-black text-gray-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" /> Margen para seguir un local
        </p>
        <p className="text-xs text-gray-500 mt-1 max-w-2xl">
          Cuánto tiempo antes de marcarse tiene que seguir el local un hombre para que su
          presencia cuente. Con margen 0 basta con pulsar "Seguir" justo antes, que casi no
          filtra nada. Por defecto 120 minutos.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <input type="number" min={0} value={margen} onChange={e => setMargen(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <span className="text-xs font-bold text-gray-500">minutos</span>
          <button onClick={guardarMargen} disabled={margenGuardando}
            className="bg-brand-orange text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50">
            {margenGuardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
        <p className="flex gap-2.5">
          <Ban className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>
            <strong>Suspender</strong> hace dos cosas a la vez: la persona desaparece de los locales,
            no puede dar likes ni escribir mensajes y sus reseñas dejan de mostrarse;{' '}
            <strong>y además se le cierra el acceso</strong> y se cierran sus sesiones abiertas.
            Queda registrado con tu nombre y el motivo, y se deshace con "Reactivar".
            <br />
            Si el cierre de acceso falla, el aviso lo dice y queda pendiente en Supabase
            (Authentication → Users).
          </span>
        </p>
        <p className="flex gap-2.5">
          <Star className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>
            Los reportes de <strong>reseña de baile</strong> traen un enlace "Ver la reseña": se lee
            y se retira desde aquí, sin salir del panel.
          </span>
        </p>
        <p className="flex gap-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>"Acción tomada" por sí solo únicamente deja constancia de la decisión.</span>
        </p>
      </div>
    </div>
  );
};

export default ReportsAdminSection;
