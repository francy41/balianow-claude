/**
 * deviceDetect — Detección de tipo de dispositivo para adaptar UI
 *
 * Tipos:
 *  mobile  → < 768px o táctil < 1024px
 *  tablet  → 768–1023px táctil
 *  desktop → 1024–1599px
 *  tv      → ≥ 1600px sin táctil, o user-agent de Smart TV
 */
import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv';

function detectTV(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const tvPatterns = /SmartTV|smart-tv|HbbTV|Tizen|webOS|SMART-TV|AppleTV|GoogleTV|FireTV|Roku|NetCast|NETTV|NTGR_TV|BRAVIA|Viera|NetRange|CE-HTML/i;
  if (tvPatterns.test(ua)) return true;
  // Pantallas muy grandes sin touch casi siempre son TV o monitor grande
  if (typeof window !== 'undefined') {
    const w = window.innerWidth;
    const noTouch = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
    return w >= 1920 && noTouch;
  }
  return false;
}

function getDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (detectTV()) return 'tv';
  if (w < 768 || (hasTouch && w < 1024)) return 'mobile';
  if (w < 1024 && hasTouch) return 'tablet';
  if (w < 1600) return 'desktop';
  return 'tv';
}

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>(getDevice);

  useEffect(() => {
    const update = () => setDevice(getDevice());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return device;
}

/** Clases Tailwind base para botones por dispositivo */
export const btnSizes: Record<DeviceType, string> = {
  mobile:  'px-4 py-3 text-sm rounded-2xl min-h-[52px]',
  tablet:  'px-5 py-3.5 text-base rounded-2xl min-h-[52px]',
  desktop: 'px-5 py-3 text-sm rounded-xl min-h-[44px]',
  tv:      'px-10 py-6 text-2xl rounded-3xl min-h-[80px] focus:ring-4 focus:ring-white focus:outline-none',
};

export const textSizes: Record<DeviceType, { title: string; body: string; small: string; score: string }> = {
  mobile:  { title: 'text-lg',  body: 'text-sm',  small: 'text-[11px]', score: 'text-3xl' },
  tablet:  { title: 'text-xl',  body: 'text-base', small: 'text-xs',    score: 'text-4xl' },
  desktop: { title: 'text-2xl', body: 'text-sm',   small: 'text-xs',    score: 'text-4xl' },
  tv:      { title: 'text-5xl', body: 'text-2xl',  small: 'text-lg',    score: 'text-8xl' },
};
