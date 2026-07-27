import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Send, Loader2, Instagram, Facebook, Music2, MessageCircle, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';
import { useSeo } from '../hooks/useSeo';

interface CityPartner { partner_id: string; display_name: string | null; socials: { provider: string; handle: string | null }[]; }
interface CityEvent { id: string; title: string; date: string | null; cover: string | null; }

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

  useSeo({
    title: `Baila en ${city} — clases, eventos y comunidad latina | BailaNow`,
    description: `Descubre la escena de danza latina en ${city}: eventos, clases, artistas y tu partner local de BailaNow. Salsa, bachata, kizomba y más.`,
    path: `/${cityParam || ''}`,
  });

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<CityPartner | null>(null);
  const [events, setEvents] = useState<CityEvent[]>([]);

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      const [{ data: cp }, { data: ev }] = await Promise.all([
        supabase.rpc('city_partner', { p_city: city }),
        supabase.from('events').select('id,title,date,cover').ilike('city', city).order('date', { ascending: true }).limit(6),
      ]);
      if (cancelled) return;
      const row = Array.isArray(cp) ? cp[0] : cp;
      setPartner(row ? { partner_id: row.partner_id, display_name: row.display_name, socials: row.socials || [] } : null);
      setEvents((ev as CityEvent[]) || []);
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-fuchsia-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-8 text-center">
          <span className="inline-flex items-center gap-2 text-fuchsia-300 font-black text-xs tracking-widest uppercase mb-3">
            <MapPin className="w-4 h-4" /> BailaNow · {city}
          </span>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight">
            La danza latina de <span className="bg-gradient-to-r from-orange-400 to-fuchsia-400 bg-clip-text text-transparent">{city}</span>
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
        </div>
      </div>

      {!partner ? (
        <div className="max-w-2xl mx-auto px-5">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-fuchsia-600 p-6 text-center">
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
                <button onClick={submit} disabled={sending} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-fuchsia-600 font-bold rounded-xl py-3.5 disabled:opacity-60">
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
