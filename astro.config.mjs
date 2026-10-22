// @ts-check
import { defineConfig } from 'astro/config';

// The POC is served from https://offbroadwaylive.github.io/obl/.
// At cutover to the real domain, set site to https://offbroadwaylive.com and base to '/'.
export default defineConfig({
  site: 'https://offbroadwaylive.github.io',
  base: '/obl',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
});
