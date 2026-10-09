import { describe, expect, it } from 'vitest';
import showsJson from '../src/data/shows.json';
import seed from './fixtures/sheet/seed-menus.json';
import { fromSheet, menuFor as menuForLive, type SheetMenu } from '../src/lib/menus';
import type { Show } from '../src/lib/shows';

// A fixed copy of the sheet's menus, so Steve's edits never break the tests.
const menuFor = (show: Show) => menuForLive(show, seed as Record<string, SheetMenu>);
const showBySlug = (slug: string) => (showsJson as Show[]).find((s) => s.slug === slug);

describe('menuFor', () => {
  it('reads the seeded sheet menu with no visible change', () => {
    const menu = menuFor(showBySlug('lionel-and-the-commodores')!)!;
    expect(menu.courses.map((c) => c.course)).toEqual(['Salad', 'Entree', 'Dessert']);
    expect(menu.courses[0].dish).toBe('Blueberry Orchard Salad');
    expect(menu.snackBoard).toBe('Mini Slice of Cheesecake, Savory Crunch Mix & Fresh Seasonal Fruit');
  });

  it('leaves out a course with no title (Best of 2026 has no salad)', () => {
    expect(menuFor(showBySlug('best-of-2026')!)!.courses.map((c) => c.course)).toEqual(['Entree', 'Dessert']);
  });

  it('has no menu for A Big Band Christmas', () => {
    expect(menuFor(showBySlug('a-big-band-christmas')!)).toBeNull();
  });

  it('falls back to the hand-written menu when the sheet has no row for a show', () => {
    expect(menuForLive(showBySlug('lionel-and-the-commodores')!, {})!.courses[0].dish).toBe('Blueberry Orchard Salad');
  });

  it('treats a blank sheet row (null) as no menu, even with a hand-written one', () => {
    expect(menuForLive(showBySlug('lionel-and-the-commodores')!, { 'lionel-and-the-commodores': null })).toBeNull();
  });

  it('treats a sheet entry with nothing in it as no menu', () => {
    expect(fromSheet({})).toBeNull();
  });
});
