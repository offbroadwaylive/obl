import { describe, expect, it } from 'vitest';
import showsJson from '../src/data/shows.json';
import {
  type Show,
  currentShows,
  nextPerformance,
  isSoldOut,
  overlayDates,
  pacificToDate,
  pastShows,
  priceFrom,
  priceSets,
  priceSetFor,
  tierPrice,
  ticketUrl,
  upcoming,
} from '../src/lib/shows';

const on = (day: string) => pacificToDate(`${day}T12:00`);
// Tests use the repo's shows.json only, never the sheet's published data
// (src/data/generated), which changes every time Steve publishes.
const allShows = showsJson as Show[];
const showBySlug = (slug: string) => allShows.find((s) => s.slug === slug);
const lionel = showBySlug('lionel-and-the-commodores')!;
const bestOf = showBySlug('best-of-2026')!;
const christmas = showBySlug('a-big-band-christmas')!;

describe('data', () => {
  it('has all 22 performances with unique Arts People ids', () => {
    const ids = allShows.flatMap((s) => s.performances.map((p) => p.id));
    expect(ids).toHaveLength(22);
    expect(new Set(ids).size).toBe(22);
  });

  it('builds the Arts People ticket URL', () => {
    expect(ticketUrl(849899)).toBe('https://app.arts-people.com/index.php?performance=849899');
  });
});

describe('pacificToDate', () => {
  it('handles daylight time (PDT, UTC-7)', () => {
    expect(pacificToDate('2026-10-10T18:00').toISOString()).toBe('2026-10-11T01:00:00.000Z');
  });
  it('handles standard time (PST, UTC-8)', () => {
    expect(pacificToDate('2026-12-12T14:00').toISOString()).toBe('2026-12-12T22:00:00.000Z');
  });
});

describe('upcoming', () => {
  it('on 7 Oct 2026, Lionel has 7 dates and hides Oct 2 and Oct 3', () => {
    const dates = upcoming(lionel, on('2026-10-07')).map((p) => p.start.slice(0, 10));
    expect(dates).toHaveLength(7);
    expect(dates).not.toContain('2026-10-02');
    expect(dates).not.toContain('2026-10-03');
    expect(dates[0]).toBe('2026-10-10');
  });

  it('keeps a performance for the whole of its day in Los Angeles', () => {
    // 11:30pm Pacific on Oct 10 is already Oct 11 in UTC.
    const lateNight = pacificToDate('2026-10-10T23:30');
    expect(upcoming(lionel, lateNight)[0].start).toBe('2026-10-10T18:00');
  });

  it('returns nothing once the last date has passed', () => {
    expect(upcoming(lionel, on('2026-10-25'))).toEqual([]);
  });
});

describe('currentShows', () => {
  it('orders shows by their first upcoming date', () => {
    expect(currentShows(allShows, on('2026-10-07')).map((s) => s.slug)).toEqual([
      'lionel-and-the-commodores',
      'best-of-2026',
      'a-big-band-christmas',
    ]);
  });

  it('on 25 Oct 2026, Lionel is gone and moves to past shows', () => {
    const now = on('2026-10-25');
    expect(currentShows(allShows, now).map((s) => s.slug)).not.toContain('lionel-and-the-commodores');
    expect(pastShows(allShows, now).map((s) => s.slug)).toEqual(['lionel-and-the-commodores']);
  });

  it('is empty after the last Christmas date', () => {
    expect(currentShows(allShows, on('2026-12-14'))).toEqual([]);
  });
});

