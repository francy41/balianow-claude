import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Lock, Loader2, Ban, Flag, X, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';
import { Avatar } from './ui';

// ── Conversación uno a uno ──────────────────────────────────────────────────
// Solo existe entre personas que han hecho match. Esa regla la aplica el RLS
// de `messages` (política messages_insert): aquí no se decide nada de permisos,
// solo se muestra. Si alguien llamara a la API a mano, el servidor lo rechaza.

type Mensaje = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean | null;
  created_at: string;
};

const MOTIVOS = [
  'Comportamiento inapropiado',
  'Acoso o insistencia',
  'Perfil falso o suplantación',
  'Mensajes ofensivos',
  'Otro',
];

const hora = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const DirectThread: React.FC<{
  otroId: string;
  miId: string;
  onBack: () => void;
  onCambio?: () => void;
}> = ({ otroId, miId, onBack, onCambio }) => {
  const { addToast } = useUIStore();
  const [otro, setOtro] = useState<{ nombre: string; avatar: string } | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reportando, setReportando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const [{ data: perfil }, { data: msgs }] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url').eq('id', otroId).maybeSingle(),
      supabase.from('messages').select('id, sender_id, receiver_id, content, is_read, created_at')
        .or(`and(sender_id.eq.${miId},receiver_id.eq.${otroId}),and(sender_id.eq.${otroId},receiver_id.eq.${miId})`)
        .order('created_at', { ascending: true }),
    ]);
    setOtro({ nombre: perfil?.full_name || 'Bailarín/a', avatar: perfil?.avatar_url || '' });
    setMensajes((msgs || []) as Mensaje[]);
    setCargando(false);

    // Lo recibido queda leído al abrir el hilo.
    const pendientes = (msgs || []).filter((m: any) => m.receiver_id === miId && !m.is_read);
    if (pendientes.length) {
      await supabase.from('messages').update({ is_read: true }).in('id', pendientes.map((m: any) => m.id));
      onCambio?.();
    }
  }, [otroId, miId, onCambio]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  // Realtime: el filtro del servidor solo acepta una columna, así que se
  // escucha lo que me llega y se descarta lo que no es de este hilo.
  useEffect(() => {
    const canal = supabase
      .channel(`dm-${miId}-${otroId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${miId}` },
        async (payload) => {
          const m = payload.new as Mensaje;
          if (m.sender_id !== otroId) return;
          setMensajes(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
          await supabase.from('messages').update({ is_read: true }).eq('id', m.id);
          onCambio?.();
        })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [miId, otroId, onCambio]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto('');
    const { data, error } = await supabase.from('messages')
      .insert({ sender_id: miId, receiver_id: otroId, content: t, is_read: false })
      .select('id, sender_id, receiver_id, content, is_read, created_at').single();
    setEnviando(false);
    if (error) {
      setTexto(t);
      // El rechazo casi siempre es la política: el match ya no está (alguien
      // deshizo el like o bloqueó). Decirlo claro vale más que "error".
      addToast({ message: 'No se pudo enviar. Puede que ya no tengáis match.', type: 'error' });
      return;
    }
    setMensajes(prev => [...prev, data as Mensaje]);
    onCambio?.();
  };

  const bloquear = async () => {
    await supabase.from('user_blocks').insert({ blocker_id: miId, blocked_id: otroId });
    addToast({ message: 'Bloqueado. No volveréis a veros ni a escribiros.', type: 'success' });
    setMenu(false);
    onCambio?.();
    onBack();
  };

  const reportar = async (motivo: string) => {
    await supabase.from('user_reports').insert({
      reporter_id: miId, reported_id: otroId, reason: motivo, context: 'chat',
    });
    setReportando(false);
    setMenu(false);
    addToast({ message: 'Gracias. El equipo lo revisará.', type: 'success' });
    supabase.functions.invoke('send-email', {
      body: { type: 'admin_reporte', data: { reason: motivo, context: 'chat', reported_id: otroId } },
    }).catch(() => {});
  };

  if (cargando) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="sm:hidden text-gray-400 hover:text-gray-600 p-1">←</button>
        <Avatar src={otro?.avatar || ''} name={otro?.nombre || 'Match'} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 dark:text-white font-semibold truncate">{otro?.nombre}</p>
          <p className="text-gray-400 text-xs">Match · Chat interno</p>
        </div>
        <div className="relative">
          <button onClick={() => setMenu(m => !m)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <MoreVertical className="w-5 h-5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-20 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <button onClick={() => { setMenu(false); setReportando(true); }}
                className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Reportar
              </button>
              <button onClick={bloquear}
                className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                <Ban className="w-4 h-4" /> Bloquear
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-[#0a0a0a]">
        {mensajes.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">💞</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Habéis hecho match</p>
            <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto">
              Escribe el primer mensaje. Quedad para bailar donde queráis.
            </p>
          </div>
        )}
        {mensajes.map(m => {
          const mio = m.sender_id === miId;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mio ? 'flex-row-reverse' : ''}`}>
              {!mio && <Avatar src={otro?.avatar || ''} name={otro?.nombre || 'Match'} size="xs" />}
              <div className={`max-w-xs lg:max-w-sm flex flex-col gap-1 ${mio ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                  mio
                    ? 'bg-brand-orange text-white rounded-2xl rounded-br-md'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
                <span className="text-gray-300 dark:text-gray-600 text-[10px] px-1">{hora(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4">
        <div className="flex gap-2 items-center">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escribe un mensaje…"
            maxLength={2000}
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 text-sm transition-all"
          />
          <button onClick={enviar} disabled={enviando || !texto.trim()}
            className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0 transition-all">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-gray-300 dark:text-gray-600 text-[10px] text-center mt-2 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Solo podéis escribiros porque hay match. Puedes bloquear cuando quieras.
        </p>
      </div>

      {reportando && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setReportando(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display font-black text-lg text-gray-900 dark:text-white">
                Reportar a {otro?.nombre}
              </h3>
              <button onClick={() => setReportando(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Solo lo verá el equipo de BailaNow. La persona reportada no recibe aviso.
            </p>
            <div className="mt-3 space-y-1.5">
              {MOTIVOS.map(m => (
                <button key={m} onClick={() => reportar(m)}
                  className="w-full text-left text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl px-3.5 py-2.5 transition-colors">
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DirectThread;
