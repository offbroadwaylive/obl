import { describe, expect, it } from 'vitest';
import {
  allShows,
  currentShows,
  nextPerformance,
  pacificToDate,
  pastShows,
  priceFrom,
  priceSetFor,
  showBySlug,
  tierPrice,
  ticketUrl,
  upcoming,
} from '../src/lib/shows';

const on = (day: string) => pacificToDate(`${day}T12:00`);
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
});
