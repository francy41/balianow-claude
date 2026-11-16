import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, QrCode, UserCheck, Undo2, Users, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';

// ── Panel del local: confirmar quién estuvo de verdad ───────────────────────
// Para que alguien aparezca en la lista del local no basta con que lo diga: el
// local tiene que confirmarlo. Hay dos vías. El QR de la entrada lo hace solo
// cuando la puerta lo escanea. Esta pantalla cubre la otra: entrada libre,
// lista, invitación — el local marca a mano a quien reconoce.
//
// Solo la ve el dueño del local. La comprobación está en las funciones de
// Postgres, no aquí.

type Presencia = {
  user_id: string;
  nombre: string | null;
  avatar: string | null;
  genero: string | null;
  verificado: boolean;
  via: string | null;
  sigue: boolean;
  cuando: string;
};

const hora = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const VenuePresencePanel: React.FC<{ venueId: string; venueName: string }> = ({ venueId, venueName }) => {
  const { addToast } = useUIStore();
  const [gente, setGente] = useState<Presencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('presencias_del_local', { p_venue: venueId });
    if (error) { setGente([]); setCargando(false); return; }
    setGente((data || []) as Presencia[]);
    setCargando(false);
  }, [venueId]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  const confirmar = async (p: Presencia) => {
    setTrabajando(p.user_id);
    const { data, error } = await supabase.rpc('confirmar_presencia', { p_user: p.user_id, p_venue: venueId });
    setTrabajando(null);
    if (error) { addToast({ message: `No se pudo confirmar: ${error.message}`, type: 'error' }); return; }
    if (data === false) { addToast({ message: 'Su presencia ya caducó', type: 'warning' }); cargar(); return; }
    addToast({ message: `Confirmado: ${p.nombre || 'esa persona'} estuvo aquí`, type: 'success' });
    cargar();
  };

  const retirar = async (p: Presencia) => {
    setTrabajando(p.user_id);
    const { error } = await supabase.rpc('retirar_presencia', { p_user: p.user_id, p_venue: venueId });
    setTrabajando(null);
    if (error) { addToast({ message: `No se pudo retirar: ${error.message}`, type: 'error' }); return; }
    addToast({ message: 'Confirmación retirada', type: 'success' });
    cargar();
  };

  const verificados = gente.filter(g => g.verificado).length;
  const pendientes = gente.length - verificados;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gray-900 dark:bg-black p-5 text-white">
        <h3 className="font-display font-black text-xl flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> Presencia de hoy en {venueName}
        </h3>
        <p className="text-white/70 text-sm mt-1.5 max-w-xl">
          Confirma a quien reconozcas. Sin confirmar, los hombres no aparecen en la lista pública
          del local ni pueden verla. Las entradas escaneadas en la puerta se confirman solas.
        </p>
        <div className="flex gap-5 mt-4">
          <div><p className="text-2xl font-black">{gente.length}</p><p className="text-white/60 text-xs font-bold">Marcados</p></div>
          <div><p className="text-2xl font-black text-green-400">{verificados}</p><p className="text-white/60 text-xs font-bold">Confirmados</p></div>
          <div><p className="text-2xl font-black text-yellow-400">{pendientes}</p><p className="text-white/60 text-xs font-bold">Sin confirmar</p></div>
        </div>
      </div>

      {cargando ? (
        <div className="card-white rounded-2xl p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
        </div>
      ) : gente.length === 0 ? (
        <div className="card-white rounded-2xl p-6 text-center">
          <Users className="w-10 h-10 text-ink-tertiary/40 mx-auto mb-2" />
          <p className="font-bold text-ink-primary text-sm">Nadie se ha marcado todavía</p>
          <p className="text-ink-tertiary text-xs mt-1">
            Aparecerán aquí en cuanto alguien marque que está en tu local.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {gente.map(p => (
            <div key={p.user_id}
              className={`card-white rounded-xl p-3 flex items-center gap-3 ${
                p.verificado ? '' : 'border-l-4 border-l-yellow-400'
              }`}>
              {p.avatar
                ? <img src={p.avatar} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                : <div className="w-11 h-11 rounded-full bg-surface-elevated-2 flex items-center justify-center flex-shrink-0">💃</div>}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-ink-primary truncate">{p.nombre || 'Bailarín/a'}</p>
                  {p.verificado && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      p.via === 'qr' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {p.via === 'qr' ? <><QrCode className="w-2.5 h-2.5" /> ENTRADA QR</> : <><UserCheck className="w-2.5 h-2.5" /> CONFIRMADO</>}
                    </span>
                  )}
                  {p.genero && (
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">{p.genero}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-tertiary mt-0.5">
                  <span>{hora(p.cuando)}</span>
                  <span className={`flex items-center gap-1 ${p.sigue ? 'text-brand' : ''}`}>
                    <Heart className={`w-3 h-3 ${p.sigue ? 'fill-current' : ''}`} />
                    {p.sigue ? 'Te sigue' : 'No te sigue'}
                  </span>
                </div>
              </div>

              {p.verificado ? (
                p.via === 'local' ? (
                  <button onClick={() => retirar(p)} disabled={trabajando === p.user_id}
                    className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-surface-elevated-2 text-ink-secondary hover:bg-hairline/10 flex items-center gap-1.5 disabled:opacity-50">
                    {trabajando === p.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                    Retirar
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-[11px] text-ink-tertiary px-2" title="La respalda una entrada escaneada en la puerta">
                    Por entrada
                  </span>
                )
              ) : (
                <button onClick={() => confirmar(p)} disabled={trabajando === p.user_id}
                  className="flex-shrink-0 btn-orange text-xs px-3 py-2 flex items-center gap-1.5 disabled:opacity-50">
                  {trabajando === p.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Confirmar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-tertiary">
        Confirma solo a quien de verdad hayas visto en el local. Esta confirmación es lo que
        permite a esa persona aparecer y contactar con otras.
      </p>
    </section>
  );
};

export default VenuePresencePanel;
