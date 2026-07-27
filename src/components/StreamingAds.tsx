import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import VideoAdOverlay, { VideoAd } from './VideoAdOverlay';

// Categorías donde puede saltar el pre-roll (primer segmento de la ruta)
const CATEGORY_SEGMENTS = new Set(['eventos', 'artistas', 'bailarinas', 'venues', 'tv', 'clases', 'marketplace', 'comunidad', 'live', 'cerca']);
const MIN_GAP_MS = 6 * 60 * 1000; // no más de 1 anuncio cada 6 min
const LS_KEY = 'bn_ad_last';

interface AdRow extends VideoAd { provider: string; targets: string[]; weight: number; starts: string | null; ends: string | null; active: boolean; }

const StreamingAds: React.FC = () => {
  const loc = useLocation();
  const { user } = useAuthStore();
  const [ads, setAds] = useState<AdRow[]>([]);
  const [current, setCurrent] = useState<VideoAd | null>(null);
  const lastSeg = useRef<string>('');

  // Los Premium y el staff no ven anuncios (gancho para vender Premium).
  const adsDisabled = !!user && (user.isPremium || user.role === 'admin' || user.role === 'superadmin' || user.role === 'partner');

  useEffect(() => {
    if (adsDisabled) return;
    let cancelled = false;
    supabase.from('video_ads').select('*').eq('active', true).eq('provider', 'video')
      .then(({ data }) => { if (!cancelled) setAds((data as AdRow[]) || []); }, () => {});
    return () => { cancelled = true; };
  }, [adsDisabled]);

  useEffect(() => {
    if (adsDisabled || current) return;
    const seg = (loc.pathname.split('/')[1] || '').toLowerCase();
    if (seg === lastSeg.current) return;           // misma categoría → no repetir
    lastSeg.current = seg;
    if (!CATEGORY_SEGMENTS.has(seg)) return;

    // Límite de frecuencia
    const last = Number(localStorage.getItem(LS_KEY) || 0);
    if (Date.now() - last < MIN_GAP_MS) return;

    // Anuncios elegibles: target 'all' o esta categoría, dentro de fechas
    const today = new Date().toISOString().slice(0, 10);
    const eligible = ads.filter(a =>
      a.video_url &&
      (a.targets?.includes('all') || a.targets?.includes(seg)) &&
      (!a.starts || a.starts <= today) &&
      (!a.ends || a.ends >= today));
    if (!eligible.length) return;

    // Selección ponderada por weight
    const total = eligible.reduce((s, a) => s + Math.max(1, a.weight || 1), 0);
    let r = Math.random() * total;
    const pick = eligible.find(a => (r -= Math.max(1, a.weight || 1)) < 0) || eligible[0];

    localStorage.setItem(LS_KEY, String(Date.now()));
    setCurrent(pick);
  }, [loc.pathname, ads, adsDisabled, current]);

  if (!current) return null;
  return <VideoAdOverlay ad={current} onClose={() => setCurrent(null)} />;
};

export default StreamingAds;
