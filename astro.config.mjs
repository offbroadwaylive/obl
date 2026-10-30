// @ts-check
import { defineConfig } from 'astro/config';

// Served from the custom domain at its root (GitHub Pages, public/CNAME).
export default defineConfig({
  site: 'https://offbroadwaylive.com',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
});
