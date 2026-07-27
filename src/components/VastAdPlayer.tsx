import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Reproductor de anuncios pre-roll de Google usando el IMA SDK (VAST/VPAID).
// Recibe una etiqueta VAST (adTagUrl) de Google Ad Manager / AdSense for video.

const IMA_SRC = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
let imaPromise: Promise<any> | null = null;
function loadIma(): Promise<any> {
  if ((window as any).google?.ima) return Promise.resolve((window as any).google.ima);
  if (imaPromise) return imaPromise;
  imaPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = IMA_SRC; s.async = true;
    s.onload = () => (window as any).google?.ima ? resolve((window as any).google.ima) : reject(new Error('IMA no disponible'));
    s.onerror = () => reject(new Error('No se pudo cargar el SDK de Google'));
    document.head.appendChild(s);
  });
  return imaPromise;
}

const track = (id: string, event: string) => { if (id) supabase.rpc('track_video_ad', { p_id: id, p_event: event }).then(() => {}, () => {}); };

const VastAdPlayer: React.FC<{ tagUrl: string; adId?: string; advertiser?: string | null; onClose: () => void }> = ({ tagUrl, adId = '', advertiser, onClose }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const adRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showClose, setShowClose] = useState(false);
  const done = useRef(false);

  const finish = () => { if (done.current) return; done.current = true; onClose(); };

  useEffect(() => {
    let adsManager: any = null;
    // Si en 8s no ha pasado nada (bloqueo, sin inventario), cerramos.
    const guard = setTimeout(finish, 8000);
    // Botón de cierre de emergencia a los 6s
    const closeTimer = setTimeout(() => setShowClose(true), 6000);

    loadIma().then((ima) => {
      if (done.current || !adRef.current || !videoRef.current || !wrapRef.current) return;
      const w = wrapRef.current.clientWidth || 640;
      const h = wrapRef.current.clientHeight || 360;

      const adDisplayContainer = new ima.AdDisplayContainer(adRef.current, videoRef.current);
      adDisplayContainer.initialize();               // permitido: montado tras navegación
      const adsLoader = new ima.AdsLoader(adDisplayContainer);

      adsLoader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e: any) => {
        const settings = new ima.AdsRenderingSettings();
        settings.restoreCustomPlaybackStateOnAdBreakComplete = false;
        adsManager = e.getAdsManager(videoRef.current, settings);
        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);
        adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, finish);
        adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => { track(adId, 'skip'); });
        adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => { track(adId, 'complete'); });
        adsManager.addEventListener(ima.AdEvent.Type.IMPRESSION, () => { track(adId, 'impression'); });
        adsManager.addEventListener(ima.AdEvent.Type.CLICK, () => { track(adId, 'click'); });
        try { adsManager.init(w, h, ima.ViewMode.NORMAL); adsManager.start(); clearTimeout(guard); }
        catch { finish(); }
      }, false);
      adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish, false);

      const req = new ima.AdsRequest();
      req.adTagUrl = tagUrl;
      req.linearAdSlotWidth = w; req.linearAdSlotHeight = h;
      req.nonLinearAdSlotWidth = w; req.nonLinearAdSlotHeight = Math.round(h / 3);
      if (req.setAdWillAutoPlay) req.setAdWillAutoPlay(true);
      if (req.setAdWillPlayMuted) req.setAdWillPlayMuted(true);
      adsLoader.requestAds(req);
    }).catch(finish);

    return () => { clearTimeout(guard); clearTimeout(closeTimer); try { adsManager?.destroy(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagUrl, adId]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" role="dialog" aria-label="Publicidad">
      <div ref={wrapRef} className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:aspect-video bg-black">
        {/* IMA necesita un <video> de contenido y un contenedor para el anuncio */}
        <video ref={videoRef} className="w-full h-full" playsInline muted />
        <div ref={adRef} className="absolute inset-0" />
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <span className="bg-black/70 text-white/90 text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded">Publicidad</span>
          {advertiser && <span className="bg-black/50 text-white/70 text-[11px] px-2 py-1 rounded">{advertiser}</span>}
        </div>
        {showClose && (
          <button onClick={finish} className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-900 text-sm font-bold rounded-lg px-3 py-1.5 z-10">
            Cerrar <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default VastAdPlayer;
