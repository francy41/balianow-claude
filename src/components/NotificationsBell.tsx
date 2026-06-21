import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

const ICON: Record<string, string> = { payment: '💸', refund: '↩️', booking: '📅', info: '🔔' };

const NotificationsBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(30);
    setItems(data || []);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter(n => !n.read).length;

  const markAllRead = async () => {
    const ids = items.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    setItems(xs => xs.map(n => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).in('id', ids);
  };

  const openNotif = async (n: Notif) => {
    if (!n.read) {
      setItems(xs => xs.map(x => x.id === n.id ? { ...x, read: true } : x));
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-white/10 text-gray-400">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900 text-sm">Notificaciones</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-orange font-semibold flex items-center gap-1 hover:underline">
                <Check className="w-3 h-3" /> Marcar leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : items.map(n => (
              <button key={n.id} onClick={() => openNotif(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${!n.read ? 'bg-pink-50/40' : ''}`}>
                <span className="text-lg flex-shrink-0">{ICON[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-brand-orange rounded-full flex-shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
