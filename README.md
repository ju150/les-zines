# Villa Les Zines — site web

Site de **location** (et vente discrète) de la Villa Les Zines, Cap Ferret.
Astro + Tailwind, multi-pages, **bilingue FR/EN**, tarifs pilotés par Google Sheet, réservation e-mail/SMS.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:4321  (et /en/ pour l'anglais)
npm run build      # génère dist/ (16 pages statiques + endpoint serveur)
npm run preview    # sert le build
```

## Structure

```
src/
  pages/               Pages FR (/) et EN (/en/)  — 8 pages chacune
    api/reservation.ts Endpoint réservation (e-mail + SMS)
  components/          Nav, Footer, PageHeader, sections
    pages/             Contenu de chaque page (bilingue, 1 seule source)
  data/
    rates.json         Tarifs 2026 de secours (si la Google Sheet n'est pas connectée)
    site.ts            Coordonnées, nav, URL Google Sheet, embed Maps
  i18n/ui.ts           Toutes les chaînes FR + EN
  styles/global.css    Design system (couleurs, typo, boutons)
public/photos/         Photos (jour, jardin, nuit, Montuzet)
google-sheet/          Modèle CSV des tarifs + guide pour l'oncle
```

## Tarifs & disponibilités (Google Sheet)

Voir **`google-sheet/GUIDE-ONCLE.md`**. En résumé : l'oncle édite une feuille Google, la publie
en CSV, on colle l'URL dans `src/data/site.ts` (`ratesSheetCsv`). Sans URL, le site utilise
`src/data/rates.json` (déjà rempli avec les tarifs 2026).

## Réservation (e-mail + SMS)

Le formulaire poste sur `/api/reservation`. Configurer les clés dans un fichier `.env`
(voir `.env.example`) : **Brevo** (prioritaire) ou **Resend** pour l'e-mail, **Twilio** pour
le SMS (optionnel). Sans clés, le formulaire ouvre automatiquement un e-mail pré-rempli —
jamais de panne. Le champ caché `website` est un honeypot anti-spam : s'il est rempli, la
demande est silencieusement ignorée.

## Déploiement

Adaptateur **Cloudflare Pages** (`@astrojs/cloudflare`) : pages statiques + Pages Functions
pour `/api/rates` et `/api/reservation`. Renseigner les variables d'environnement
(Resend/Twilio) dans Cloudflare → Workers & Pages → le projet → Settings → Variables and
Secrets, puis relancer un déploiement. Le DNS reste chez **OVH** : `www` est un CNAME vers
`<projet>.pages.dev`, l'apex `leszines.fr` redirige en 301 vers `www` — les enregistrements
MX d'OVH (messagerie du domaine) ne bougent pas.

Redirections et en-têtes : `public/_redirects` et `public/_headers` (la CSP est en
Report-Only : à passer en `Content-Security-Policy` après vérification console sur le site
déployé). `wrangler.jsonc` porte la date et les drapeaux de compatibilité du runtime.

> Historique : le site était hébergé chez Netlify (`netlify.toml`, conservé pour mémoire)
> jusqu'à la suspension de l'équipe pour dépassement de crédits, le 30 août 2026.

## SEO

- `Base.astro` génère canonical, hreflang fr/en/x-default, Open Graph (image `public/photos/og.jpg`)
  et Twitter Cards ; JSON-LD (VacationRental, RealEstateListing, BreadcrumbList) via `src/data/schema.ts`.
- Sitemap : `@astrojs/sitemap` (`/sitemap-index.xml`), déclaré dans `public/robots.txt`.
- Crawlers IA : recherche et agents autorisés, robots d'entraînement refusés. Le blocage
  réel vient du réglage Cloudflare (AI Crawl Control), `public/robots.txt` déclare la même
  politique en repli — les deux doivent rester cohérents, sinon le fichier gagne et annule
  le réglage. Fiche d'infos pour les IA : `public/llms.txt`.
- Après un changement de tarifs dans la Google Sheet, penser à resynchroniser
  `src/data/rates.json` (fallback affiché en SSR) et à redéployer.

## Outils

- `node scripts-tools/optimize-images.mjs` : OG card, apple-touch-icon, conversion WebP des photos.
- `node scripts-tools/selfhost-fonts.mjs` : re-télécharge les polices auto-hébergées (public/fonts/).

## À compléter

- Clés Brevo / Twilio pour l'envoi réel (variables d'environnement Netlify).
