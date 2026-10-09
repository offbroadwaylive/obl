// Menus come from the Menus tab of the content sheet (src/data/generated/menus.json,
// keyed by show slug) and fall back to the hand-written src/data/menus.json.
import handWritten from '../data/menus.json';
import sheetMenus from '../data/generated/menus.json';
import type { Show } from './shows';

export interface Course {
  course: 'Salad' | 'Entree' | 'Dessert';
  dish: string;
  description: string;
}

export interface Menu {
  courses: Course[];
  snackBoard?: string;
}

type Dish = { title: string; description?: string };
export type SheetMenu = { salad?: Dish; entree?: Dish; dessert?: Dish; snackBoard?: string } | null;

const COURSES = [
  ['salad', 'Salad'],
  ['entree', 'Entree'],
  ['dessert', 'Dessert'],
] as const;

/** "Prepared & Presented by Chef …": always from the hand-written file. */
export const menuCredit = handWritten.credit;

export function fromSheet(entry: NonNullable<SheetMenu>): Menu | null {
  const courses = COURSES.filter(([key]) => entry[key]?.title).map(([key, course]) => ({
    course,
    dish: entry[key]!.title,
    description: entry[key]!.description ?? '',
  }));
  if (!courses.length && !entry.snackBoard) return null;
  return { courses, ...(entry.snackBoard ? { snackBoard: entry.snackBoard } : {}) };
}

/**
 * The menu for a show, or null when it has none. A sheet entry wins; a sheet
 * row left blank is stored as null and means "no menu section".
 */
export function menuFor(show: Show, sheet: Record<string, SheetMenu> = sheetMenus as Record<string, SheetMenu>): Menu | null {
  if (show.slug in sheet) {
    const entry = sheet[show.slug];
    return entry ? fromSheet(entry) : null;
  }
  if (!show.menu) return null;
  return (handWritten.menus as Record<string, Menu>)[show.menu] ?? null;
}

/** Page anchor for a show's menu on /menus/. */
export const menuAnchor = (show: Show) => `menu-${show.slug}`;
