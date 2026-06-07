/**
 * LanguageSelector — dropdown para cambiar el idioma de la app
 */
import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n, LANGUAGES } from '../lib/i18n';

const LanguageSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
        aria-label="Cambiar idioma"
      >
        <span className="text-base">{current.flag}</span>
        {!compact && <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">{current.code.toUpperCase()}</span>}
        <Globe className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 py-1 z-[200] max-h-80 overflow-y-auto">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors text-left ${lang === l.code ? 'text-pink-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="flex-1">{l.name}</span>
              {lang === l.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
