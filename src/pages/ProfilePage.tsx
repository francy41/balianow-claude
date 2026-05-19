import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit3, MapPin, Mail, Phone, Globe, Instagram, Youtube, Facebook,
  Twitch, Music2, CheckCircle, Camera
} from 'lucide-react';
import { useAuthStore } from '../store/appStore';
import { Avatar, Badge, Button } from '../components/ui';
import ProfileEditModal from '../components/ProfileEditModal';

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram:  <Instagram className="w-4 h-4" />,
  youtube:    <Youtube className="w-4 h-4" />,
  facebook:   <Facebook className="w-4 h-4" />,
  twitch:     <Twitch className="w-4 h-4" />,
  spotify:    <Music2 className="w-4 h-4" />,
  soundcloud: <Music2 className="w-4 h-4" />,
  tiktok:     <Music2 className="w-4 h-4" />,
  website:    <Globe className="w-4 h-4" />,
};

const SOCIAL_COLORS: Record<string, string> = {
  instagram:  'from-purple-500 to-pink-500',
  youtube:    'from-red-500 to-red-600',
  facebook:   'from-blue-500 to-blue-700',
  spotify:    'from-green-500 to-green-600',
  soundcloud: 'from-pink-500 to-pink-600',
  tiktok:     'from-gray-900 to-pink-500',
  twitch:     'from-purple-600 to-purple-800',
  website:    'from-gray-700 to-gray-900',
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-500 mb-4">Inicia sesión para ver tu perfil</p>
          <Button variant="orange" onClick={() => navigate('/auth')}>Entrar</Button>
        </div>
      </div>
    );
  }

  const socials = Object.entries(user.socials || {}).filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-brand-orange to-pink-500 overflow-hidden">
        {user.coverPhoto && <img src={user.coverPhoto} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <button onClick={() => setEditOpen(true)}
          className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow">
          <Edit3 className="w-4 h-4" /> Editar perfil
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative">
        <div className="card-white rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="ring-4 ring-white rounded-full -mt-14">
              <Avatar src={user.avatar} name={user.name} size="xl" />
            </div>
            <div className="flex-1 sm:pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-3xl text-gray-900">{user.name}</h1>
                {user.isVerified && <CheckCircle className="w-6 h-6 text-blue-500" />}
                {user.isPremium && <Badge variant="orange">👑 PRO</Badge>}
              </div>
              <p className="text-gray-500 capitalize mt-1">{user.role} · {user.city}{user.country ? `, ${user.country}` : ''}</p>
              {user.bio && <p className="text-gray-700 mt-3 leading-relaxed max-w-2xl">{user.bio}</p>}
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100">
            <InfoBlock icon={<Mail className="w-4 h-4" />}  label="Email"    value={user.email} />
            {user.phone && <InfoBlock icon={<Phone className="w-4 h-4" />} label="Teléfono" value={user.phone} />}
            <InfoBlock icon={<MapPin className="w-4 h-4" />} label="Ubicación" value={`${user.city}${user.country ? ', ' + user.country : ''}`} />
          </div>

          {/* Socials */}
          {socials.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-orange" /> Redes sociales
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {socials.map(([k, v]) => (
                  <a key={k}
                    href={String(v).startsWith('http') ? String(v) : `https://${k}.com/${String(v).replace('@', '')}`}
                    target="_blank" rel="noreferrer"
                    className="card-white rounded-xl p-3 flex items-center gap-2 hover:shadow-md transition-all">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SOCIAL_COLORS[k]} text-white flex items-center justify-center flex-shrink-0`}>
                      {SOCIAL_ICONS[k]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{k}</p>
                      <p className="text-xs text-gray-700 truncate">{String(v)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {socials.length === 0 && !user.bio && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-center py-8">
              <Camera className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm mb-3">Tu perfil aún está vacío. Añade bio, foto, portada y redes sociales.</p>
              <Button variant="orange" icon={<Edit3 className="w-4 h-4" />} onClick={() => setEditOpen(true)}>
                Completar mi perfil
              </Button>
            </div>
          )}
        </div>
      </div>

      <ProfileEditModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
};

const InfoBlock: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
    <div className="text-gray-400 mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 truncate">{value}</p>
    </div>
  </div>
);

export default ProfilePage;
