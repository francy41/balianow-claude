import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import { Send, Loader2, MessageSquare, Shield, RefreshCw } from 'lucide-react';

interface Msg {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  text: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
}

interface Thread {
  userId: string;
  name: string;
  email: string;
  last: string;
  lastAt: string;
  unread: number;
  messages: Msg[];
}

const SupportAdminSection: React.FC<{ addToast: (o: { message: string; type: 'error' | 'info' | 'success' | 'warning' }) => void }> = ({ addToast }) => {
  const { user } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { addToast({ message: `Error: ${error.message}`, type: 'error' }); setLoading(false); return; }

    // Agrupar por user_id
    const map = new Map<string, Thread>();
    for (const m of (data || []) as Msg[]) {
      if (!map.has(m.user_id)) {
        map.set(m.user_id, { userId: m.user_id, name: m.user_name || 'Usuario', email: m.user_email || '', last: '', lastAt: '', unread: 0, messages: [] });
      }
      const t = map.get(m.user_id)!;
      t.messages.push(m);
      t.last = m.text;
      t.lastAt = m.created_at;
      if (!m.is_admin && !m.read) t.unread++;
    }
    const list = Array.from(map.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    setThreads(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime: refresca el buzón cuando llega/cambia cualquier mensaje
  useEffect(() => {
    const channel = supabase
      .channel('support-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeUser, threads]);

  const active = threads.find(t => t.userId === activeUser);

  const openThread = async (t: Thread) => {
    setActiveUser(t.userId);
    if (t.unread > 0) {
      await supabase.from('support_messages').update({ read: true }).eq('user_id', t.userId).eq('is_admin', false);
      load();
    }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !active || sending) return;
    setSending(true);
    setReply('');
    const { error } = await supabase.from('support_messages').insert({
      user_id: active.userId,
      user_email: active.email,
      user_name: active.name,
      text,
      is_admin: true,
    });
    setSending(false);
    if (error) { addToast({ message: `Error al responder: ${error.message}`, type: 'error' }); setReply(text); return; }
    load();
  };

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-gray-900 flex items-center gap-2">
            🛟 Soporte
            {totalUnread > 0 && <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">{totalUnread}</span>}
          </h2>
          <p className="text-gray-500 text-sm">Mensajes de los usuarios al soporte de BailaNow</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 480 }}>
        {/* Lista de hilos */}
        <div className="card-white rounded-2xl overflow-hidden lg:col-span-1">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-pink-400" /></div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Sin mensajes de soporte</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
              {threads.map(t => (
                <button key={t.userId} onClick={() => openThread(t)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${activeUser === t.userId ? 'bg-pink-50 border-r-2 border-brand-orange' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-gray-900 truncate">{t.name}</span>
                    {t.unread > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0">{t.unread}</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{t.email}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.last}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversación */}
        <div className="card-white rounded-2xl overflow-hidden lg:col-span-2 flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <p className="text-gray-400 text-sm">Selecciona un usuario para ver y responder sus mensajes</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-gray-100">
                <p className="font-bold text-gray-900 text-sm">{active.name}</p>
                <p className="text-[11px] text-gray-400">{active.email}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 max-h-[360px]">
                {active.messages.map(m => {
                  const fromAdmin = m.is_admin;
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${fromAdmin ? 'flex-row-reverse' : ''}`}>
                      {fromAdmin && (
                        <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
                          <Shield className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-xs px-4 py-2.5 shadow-sm ${fromAdmin ? 'bg-brand-orange text-white rounded-2xl rounded-br-sm' : 'bg-white text-gray-700 rounded-2xl rounded-bl-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                        <p className={`text-[9px] mt-1 ${fromAdmin ? 'text-white/60' : 'text-gray-400'}`}>{new Date(m.created_at).toLocaleString('es-ES')}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-gray-100 p-3 flex items-center gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Responder al usuario…"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="bg-brand-orange text-white rounded-xl p-2.5 disabled:opacity-40">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportAdminSection;
