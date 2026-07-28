/**
 * PublicProfilePage — Landing page pública del usuario/artista
 * URL: /p/:slug  (slug = email-username o id)
 * Tipo: embudo de ventas con CTA claros
 * - Optimizado para compartir en redes sociales
 * - SEO friendly con metadatos
 * - Botones de compartir nativos
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Instagram, Youtube, Facebook, Globe, Music, Twitch, Share2, MapPin,
  Star, Calendar, MessageCircle, CheckCircle, Copy, Check, Heart, ExternalLink, Edit,
} from 'lucide-react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '../lib/supabase';
import { safeSocialUrl } from '../lib/security';
import { useAuthStore } from '../store/appStore';
import ProfileEditModal from '../components/ProfileEditModal';

interface PublicProfile {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  cover_photo: string;
  location: string;
  country: string;
  role: string;
  whatsapp: string;
  email: string;
  verified: boolean;
  is_premium: boolean;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  facebook_url: string;
  website_url: string;
  twitch_url: string;
  spotify_url: string;
  soundcloud_url: string;
  tags?: string[];
  styles?: string[];
}

const ROLE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  artist:     { label: 'Artista',      color: 'bg-purple-500', emoji: '🎤' },
  dancer:     { label: 'Bailarín/a',   color: 'bg-green-500',  emoji: '💃' },
  dj:         { label: 'DJ',           color: 'bg-cyan-500',      emoji: '🎧' },
  instructor: { label: 'Profesor/a',   color: 'bg-pink-500',      emoji: '🎓' },
  venue:      { label: 'Local',        color: 'bg-orange-500',     emoji: '🏛️' },
  business:   { label: 'Vendedor',     color: 'bg-blue-600',    emoji: '🏪' },
  promoter:   { label: 'Promotor',     color: 'bg-yellow-500',  emoji: '📢' },
  user:       { label: 'Bailador/a',   color: 'bg-gray-500',      emoji: '🕺' },
};

const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isAdmin = ['admin','superadmin'].includes(user?.role ?? '');
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(searchParams.get('edit') === '1');

  // Auto-abrir edición si llega con ?edit=1 y es admin (o es su propio perfil)
  useEffect(() => {
    if (searchParams.get('edit') === '1' && (isAdmin || user?.id === slug)) {
      setEditOpen(true);
    }
  }, [searchParams, isAdmin, user, slug]);

  // Cargar perfil
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    (async () => {
      try {
        // Por ID directo o por email
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        const query = supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS);
        const { data, error } = isUUID
          ? await query.eq('id', slug).maybeSingle()
          : await query.ilike('email', `${slug.replace(/-/g, '%')}%`).limit(1).maybeSingle();
        if (error || !data) {
          setError('Perfil no encontrado');
          setLoading(false);
          return;
        }
        setProfile(data as any);
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    })();

    // Actualizar SEO meta
    if (slug) {
      document.title = `Perfil — BailaNow`;
    }
  }, [slug]);

  // Actualizar título cuando carga perfil
  useEffect(() => {
    if (profile) {
      document.title = `${profile.full_name} — BailaNow`;
      // Actualizar meta description
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', profile.bio?.slice(0, 160) || `${profile.full_name} en BailaNow`);
    }
  }, [profile]);

  const publicUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name} en BailaNow`,
          text: profile?.bio || `Mira el perfil de ${profile?.full_name}`,
          url: publicUrl,
        });
        return;
      } catch {}
    }
    setShareOpen(true);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Perfil no encontrado</h2>
          <p className="text-gray-400 mb-6">{error || 'Este perfil no existe o fue eliminado'}</p>
          <Link to="/" className="bg-brand-orange text-white font-bold px-6 py-3 rounded-xl inline-block">
            Volver a BailaNow
          </Link>
        </div>
      </div>
    );
  }

  const role = ROLE_LABELS[profile.role] || ROLE_LABELS.user;
  const socials = [
    { key: 'instagram',  url: profile.instagram_url,  icon: <Instagram className="w-5 h-5" />, color: 'from-purple-500 via-pink-500 to-orange-400', label: 'Instagram' },
    { key: 'tiktok',     url: profile.tiktok_url,     icon: <Music className="w-5 h-5" />,      color: 'bg-gray-900', label: 'TikTok' },
    { key: 'youtube',    url: profile.youtube_url,    icon: <Youtube className="w-5 h-5" />,    color: 'bg-red-500', label: 'YouTube' },
    { key: 'facebook',   url: profile.facebook_url,   icon: <Facebook className="w-5 h-5" />,   color: 'bg-blue-600', label: 'Facebook' },
    { key: 'twitch',     url: profile.twitch_url,     icon: <Twitch className="w-5 h-5" />,     color: 'bg-purple-600', label: 'Twitch' },
    { key: 'spotify',    url: profile.spotify_url,    icon: <Music className="w-5 h-5" />,      color: 'bg-green-500', label: 'Spotify' },
    { key: 'soundcloud', url: profile.soundcloud_url, icon: <Music className="w-5 h-5" />,      color: 'bg-orange-500', label: 'SoundCloud' },
    { key: 'website',    url: profile.website_url,    icon: <Globe className="w-5 h-5" />,      color: 'bg-gray-500', label: 'Sitio web' },
  ].filter(s => s.url);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* COVER */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-700 overflow-hidden">
        {profile.cover_photo && (
          <img src={profile.cover_photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Share button */}
        <button onClick={handleShare}
          className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm text-pink-600 font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 hover:scale-105 transition-transform">
          <Share2 className="w-4 h-4" /> Compartir
        </button>

        {/* BailaNow branding */}
        <Link to="/" className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full">
          💃 BailaNow
        </Link>
      </div>

      {/* AVATAR + INFO */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 relative">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white dark:bg-gray-900 p-1 shadow-2xl flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center text-white text-4xl font-black`}>
                {profile.full_name?.[0] || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 pb-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg truncate">{profile.full_name}</h1>
              {profile.verified && <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-100" />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-black text-white px-2 py-1 rounded-full bg-gradient-to-r ${role.color} shadow`}>
                {role.emoji} {role.label}
              </span>
              {profile.is_premium && (
                <span className="text-xs font-black text-white px-2 py-1 rounded-full bg-amber-500 shadow">
                  ⭐ PREMIUM
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Location + bio */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-md border border-gray-100 dark:border-gray-800 mb-4">
          {(profile.location || profile.country) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-3">
              <MapPin className="w-4 h-4 text-pink-500" />
              {profile.location}{profile.country && profile.location ? `, ${profile.country}` : profile.country}
            </p>
          )}
          {profile.bio && (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{profile.bio}</p>
          )}

          {/* Tags/Styles */}
          {((profile.styles && profile.styles.length > 0) || (profile.tags && profile.tags.length > 0)) && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {(profile.styles || []).map(s => (
                <Link key={s} to={`/cerca?style=${encodeURIComponent(s)}`}
                  className="text-xs font-bold px-3 py-1 rounded-full bg-brand-orange dark:from-pink-900/30 dark:to-fuchsia-900/30 text-pink-700 dark:text-pink-300 hover:scale-105 transition-transform">
                  🎵 {s}
                </Link>
              ))}
              {(profile.tags || []).map(t => (
                <span key={t} className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTAs principales (embudo de ventas) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {profile.whatsapp && (
            <a href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="bg-emerald-500 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          <button onClick={() => navigate(`/chat?with=${profile.id}`)}
            className="bg-brand-orange text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95">
            <MessageCircle className="w-4 h-4" /> Chat BailaNow
          </button>
        </div>

        {/* Redes sociales — botones grandes para compartir */}
        {socials.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-md border border-gray-100 dark:border-gray-800 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Sígueme en redes</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {socials.map(s => {
                const url = safeSocialUrl(s.key, s.url) || s.url;
                return (
                  <a key={s.key} href={url} target="_blank" rel="noopener noreferrer"
                    className={`bg-gradient-to-r ${s.color} text-white font-bold py-3 px-3 rounded-2xl flex items-center gap-2 shadow active:scale-95 hover:scale-[1.02] transition-transform`}>
                    {s.icon}
                    <span className="text-sm flex-1 truncate">{s.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA grande: Reservar / Bookear */}
        {['artist','dancer','dj','instructor'].includes(profile.role) && (
          <button onClick={() => navigate(`/clases?vendor=${profile.id}`)}
            className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-600 to-purple-600 text-white font-black py-4 rounded-2xl shadow-2xl shadow-pink-500/30 flex items-center justify-center gap-2 active:scale-95 mb-4">
            <Calendar className="w-5 h-5" /> Reservar una clase
          </button>
        )}

        {/* Footer BailaNow */}
        <div className="text-center pt-6 pb-12 text-xs text-gray-400">
          <p>Perfil creado en <Link to="/" className="text-pink-500 font-bold">BailaNow.com</Link></p>
          <p className="mt-1">¿Eres bailarín, DJ o profesor? <Link to="/auth?tab=register" className="text-pink-500 font-bold underline">Crea tu perfil gratis</Link></p>
        </div>
      </div>

      {/* Share modal fallback */}
      {shareOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setShareOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="font-black text-lg text-gray-900 dark:text-white text-center mb-2">Comparte este perfil</h3>

            <button onClick={copyLink}
              className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl p-3 flex items-center justify-between transition-all">
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 text-left">{publicUrl}</span>
              <span className={`text-sm font-black px-3 py-1 rounded-full flex items-center gap-1 ${copied ? 'bg-green-500 text-white' : 'bg-pink-500 text-white'}`}>
                {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </span>
            </button>

            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'WhatsApp', color: 'bg-green-500', url: `https://wa.me/?text=${encodeURIComponent(publicUrl)}` },
                { name: 'Telegram', color: 'bg-blue-500',     url: `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}` },
                { name: 'Twitter',  color: 'bg-gray-700',        url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}` },
                { name: 'Facebook', color: 'bg-blue-600',     url: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}` },
              ].map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                  className={`bg-gradient-to-br ${s.color} text-white text-xs font-bold py-3 rounded-xl text-center active:scale-95`}>
                  {s.name}
                </a>
              ))}
            </div>

            <button onClick={() => setShareOpen(false)} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold py-2.5 rounded-xl text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── Botón flotante de edición (solo admin u owner) ── */}
      {(isAdmin || user?.id === profile?.id) && (
        <button
          onClick={() => setEditOpen(true)}
          className="fixed bottom-36 lg:bottom-6 right-4 z-30 bg-brand-orange text-white font-bold rounded-full px-5 py-3 shadow-lg shadow-pink-500/40 flex items-center gap-2 active:scale-95"
          title="Editar este perfil"
        >
          <Edit className="w-5 h-5" />
          <span className="text-sm">Editar perfil</span>
        </button>
      )}

      {/* Modal de edición (Edit Profile) — abre encima del perfil real */}
      {editOpen && profile && (
        <ProfileEditModal
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            if (searchParams.get('edit')) {
              searchParams.delete('edit');
              setSearchParams(searchParams, { replace: true });
            }
            // Recargar perfil para mostrar cambios
            setTimeout(() => window.location.reload(), 500);
          }}
        />
      )}
    </div>
  );
};

export default PublicProfilePage;
