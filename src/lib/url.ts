// Every internal link and asset path goes through here, so links follow the
// base path in astro.config.mjs (the domain root, '/').

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** url('menus/') -> '/menus/' */
export function url(path = ''): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path.replace(/^\/+/, '');
  return `${BASE}/${clean}`;
}

export function showUrl(slug: string): string {
  return url(`shows/${slug}/`);
}

export function icsUrl(id: number): string {
  return url(`ics/${id}.ics`);
}
