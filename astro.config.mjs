import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build
export default defineConfig({
  site: 'https://www.leszines.fr',
  // Hybrid: every page is static (prerendered) except routes that opt out
  // via `export const prerender = false` (our /api endpoints).
  output: 'hybrid',
  adapter: netlify(),
  integrations: [tailwind({ applyBaseStyles: false })],
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
