import type { ImageMetadata } from 'astro';

// Images imported by scripts/fetch-assets.sh live in src/assets/images so
// Astro can resize them and convert them to WebP. Paths in the data files
// are relative to that folder, e.g. "shows/lionel-wide.jpg".
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
});

export function findImage(path: string | null | undefined): ImageMetadata | undefined {
  if (!path) return undefined;
  return files[`/src/assets/images/${path}`]?.default;
}
