// Applies a "Publish now" payload from the OBL Website Content sheet.
//
//   node scripts/apply-sheet.mjs                 reads the SHEET_PAYLOAD env var (the workflow)
//   npm run apply-sheet -- path/to/payload.json  reads a file (local testing)
//
// The payload is untrusted input. It is validated against the rules in the
// sheet doc; on any problem the script prints each one with its tab and row,
// changes nothing and exits 1. Otherwise it writes src/data/generated/menus.json
// and dates.json with stable formatting, and prints what changed. If
// COMMIT_MSG_FILE is set, a commit message is written there.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = join(ROOT, 'src/data/generated');

export const MAX_BYTES = 64 * 1024;
export const COURSES = [
  { key: 'salad', title: 'Salad Title', description: 'Salad Description' },
  { key: 'entree', title: 'Entree Title', description: 'Entree Description' },
  { key: 'dessert', title: 'Dessert Title', description: 'Dessert Description' },
];
export const SNACK = 'Snack Board Description';
export const MENU_HEADERS = ['Show', ...COURSES.flatMap((c) => [c.title, c.description]), SNACK];
/** "Performance ID" is optional: without it the ids in shows.json are used. */
export const DATE_HEADERS = ['Show', 'Date', 'Status'];
export const ID_HEADER = 'Performance ID';
export const STATUS = { 'on sale': 'on-sale', 'few tickets remain': 'low', 'sold out': 'sold-out' };
export const STATUS_LABEL = { 'on-sale': 'On Sale', low: 'Few Tickets Remain', 'sold-out': 'Sold Out' };
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 300;

/** Plain text: no control characters or line breaks, single spaces, capped length. */
export function clean(value, max) {
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Today in Los Angeles as YYYY-MM-DD. BUILD_DATE overrides it, as for the site build. */
export function todayLA(env = process.env) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(env.BUILD_DATE ?? '')) return env.BUILD_DATE;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Parses the raw payload text. Returns { payload } or { errors }. Empty text means "no data". */
export function parsePayload(text) {
  if (text == null || String(text).trim() === '') return { payload: null };
  if (Buffer.byteLength(String(text), 'utf8') > MAX_BYTES) return { errors: [`Payload is larger than ${MAX_BYTES / 1024} KB.`] };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { errors: ['Payload is not valid JSON.'] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { errors: ['Payload is not a JSON object.'] };
  if (!Array.isArray(data.menus) || !Array.isArray(data.dates)) return { errors: ['Payload must have "menus" and "dates" lists.'] };
  return { payload: data };
}

const where = (tab, row, i) => `${tab} row ${Number.isInteger(row?._row) ? row._row : `#${i + 1}`}`;

/** Checks every row is an object of text cells and that required columns exist. */
function checkShape(tab, rows, headers, errors) {
  const missing = new Set();
  rows.forEach((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`${where(tab, row, i)}: is not a row of cells.`);
      return;
    }
    for (const h of headers) if (!(h in row)) missing.add(h);
    for (const [k, v] of Object.entries(row)) {
      if (k !== '_row' && typeof v !== 'string') errors.push(`${where(tab, row, i)}: "${k}" is not text.`);
    }
  });
  for (const h of missing) errors.push(`${tab} tab: the "${h}" column is missing.`);
  return missing.size === 0;
}

/**
 * Validates a parsed payload against the repo's shows.
 * Returns { errors, warnings, menus, dates } where menus and dates are the
 * contents for the generated files (only meaningful when errors is empty).
 */
