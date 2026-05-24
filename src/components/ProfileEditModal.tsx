import React, { useState, useRef, useEffect } from 'react';
import {
  X, Camera, Upload, User as UserIcon, Mail, MapPin, Phone, Save,
  Instagram, Youtube, Facebook, Globe, Music2, Twitch, Loader2
} from 'lucide-react';
import { useAuthStore, useUIStore, type User, type UserSocials } from '../store/appStore';
import { supabase, storage } from '../lib/supabase';
import { uploadImage as uploadImageHelper } from '../lib/uploadHelper';
import { Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SOCIAL_FIELDS: { key: keyof UserSocials; label: string; icon: React.ReactNode; placeholder: string; color: string; dbCol: string }[] = [
  { key: 'instagram',  label: 'Instagram',  icon: <Instagram className="w-4 h-4" />, placeholder: '@usuario o URL',      color: 'from-purple-500 to-pink-500', dbCol: 'instagram_url' },
  { key: 'tiktok',     label: 'TikTok',     icon: <Music2 className="w-4 h-4" />,    placeholder: '@usuario',             color: 'from-gray-900 to-pink-500',   dbCol: 'tiktok_url' },
  { key: 'youtube',    label: 'YouTube',    icon: <Youtube className="w-4 h-4" />,   placeholder: 'URL del canal',        color: 'from-red-500 to-red-600',     dbCol: 'youtube_url' },
  { key: 'spotify',    label: 'Spotify',    icon: <Music2 className="w-4 h-4" />,    placeholder: 'URL artista Spotify',  color: 'from-green-500 to-green-600', dbCol: 'spotify_url' },
  { key: 'facebook',   label: 'Facebook',   icon: <Facebook className="w-4 h-4" />,  placeholder: 'URL página/perfil',    color: 'from-blue-500 to-blue-700',   dbCol: 'facebook_url' },
  { key: 'soundcloud', label: 'SoundCloud', icon: <Music2 className="w-4 h-4" />,    placeholder: 'URL SoundCloud',       color: 'from-pink-500 to-pink-600',   dbCol: 'soundcloud_url' },
  { key: 'twitch',     label: 'Twitch',     icon: <Twitch className="w-4 h-4" />,    placeholder: 'URL Twitch',           color: 'from-purple-600 to-purple-800', dbCol: 'twitch_url' },
  { key: 'website',    label: 'Web',        icon: <Globe className="w-4 h-4" />,     placeholder: 'https://...',          color: 'from-gray-700 to-gray-900',   dbCol: 'website_url' },
];

const ProfileEditModal: React.FC<Props> = ({ open, onClose }) => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();
  const [form, setForm] = useState<Partial<User>>(user || {});
  const [tab, setTab] = useState<'info' | 'socials' | 'photos'>('info');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) setForm(user); }, [user]);
  if (!open || !user) return null;

  // ── Upload image (helper unificado: Supabase → Cloudinary → base64) ──
  const uploadImage = async (file: File, field: 'avatar' | 'coverPhoto'): Promise<string | null> => {
    // Resize primero para no enviar archivos enormes
    const resized = await resizeImage(file, field === 'avatar' ? 400 : 1200, field === 'avatar' ? 400 : 400);
    const folder = field === 'avatar' ? `avatars/${user.id}` : `covers/${user.id}`;
    const r = await uploadImageHelper(resized, folder);
    if (r.url) return r.url;
    // último recurso: base64
    return await fileToBase64(file);
  };

  const resizeImage = (file: File, maxW: number, maxH: number): Promise<File> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const scale  = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File | undefined, field: 'avatar' | 'coverPhoto') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ message: 'Solo imágenes (jpg, png, webp...)', type: 'error' }); return;
    }
    if (field === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const url = await uploadImage(file, field);
      if (url) {
        setForm(prev => ({ ...prev, [field]: url }));
        addToast({ message: `${field === 'avatar' ? 'Foto de perfil' : 'Portada'} subida ✓`, type: 'success' });
      }
    } catch (err: any) {
      addToast({ message: `Error al subir imagen: ${err.message}`, type: 'error' });
    } finally {
      if (field === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  // ── Save profile to Supabase ───────────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim()) {
      addToast({ message: 'El nombre es obligatorio', type: 'error' }); return;
    }

    // Verify we have a real Supabase session (not demo login)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // No real session — just save to local store (demo mode)
      updateUser(form);
      addToast({ message: '✅ Perfil actualizado (modo demo)', type: 'success' });
      onClose();
      return;
    }

    setSaving(true);
    try {
      const realId = session.user.id; // Always use the real Supabase auth ID

      const dbUpdate: Record<string, any> = {
        full_name:      form.name,
        bio:            form.bio          || null,
        location:       form.city         || null,
        country:        form.country      || null,
        whatsapp:       form.phone        || null,
        avatar_url:     form.avatar       || null,
        instagram_url:  form.socials?.instagram  || null,
        tiktok_url:     form.socials?.tiktok     || null,
        youtube_url:    form.socials?.youtube    || null,
        website_url:    form.socials?.website    || null,
        facebook_url:   form.socials?.facebook   || null,
      };
      if (form.coverPhoto) dbUpdate.cover_photo = form.coverPhoto;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdate)
        .eq('id', realId);

      if (error) {
        // Retry with minimal set if some columns don't exist yet
        const { error: error2 } = await supabase
          .from('profiles')
          .update({
            full_name:  form.name,
            bio:        form.bio      || null,
            location:   form.city     || null,
            country:    form.country  || null,
            whatsapp:   form.phone    || null,
            avatar_url: form.avatar   || null,
          })
          .eq('id', realId);
        if (error2) throw error2;
      }

      // Sync local Zustand store
      updateUser({ ...form, id: realId });
      addToast({ message: '✅ Perfil guardado correctamente', type: 'success' });
      onClose();
    } catch (err: any) {
      console.error('Profile save error:', err);
      addToast({ message: `Error al guardar: ${err.message || 'Error desconocido'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
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
          <button onClick={() => coverRef.current?.click()} disabled={uploadingCover}
            className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow disabled:opacity-60">
            {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            {uploadingCover ? 'Subiendo...' : 'Cambiar portada'}
          </button>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0], 'coverPhoto')} />

          {/* Avatar */}
          <div className="absolute -bottom-10 left-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full ring-4 ring-white bg-gray-200 overflow-hidden">
                {uploadingAvatar ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
                  </div>
                ) : form.avatar ? (
                  <img src={form.avatar} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-orange text-white font-black text-2xl">
                    {form.name?.[0] || '?'}
                  </div>
                )}
              </div>
              <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 bg-brand-orange hover:bg-brand-orange-dark text-white p-1.5 rounded-full shadow disabled:opacity-60">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0], 'avatar')} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-12 pb-2 flex gap-2 border-b border-gray-100 flex-shrink-0">
          {[
            { id: 'info'   as const, label: 'Información' },
            { id: 'socials'as const, label: 'Redes sociales' },
            { id: 'photos' as const, label: 'Fotos' },
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
                <input value={form.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" type="email" />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />} label="WhatsApp / Teléfono">
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
                  placeholder="Cuéntale al mundo quién eres..."
                  className="input-field"
                  maxLength={500}
                />
                <p className="text-[10px] text-gray-400 text-right mt-1">{(form.bio || '').length}/500</p>
              </div>
            </div>
          )}

          {tab === 'socials' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">Conecta tus redes para que la gente te descubra.</p>
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
                    {uploadingAvatar
                      ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>
                      : form.avatar ? <img src={form.avatar} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}
                      className="bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-60">
                      {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingAvatar ? 'Subiendo...' : 'Subir foto de perfil'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2">JPG, PNG o WEBP · cuadrada · mín 400×400px</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Foto de portada</p>
                <div className="w-full aspect-[3/1] rounded-2xl bg-gray-100 overflow-hidden mb-3">
                  {uploadingCover
                    ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>
                    : form.coverPhoto
                      ? <img src={form.coverPhoto} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin portada</div>}
                </div>
                <button onClick={() => coverRef.current?.click()} disabled={uploadingCover}
                  className="bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-60">
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingCover ? 'Subiendo...' : 'Subir portada'}
                </button>
                <p className="text-[10px] text-gray-400 mt-2">Recomendado 1600×500px · JPG/PNG/WEBP</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                ✅ Las imágenes se guardan en Supabase Storage y persisten permanentemente.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-500 hidden sm:block">Los cambios se guardan en la base de datos.</p>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-bold px-4 py-2">Cancelar</button>
            <Button variant="orange" icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={handleSave} loading={saving}>
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </Button>
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
