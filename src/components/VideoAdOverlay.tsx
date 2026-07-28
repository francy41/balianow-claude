import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface VideoAd {
  id: string;
  title: string;
  advertiser: string | null;
  video_url: string | null;
  poster_url: string | null;
  click_url: string | null;
  skip_after: number;
}

const track = (id: string, event: string) => {
  supabase.rpc('track_video_ad', { p_id: id, p_event: event }).then(() => {}, () => {});
};

const VideoAdOverlay: React.FC<{ ad: VideoAd; onClose: () => void }> = ({ ad, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [remaining, setRemaining] = useState(ad.skip_after || 0);
  const [canSkip, setCanSkip] = useState((ad.skip_after || 0) <= 0);
  const impressed = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
    const onTime = () => {
      if (!impressed.current && v.currentTime > 0.3) { impressed.current = true; track(ad.id, 'impression'); }
      const left = Math.ceil((ad.skip_after || 0) - v.currentTime);
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) setCanSkip(true);
    };
    const onEnded = () => { track(ad.id, 'complete'); onClose(); };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    // Fallback: si el vídeo no carga en 2.5s, permite cerrar
    const guard = setTimeout(() => { if (!impressed.current) setCanSkip(true); }, 2500);
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('ended', onEnded); clearTimeout(guard); };
  }, [ad.id, ad.skip_after, onClose]);

  const skip = () => { track(ad.id, 'skip'); onClose(); };
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const click = () => { if (!ad.click_url) return; track(ad.id, 'click'); window.open(ad.click_url, '_blank', 'noopener'); };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" role="dialog" aria-label="Publicidad">
      <div className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:aspect-video bg-black">
        <video
          ref={videoRef}
          src={ad.video_url || undefined}
          poster={ad.poster_url || undefined}
          playsInline
          onClick={click}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Etiqueta Publicidad */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="bg-black/70 text-white/90 text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded">Publicidad</span>
          {ad.advertiser && <span className="bg-black/50 text-white/70 text-[11px] px-2 py-1 rounded">{ad.advertiser}</span>}
        </div>

        {/* Silenciar */}
        <button onClick={toggleMute} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center">
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* CTA */}
        {ad.click_url && (
          <button onClick={click} className="absolute bottom-16 sm:bottom-4 left-3 bg-brand-orange text-white text-sm font-bold rounded-lg px-4 py-2">
            Más información
          </button>
        )}

        {/* Saltar / cuenta atrás */}
        <div className="absolute bottom-16 sm:bottom-4 right-3">
          {canSkip ? (
            <button onClick={skip} className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-900 text-sm font-bold rounded-lg px-4 py-2">
              Saltar anuncio <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="bg-black/70 text-white/80 text-sm rounded-lg px-4 py-2">Puedes saltar en {remaining}s</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoAdOverlay;
