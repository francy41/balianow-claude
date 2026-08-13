import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Loader2, Instagram, Facebook, Music2, MessageCircle, Calendar,
  Share2, Copy, Check, Users, Store, Send as Telegram, Heart, BadgeCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { useSeo } from '../hooks/useSeo';

interface Partner {
  partner_id: string;
  display_name: string | null;
  bio: string | null;
  logo_url: string | null;
  cover_url: string | null;
  cities: string[];
  socials: { provider: string; handle: string | null }[];
}
interface EventItem { id: string; title: string; date: string | null; cover: string | null; }
interface VenueItem { id: string; name: string; cover: string | null; type: string | null; }
interface ArtistItem { id: string; name: string; avatar: string | null; cover: string | null; type: string | null; }

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />, facebook: <Facebook className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />, whatsapp: <MessageCircle className="w-4 h-4" />,
};
const socialUrl = (provider: string, handle: string) => {
  const h = handle.replace(/^@/, '').trim();
  switch (provider) {
    case 'instagram': return `https://instagram.com/${h}`;
    case 'facebook': return `https://facebook.com/${h}`;
    case 'tiktok': return `https://tiktok.com/@${h}`;
    case 'whatsapp': return `https://wa.me/${h.replace(/\D/g, '')}`;
    default: return '#';
  }
};

const PartnerProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [followers, setFollowers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const brand = partner?.display_name?.trim() || 'Partner BailaNow';
  const citiesLabel = useMemo(() => (partner?.cities || []).join(' · '), [partner]);
  const shareUrl = `https://bailanow.com/partner/${encodeURIComponent(slug || '')}`;
  const shareText = `💃🔥 ${brand} en BailaNow — eventos, locales y artistas${citiesLabel ? ' de ' + citiesLabel : ''}`;
  const ogImage = partner?.cover_url || partner?.logo_url || events[0]?.cover || undefined;

  useSeo({
    title: `${brand}${citiesLabel ? ' · ' + citiesLabel : ''} — danza latina en BailaNow`,
    description: partner?.bio || `Sigue a ${brand} en BailaNow: eventos, locales y artistas${citiesLabel ? ' de ' + citiesLabel : ''}. Salsa, bachata, kizomba y más.`,
    path: `/partner/${slug || ''}`,
    image: ogImage,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      const { data } = await supabase.rpc('partner_by_slug', { p_slug: slug });
      const row = Array.isArray(data) ? data[0] : data;
      if (cancelled) return;
      if (!row) { setPartner(null); setLoading(false); return; }
      const p: Partner = {
        partner_id: row.partner_id, display_name: row.display_name, bio: row.bio,
        logo_url: row.logo_url, cover_url: row.cover_url, cities: row.cities || [], socials: row.socials || [],
      };
      setPartner(p);

      const cities = p.cities.length ? p.cities : [''];
      const [{ data: ev }, { data: vn }, { data: ar }, followCount, mine] = await Promise.all([
        supabase.from('events').select('id,title,date,cover').is('deleted_at', null).in('city', cities).order('date', { ascending: true }).limit(6),
        supabase.from('venues').select('id,name,cover,type').is('deleted_at', null).in('city', cities).limit(6),
        supabase.from('artists').select('id,name,avatar,cover,type').in('city', cities).limit(8),
        supabase.from('partner_followers').select('*', { count: 'exact', head: true }).eq('partner_id', p.partner_id),
        user ? supabase.from('partner_followers').select('user_id').eq('partner_id', p.partner_id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setEvents((ev as EventItem[]) || []);
      setVenues((vn as VenueItem[]) || []);
      setArtists((ar as ArtistItem[]) || []);
      setFollowers(followCount.count || 0);
      setIsFollowing(!!(mine as any)?.data);
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(safety); };
  }, [slug, user]);

  const toggleFollow = async () => {
    if (!partner) return;
    if (!user) { navigate('/auth'); return; }
    setFollowBusy(true);
    if (isFollowing) {
      const { error } = await supabase.from('partner_followers').delete().eq('partner_id', partner.partner_id).eq('user_id', user.id);
      if (!error) { setIsFollowing(false); setFollowers(f => Math.max(0, f - 1)); }
      else addToast({ message: error.message, type: 'error' });
    } else {
      const { error } = await supabase.from('partner_followers').insert({ partner_id: partner.partner_id, user_id: user.id });
      if (!error) { setIsFollowing(true); setFollowers(f => f + 1); addToast({ message: `Sigues a ${brand} ✔`, type: 'success' }); }
      else addToast({ message: error.message, type: 'error' });
    }
    setFollowBusy(false);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); addToast({ message: 'Enlace copiado ✔', type: 'success' }); }
    catch { addToast({ message: shareUrl, type: 'info' }); }
  };
  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: brand, text: shareText, url: shareUrl }); } catch { /* cancelado */ }
    } else { copyLink(); }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;

  if (!partner) return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl mb-3">🕵️</p>
      <h1 className="font-display font-black text-2xl">Partner no encontrado</h1>
      <p className="text-white/50 mt-2 max-w-sm">No existe un partner con ese enlace o aún no está activo.</p>
      <button onClick={() => navigate('/')} className="mt-5 bg-brand-orange font-bold rounded-xl px-5 py-2.5">Ir al inicio</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Cover */}
      <div className="relative h-44 sm:h-60 overflow-hidden">
        {partner.cover_url
          ? <img src={partner.cover_url} alt={brand} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-fuchsia-700/40 via-[#0a0a0f] to-orange-600/30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-5">
        {/* Identidad */}
        <div className="-mt-12 relative flex items-end gap-4">
          <div className="w-24 h-24 rounded-2xl ring-4 ring-[#0a0a0f] bg-gray-800 overflow-hidden flex-shrink-0">
            {partner.logo_url
              ? <img src={partner.logo_url} alt={brand} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-fuchsia-300">{brand.charAt(0)}</div>}
          </div>
          <div className="pb-1 min-w-0">
            <h1 className="font-display font-black text-2xl sm:text-3xl leading-tight flex items-center gap-2">
              <span className="truncate">{brand}</span>
              <BadgeCheck className="w-6 h-6 text-fuchsia-400 flex-shrink-0" />
            </h1>
            {citiesLabel && <p className="text-white/60 text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {citiesLabel}</p>}
          </div>
        </div>

        {partner.bio && <p className="text-white/70 mt-4">{partner.bio}</p>}

        {/* Seguidores + acciones */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={toggleFollow} disabled={followBusy}
            className={`inline-flex items-center gap-2 font-black rounded-xl px-5 py-2.5 transition disabled:opacity-60 ${isFollowing ? 'bg-white/10 ring-1 ring-white/20 text-white' : 'bg-gradient-to-r from-brand-orange to-fuchsia-600 text-white hover:scale-[1.03] shadow-lg shadow-fuchsia-500/30'}`}>
            <Heart className={`w-4 h-4 ${isFollowing ? 'fill-fuchsia-400 text-fuchsia-400' : ''}`} /> {isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
          <span className="text-sm text-white/60"><b className="text-white">{followers.toLocaleString('es')}</b> seguidores</span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={nativeShare} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 font-bold rounded-xl px-4 py-2.5 transition"><Share2 className="w-4 h-4" /> Compartir</button>
            <button onClick={copyLink} aria-label="Copiar enlace" className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>
          </div>
        </div>

        {/* Compartir en redes */}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 transition"><MessageCircle className="w-4 h-4" /></a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" aria-label="Facebook" className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 transition"><Facebook className="w-4 h-4" /></a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" aria-label="Telegram" className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 transition"><Telegram className="w-4 h-4" /></a>
          {partner.socials.filter(s => s.handle).map(s => (
            <a key={s.provider} href={socialUrl(s.provider, s.handle!)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-white/5 hover:bg-white/15 rounded-lg px-3 py-2 capitalize transition">
              {PROVIDER_ICON[s.provider]} {s.provider}
            </a>
          ))}
        </div>

        <div className="mt-8 space-y-8">
          {/* Eventos */}
          {events.length > 0 && (
            <div>
              <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-fuchsia-400" /> Próximos eventos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {events.map(e => (
                  <button key={e.id} onClick={() => navigate(`/eventos/${e.id}`)} className="text-left rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10">
                    <div className="aspect-video bg-gray-800">
                      {e.cover ? <img src={e.cover} alt={e.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>}
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-sm line-clamp-1">{e.title}</p>
                      {e.date && <p className="text-white/50 text-xs">{new Date(e.date).toLocaleDateString('es')}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Locales */}
          {venues.length > 0 && (
            <div>
              <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2"><Store className="w-5 h-5 text-fuchsia-400" /> Locales</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {venues.map(v => (
                  <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)} className="text-left rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10">
                    <div className="aspect-video bg-gray-800">
                      {v.cover ? <img src={v.cover} alt={v.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🪩</div>}
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-sm line-clamp-1">{v.name}</p>
                      {v.type && <p className="text-white/50 text-xs capitalize">{v.type}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Artistas */}
          {artists.length > 0 && (
            <div>
              <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-fuchsia-400" /> Artistas</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {artists.map(a => (
                  <button key={a.id} onClick={() => navigate(`/artistas/${a.id}`)} className="text-center group">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-gray-800 ring-1 ring-white/10 mb-1.5">
                      {(a.avatar || a.cover) ? <img src={(a.avatar || a.cover)!} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎧</div>}
                    </div>
                    <p className="font-bold text-xs line-clamp-1">{a.name}</p>
                    {a.type && <p className="text-white/40 text-[10px] capitalize">{a.type}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && venues.length === 0 && artists.length === 0 && (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-8 text-center text-white/50">
              Este partner aún no tiene contenido publicado en {citiesLabel || 'su ciudad'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerProfilePage;
