import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Loader2, AlertTriangle, CheckCircle, XCircle, Eye, ExternalLink, MapPin, MessageSquare } from 'lucide-react';
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
                    </div>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 flex gap-2.5">
        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
        <p>
          "Acción tomada" solo deja constancia de la decisión: no suspende la cuenta ni avisa a nadie.
          Para suspender a alguien hay que hacerlo desde <strong>Usuarios</strong>.
        </p>
      </div>
    </div>
  );
};

export default ReportsAdminSection;
