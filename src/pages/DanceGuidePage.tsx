import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, Music, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSeo } from '../hooks/useSeo';

// Estilos soportados (slug → etiqueta + sinónimos para el match)
const STYLES: Record<string, { label: string; syn: string[] }> = {
  bachata: { label: 'bachata', syn: ['bachata'] },
  salsa: { label: 'salsa', syn: ['salsa'] },
  kizomba: { label: 'kizomba', syn: ['kizomba', 'urban kiz'] },
  merengue: { label: 'merengue', syn: ['merengue'] },
  zouk: { label: 'zouk', syn: ['zouk'] },
  'salsa-cubana': { label: 'salsa cubana', syn: ['cubana', 'casino', 'rueda'] },
};
const titleCase = (s: string) => s.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface EventRow { id: string; title: string; date: string | null; cover: string | null; category: string[] | null; }
interface VenueRow { id: string; name: string; cover: string | null; address?: string | null; }

const DanceGuidePage: React.FC = () => {
  const { style: styleParam, city: cityParam } = useParams<{ style: string; city: string }>();
  const navigate = useNavigate();
  const styleKey = (styleParam || 'bachata').toLowerCase();
  const style = STYLES[styleKey] || { label: (styleParam || '').replace(/-/g, ' '), syn: [(styleParam || '').toLowerCase()] };
  const cityRaw = decodeURIComponent(cityParam || '');
  const city = titleCase(cityRaw);
  const sLabel = style.label;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const title = `Dónde bailar ${sLabel} en ${city} — eventos, locales y clases | BailaNow`;
  const description = `Guía para salir a bailar ${sLabel} en ${city}: próximos eventos y socials, los mejores locales y clases. Descúbrelo todo en BailaNow.`;
  useSeo({ title, description, path: `/donde-bailar/${styleKey}/${cityParam || ''}` });

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: ev }, { data: vn }] = await Promise.all([
        supabase.from('events').select('id,title,date,cover,category').ilike('city', city).gte('date', today).order('date', { ascending: true }).limit(30),
        supabase.from('venues').select('id,name,cover,address').ilike('city', city).limit(12),
      ]);
      if (cancelled) return;
      const match = (e: EventRow) => {
        const hay = ((e.category || []).join(' ') + ' ' + (e.title || '')).toLowerCase();
        return style.syn.some(s => hay.includes(s));
      };
      const filtered = (ev as EventRow[] || []).filter(match);
      setEvents((filtered.length ? filtered : (ev as EventRow[] || [])).slice(0, 8));
      setVenues((vn as VenueRow[]) || []);
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(safety); };
  }, [city, styleKey]);

  // Datos estructurados (JSON-LD): breadcrumb + FAQ + eventos
  const faqs = useMemo(() => [
    { q: `¿Dónde puedo bailar ${sLabel} en ${city}?`, a: `En ${city} hay socials, discotecas y escuelas donde bailar ${sLabel}. En BailaNow encuentras los próximos eventos y los locales con ambiente latino, actualizados a diario.` },
    { q: `¿Hay clases de ${sLabel} para principiantes en ${city}?`, a: `Sí. Muchas escuelas y profesores de ${city} ofrecen clases de ${sLabel} desde nivel cero. Puedes reservar clases y ver a los profesores en BailaNow.` },
    { q: `¿Qué noches se sale a bailar ${sLabel} en ${city}?`, a: `Depende de cada sala, pero suele haber socials de ${sLabel} entre semana y los fines de semana. Consulta la agenda de eventos de ${city} en BailaNow para no perderte ninguno.` },
  ], [sLabel, city]);

  useEffect(() => {
    const ld = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'BailaNow', item: 'https://bailanow.com/' },
          { '@type': 'ListItem', position: 2, name: city, item: `https://bailanow.com/${encodeURIComponent(cityRaw)}` },
          { '@type': 'ListItem', position: 3, name: `Bailar ${sLabel} en ${city}` },
        ] },
        { '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
        ...(events.length ? [{ '@type': 'ItemList', itemListElement: events.map((e, i) => ({
          '@type': 'ListItem', position: i + 1,
          item: { '@type': 'Event', name: e.title, ...(e.date ? { startDate: e.date } : {}), location: { '@type': 'Place', name: city, address: city }, url: `https://bailanow.com/eventos/${e.id}` },
        })) }] : []),
      ],
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-guide', '1');
    el.textContent = JSON.stringify(ld);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [events, faqs, city, cityRaw, sLabel]);

  const otherStyles = Object.keys(STYLES).filter(k => k !== styleKey).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-orange to-pink-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <nav className="text-xs text-white/70 mb-3" aria-label="breadcrumb">
            <Link to="/" className="hover:underline">BailaNow</Link> ·{' '}
            <Link to={`/${encodeURIComponent(cityRaw)}`} className="hover:underline">{city}</Link> ·{' '}
            <span>Bailar {sLabel}</span>
          </nav>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight max-w-3xl">
            Dónde bailar {sLabel} en {city}
          </h1>
          <p className="text-white/90 mt-3 max-w-2xl">
            Tu guía para salir a bailar {sLabel} en {city}: los próximos eventos y socials, los mejores locales con ambiente latino y dónde aprender. Todo actualizado en BailaNow.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => navigate('/eventos')} className="bg-white text-gray-900 font-bold rounded-xl px-5 py-2.5 text-sm">Ver toda la agenda</button>
            <button onClick={() => navigate('/clases')} className="bg-white/15 hover:bg-white/25 font-bold rounded-xl px-5 py-2.5 text-sm">Clases y profes</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-brand-orange" /></div>
        ) : (
          <>
            {/* Eventos */}
            <section className="mt-8">
              <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-orange" /> Próximos eventos de {sLabel} en {city}
              </h2>
              {events.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aún no hay eventos publicados para {city}. Vuelve pronto o <Link to="/eventos" className="text-brand-orange font-semibold underline">explora toda la agenda</Link>.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {events.map(e => (
                    <Link key={e.id} to={`/eventos/${e.id}`} className="group rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-700">
                        {e.cover ? <img src={e.cover} alt={e.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>}
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{e.title}</p>
                        {e.date && <p className="text-gray-400 text-xs">{new Date(e.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Locales */}
            <section className="mt-10">
              <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-orange" /> Locales para bailar {sLabel} en {city}
              </h2>
              {venues.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Estamos añadiendo locales de {city}. <Link to="/venues" className="text-brand-orange font-semibold underline">Ver todos los venues</Link>.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {venues.map(v => (
                    <Link key={v.id} to={`/venues/${v.id}`} className="group rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-gray-200 dark:bg-gray-700">
                        {v.cover ? <img src={v.cover} alt={v.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏛️</div>}
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{v.name}</p>
                        {v.address && <p className="text-gray-400 text-xs line-clamp-1">{v.address}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Texto SEO */}
            <section className="mt-10 prose-sm max-w-none">
              <h2 className="font-display font-black text-xl text-gray-900 dark:text-white mb-2">Salir a bailar {sLabel} en {city}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {city} tiene una escena latina muy viva. Si buscas <strong>dónde bailar {sLabel} en {city}</strong>, en BailaNow reunimos los socials, discotecas y fiestas de {sLabel}, además de las escuelas y profesores para aprender desde cero o perfeccionar tu estilo. Guarda esta guía y vuelve cada semana: la agenda se actualiza con los nuevos eventos de la ciudad.
              </p>
            </section>

            {/* FAQ */}
            <section className="mt-10">
              <h2 className="font-display font-black text-xl text-gray-900 dark:text-white mb-3">Preguntas frecuentes</h2>
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <details key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <summary className="font-bold text-gray-900 dark:text-white cursor-pointer text-sm">{f.q}</summary>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* Enlaces internos: otros estilos */}
            <section className="mt-10">
              <h2 className="font-display font-black text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Music className="w-5 h-5 text-brand-orange" /> Más formas de bailar en {city}</h2>
              <div className="flex flex-wrap gap-2">
                {otherStyles.map(s => (
                  <Link key={s} to={`/donde-bailar/${s}/${encodeURIComponent(cityRaw)}`}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-brand-orange">
                    {STYLES[s].label} en {city} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default DanceGuidePage;
