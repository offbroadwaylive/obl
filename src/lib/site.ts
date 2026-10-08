import site from '../data/site.json';

export const fullAddress = `${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}`;

const q = encodeURIComponent(`${site.name}, ${fullAddress}`);
export const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${q}&output=embed`;

export const isLive = site.SITE_IS_LIVE === true;
