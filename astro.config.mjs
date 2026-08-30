import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build
export default defineConfig({
  site: 'https://www.leszines.fr',
  // Static by default; the /api endpoints opt out via `export const prerender = false`
  // and run as Cloudflare Pages Functions. (Tailwind est branché via postcss.config.mjs.)
  // Redirections et en-têtes : public/_redirects et public/_headers (ex-netlify.toml).
  adapter: cloudflare({
    // Expose les variables d'environnement (fichier .env) au runtime Workers
    // pendant `astro dev`, comme le faisait `netlify dev`.
    platformProxy: { enabled: true },
  }),
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
