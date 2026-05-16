import React, { useState, useRef, useEffect } from 'react';
import {
  X, Camera, Upload, User as UserIcon, Mail, MapPin, Phone, Save,
  Instagram, Youtube, Facebook, Globe, Music2, Twitch
} from 'lucide-react';
import { useAuthStore, useUIStore, type User, type UserSocials } from '../store/appStore';
import { Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SOCIAL_FIELDS: { key: keyof UserSocials; label: string; icon: React.ReactNode; placeholder: string; color: string }[] = [
  { key: 'instagram',  label: 'Instagram',  icon: <Instagram className="w-4 h-4" />, placeholder: '@usuario o URL',         color: 'from-purple-500 to-pink-500' },
  { key: 'tiktok',     label: 'TikTok',     icon: <Music2 className="w-4 h-4" />,    placeholder: '@usuario',               color: 'from-gray-900 to-pink-500' },
  { key: 'youtube',    label: 'YouTube',    icon: <Youtube className="w-4 h-4" />,   placeholder: 'URL del canal',          color: 'from-red-500 to-red-600' },
  { key: 'spotify',    label: 'Spotify',    icon: <Music2 className="w-4 h-4" />,    placeholder: 'URL artista Spotify',    color: 'from-green-500 to-green-600' },
  { key: 'facebook',   label: 'Facebook',   icon: <Facebook className="w-4 h-4" />,  placeholder: 'URL página/perfil',      color: 'from-blue-500 to-blue-700' },
  { key: 'soundcloud', label: 'SoundCloud', icon: <Music2 className="w-4 h-4" />,    placeholder: 'URL SoundCloud',         color: 'from-orange-500 to-orange-600' },
  { key: 'twitch',     label: 'Twitch',     icon: <Twitch className="w-4 h-4" />,    placeholder: 'URL Twitch',             color: 'from-purple-600 to-purple-800' },
  { key: 'website',    label: 'Web',        icon: <Globe className="w-4 h-4" />,     placeholder: 'https://...',            color: 'from-gray-700 to-gray-900' },
];

const ProfileEditModal: React.FC<Props> = ({ open, onClose }) => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();
  const [form, setForm] = useState<Partial<User>>(user || {});
  const [tab, setTab] = useState<'info' | 'socials' | 'photos'>('info');
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) setForm(user); }, [user]);
  if (!open || !user) return null;

  const handleFile = (file: File | undefined, field: 'avatar' | 'coverPhoto') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ message: 'Solo imágenes (jpg, png, webp...)', type: 'error' }); return;
    }
    const url = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, [field]: url }));
    addToast({ message: `${field === 'avatar' ? 'Foto de perfil' : 'Portada'} cargada`, type: 'success' });
  };

  const handleSave = () => {
    if (!form.name?.trim()) { addToast({ message: 'El nombre es obligatorio', type: 'error' }); return; }
    updateUser(form);
    addToast({ message: 'Perfil actualizado', type: 'success' });
    onClose();
  };

  const setSocial = (key: keyof UserSocials, value: string) =>
    setForm(prev => ({ ...prev, socials: { ...(prev.socials || {}), [key]: value } }));

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header con portada */}
        <div className="relative h-40 bg-gradient-to-br from-brand-orange to-pink-500 flex-shrink-0">
          {form.coverPhoto && <img src={form.coverPhoto} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/30" />
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5">
            <X className="w-4 h-4" />
          </button>
          <button onClick={() => coverRef.current?.click()}
            className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
            <Camera className="w-3.5 h-3.5" /> Cambiar portada
          </button>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0], 'coverPhoto')} />

          {/* Avatar */}
          <div className="absolute -bottom-10 left-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full ring-4 ring-white bg-gray-200 overflow-hidden">
                {form.avatar ? (
                  <img src={form.avatar} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-orange text-white font-black text-2xl">
                    {form.name?.[0] || '?'}
                  </div>
                )}
              </div>
              <button onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-brand-orange hover:bg-brand-orange-dark text-white p-1.5 rounded-full shadow">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0], 'avatar')} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-12 pb-2 flex gap-2 border-b border-gray-100 flex-shrink-0">
          {[
            { id: 'info' as const,    label: 'Información' },
            { id: 'socials' as const, label: 'Redes sociales' },
            { id: 'photos' as const,  label: 'Fotos' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-sm font-bold pb-2 px-2 border-b-2 transition-all ${
                tab === t.id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'info' && (
            <div className="space-y-3">
              <Field icon={<UserIcon className="w-4 h-4" />} label="Nombre completo *">
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
              </Field>
              <Field icon={<Mail className="w-4 h-4" />} label="Email">
                <input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" type="email" />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />} label="Teléfono">
                <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+34 600 000 000" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={<MapPin className="w-4 h-4" />} label="Ciudad">
                  <input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} className="input-field" />
                </Field>
                <Field icon={<Globe className="w-4 h-4" />} label="País">
                  <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} className="input-field" placeholder="España" />
                </Field>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Biografía</label>
                <textarea
                  value={form.bio || ''}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  placeholder="Cuéntale al mundo quién eres, qué haces y qué te apasiona..."
                  className="input-field"
                  maxLength={500}
                />
                <p className="text-[10px] text-gray-400 text-right mt-1">{(form.bio || '').length}/500</p>
              </div>
            </div>
          )}

          {tab === 'socials' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">Conecta tus redes para que la gente te descubra. Aparecerán en tu perfil público.</p>
              {SOCIAL_FIELDS.map(s => (
                <div key={s.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} text-white flex items-center justify-center flex-shrink-0`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-700">{s.label}</label>
                    <input
                      value={form.socials?.[s.key] || ''}
                      onChange={e => setSocial(s.key, e.target.value)}
                      placeholder={s.placeholder}
                      className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none mt-0.5"
                    />
                  </div>
                  {form.socials?.[s.key] && (
                    <button onClick={() => setSocial(s.key, '')} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'photos' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Foto de perfil</p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                    {form.avatar ? <img src={form.avatar} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <button onClick={() => avatarRef.current?.click()} className="bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Subir foto de perfil
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2">JPG, PNG o WEBP · cuadrada recomendada · mín 400×400px</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Foto de portada</p>
                <div className="w-full aspect-[3/1] rounded-2xl bg-gray-100 overflow-hidden mb-3">
                  {form.coverPhoto ? (
                    <img src={form.coverPhoto} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin portada</div>
                  )}
                </div>
                <button onClick={() => coverRef.current?.click()} className="bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Subir portada
                </button>
                <p className="text-[10px] text-gray-400 mt-2">Recomendado 1600×500px · JPG/PNG/WEBP</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-gray-700">
                💡 Tip: las imágenes se guardan localmente (URL temporal del navegador). Para producción se subirían a Cloudinary/S3.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-500 hidden sm:block">Los cambios se aplican al instante en toda la web.</p>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-bold px-4 py-2">Cancelar</button>
            <Button variant="orange" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Guardar perfil</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5 mb-1">
      <span className="text-gray-400">{icon}</span> {label}
    </label>
    {children}
  </div>
);

export default ProfileEditModal;
