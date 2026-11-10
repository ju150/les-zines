import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// Commit en cours de construction. Cloudflare Workers Builds le fournit dans cette variable ;
// en local elle est vide. Figé dans le build (« define ») puis servi par /version.txt : c'est
// ce qui permet au workflow IndexNow de savoir que CE commit est bien arrivé en production
// avant de prévenir Bing. Ce n'est pas un secret : le dépôt est public.
const BUILD_COMMIT = process.env.WORKERS_CI_COMMIT_SHA ?? '';

// https://astro.build
export default defineConfig({
  site: 'https://www.leszines.fr',
  vite: { define: { __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT) } },
  // Pages statiques par défaut ; les routes /api/ s'en excluent (`export const prerender =
  // false`) et tournent dans le Worker Cloudflare. Tailwind est branché via postcss.config.mjs.
  // Redirections et en-têtes : public/_redirects et public/_headers.
  adapter: cloudflare({
    // Expose les variables d'environnement (fichier .env) au runtime Workers
    // pendant `astro dev`.
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
