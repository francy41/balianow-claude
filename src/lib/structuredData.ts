/**
 * structuredData — helpers JSON-LD para SEO (Schema.org)
 *
 * Google/Bing usan structured data para "rich results":
 * - Organization → logo, contacto, redes en knowledge graph
 * - Event → cards en Google Search con fecha/precio/venue
 * - Person → perfil de artista con bio/oficio
 * - LocalBusiness → venue en Google Maps con horario/dirección
 *
 * Usar con useJsonLd() o renderJsonLd() en cualquier página.
 */
import { useEffect } from 'react';

const SCRIPT_ID = 'bn-json-ld';

// ─── Esquemas ─────────────────────────────────────────────────────
export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BailaNow',
    legalName: 'BailaNow SL',
    url: 'https://bailanow.com',
    logo: 'https://bailanow.com/logo.svg',
    image: 'https://bailanow.com/og-default.svg',
    description: 'El ecosistema latino #1 para DJs, artistas, bailarines, eventos y venues.',
    email: 'hola@bailanow.com',
    address: { '@type': 'PostalAddress', addressCountry: 'ES', addressLocality: 'Madrid' },
    sameAs: [
      'https://www.instagram.com/bailanowofficial',
      'https://www.tiktok.com/@bailanowofficial',
      'https://www.facebook.com/bailanowofficial',
    ],
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BailaNow',
    url: 'https://bailanow.com',
    inLanguage: 'es-ES',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://bailanow.com/cerca?city={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function eventLd(event: {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  cover?: string;
  city?: string;
  venueName?: string;
  price?: number;
  isOnline?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || event.title,
    startDate: event.date,
    endDate: event.endDate || event.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: event.isOnline
      ? { '@type': 'VirtualLocation', url: `https://bailanow.com/eventos/${event.id}` }
      : { '@type': 'Place', name: event.venueName || 'Por confirmar', address: event.city || 'España' },
    image: event.cover || 'https://bailanow.com/og-default.svg',
    offers: event.price != null ? {
      '@type': 'Offer',
      url: `https://bailanow.com/eventos/${event.id}`,
      price: event.price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    } : undefined,
    organizer: { '@type': 'Organization', name: 'BailaNow', url: 'https://bailanow.com' },
  };
}

export function personLd(person: {
  id: string;
  name: string;
  type?: string;       // dj, dancer, instructor, singer, band
  bio?: string;
  avatar?: string;
  city?: string;
  socials?: Record<string, string | undefined>;
}) {
  const occupation: Record<string, string> = {
    dj: 'Disc Jockey',
    dancer: 'Bailarín/a',
    instructor: 'Profesor de baile',
    singer: 'Cantante',
    band: 'Banda musical',
    artist: 'Artista latino',
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.bio || `${occupation[person.type || 'artist']} en BailaNow`,
    image: person.avatar,
    jobTitle: occupation[person.type || 'artist'],
    address: person.city ? { '@type': 'PostalAddress', addressLocality: person.city, addressCountry: 'ES' } : undefined,
    url: `https://bailanow.com/p/${person.id}`,
    sameAs: Object.values(person.socials || {}).filter(Boolean),
  };
}

export function localBusinessLd(venue: {
  id: string;
  name: string;
  type?: string;
  city?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  cover?: string;
  openHours?: string;
  priceRange?: number;
  lat?: number;
  lng?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': venue.type === 'club' || venue.type === 'bar' ? 'NightClub' : 'LocalBusiness',
    name: venue.name,
    image: venue.cover || 'https://bailanow.com/og-default.svg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address || '',
      addressLocality: venue.city || 'España',
      addressCountry: 'ES',
    },
    geo: (venue.lat && venue.lng) ? {
      '@type': 'GeoCoordinates',
      latitude: venue.lat,
      longitude: venue.lng,
    } : undefined,
    aggregateRating: (venue.rating && venue.reviews) ? {
      '@type': 'AggregateRating',
      ratingValue: venue.rating,
      reviewCount: venue.reviews,
    } : undefined,
    priceRange: venue.priceRange ? '€'.repeat(Math.max(1, Math.min(4, venue.priceRange))) : undefined,
    openingHours: venue.openHours,
    url: `https://bailanow.com/venues/${venue.id}`,
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── Hook React para inyectar JSON-LD ───────────────────────────
export function useJsonLd(...schemas: object[]) {
  useEffect(() => {
    if (schemas.length === 0) return;
    const data = schemas.length === 1 ? schemas[0] : schemas;
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      // No cleanup — el siguiente componente lo reemplaza
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(schemas)]);
}
