import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { commitMessage, describeChanges, parsePayload, render, validate } from '../scripts/apply-sheet.mjs';

const shows = JSON.parse(readFileSync('src/data/shows.json', 'utf8'));
const fixture = (name: string) => readFileSync(`tests/fixtures/sheet/${name}.json`, 'utf8');
const TODAY = '2026-10-07';
const run = (name: string) => validate(parsePayload(fixture(name)).payload, shows, TODAY);
// The menus as first seeded, matching the clean fixture. Never the live
// src/data/generated files, which change with every sheet publish.
const seedMenus = () => readFileSync('tests/fixtures/sheet/seed-menus.json', 'utf8');

describe('parsePayload', () => {
  it('treats an empty payload as "nothing to apply"', () => {
    expect(parsePayload('')).toEqual({ payload: null });
    expect(parsePayload(undefined)).toEqual({ payload: null });
  });

  it('rejects anything but an object with menus and dates lists', () => {
    expect(parsePayload('not json').errors).toBeDefined();
    expect(parsePayload('[]').errors).toBeDefined();
    expect(parsePayload('{"menus":[]}').errors).toBeDefined();
    expect(parsePayload('{"menus":{},"dates":[]}').errors).toBeDefined();
  });

  it('rejects a payload over 64 KB', () => {
    const big = JSON.stringify({ menus: [], dates: [], pad: 'x'.repeat(65 * 1024) });
    expect(parsePayload(big).errors![0]).toMatch(/64 KB/);
  });
});

describe('validate: clean sheet', () => {
  const result = run('clean');

  it('passes with no errors', () => {
    expect(result.errors).toEqual([]);
  });

  it('reproduces the seeded menus byte for byte', () => {
    expect(render(result.menus)).toBe(seedMenus());
  });

  it('ignores past dates and keeps one row per upcoming performance', () => {
    expect(result.dates).toHaveLength(20);
    expect(result.dates.some((d: { start: string }) => d.start.startsWith('2026-10-02'))).toBe(false);
  });

  it('keeps both Dec 12 performances apart', () => {
    const dec12 = result.dates.filter((d: { start: string }) => d.start.startsWith('2026-12-12'));
    expect(dec12).toEqual([
      { show: 'a-big-band-christmas', start: '2026-12-12T14:00', status: 'on-sale', id: 927604 },
      { show: 'a-big-band-christmas', start: '2026-12-12T18:00', status: 'on-sale', id: 927613 },
    ]);
  });

  it('describes no content changes when the sheet matches the site', () => {
    expect(describeChanges(shows, { menus: JSON.parse(seedMenus()), dates: [] }, result)).toEqual([]);
  });
});

describe('validate: each failure from the sheet doc fails the run and names the row', () => {
  const cases: [string, RegExp][] = [
    ['fail-missing-header', /^Dates tab: the "Status" column is missing/],
    ['fail-unknown-show', /^Menus row 2: Show "Lionel and the Commodores" does not match/],
    ['fail-bad-date-format', /^Dates row \d+: Date "10\/17\/2026 6:00 PM" is not a date and time/],
    ['fail-no-matching-performance', /^Dates row \d+: Lionel & The Commodores has no performance on 2026-10-17 19:00/],
    ['fail-bad-status', /^Dates row \d+: Status "" must be On Sale, Few Tickets Remain or Sold Out/],
    ['fail-non-digit-id', /^Dates row \d+: Performance ID "84990x" must be numbers only/],
    ['fail-duplicate-id', /^Dates row \d+: Performance ID 849899 is also on Dates row \d+/],
    ['fail-description-without-title', /^Menus row 3: Salad Description is filled in but Salad Title is blank/],
  ];
  it.each(cases)('%s', (name, message) => {
    const { errors } = run(name);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e: string) => message.test(e))).toBe(true);
  });
});

