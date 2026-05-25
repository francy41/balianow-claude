import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';

interface LiveSession {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  pricing_mode: 'free' | 'paid' | 'reservation' | 'donation';
  price: number | null;
  jitsi_room: string;
  status: string;
  cover_url: string | null;
  host_name?: string | null;
  host_avatar?: string | null;
  total_donations?: number | null;
}

interface Donation {
  id: string;
  donor_name: string | null;
  amount: number;
  message: string | null;
  created_at: string;
}

declare global { interface Window { JitsiMeetExternalAPI?: any } }

const DONATION_PRESETS = [2, 5, 10, 20];

const LiveSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore(s => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [showDonate, setShowDonate] = useState(false);
  const [donAmount, setDonAmount] = useState<number>(5);
  const [donMessage, setDonMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load session
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('live_sessions_enriched')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        // fallback a tabla raw
        const { data: raw } = await supabase.from('live_sessions').select('*').eq('id', id).maybeSingle();
        setSession(raw as any);
      } else {
        setSession(data as any);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Load + subscribe donations
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('live_donations')
        .select('id, donor_name, amount, message, created_at')
        .eq('session_id', id).order('created_at', { ascending: false }).limit(50);
      setDonations((data as any) || []);
    })();
    const channel = supabase
      .channel(`live-donations-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_donations', filter: `session_id=eq.${id}` },
        (payload) => setDonations(prev => [payload.new as any, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Load Jitsi script + mount
  useEffect(() => {
    if (!session?.jitsi_room || !containerRef.current) return;

    const mount = () => {
      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: session.jitsi_room,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: false },
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ['microphone','camera','chat','tileview','hangup'] },
      });
      apiRef.current.addEventListener('readyToClose', () => navigate('/live'));
    };

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      const s = document.createElement('script');
      s.src = 'https://meet.jit.si/external_api.js';
      s.async = true;
      s.onload = mount;
      document.body.appendChild(s);
    }

    return () => {
      try { apiRef.current?.dispose(); } catch { /* noop */ }
      apiRef.current = null;
    };
  }, [session?.jitsi_room, navigate]);

  const sendDonation = async () => {
    if (!session || donAmount <= 0) return;
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      const { error } = await supabase.from('live_donations').insert({
        session_id: session.id,
        user_id:    uid,
        donor_name: sess.session?.user?.user_metadata?.name || 'Anónimo',
        amount:     donAmount,
        currency:   'EUR',
        message:    donMessage || null,
      });
      if (error) { addToast({ type: 'error', message: error.message }); setSending(false); return; }
      addToast({ type: 'success', message: '¡Gracias por tu donación!' });
      setShowDonate(false);
      setDonMessage('');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
  );
  if (!session) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Live no encontrado</p>
      <button onClick={() => navigate('/live')} className="btn-orange">Volver</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/live')} className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{session.title}</div>
          <div className="text-xs text-gray-400 truncate">{session.host_name}</div>
        </div>
        <button onClick={() => setShowDonate(true)} className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Heart className="w-4 h-4" /> Apoyar
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-0">
        {/* Jitsi */}
        <div className="aspect-video lg:aspect-auto lg:h-[calc(100vh-60px)] bg-black">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Donations feed */}
        <aside className="bg-[#0f0f1e] border-l border-gray-800 max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="sticky top-0 bg-[#0f0f1e] border-b border-gray-800 px-4 py-3">
            <div className="font-bold text-sm">💝 Apoyos en vivo</div>
            {typeof session.total_donations === 'number' && session.total_donations > 0 && (
              <div className="text-xs text-pink-400 mt-1">Total: €{session.total_donations.toFixed(2)}</div>
            )}
          </div>
          {donations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">Sé el primero en apoyar</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {donations.map(d => (
                <li key={d.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{d.donor_name || 'Anónimo'}</span>
                    <span className="text-pink-400 font-bold text-sm">€{d.amount.toFixed(2)}</span>
                  </div>
                  {d.message && <div className="text-xs text-gray-400 mt-1">{d.message}</div>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Donate modal */}
      {showDonate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4" onClick={() => setShowDonate(false)}>
          <div className="bg-white dark:bg-[#0f0f1e] text-gray-900 dark:text-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Heart className="text-pink-500" /> Apoyar este live</h3>
              <button onClick={() => setShowDonate(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DONATION_PRESETS.map(v => (
                <button key={v} onClick={() => setDonAmount(v)}
                  className={`py-3 rounded-xl font-bold border-2 ${donAmount === v ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-600' : 'border-gray-200 dark:border-gray-700'}`}>
                  €{v}
                </button>
              ))}
            </div>
            <input type="number" min="1" value={donAmount} onChange={e => setDonAmount(Number(e.target.value))} className="input-field" placeholder="Cantidad personalizada" />
            <input type="text" value={donMessage} onChange={e => setDonMessage(e.target.value)} placeholder="Mensaje (opcional)" className="input-field" />
            <button onClick={sendDonation} disabled={sending || donAmount <= 0} className="btn-orange w-full flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? 'Enviando...' : `Enviar €${donAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSessionPage;