export function validate(payload, shows, today) {
  const errors = [];
  const warnings = [];
  // A show can keep an older name in the sheet (sheetName) after its title changes.
  const byTitle = new Map(shows.flatMap((s) => [[s.title, s], ...(s.sheetName ? [[s.sheetName, s]] : [])]));

  // ---- Menus tab
  const menus = {};
  const menuSeen = new Map();
  if (checkShape('Menus', payload.menus, MENU_HEADERS, errors)) {
    payload.menus.forEach((row, i) => {
      if (!row || typeof row !== 'object') return;
      const at = where('Menus', row, i);
      const title = clean(row.Show ?? '', 200);
      const show = byTitle.get(title);
      if (!show) {
        errors.push(`${at}: Show "${title}" does not match any show on the website.`);
        return;
      }
      if (menuSeen.has(show.slug)) {
        errors.push(`${at}: ${show.title} is also on ${menuSeen.get(show.slug)}.`);
        return;
      }
      menuSeen.set(show.slug, at);
      const entry = {};
      for (const c of COURSES) {
        const dish = clean(row[c.title] ?? '', MAX_TITLE);
        const description = clean(row[c.description] ?? '', MAX_DESCRIPTION);
        if (!dish && description) errors.push(`${at}: ${c.description} is filled in but ${c.title} is blank.`);
        if (dish) entry[c.key] = description ? { title: dish, description } : { title: dish };
      }
      const snack = clean(row[SNACK] ?? '', MAX_DESCRIPTION);
      if (snack) entry.snackBoard = snack;
      menus[show.slug] = Object.keys(entry).length ? entry : null;
    });
  }

  // ---- Dates tab
  const dates = [];
  const keySeen = new Map();
  const idSeen = new Map();
  if (checkShape('Dates', payload.dates, DATE_HEADERS, errors)) {
    payload.dates.forEach((row, i) => {
      if (!row || typeof row !== 'object') return;
      const at = where('Dates', row, i);
      const title = clean(row.Show ?? '', 200);
      const show = byTitle.get(title);
      if (!show) {
        errors.push(`${at}: Show "${title}" does not match any show on the website.`);
        return;
      }
      const date = clean(row.Date ?? '', 40);
      const m = date.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
      const valid = m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31 && +m[4] <= 23 && +m[5] <= 59;
      if (!valid) {
        errors.push(`${at}: Date "${date}" is not a date and time like 2026-10-10 18:00.`);
        return;
      }
      if (date.slice(0, 10) < today) return; // past dates are ignored
      const start = date.replace(' ', 'T');
      const perf = show.performances.find((p) => p.start === start);
      if (!perf) {
        errors.push(`${at}: ${show.title} has no performance on ${date}. Add it to shows.json first.`);
        return;
      }
      const key = `${show.slug}|${start}`;
      if (keySeen.has(key)) {
        errors.push(`${at}: ${show.title} ${date} is also on ${keySeen.get(key)}.`);
        return;
      }
      keySeen.set(key, at);
      const status = STATUS[clean(row.Status ?? '', 40).toLowerCase()];
      if (!status) errors.push(`${at}: Status "${clean(row.Status ?? '', 40)}" must be On Sale, Few Tickets Remain or Sold Out.`);
      const rawId = clean(row[ID_HEADER] ?? '', 40);
      let id;
      if (rawId) {
        if (!/^\d{1,12}$/.test(rawId)) errors.push(`${at}: Performance ID "${rawId}" must be numbers only.`);
        else if (idSeen.has(rawId)) errors.push(`${at}: Performance ID ${rawId} is also on ${idSeen.get(rawId)}.`);
        else {
          idSeen.set(rawId, at);
          id = Number(rawId);
        }
      }
      if (status) dates.push({ show: show.slug, start, status, ...(id ? { id } : {}) });
    });
  }

  if (errors.length === 0) {
    // Ids must stay unique once the sheet's ids are laid over the repo's.
    const overlay = new Map(dates.map((d) => [`${d.show}|${d.start}`, d]));
    const owner = new Map();
    for (const s of shows) {
      for (const p of s.performances) {
        const id = overlay.get(`${s.slug}|${p.start}`)?.id ?? p.id;
        const label = `${s.title} ${p.start.replace('T', ' ')}`;
        if (owner.has(id)) errors.push(`Dates tab: Performance ID ${id} would be used by both ${owner.get(id)} and ${label}.`);
        else owner.set(id, label);
        if (p.start.slice(0, 10) >= today && !overlay.has(`${s.slug}|${p.start}`)) {
          warnings.push(`Dates tab: ${label} has no row; keeping the website's status and id.`);
        }
      }
    }
  }

  dates.sort((a, b) => a.show.localeCompare(b.show) || a.start.localeCompare(b.start));
  return { errors, warnings, menus, dates };
}

