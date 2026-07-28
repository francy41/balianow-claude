import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Users, ArrowLeft, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';

// Sala de cámaras (Jitsi) para que la pareja/familia practique junta mientras ve BailaNow TV.
const PracticeRoomPage: React.FC = () => {
  const { room } = useParams<{ room: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [access, setAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setAccess(false); return; }
      const { data } = await supabase.rpc('has_membership_access', { p_uid: user.id });
      if (!cancelled) setAccess(!!data);
    })().catch(() => { if (!cancelled) setAccess(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (access === null) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;
  }

  if (!access) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Users className="w-12 h-12 mx-auto text-fuchsia-400 mb-3" />
          <h1 className="font-display font-black text-2xl">Sala solo para planes Pareja o Familiar</h1>
          <p className="text-white/60 mt-2">Necesitas un plan Pareja o Familiar (o ser miembro invitado) para practicar juntos por cámara.</p>
          <button onClick={() => navigate('/membresias')} className="mt-5 bg-brand-orange font-bold rounded-xl px-6 py-3">Ver planes</button>
        </div>
      </div>
    );
  }

  const roomName = `bailanow-practica-${room}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(user?.name || 'Bailarín')}"&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={() => navigate('/membresias')} className="inline-flex items-center gap-1.5 text-sm text-white/70"><ArrowLeft className="w-4 h-4" /> Mi plan</button>
        <span className="font-bold text-sm flex items-center gap-2"><Video className="w-4 h-4 text-fuchsia-400" /> Practicar juntos</span>
        <button onClick={() => navigate('/tv')} className="text-sm font-bold bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5">Abrir TV</button>
      </div>
      <div className="flex-1">
        <iframe
          src={jitsiUrl}
          title="Sala de práctica"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full min-h-[70vh] border-0"
        />
      </div>
      <p className="text-center text-white/40 text-xs py-2">Comparte este enlace con tu pareja/familia del plan para uniros a la misma sala.</p>
    </div>
  );
};

export default PracticeRoomPage;
