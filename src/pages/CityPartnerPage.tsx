import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Send, Loader2, Instagram, Facebook, Music2, MessageCircle, Calendar, Sparkles, CheckCircle2, Share2, Copy, Check, Users, Store, Send as Telegram } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';
import { useSeo } from '../hooks/useSeo';
import NotFoundPage from './NotFoundPage';

interface CityPartner { partner_id: string; display_name: string | null; socials: { provider: string; handle: string | null }[]; }
interface CityEvent { id: string; title: string; date: string | null; cover: string | null; }
interface CityVenue { id: string; name: string; cover: string | null; type: string | null; }
interface CityArtist { id: string; name: string; avatar: string | null; cover: string | null; type: string | null; }

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

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const CityPartnerPage: React.FC = () => {
  const { city: cityParam } = useParams<{ city: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const city = useMemo(() => titleCase(decodeURIComponent(cityParam || '')), [cityParam]);

  const [loading, setLoading] = useState(true);
  const [noExiste, setNoExiste] = useState(false);
  const [partner, setPartner] = useState<CityPartner | null>(null);
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [venues, setVenues] = useState<CityVenue[]>([]);
  const [artists, setArtists] = useState<CityArtist[]>([]);
  const [ogImage, setOgImage] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const brand = partner?.display_name?.trim() || `BailaNow ${city}`;
  const shareUrl = `https://bailanow.com/${encodeURIComponent((cityParam || city).toLowerCase())}`;
  const shareText = `💃🔥 La escena de danza latina de ${city} en BailaNow — eventos, locales y artistas${partner?.display_name ? ' · ' + partner.display_name : ''}`;

  useSeo({
    title: `${brand} — danza latina en ${city}: eventos, locales y artistas | BailaNow`,
    description: `Todo lo latino de ${city} en un sitio: eventos, locales, artistas y tu partner local ${partner?.display_name || 'de BailaNow'}. Salsa, bachata, kizomba y más.`,
    path: `/${cityParam || ''}`,
    image: ogImage,
  });

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); addToast({ message: 'Enlace copiado ✔', type: 'success' }); }
    catch { addToast({ message: shareUrl, type: 'info' }); }
  };
  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: brand, text: shareText, url: shareUrl }); } catch { /* cancelado */ }
    } else { copyLink(); }
  };

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      const res = await Promise.all([
        supabase.rpc('city_partner', { p_city: city }),
        supabase.from('events').select('id,title,date,cover').is('deleted_at', null).ilike('city', city).order('date', { ascending: true }).limit(6),
        supabase.from('venues').select('id,name,cover,type').is('deleted_at', null).ilike('city', city).limit(6),
        supabase.from('artists').select('id,name,avatar,cover,type').ilike('city', city).limit(8),
      ]);
      if (cancelled) return;
      const [{ data: cp }, { data: ev }, { data: vn }, { data: ar }] = res;
      const row = Array.isArray(cp) ? cp[0] : cp;
      setPartner(row ? { partner_id: row.partner_id, display_name: row.display_name, socials: row.socials || [] } : null);
      const evs = (ev as CityEvent[]) || [];
      const vns = (vn as CityVenue[]) || [];
      const ars = (ar as CityArtist[]) || [];
      setEvents(evs);
      setVenues(vns);
      setArtists(ars);
      setOgImage(evs[0]?.cover || vns[0]?.cover || ars.find(a => a.cover)?.cover || undefined);

      // `/:city` es un comodín al final de App.tsx: captura CUALQUIER ruta de un
      // segmento que ninguna otra reclamó. Una errata en un enlace acababa aquí
      // mostrando una ciudad inventada en vez de un 404, y Google la indexaba.
      // Si las cuatro consultas fueron bien y no hay NADA de esta ciudad, el
      // segmento no es una ciudad: es un 404. Si alguna falló (red, permisos)
      // no se concluye nada y se sigue pintando la página, para no empeorar.
      const algunaFallo = res.some(r => (r as any).error);
      if (!algunaFallo && !row && evs.length === 0 && vns.length === 0 && ars.length === 0) {
        setNoExiste(true);
      }
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(safety); };
  }, [city]);

  const submit = async () => {
    if (!message.trim()) { addToast({ message: 'Escribe tu pregunta', type: 'error' }); return; }
    if (!partner) return;
    setSending(true);
    const { error } = await supabase.from('partner_inquiries').insert({
      partner_id: partner.partner_id,
      city,
      channel: 'web',
      contact_name: name.trim() || null,
      contact_handle: handle.trim() || null,
      message: message.trim(),
      status: 'new',
    });
    setSending(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setSent(true);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;
  // El segmento no corresponde a ninguna ciudad con contenido: 404 honesto.
  if (noExiste) return <NotFoundPage />;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-fuchsia-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-8 text-center">
          <span className="inline-flex items-center gap-2 text-fuchsia-300 font-black text-xs tracking-widest uppercase mb-3">
            <MapPin className="w-4 h-4" /> {partner?.display_name ? `${partner.display_name} · ${city}` : `BailaNow · ${city}`}
          </span>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight">
            La danza latina de <span className="bg-brand-orange bg-clip-text text-transparent">{city}</span>
          </h1>
          {partner ? (
            <p className="text-white/70 mt-4 max-w-xl mx-auto">
              Tu partner local {partner.display_name ? <b className="text-white">{partner.display_name}</b> : 'de BailaNow'} gestiona los eventos,
              clases y artistas de {city}. Escríbele directamente aquí abajo. 👇
            </p>
          ) : (
            <p className="text-white/70 mt-4 max-w-xl mx-auto">
              Aún no tenemos partner en {city}. ¿Conoces la escena? Podrías representarla tú.
            </p>
          )}

          {/* Compartir en redes */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button onClick={nativeShare} className="inline-flex items-center gap-2 bg-brand-orange text-white font-black rounded-xl px-5 py-2.5 hover:scale-[1.03] transition">
              <Share2 className="w-4 h-4" /> Compartir
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"><MessageCircle className="w-4 h-4" /></a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" aria-label="Compartir en Facebook" className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"><Facebook className="w-4 h-4" /></a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" aria-label="Compartir en Telegram" className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"><Telegram className="w-4 h-4" /></a>
            <button onClick={copyLink} aria-label="Copiar enlace" className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>
          </div>
        </div>
      </div>

      {!partner ? (
        <div className="max-w-2xl mx-auto px-5">
          <div className="rounded-2xl bg-brand-orange p-6 text-center">
            <Sparkles className="w-9 h-9 mx-auto mb-2" />
            <p className="font-display font-black text-xl">Sé el partner de {city}</p>
            <p className="text-white/85 text-sm mt-1 max-w-md mx-auto">Gestiona los eventos de tu ciudad, crea contenido y gana comisiones.</p>
            <button onClick={() => navigate('/partner/aplicar')} className="mt-4 inline-flex items-center gap-2 bg-white text-gray-900 font-bold rounded-xl px-5 py-2.5">
              Quiero ser partner →
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-5 space-y-8">
          {/* Redes del partner */}
          {partner.socials.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {partner.socials.filter(s => s.handle).map(s => (
                <a key={s.provider} href={socialUrl(s.provider, s.handle!)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold bg-white/10 hover:bg-white/20 rounded-xl px-3.5 py-2 capitalize">
                  {PROVIDER_ICON[s.provider]} {s.provider}
                </a>
              ))}
            </div>
          )}

          {/* Eventos de la ciudad */}
          {events.length > 0 && (
            <div>
              <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-fuchsia-400" /> Próximos en {city}</h2>
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

          {/* Locales de la ciudad */}
          {venues.length > 0 && (
            <div>
              <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2"><Store className="w-5 h-5 text-fuchsia-400" /> Locales en {city}</h2>
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

          {/* Artistas de la ciudad */}
          {artists.length > 0 && (
            <div>
              <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-fuchsia-400" /> Artistas de {city}</h2>
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

          {/* Guías de SEO local — enlazado interno */}
          <div>
            <h2 className="font-display font-black text-lg mb-3">Dónde bailar en {city}</h2>
            <div className="flex flex-wrap gap-2">
              {['bachata', 'salsa', 'kizomba'].map(s => (
                <a key={s} href={`/donde-bailar/${s}/${encodeURIComponent(city)}`}
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm font-bold capitalize">
                  {s} en {city} →
                </a>
              ))}
            </div>
          </div>

          {/* Formulario de contacto directo */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
            {sent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-black text-lg">¡Mensaje enviado!</p>
                <p className="text-white/60 text-sm mt-1">Tu partner en {city} te responderá pronto.</p>
              </div>
            ) : (
              <>
                <h2 className="font-display font-black text-lg mb-1">Pregunta directa al partner de {city}</h2>
                <p className="text-white/50 text-sm mb-4">Eventos, clases, colaboraciones… lo que necesites de la escena local.</p>
                <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                  <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="Tu Instagram, email o teléfono" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Escribe tu pregunta…" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 mb-4 outline-none focus:ring-fuchsia-500 resize-none" />
                <button onClick={submit} disabled={sending} className="w-full inline-flex items-center justify-center gap-2 bg-brand-orange font-bold rounded-xl py-3.5 disabled:opacity-60">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviar pregunta
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityPartnerPage;
