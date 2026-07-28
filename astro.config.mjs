import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// https://astro.build
export default defineConfig({
  site: 'https://www.leszines.fr',
  // Static by default; the /api endpoints opt out via `export const prerender = false`
  // and run as Netlify functions. (Tailwind est branché via postcss.config.mjs.)
  adapter: netlify(),
  integrations: [
    sitemap({
      // hreflang sans région : « fr » (pas « fr-FR ») pour ne pas réserver la page
      // française à la France, ni l'anglaise au Royaume-Uni. Valeurs identiques à
      // celles déclarées dans <head> par Base.astro — sitemap et pages doivent
      // envoyer le même signal à Google.
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr', en: 'en' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