/** Stable JSON: sorted keys, two-space indent, trailing newline. */
export function render(value) {
  const sort = (v) =>
    Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v;
  return JSON.stringify(sort(value), null, 2) + '\n';
}

/** Human-readable list of what a publish changes, for logs and the commit message. */
export function describeChanges(shows, before, after) {
  const out = [];
  const title = new Map(shows.map((s) => [s.slug, s.title]));
  const handWritten = new Set(shows.filter((s) => s.menu).map((s) => s.slug));
  const when = (start) => {
    const d = new Date(`${start}:00Z`);
    return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} ${start.slice(11)}`;
  };
  const effective = (rows) => {
    const map = new Map(rows.map((r) => [`${r.show}|${r.start}`, r]));
    return (slug, p) => {
      const r = map.get(`${slug}|${p.start}`);
      return { status: r?.status ?? p.status ?? 'on-sale', id: r?.id ?? p.id };
    };
  };
  const was = effective(before.dates);
  const now = effective(after.dates);
  for (const s of shows) {
    for (const p of s.performances) {
      const a = was(s.slug, p);
      const b = now(s.slug, p);
      if (a.status !== b.status) out.push(`${s.title} ${when(p.start)} ${STATUS_LABEL[a.status]} -> ${STATUS_LABEL[b.status]}`);
      if (a.id !== b.id) out.push(`${s.title} ${when(p.start)} id ${a.id} -> ${b.id}`);
    }
  }
  const slugs = [...new Set([...Object.keys(before.menus), ...Object.keys(after.menus)])].sort();
  for (const slug of slugs) {
    const name = title.get(slug) ?? slug;
    const a = before.menus[slug];
    const b = after.menus[slug];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    // A blank row (null) and no row look the same on the site unless the
    // show has a hand-written menu to fall back to.
    if (!a && !b && !handWritten.has(slug)) continue;
    if (!a || !b) {
      out.push(`${name} menu ${b ? 'added' : a === undefined ? 'cleared' : 'removed'}`);
      continue;
    }
    for (const c of COURSES) {
      if (a[c.key]?.title !== b[c.key]?.title) out.push(`${name} ${c.key} title`);
      if (a[c.key]?.description !== b[c.key]?.description) out.push(`${name} ${c.key} description`);
    }
    if (a.snackBoard !== b.snackBoard) out.push(`${name} snack board`);
  }
  return out;
}

export function commitMessage(changes) {
  if (changes.length === 0) return 'Sheet publish: tidy generated data';
  const head = changes.slice(0, 3).join('; ');
  const more = changes.length > 3 ? ` (+${changes.length - 3} more)` : '';
  return `Sheet publish: ${head}${more}\n\n${changes.map((c) => `- ${c}`).join('\n')}\n`;
}

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

export function main(argv = process.argv, env = process.env) {
  const file = argv[2];
  const text = file ? readFileSync(file, 'utf8') : env.SHEET_PAYLOAD;
  const parsed = parsePayload(text);
  if (parsed.errors) {
    parsed.errors.forEach((e) => console.error(`::error::${e}`));
    return 1;
  }
  if (!parsed.payload) {
    console.log('No payload: nothing to apply.');
    return 0;
  }

  const shows = JSON.parse(readFileSync(join(ROOT, 'src/data/shows.json'), 'utf8'));
  const result = validate(parsed.payload, shows, todayLA(env));
  result.warnings.forEach((w) => console.log(`::warning::${w}`));
  if (result.errors.length) {
    console.error(`The sheet was not published. ${result.errors.length} problem(s) to fix:`);
    result.errors.forEach((e) => console.error(`::error::${e}`));
    return 1;
  }

  const before = {
    menus: readJson(join(GENERATED, 'menus.json'), {}),
    dates: readJson(join(GENERATED, 'dates.json'), []),
  };
  const changes = describeChanges(shows, before, result);
  writeFileSync(join(GENERATED, 'menus.json'), render(result.menus));
  writeFileSync(join(GENERATED, 'dates.json'), render(result.dates));
  console.log(changes.length ? `Changes:\n${changes.map((c) => `  ${c}`).join('\n')}` : 'No content changes.');
  if (env.COMMIT_MSG_FILE) writeFileSync(env.COMMIT_MSG_FILE, commitMessage(changes));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
