// Writes TODO.md: every "TODO" marker in src/ and scripts/, with its file
// and line, so open questions are tracked in one place.
//   npm run check:todo
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dirs = ['src', 'scripts'];
const skip = new Set(['list-todos.mjs']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (!skip.has(name) && /\.(json|astro|ts|mjs|sh|css)$/.test(name)) yield path;
  }
}

const rows = [];
for (const dir of dirs) {
  for (const file of walk(join(root, dir))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const at = line.indexOf('TODO');
        if (at === -1) return;
        const text = line
          .slice(at)
          .replace(/["',}*/\s]+$/, '')
          .replace(/\\"/g, '"')
          .trim();
        const item = text.match(/open item (\d+)/)?.[1];
        rows.push({ file: relative(root, file), line: i + 1, item: item ? Number(item) : 99, text });
      });
  }
}
rows.sort((a, b) => a.item - b.item || a.file.localeCompare(b.file) || a.line - b.line);

const md = [
  '# TODO',
  '',
  'Open items from section 9 of the build doc, and other gaps, with the file and line each lives in.',
  'This file is generated: run `npm run check:todo` after editing a TODO.',
  '',
  '| Open item | File | Note |',
  '| --- | --- | --- |',
  ...rows.map((r) => `| ${r.item === 99 ? '–' : r.item} | \`${r.file}:${r.line}\` | ${r.text.replace(/\|/g, '\\|')} |`),
  '',
].join('\n');

writeFileSync(join(root, 'TODO.md'), md);
console.log(`TODO.md: ${rows.length} items`);