describe('nextPerformance', () => {
  it('on 7 Oct 2026 is Lionel on Oct 10', () => {
    const next = nextPerformance(allShows, on('2026-10-07'))!;
    expect(next.show.slug).toBe('lionel-and-the-commodores');
    expect(next.perf.id).toBe(849899);
  });

  it('on 25 Oct 2026 is Best of 2026', () => {
    const next = nextPerformance(allShows, on('2026-10-25'))!;
    expect(next.show.slug).toBe('best-of-2026');
    expect(next.perf.id).toBe(848434);
  });

  it('skips sold-out performances', () => {
    const shows = overlayDates(allShows, [{ show: 'lionel-and-the-commodores', start: '2026-10-10T18:00', status: 'sold-out' }]);
    expect(nextPerformance(shows, on('2026-10-07'))!.perf.id).toBe(849900);
  });

  it('is undefined when nothing is scheduled', () => {
    expect(nextPerformance(allShows, on('2027-01-01'))).toBeUndefined();
  });
});

describe('pricing', () => {
  it('Best of 2026 tiers are $109, $224, $438, $446', () => {
    expect(priceSetFor(bestOf).tiers.map((t) => t.price)).toEqual([109, 224, 438, 446]);
  });

  it('snack-board dates are $15 less per seat', () => {
    const set = priceSetFor(lionel);
    const main = set.tiers.find((t) => t.key === 'main')!;
    const bx = set.tiers.find((t) => t.key === 'bx')!;
    expect(tierPrice(set, main, 'snack-board')).toBe(84);
    expect(tierPrice(set, bx, 'snack-board')).toBe(428 - 60);
    const sunday = lionel.performances.find((p) => p.format === 'snack-board')!;
    const friday = lionel.performances.find((p) => p.format === 'dinner')!;
    expect(priceFrom(lionel, friday) - priceFrom(lionel, sunday)).toBe(15);
  });

  it('price-from is the lowest per-seat price', () => {
    expect(priceFrom(bestOf, bestOf.performances[0])).toBe(109);
    expect(priceFrom(christmas, christmas.performances[0])).toBe(94);
  });

  it('price-from follows the single-seat price, not a cheaper-per-seat table', () => {
    const set = structuredClone(priceSetFor(bestOf));
    set.tiers[0].price = 111; // main floor now dearer per seat than a $438 table for 4
    const show = { ...bestOf, pricing: 'test' };
    (priceSets as Record<string, unknown>).test = set;
    expect(priceFrom(show, bestOf.performances[0])).toBe(111);
    delete (priceSets as Record<string, unknown>).test;
  });
});

describe('overlayDates (sheet Dates tab)', () => {
  const rows = [
    { show: 'a-big-band-christmas', start: '2026-12-12T14:00', status: 'sold-out' as const, id: 999001 },
    { show: 'a-big-band-christmas', start: '2026-12-12T18:00', status: 'low' as const },
  ];
  const shows = overlayDates(allShows, rows);
  const xmas = shows.find((s) => s.slug === 'a-big-band-christmas')!;
  const at = (start: string) => xmas.performances.find((p) => p.start === start)!;

  it('gives both Dec 12 performances their own status and id', () => {
    expect(at('2026-12-12T14:00')).toMatchObject({ status: 'sold-out', id: 999001 });
    expect(at('2026-12-12T18:00')).toMatchObject({ status: 'low', id: 927613 });
  });

  it('keeps the repo id when the sheet has none, and leaves other dates alone', () => {
    expect(at('2026-12-13T14:00')).toMatchObject({ id: 927607, status: 'on-sale' });
  });

  it('never adds a performance', () => {
    const added = overlayDates(allShows, [{ show: 'best-of-2026', start: '2026-11-09T18:00', status: 'sold-out' }]);
    expect(added.flatMap((s) => s.performances)).toHaveLength(22);
  });

  it('marks a show sold out only when every upcoming date is', () => {
    const all = christmas.performances.map((p) => ({ show: christmas.slug, start: p.start, status: 'sold-out' as const }));
    const soldOut = overlayDates(allShows, all).find((s) => s.slug === christmas.slug)!;
    expect(isSoldOut(soldOut, on('2026-10-07'))).toBe(true);
    expect(isSoldOut(xmas, on('2026-10-07'))).toBe(false);
  });
});
