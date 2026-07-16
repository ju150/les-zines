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
(voir `.env.example`) : **Resend** pour l'e-mail, **Twilio** pour le SMS (optionnel).
Sans clés, le formulaire ouvre automatiquement un e-mail pré-rempli — jamais de panne.

## Déploiement

Actuellement adaptateur **Node** (`@astrojs/node`, mode standalone) pour faire tourner l'endpoint.
Pour Netlify ou Vercel, remplacer l'adaptateur dans `astro.config.mjs` par `@astrojs/netlify`
ou `@astrojs/vercel`, puis renseigner les variables d'environnement (Resend/Twilio) dans le tableau
de bord de l'hébergeur. Pointer le domaine **leszines.fr** vers l'hébergeur (sortie de Wix).

## À compléter

- Photos d'intérieur (chambres, cuisine, salles d'eau) — à déposer dans `public/photos/`.
- URL de la Google Sheet publiée (oncle).
- Clés Resend / Twilio pour l'envoi réel.
- Épingle Google Maps exacte de la villa (dans `site.ts`, `mapsEmbed`).
