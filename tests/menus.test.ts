import { describe, expect, it } from 'vitest';
import { fromSheet, menuFor } from '../src/lib/menus';
import { showBySlug } from '../src/lib/shows';

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

  it('treats a sheet entry with nothing in it as no menu', () => {
    expect(fromSheet({})).toBeNull();
  });
});
