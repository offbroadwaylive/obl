import { url } from './url';

// Self-hosted WOFF2 files in public/fonts. No third-party font requests.
const faces = [
  { family: 'Anton', file: 'anton-latin-400-normal', weight: 400, style: 'normal' },
  { family: 'Playfair Display', file: 'playfair-display-latin-400-normal', weight: 400, style: 'normal' },
  { family: 'Playfair Display', file: 'playfair-display-latin-400-italic', weight: 400, style: 'italic' },
  { family: 'Playfair Display', file: 'playfair-display-latin-700-normal', weight: 700, style: 'normal' },
  { family: 'Inter', file: 'inter-latin-400-normal', weight: 400, style: 'normal' },
  { family: 'Inter', file: 'inter-latin-600-normal', weight: 600, style: 'normal' },
];

export const fontFaceCss = faces
  .map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url('${url(`fonts/${f.file}.woff2`)}') format('woff2');` +
      `font-weight:${f.weight};font-style:${f.style};font-display:swap}`,
  )
  .join('\n');

/** Fonts used above the fold on every page; preloaded in the head. */
export const preloadFonts = ['anton-latin-400-normal', 'inter-latin-400-normal'].map((f) => url(`fonts/${f}.woff2`));
