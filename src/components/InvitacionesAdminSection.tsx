import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Send, Search, CheckCircle, AlertTriangle, Instagram, Save, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Invitaciones para reclamar perfil ───────────────────────────────────────
// Los 189 perfiles importados (artistas y locales) están publicados pero sin
// dueño. Esto invita a sus dueños reales a reclamarlos.
//
// TRES COSAS QUE ESTA PANTALLA HACE A PROPÓSITO
//
// 1. Enseña los perfiles SIN contacto además de los que lo tienen. Sin eso,
//    una lista vacía no explicaría nada: el trabajo de verdad es conseguir los
//    correos, no pulsar "enviar".
//
// 2. No permite reenviar. `profile_invites` tiene clave única por perfil y
//    canal: una invitación por sitio. A gente que no se ha registrado, repetir
//    el envío es la diferencia entre invitación y spam.
//
// 3. Envía de uno en uno con una pausa. Soltar 189 correos en el mismo segundo
//    desde un dominio nuevo es la forma más rápida de acabar en la carpeta de
//    no deseados y de quemar el dominio para siempre.

type Fila = {
  target_type: 'artist' | 'venue';
  target_id: string;
  nombre: string | null;
  ciudad: string | null;
  avatar: string | null;
  email: string | null;
  instagram: string | null;
  estado: string | null;
  enviado_at: string | null;
};

