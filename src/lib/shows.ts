// Everything derived from shows.json and pricing.json lives here, so pages
// never compute dates, prices or ticket links on their own.

import showsData from '../data/shows.json';
import pricingData from '../data/pricing.json';

export const TZ = 'America/Los_Angeles';

export type Format = 'dinner' | 'snack-board' | 'dessert';
export type Status = 'on-sale' | 'low' | 'sold-out';

export interface Performance {
  /** Local Pacific doors time, e.g. "2026-10-10T18:00". */
  start: string;
  /** Arts People performance number. */
  id: number;
  format: Format;
  status?: Status;
}

export interface Show {
  slug: string;
  title: string;
  series: 'encore' | 'holiday' | 'theatrical' | 'special';
  kicker: string;
  blurb: string;
  poster: string | null;
  posterAlt: string;
  hero: string | null;
  heroAlt: string;
  accent: string;
  pricing: string;
  menu: string | null;
  ageRule: string;
  notes: string[];
  performances: Performance[];
}

export interface Tier {
  key: string;
  name: string;
  seats: number;
  price: number;
  unit: string;
}

export interface PriceSet {
  label: string;
  feeNote: string;
  seatMap: boolean;
  tiers: Tier[];
  adjustments: { format: Format; perSeat: number }[];
  notes: string[];
}

export interface Dated {
  show: Show;
  perf: Performance;
}

export const allShows = showsData as Show[];
export const priceSets = pricingData as unknown as Record<string, PriceSet>;

export const FORMAT_LABEL: Record<Format, string> = {
  dinner: 'Dinner Show',
  'snack-board': 'Snack Board',
  dessert: 'Dessert Show',
};

export function ticketUrl(id: number): string {
  return `https://app.arts-people.com/index.php?performance=${id}`;
}

/**
 * "Now" for the build. Set BUILD_DATE=YYYY-MM-DD to preview the site as it
 * will look on that day (noon Pacific); otherwise the real clock is used.
 */
export function buildNow(): Date {
  const override = typeof process !== 'undefined' ? process.env.BUILD_DATE : undefined;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return pacificToDate(`${override}T12:00`);
  }
  return new Date();
}

/** Calendar date in Los Angeles for an instant, as "YYYY-MM-DD". */
export function laDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Converts a local Pacific "YYYY-MM-DDTHH:MM" to the real instant, DST included. */
export function pacificToDate(local: string): Date {
  const [d, t = '00:00'] = local.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  const asUtc = Date.UTC(y, mo - 1, da, h, mi);
  // Offset of LA at that moment, found by formatting the guess back in LA time.
  const offsetAt = (ms: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
        .formatToParts(new Date(ms))
        .map((p) => [p.type, p.value]),
    );
    const seen = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    return seen - ms;
  };
  let ms = asUtc - offsetAt(asUtc);
  ms = asUtc - offsetAt(ms);
  return new Date(ms);
}

export function perfDay(p: Performance): string {
  return p.start.slice(0, 10);
}

const byStart = (a: Performance, b: Performance) => a.start.localeCompare(b.start);

/** Performances on or after today in Los Angeles, soonest first. */
export function upcoming(show: Show, now: Date = buildNow()): Performance[] {
  const today = laDay(now);
  return show.performances.filter((p) => perfDay(p) >= today).sort(byStart);
}

/** Shows with at least one upcoming performance, ordered by their first one. */
export function currentShows(shows: Show[] = allShows, now: Date = buildNow()): Show[] {
  return shows
    .map((show) => ({ show, first: upcoming(show, now)[0] }))
    .filter((x) => x.first)
    .sort((a, b) => byStart(a.first, b.first))
    .map((x) => x.show);
}

/** Shows whose dates have all passed, most recent first. */
export function pastShows(shows: Show[] = allShows, now: Date = buildNow()): Show[] {
  const last = (s: Show) => [...s.performances].sort(byStart).at(-1)?.start ?? '';
  return shows.filter((s) => upcoming(s, now).length === 0).sort((a, b) => last(b).localeCompare(last(a)));
}

/** Every upcoming performance across all shows, soonest first. */
export function allUpcoming(shows: Show[] = allShows, now: Date = buildNow()): Dated[] {
  return shows
    .flatMap((show) => upcoming(show, now).map((perf) => ({ show, perf })))
    .sort((a, b) => byStart(a.perf, b.perf));
}

/** The soonest upcoming performance across all shows. Sold-out dates still count. */
export function nextPerformance(shows: Show[] = allShows, now: Date = buildNow()): Dated | undefined {
  return allUpcoming(shows, now)[0];
}

export function showBySlug(slug: string): Show | undefined {
  return allShows.find((s) => s.slug === slug);
}

export function priceSetFor(show: Show): PriceSet {
  const set = priceSets[show.pricing];
  if (!set) throw new Error(`shows.json: "${show.slug}" uses unknown pricing "${show.pricing}"`);
  return set;
}

/** Per-seat change for a format, e.g. -15 for Sunday snack-board shows. */
export function perSeatAdjustment(set: PriceSet, format: Format): number {
  return set.adjustments.filter((a) => a.format === format).reduce((n, a) => n + a.perSeat, 0);
}

/** Price of a tier for a given format, adjustments applied per seat. */
export function tierPrice(set: PriceSet, tier: Tier, format: Format): number {
  return tier.price + perSeatAdjustment(set, format) * tier.seats;
}

/**
 * "From $X" for a performance: the cheapest single-seat ticket. Tables are
 * sold whole, so they only count if no single seats are offered.
 */
export function priceFrom(show: Show, perf: Performance): number {
  const set = priceSetFor(show);
  const singles = set.tiers.filter((t) => t.seats === 1);
  const pool = singles.length ? singles : set.tiers;
  return Math.ceil(Math.min(...pool.map((t) => tierPrice(set, t, perf.format) / t.seats)));
}

/** Formats a show uses across its upcoming dates, in a stable order. */
export function formatsOf(show: Show, now: Date = buildNow()): Format[] {
  const used = new Set(upcoming(show, now).map((p) => p.format));
  return (['dinner', 'snack-board', 'dessert'] as Format[]).filter((f) => used.has(f));
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });

// Dates are formatted from the local Pacific wall-clock values, so the
// formatter runs in UTC on purpose: no conversion, no DST surprises.
const wall = (p: Performance) => new Date(`${p.start}:00Z`);

export const weekdayShort = (p: Performance) => fmt({ weekday: 'short' }).format(wall(p));
export const weekdayLong = (p: Performance) => fmt({ weekday: 'long' }).format(wall(p));
export const monthDay = (p: Performance) => fmt({ month: 'short', day: 'numeric' }).format(wall(p));
export const longDate = (p: Performance) =>
  fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(wall(p));

/** "6:00pm" */
export function doorsTime(p: Performance): string {
  const [h, m] = p.start.slice(11, 16).split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${suffix}`;
}

export function ageLabel(rule: string): string {
  if (rule === '21+') return '21+ event';
  if (rule === 'over-10') return 'Ages over 10 welcome';
  return rule;
}

/** "Oct 10 – Oct 24" (or a single date). */
export function dateRange(perfs: Performance[]): string {
  if (perfs.length === 0) return '';
  const first = monthDay(perfs[0]);
  const last = monthDay(perfs[perfs.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}
