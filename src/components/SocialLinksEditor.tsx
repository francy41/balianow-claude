/**
 * SocialLinksEditor — Inputs inteligentes para redes sociales
 * - Detecta automáticamente si pegas URL completa o solo handle
 * - Normaliza al formato correcto
 * - Botón "abrir" verifica el link
 * - Iconos colorados con marcas oficiales
 */
import React, { useState } from 'react';
import { Instagram, Youtube, Facebook, Globe, Check, X, ExternalLink, Twitch, Music } from 'lucide-react';
import { safeSocialUrl } from '../lib/security';
import type { UserSocials } from '../store/appStore';

type Platform = keyof UserSocials;

interface PlatformConfig {
  key: Platform;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  color: string;
  prefix: string;
  domains: string[];      // Para detectar URLs completas
}

const PLATFORMS: PlatformConfig[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario o https://instagram.com/usuario',
    icon: <Instagram className="w-4 h-4" />, color: 'from-purple-500 via-pink-500 to-orange-400',
    prefix: 'https://instagram.com/', domains: ['instagram.com'] },
  { key: 'tiktok',    label: 'TikTok', placeholder: '@usuario o https://tiktok.com/@usuario',
    icon: <Music className="w-4 h-4" />, color: 'bg-gray-900',
    prefix: 'https://tiktok.com/@', domains: ['tiktok.com'] },
  { key: 'youtube',   label: 'YouTube', placeholder: '@canal o https://youtube.com/@canal',
    icon: <Youtube className="w-4 h-4" />, color: 'bg-red-500',
    prefix: 'https://youtube.com/@', domains: ['youtube.com', 'youtu.be'] },
  { key: 'facebook',  label: 'Facebook', placeholder: 'usuario o https://facebook.com/usuario',
    icon: <Facebook className="w-4 h-4" />, color: 'bg-blue-600',
    prefix: 'https://facebook.com/', domains: ['facebook.com', 'fb.com'] },
  { key: 'twitch',    label: 'Twitch', placeholder: 'canal o https://twitch.tv/canal',
    icon: <Twitch className="w-4 h-4" />, color: 'bg-purple-600',
    prefix: 'https://twitch.tv/', domains: ['twitch.tv'] },
  { key: 'spotify',   label: 'Spotify', placeholder: 'URL de tu perfil Spotify',
    icon: <Music className="w-4 h-4" />, color: 'bg-green-500',
    prefix: 'https://open.spotify.com/artist/', domains: ['spotify.com'] },
  { key: 'soundcloud',label: 'SoundCloud', placeholder: 'usuario o https://soundcloud.com/usuario',
    icon: <Music className="w-4 h-4" />, color: 'bg-orange-500',
    prefix: 'https://soundcloud.com/', domains: ['soundcloud.com'] },
  { key: 'website',   label: 'Sitio web', placeholder: 'https://tu-sitio.com',
    icon: <Globe className="w-4 h-4" />, color: 'bg-gray-500',
    prefix: 'https://', domains: [] },
];

interface Props {
  socials: UserSocials | undefined;
  onChange: (socials: UserSocials) => void;
}

const SocialLinksEditor: React.FC<Props> = ({ socials, onChange }) => {
  const current = socials || {} as UserSocials;
  const [focusedKey, setFocusedKey] = useState<Platform | null>(null);

  const normalize = (platform: PlatformConfig, raw: string): string => {
    const v = raw.trim();
    if (!v) return '';
    // Si ya es URL completa de la plataforma o cualquier URL → mantener
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    // Si es @handle → quitar @ y añadir prefijo
    const handle = v.replace(/^@/, '');
    return platform.prefix + handle;
  };

  const setVal = (key: Platform, raw: string) => {
    onChange({ ...current, [key]: raw });
  };

  const handleBlur = (platform: PlatformConfig) => {
    const v = (current as any)[platform.key];
    if (v && !v.startsWith('http')) {
      const normalized = normalize(platform, v);
      onChange({ ...current, [platform.key]: normalized });
    }
  };

  const verify = (platform: PlatformConfig, value: string): { valid: boolean; url: string | null } => {
    if (!value) return { valid: true, url: null };
    const url = safeSocialUrl(platform.key, value);
    return { valid: !!url, url };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
        <span className="text-lg">💡</span>
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <p className="font-bold">Tip:</p>
          <p>Puedes pegar la URL completa (https://instagram.com/...) o solo tu @usuario. Lo detectamos automáticamente.</p>
        </div>
      </div>

      {PLATFORMS.map(p => {
        const value = (current as any)[p.key] || '';
        const { valid, url } = verify(p, value);
        const isFocused = focusedKey === p.key;
        return (
          <div key={p.key} className="group">
            <div className={`flex items-center gap-2 bg-white dark:bg-gray-800 border-2 rounded-xl transition-all ${
              isFocused ? 'border-pink-500 shadow-md' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className={`w-10 h-10 rounded-l-lg bg-gradient-to-br ${p.color} flex items-center justify-center text-white flex-shrink-0`}>
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[9px] uppercase font-black text-gray-400 tracking-wider px-1 pt-1">
                  {p.label}
                </label>
                <input
                  type="text" value={value}
                  onChange={e => setVal(p.key, e.target.value)}
                  onFocus={() => setFocusedKey(p.key)}
                  onBlur={() => { setFocusedKey(null); handleBlur(p); }}
                  placeholder={p.placeholder}
                  className="w-full bg-transparent border-0 px-1 pb-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                />
              </div>
              {value && (
                <div className="flex items-center gap-1 pr-2 flex-shrink-0">
                  {valid ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded-lg text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20" title="Abrir en nueva pestaña">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
            {value && !valid && (
              <p className="text-[10px] text-red-500 mt-1 pl-2">⚠ URL no válida</p>
            )}
          </div>
        );
      })}

      {/* Preview de iconos activos */}
      {Object.values(current).filter(v => v).length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-2">Vista previa</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => {
              const v = (current as any)[p.key];
              if (!v) return null;
              const { url } = verify(p, v);
              if (!url) return null;
              return (
                <a key={p.key} href={url} target="_blank" rel="noopener noreferrer"
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.color} text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md`}
                  title={p.label}>
                  {p.icon}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialLinksEditor;
