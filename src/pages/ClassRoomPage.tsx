/**
 * ClassRoomPage — sala de clase en vivo con Jitsi Meet embebido
 * URL: /clase/:bookingId
 * Solo accesible al estudiante o profesor de la reserva
 */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Video, AlertCircle, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';

interface Booking {
  id: string;
  jitsi_room: string;
  status: string;
  student_id: string;
  vendor_id: string;
  offering_id: string;
  amount_paid: number;
  created_at: string;
}

const ClassRoomPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // Cargar booking
  useEffect(() => {
    if (!bookingId || !user) { setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('class_bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();
        if (error || !data) {
          setError('Reserva no encontrada');
          setLoading(false);
          return;
        }
        if (data.student_id !== user.id && data.vendor_id !== user.id) {
          setError('No tienes acceso a esta clase');
          setLoading(false);
          return;
        }
        setBooking(data);

        const { data: off } = await supabase
          .from('class_offerings')
          .select('*')
          .eq('id', data.offering_id)
          .maybeSingle();
        setOffering(off);
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, [bookingId, user]);

  // Cargar Jitsi script y montar la sala
  useEffect(() => {
    if (!booking?.jitsi_room || !jitsiContainerRef.current) return;

    const loadJitsi = () => {
      if (!(window as any).JitsiMeetExternalAPI) {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = mountJitsi;
        document.body.appendChild(script);
      } else {
        mountJitsi();
      }
    };

    const mountJitsi = () => {
      if (!jitsiContainerRef.current) return;
      // @ts-ignore
      const api = new (window as any).JitsiMeetExternalAPI('meet.jit.si', {
        roomName: booking.jitsi_room,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: user?.name || 'Estudiante' },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'chat', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'settings',
            'raisehand', 'tileview', 'mute-everyone',
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND: '#0a0a0a',
        },
      });
      jitsiApiRef.current = api;
    };

    loadJitsi();

    return () => {
      try { jitsiApiRef.current?.dispose(); } catch {}
    };
  }, [booking, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white">Cargando sala…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="font-black text-white text-xl mb-1">{error || 'Sin acceso'}</h2>
          <p className="text-gray-400 text-sm mb-5">No pudimos cargar esta clase.</p>
          <button onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-5 py-2.5 rounded-xl">
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  const isVendor = user?.id === booking.vendor_id;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-pink-500/20 px-3 py-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate">{offering?.title || 'Clase en vivo'}</h1>
          <p className="text-gray-400 text-[10px] flex items-center gap-2">
            <span className="flex items-center gap-1"><Video className="w-3 h-3 text-red-500" /> Sala: {booking.jitsi_room.slice(0, 16)}…</span>
            <span>·</span>
            <span>{isVendor ? '🎓 Profesor' : '👤 Estudiante'}</span>
          </p>
        </div>
        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">EN VIVO</span>
      </header>

      {/* Jitsi container */}
      <div ref={jitsiContainerRef} className="flex-1 bg-black" style={{ minHeight: '70vh' }} />

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2 text-[11px] text-gray-400 flex items-center justify-between">
        <span>🔒 Sala privada · solo tú y {isVendor ? 'tu estudiante' : 'tu profesor'}</span>
        <button onClick={() => navigate(`/chat?with=${isVendor ? booking.student_id : booking.vendor_id}`)}
          className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-bold">
          <MessageCircle className="w-3 h-3" /> Chat
        </button>
      </footer>
    </div>
  );
};

export default ClassRoomPage;