describe('validate: details', () => {
  const base = () => JSON.parse(fixture('clean'));

  it('matches a renamed show by the old name it keeps in the sheet', () => {
    const p = base();
    p.dates.push({ _row: 99, Show: 'Country on the Beach', Date: '2027-07-02 18:00', Status: 'Sold Out', 'Performance ID': '934463' });
    const { errors, dates } = validate(p, shows, TODAY);
    expect(errors).toEqual([]);
    expect(dates).toContainEqual({ show: 'country-beach-party', start: '2027-07-02T18:00', status: 'sold-out', id: 934463 });
  });

  it('warns, but does not fail, when a performance has no row', () => {
    const p = base();
    p.dates = p.dates.filter((d: { Date: string }) => d.Date !== '2026-11-07 18:00');
    const { errors, warnings, dates } = validate(p, shows, TODAY);
    expect(errors).toEqual([]);
    expect(warnings.join('\n')).toMatch(/Best of 2026 2026-11-07 18:00 has no row/);
    expect(dates).toHaveLength(19);
  });

  it('falls back to the repo id when a Performance ID cell is blank', () => {
    const p = base();
    p.dates.find((d: { Date: string }) => d.Date === '2026-10-17 18:00')['Performance ID'] = '';
    const row = validate(p, shows, TODAY).dates.find((d: { start: string }) => d.start === '2026-10-17T18:00');
    expect(row).toEqual({ show: 'lionel-and-the-commodores', start: '2026-10-17T18:00', status: 'on-sale' });
  });

  it('works without a Performance ID column at all', () => {
    const p = base();
    p.dates.forEach((d: Record<string, unknown>) => delete d['Performance ID']);
    const { errors, dates } = validate(p, shows, TODAY);
    expect(errors).toEqual([]);
    expect(dates.every((d: { id?: number }) => d.id === undefined)).toBe(true);
  });

  it('maps statuses after trimming and ignoring case', () => {
    const p = base();
    p.dates.find((d: { Date: string }) => d.Date === '2026-10-17 18:00').Status = '  sold OUT ';
    p.dates.find((d: { Date: string }) => d.Date === '2026-10-16 18:00').Status = 'Few Tickets Remain';
    const { dates } = validate(p, shows, TODAY);
    const at = (s: string) => dates.find((d: { start: string }) => d.start === s).status;
    expect(at('2026-10-17T18:00')).toBe('sold-out');
    expect(at('2026-10-16T18:00')).toBe('low');
  });

  it('rejects an id that another performance already uses', () => {
    const p = base();
    const row = p.dates.find((d: { Date: string }) => d.Date === '2026-10-17 18:00');
    row['Performance ID'] = '849898'; // Oct 3, a past date not in the sheet's upcoming rows
    expect(validate(p, shows, TODAY).errors.join('\n')).toMatch(/849898 would be used by both/);
  });

  it('stores shell and formula characters as plain text', () => {
    const p = base();
    p.menus[0]['Salad Description'] = '"; echo hacked; " $(rm -rf /) `id`\n=HYPERLINK("x")';
    const { errors, menus } = validate(p, shows, TODAY);
    expect(errors).toEqual([]);
    expect(menus['lionel-and-the-commodores'].salad.description).toBe('"; echo hacked; " $(rm -rf /) `id` =HYPERLINK("x")');
  });

  it('strips line breaks and caps titles at 80 and descriptions at 300 characters', () => {
    const p = base();
    p.menus[0]['Salad Title'] = 'A'.repeat(100);
    p.menus[0]['Salad Description'] = 'line one\n\nline   two ' + 'b'.repeat(400);
    const salad = validate(p, shows, TODAY).menus['lionel-and-the-commodores'].salad;
    expect(salad.title).toHaveLength(80);
    expect(salad.description).toHaveLength(300);
    expect(salad.description.startsWith('line one line two b')).toBe(true);
  });

  it('stores a blank menu row as no menu', () => {
    const p = base();
    for (const k of Object.keys(p.menus[0])) if (k !== 'Show' && k !== '_row') p.menus[0][k] = '';
    expect(validate(p, shows, TODAY).menus['lionel-and-the-commodores']).toBeNull();
  });

  it('rejects cells that are not text', () => {
    const p = base();
    p.dates[0].Status = { evil: true };
    expect(validate(p, shows, TODAY).errors.join('\n')).toMatch(/"Status" is not text/);
  });
});

describe('describeChanges and commitMessage', () => {
  it('ignores a show with no menu either way (blank row or no row)', () => {
    expect(describeChanges(shows, { menus: { 'a-big-band-christmas': null }, dates: [] }, { menus: {}, dates: [] })).toEqual([]);
  });

  it('reports a blank row for a show whose hand-written menu would otherwise show', () => {
    expect(describeChanges(shows, { menus: {}, dates: [] }, { menus: { 'lionel-and-the-commodores': null }, dates: [] })).toEqual([
      'Lionel & The Commodores menu cleared',
    ]);
  });

  it('lists status and menu changes', () => {
    const p = JSON.parse(fixture('clean'));
    p.dates.find((d: { Date: string }) => d.Date === '2026-10-17 18:00').Status = 'Sold Out';
    p.menus[1]['Entree Description'] = 'New words';
    const after = validate(p, shows, TODAY);
    const before = { menus: JSON.parse(seedMenus()), dates: [] };
    const changes = describeChanges(shows, before, after);
    expect(changes).toEqual(['Lionel & The Commodores Oct 17 18:00 On Sale -> Sold Out', 'Best of 2026 entree description']);
    expect(commitMessage(changes).split('\n')[0]).toBe(
      'Sheet publish: Lionel & The Commodores Oct 17 18:00 On Sale -> Sold Out; Best of 2026 entree description',
    );
  });
});
