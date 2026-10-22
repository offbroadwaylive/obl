// Every internal link and asset path goes through here, so the same build
// works at /obl/ now and at the domain root after cutover.

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** url('menus/') -> '/obl/menus/' */
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
