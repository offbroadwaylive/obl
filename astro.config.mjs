// @ts-check
import { defineConfig } from 'astro/config';

// The POC is served from https://dogmaticvox.github.io/offbroadwaylive/.
// At cutover to the real domain, set site to https://offbroadwaylive.com and base to '/'.
export default defineConfig({
  site: 'https://dogmaticvox.github.io',
  base: '/offbroadwaylive',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
});
