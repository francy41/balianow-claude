import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import VideoAdOverlay, { VideoAd } from './VideoAdOverlay';
import VastAdPlayer from './VastAdPlayer';

interface AdRow extends VideoAd { provider: string; vast_tag_url: string | null; targets: string[]; weight: number; starts: string | null; ends: string | null; }

/**
 * Anuncio pre-roll antes de un vídeo de BailaNow TV (solo cuentas gratis).
 * Registra la impresión atribuida al creador del título (modelo 60/40).
 * Llama a onDone cuando termina, se salta, o si no hay anuncio disponible.
 */
const TvPreroll: React.FC<{ titleId: string; onDone: () => void }> = ({ titleId, onDone }) => {
  const [ad, setAd] = useState<AdRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('video_ads').select('*').eq('active', true);
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const eligible = ((data as AdRow[]) || []).filter(a =>
        (a.provider === 'vast' ? !!a.vast_tag_url : !!a.video_url) &&
        (a.targets?.includes('all') || a.targets?.includes('tv')) &&
        (!a.starts || a.starts <= today) && (!a.ends || a.ends >= today));
      if (!eligible.length) { onDone(); return; }
      const total = eligible.reduce((s, a) => s + Math.max(1, a.weight || 1), 0);
      let r = Math.random() * total;
      const pick = eligible.find(a => (r -= Math.max(1, a.weight || 1)) < 0) || eligible[0];
      supabase.rpc('record_tv_ad_impression', { p_title_id: titleId, p_ad_id: pick.id }).then(() => {}, () => {});
      setAd(pick);
    })().catch(() => onDone());
    return () => { cancelled = true; };
  }, [titleId, onDone]);

  if (!ad) return null;
  if (ad.provider === 'vast' && ad.vast_tag_url) {
    return <VastAdPlayer tagUrl={ad.vast_tag_url} adId={ad.id} advertiser={ad.advertiser} onClose={onDone} />;
  }
  return <VideoAdOverlay ad={ad} onClose={onDone} />;
};

export default TvPreroll;
