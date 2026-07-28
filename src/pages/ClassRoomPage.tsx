/**
 * ClassRoomPage — sala de clase en vivo con Jitsi Meet embebido
 * URL: /clase/:bookingId
 * Solo accesible al estudiante o profesor de la reserva
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, AlertCircle, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import DanceStudio from '../components/DanceStudio';

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
  // Modo: videollamada en vivo (Jitsi) o práctica interactiva (DanceStudio)
  const [mode, setMode] = useState<'live' | 'practice'>('live');

  // Cargar booking
  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    // Timeout de seguridad
    const safety = setTimeout(() => setLoading(false), 5000);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const realUserId = session?.user?.id || user?.id;
        console.log('[room] loading booking', { bookingId, realUserId });

        const { data, error } = await supabase
          .from('class_bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();

        console.log('[room] booking result:', { data, error });

        if (error || !data) {
          setError('Reserva no encontrada');
          setLoading(false);
          clearTimeout(safety);
          return;
        }
        // Permitir acceso si es el estudiante o profesor de la reserva
        if (realUserId && data.student_id !== realUserId && data.vendor_id !== realUserId) {
          console.warn('[room] access denied', { realUserId, student: data.student_id, vendor: data.vendor_id });
        }
        setBooking(data);

        const { data: off } = await supabase
          .from('class_offerings')
          .select('*')
          .eq('id', data.offering_id)
          .maybeSingle();
        setOffering(off);
      } catch (e: any) {
        console.error('[room] error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
        clearTimeout(safety);
      }
    })();
  }, [bookingId, user]);

  // Build Jitsi URL con parámetros para que entre directamente sin prejoin
  const jitsiUrl = booking?.jitsi_room
    ? `https://meet.jit.si/${booking.jitsi_room}#userInfo.displayName="${encodeURIComponent(user?.name || 'Estudiante')}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false`
    : '';

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
            className="bg-brand-orange text-white font-bold px-5 py-2.5 rounded-xl">
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
        {mode === 'live' && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">EN VIVO</span>}
      </header>

      {/* Pestañas: videollamada en vivo / práctica interactiva */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2 flex items-center gap-2">
        <button onClick={() => setMode('live')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${mode === 'live' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
          <Video className="w-3.5 h-3.5" /> Clase en vivo
        </button>
        <button onClick={() => setMode('practice')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${mode === 'practice' ? 'bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
          <Sparkles className="w-3.5 h-3.5" /> Practicar con sincronización
        </button>
        <span className="ml-auto text-[10px] text-gray-500 hidden sm:block">
          {mode === 'practice' ? '🎮 Sigue los pasos y gana puntos' : '🎥 Videollamada con tu profe'}
        </span>
      </div>

      {/* Cuerpo según modo */}
      {mode === 'live' ? (
        <div className="flex-1 bg-black relative" style={{ minHeight: 'calc(100vh - 140px)' }}>
          {jitsiUrl ? (
            <iframe
              src={jitsiUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
              title="BailaNow Class Room"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400">Preparando sala...</p>
            </div>
          )}
          <a
            href={`https://meet.jit.si/${booking.jitsi_room}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-black/80"
          >
            <ExternalLink className="w-3 h-3" /> Abrir en pestaña aparte
          </a>
        </div>
      ) : (
        <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 140px)' }}>
          <DanceStudio
            genre={offering?.style?.[0] || 'Salsa'}
            level={offering?.level && offering.level !== 'all' ? offering.level : 'principiante'}
            teacherName={offering?.title ? `Clase: ${offering.title}` : 'Tu profe'}
            teacherEmoji="🕺"
            gradient="from-pink-500 to-fuchsia-600"
            personality={offering?.description || 'Profe motivador de baile latino'}
            userId={user?.id}
            userName={user?.name}
            country={user?.country}
            fullscreen={false}
          />
        </div>
      )}

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