interface Props {
  addToast: (o: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

// Pausa entre envíos. No es por los límites de Resend, es por reputación:
// un goteo parece una persona, una ráfaga parece una máquina.
const PAUSA_MS = 1200;

const esEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const InvitacionesAdminSection: React.FC<Props> = ({ addToast }) => {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [disponible, setDisponible] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'con-email' | 'sin-email' | 'enviados'>('con-email');
  const [borradores, setBorradores] = useState<Record<string, { email: string; instagram: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });

  const clave = (f: Fila) => `${f.target_type}:${f.target_id}`;

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase.rpc('perfiles_por_invitar');
    if (error) {
      if ((error as any).code === '42883') setDisponible(false);
      else addToast({ message: `No se pudo cargar: ${error.message}`, type: 'error' });
      setFilas([]);
    } else {
      setFilas((data || []) as Fila[]);
    }
    setCargando(false);
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarContacto = async (f: Fila) => {
    const b = borradores[clave(f)] ?? { email: f.email ?? '', instagram: f.instagram ?? '' };
    if (b.email.trim() && !esEmail(b.email)) {
      addToast({ message: 'Ese email no tiene buena pinta', type: 'warning' });
      return;
    }
    setGuardando(clave(f));
    const { error } = await supabase.rpc('guardar_contacto_perfil', {
      p_tipo: f.target_type, p_id: f.target_id,
      p_email: b.email, p_instagram: b.instagram,
    });
    setGuardando(null);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Contacto guardado', type: 'success' });
    cargar();
  };

  // Una invitación por perfil. La fila en `profile_invites` se crea ANTES de
  // llamar al correo: si el envío falla, queda constancia del intento y de su
  // error en lugar de desaparecer sin rastro.
  const invitar = async (f: Fila): Promise<boolean> => {
    const destino = (f.email ?? '').trim();
    if (!esEmail(destino)) return false;

    const { data: fila, error: errIns } = await supabase.from('profile_invites').insert({
      target_type: f.target_type,
      target_id: f.target_id,
      target_name: f.nombre,
      canal: 'email',
      destino,
    }).select('token').single();

    // 23505: ya se invitó antes. No es un fallo: es la protección funcionando.
    if (errIns) return false;

    const { error: errMail } = await supabase.functions.invoke('send-email', {
      body: {
        to: destino,
        type: 'invitacion_perfil',
        data: { nombre: f.nombre, ciudad: f.ciudad, token: fila.token },
      },
    });

    await supabase.from('profile_invites')
      .update(errMail
        ? { estado: 'fallido', error: String(errMail).slice(0, 300) }
        : { estado: 'enviado', enviado_at: new Date().toISOString() })
      .eq('target_type', f.target_type).eq('target_id', f.target_id).eq('canal', 'email');

    return !errMail;
  };

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return filas.filter(f => {
      if (t && !(f.nombre ?? '').toLowerCase().includes(t) && !(f.ciudad ?? '').toLowerCase().includes(t)) return false;
      const tiene = !!(f.email ?? '').trim();
      if (filtro === 'con-email') return tiene && !f.estado;
      if (filtro === 'sin-email') return !tiene;
      if (filtro === 'enviados') return !!f.estado;
      return true;
    });
  }, [filas, busqueda, filtro]);

  const enviables = visibles.filter(f => esEmail(f.email ?? '') && !f.estado);

  const enviarTanda = async () => {
    if (enviables.length === 0) return;
    if (!window.confirm(
      `Se enviará la invitación a ${enviables.length} perfil(es).\n\n` +
      'Va a gente que NO se ha registrado. Solo se envía una vez por perfil: ' +
      'no hay forma de deshacerlo.\n\n¿Continuar?')) return;

    setEnviando(true);
    setProgreso({ hechos: 0, total: enviables.length });
    let ok = 0;
    for (let i = 0; i < enviables.length; i++) {
      if (await invitar(enviables[i])) ok++;
      setProgreso({ hechos: i + 1, total: enviables.length });
      if (i < enviables.length - 1) await new Promise(r => setTimeout(r, PAUSA_MS));
    }
    setEnviando(false);
    addToast({
      message: `Enviadas ${ok} de ${enviables.length}`,
      type: ok === enviables.length ? 'success' : 'warning',
    });
    cargar();
  };

  const conEmail = filas.filter(f => esEmail(f.email ?? '')).length;
  const enviados = filas.filter(f => f.estado === 'enviado').length;

  if (!disponible) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">Falta aplicar <code>supabase/invitaciones-perfil.sql</code></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl text-gray-900">✉️ Invitaciones a reclamar perfil</h2>
        <p className="text-gray-500 text-sm mt-1">
          Perfiles publicados sin dueño. Les invitamos a reclamarlos.
        </p>
      </div>

      {/* El aviso legal va arriba y no en letra pequeña: esto escribe a gente
          que nunca se registró, y conviene tenerlo presente cada vez. */}
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-black flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Antes de enviar, léelo
        </p>
        <p className="mt-1.5">
          Esto escribe a personas y negocios que <strong>no se han registrado</strong>. En España
          la LSSI-CE restringe el correo comercial sin consentimiento previo. Escribir a la
          dirección pública de un negocio sobre un servicio de su sector tiene más margen que
          escribir a un particular, pero <strong>no soy tu asesor legal</strong>: consúltalo antes
          de una campaña grande.
        </p>
        <p className="mt-1.5">
          El correo explica quién somos, por qué está su ficha y cómo pedir la baja. Cada perfil
          recibe <strong>una sola invitación</strong>: no se puede reenviar.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Perfiles sin dueño', filas.length, 'bg-gray-50 border-gray-200 text-gray-700'],
          ['Con email', conEmail, 'bg-green-50 border-green-200 text-green-700'],
          ['Sin contacto', filas.length - conEmail, 'bg-amber-50 border-amber-200 text-amber-700'],
          ['Ya invitados', enviados, 'bg-blue-50 border-blue-200 text-blue-700'],
        ].map(([label, n, color]) => (
          <div key={String(label)} className={`rounded-xl border p-4 text-center ${color}`}>
            <p className="text-2xl font-black">{n as number}</p>
            <p className="text-xs font-bold mt-1">{label as string}</p>
          </div>
        ))}
      </div>

      {conEmail === 0 && !cargando && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-black text-gray-900 text-sm">Todavía no hay a quién enviar</p>
          <p className="text-gray-600 text-sm mt-1.5">
            Ninguno de los {filas.length} perfiles importados tiene email guardado. Añádelos abajo
            (filtro <strong>Sin contacto</strong>) y el botón de enviar se activará solo.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o ciudad…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        {([['con-email', 'Listos para enviar'], ['sin-email', 'Sin contacto'],
           ['enviados', 'Ya invitados'], ['todos', 'Todos']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFiltro(id)}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
              filtro === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {enviables.length > 0 && (
        <button onClick={enviarTanda} disabled={enviando}
          className="w-full bg-brand-orange text-white font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
          {enviando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando {progreso.hechos} de {progreso.total}…</>
            : <><Send className="w-4 h-4" /> Enviar invitación a {enviables.length} perfil(es)</>}
        </button>
      )}

      {cargando ? (
        <div className="text-center py-12"><Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" /></div>
      ) : visibles.length === 0 ? (
        <p className="text-center text-gray-500 py-10 text-sm">Nada con este filtro.</p>
      ) : (
        <div className="space-y-2">
          {visibles.slice(0, 200).map(f => {
            const k = clave(f);
            const b = borradores[k] ?? { email: f.email ?? '', instagram: f.instagram ?? '' };
            return (
              <div key={k} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
                {f.avatar
                  ? <img src={f.avatar} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {f.target_type === 'venue' ? '📍' : '🎤'}
                    </div>}

                <div className="min-w-[140px] flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{f.nombre || '(sin nombre)'}</p>
                  <p className="text-xs text-gray-500">
                    {f.target_type === 'venue' ? 'Local' : 'Artista'}{f.ciudad ? ` · ${f.ciudad}` : ''}
                  </p>
                </div>

                {f.estado ? (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1.5 ${
                    f.estado === 'enviado' ? 'bg-blue-100 text-blue-700'
                    : f.estado === 'reclamado' ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {f.estado === 'enviado' ? 'Invitado' : f.estado}
                    {f.enviado_at ? ` · ${new Date(f.enviado_at).toLocaleDateString('es-ES')}` : ''}
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={b.email}
                        onChange={e => setBorradores(s => ({ ...s, [k]: { ...b, email: e.target.value } }))}
                        placeholder="email de contacto"
                        className="border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-xs w-52" />
                    </div>
                    {f.target_type === 'artist' && (
                      <div className="relative">
                        <Instagram className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={b.instagram}
                          onChange={e => setBorradores(s => ({ ...s, [k]: { ...b, instagram: e.target.value } }))}
                          placeholder="@instagram"
                          className="border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-xs w-40" />
                      </div>
                    )}
                    <button onClick={() => guardarContacto(f)} disabled={guardando === k}
                      className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      {guardando === k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Guardar
                    </button>
                    {b.instagram && (
                      <button
                        onClick={() => {
                          const texto = `Hola ${f.nombre || ''}! Hemos publicado tu perfil en BailaNow, el directorio de baile latino. Puedes reclamarlo gratis aquí: https://bailanow.com/reclamar`;
                          navigator.clipboard.writeText(texto).then(
                            () => addToast({ message: 'Mensaje copiado — pégalo en Instagram', type: 'success' }),
                            () => {});
                        }}
                        title="Copiar mensaje para enviar por Instagram a mano"
                        className="bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200">
                        <Copy className="w-3.5 h-3.5" /> Texto IG
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {visibles.length > 200 && (
            <p className="text-center text-xs text-gray-400 py-2">
              Mostrando 200 de {visibles.length}. Afina con el buscador.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
        <p className="flex gap-2.5">
          <Instagram className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>
            <strong>Instagram no se puede automatizar.</strong> Su API solo deja responder a quien
            te ha escrito antes, en una ventana de 24 h. Enviar mensajes masivos con herramientas
            no oficiales es motivo de cierre de cuenta. Por eso aquí el botón solo copia el texto
            para que lo pegues a mano.
          </span>
        </p>
        <p className="flex gap-2.5">
          <Send className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>
            Los correos salen por Resend, que ya está configurado y con el dominio verificado.
            Van de uno en uno con una pausa de {PAUSA_MS / 1000} s: una ráfaga desde un dominio
            nuevo acaba en la carpeta de no deseados.
          </span>
        </p>
      </div>
    </div>
  );
};

export default InvitacionesAdminSection;
