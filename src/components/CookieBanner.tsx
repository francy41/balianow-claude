import React, { useState, useEffect } from 'react';
import { Cookie, X, Check, Settings } from 'lucide-react';

const COOKIE_KEY = 'bailanow-cookie-consent';

type ConsentState = 'accepted' | 'rejected' | 'custom' | null;

interface Prefs { analytics: boolean; marketing: boolean }

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ analytics: true, marketing: false });

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) {
      // Show after 1 second
      const t = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(t);
    }
    // Permite reabrir el banner desde otros sitios (ej. footer "Gestionar cookies")
    const reopen = () => {
      try {
        const prev = JSON.parse(localStorage.getItem(COOKIE_KEY) || '{}');
        if (prev?.prefs) setPrefs(prev.prefs);
      } catch {}
      setShowCustom(true);
      setVisible(true);
    };
    window.addEventListener('bn:open-cookie-settings', reopen);
    return () => window.removeEventListener('bn:open-cookie-settings', reopen);
  }, []);

  const save = (state: ConsentState, customPrefs?: Prefs) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ state, prefs: customPrefs || prefs, date: new Date().toISOString() }));
    setVisible(false);
    // Avisa a otros componentes (ej. botón de donación) que el banner ya no ocupa el borde inferior.
    window.dispatchEvent(new Event('bn:cookie-consent'));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] lg:bottom-4 lg:left-4 lg:right-auto lg:max-w-sm">
      <div className="bg-gray-950 border border-pink-500/30 rounded-t-2xl lg:rounded-2xl shadow-2xl shadow-black/50 overflow-y-auto max-h-[65vh]">

        {!showCustom ? (
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center">
                <Cookie className="w-4 h-4 text-pink-400" />
              </div>
              <h3 className="font-black text-white text-sm">Usamos cookies</h3>
            </div>

            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Usamos cookies propias y de terceros para mejorar tu experiencia, analizar el uso y mostrarte contenido relevante.
              Puedes aceptar todas o personalizar tus preferencias.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => save('accepted', { analytics: true, marketing: true })}
                className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white font-bold text-sm py-2.5 rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all"
              >
                <Check className="w-4 h-4" /> Aceptar todas
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustom(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-700 text-gray-400 text-xs font-bold py-2 rounded-xl hover:bg-gray-800 transition-all"
                >
                  <Settings className="w-3 h-3" /> Personalizar
                </button>
                <button
                  onClick={() => save('rejected', { analytics: false, marketing: false })}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-700 text-gray-400 text-xs font-bold py-2 rounded-xl hover:bg-gray-800 transition-all"
                >
                  <X className="w-3 h-3" /> Solo necesarias
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-[10px] mt-3 text-center">
              <a href="/legal/cookies" className="hover:text-pink-400 transition-colors underline underline-offset-2">Política de cookies</a>
              {' · '}
              <a href="/legal/privacidad" className="hover:text-pink-400 transition-colors underline underline-offset-2">Privacidad</a>
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white text-sm">Gestionar preferencias</h3>
              <button onClick={() => setShowCustom(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {/* Técnicas */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-xs font-bold">Necesarias</p>
                  <p className="text-gray-500 text-[10px]">Sesión, carrito, preferencias. Siempre activas.</p>
                </div>
                <div className="w-9 h-5 bg-green-600 rounded-full flex items-center justify-end px-0.5 flex-shrink-0 mt-0.5">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>

              {/* Análisis */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-xs font-bold">Análisis</p>
                  <p className="text-gray-500 text-[10px]">Nos ayudan a mejorar la plataforma (anónimas).</p>
                </div>
                <button
                  onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 mt-0.5 ${prefs.analytics ? 'bg-pink-500 justify-end' : 'bg-gray-700 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full" />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-xs font-bold">Marketing</p>
                  <p className="text-gray-500 text-[10px]">Anuncios relevantes en otras plataformas.</p>
                </div>
                <button
                  onClick={() => setPrefs(p => ({ ...p, marketing: !p.marketing }))}
                  className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 mt-0.5 ${prefs.marketing ? 'bg-pink-500 justify-end' : 'bg-gray-700 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            </div>

            <button
              onClick={() => save('custom')}
              className="w-full bg-brand-orange text-white font-bold text-sm py-2.5 rounded-xl"
            >
              Guardar preferencias
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
