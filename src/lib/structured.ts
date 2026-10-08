// schema.org data. Base.astro emits it only when SITE_IS_LIVE is true.
import site from '../data/site.json';
import faqs from '../data/faqs.json';
import { type Show, pacificToDate, priceFrom, ticketUrl, upcoming, FORMAT_LABEL } from './shows';

const place = {
  '@type': 'Place',
  name: site.name,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: 'US',
  },
};

/** One Event per upcoming performance. */
export function showEvents(show: Show): object[] {
  return upcoming(show).map((perf) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `${show.title} (${FORMAT_LABEL[perf.format]})`,
    description: show.blurb,
    startDate: pacificToDate(perf.start).toISOString(),
    doorTime: pacificToDate(perf.start).toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place,
    organizer: { '@type': 'Organization', name: site.name, url: site.url },
    offers: {
      '@type': 'Offer',
      url: ticketUrl(perf.id),
      price: priceFrom(show, perf),
      priceCurrency: 'USD',
      availability: perf.status === 'sold-out' ? 'https://schema.org/SoldOut' : perf.status === 'low' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
    },
  }));
}

const stripMd = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|####\s*/g, '');

export function faqPage(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: stripMd(f.a) },
    })),
  };
}

export function localBusiness(): object {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'PerformingArtsTheater'],
    name: site.name,
    url: site.url,
    telephone: site.phone.dial,
    email: site.email,
    address: place.address,
    ...(site.map.lat != null && site.map.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: site.map.lat, longitude: site.map.lng } } : {}),
  };
}
