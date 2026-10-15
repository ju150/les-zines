# AGENTS.md

Consignes pour les agents de code qui travaillent sur ce dépôt. Le README décrit le projet ; ce
fichier dit comment y travailler sans rien casser.

## Avant de dire « c'est fini »

```bash
npm run verify   # astro check, tests Vitest, build, audit SEO du build
```

Un push sur `main` part **en production** (Cloudflare Workers Builds). Rien n'y va sans
`npm run verify` vert. Travailler sur une branche, ouvrir une pull request : la CI rejoue tout.

## Règles d'architecture

- **La logique vit dans `src/lib/`**, en fonctions pures qui reçoivent leur configuration en
  paramètre. Les routes de `src/pages/api/` restent fines : lire la requête et l'environnement,
  appeler `src/lib`, renvoyer la réponse. Toute nouvelle logique arrive avec ses tests dans `tests/`.
- **`src/lib/env.ts` est le seul accès aux variables d'environnement** et le seul import de
  `cloudflare:workers`. Ne jamais utiliser `Astro.locals.runtime.env` (depuis Astro 6, il lève une
  exception), ni `import.meta.env` pour un secret (Vite le fige au build).
- **Aucun secret dans le dépôt**, ni en clair ni en commentaire : clés d'API, jetons, et l'adresse
  de la feuille Google des tarifs (lisible par quiconque a le lien). Les secrets vont dans
  Cloudflare, en variables d'exécution (Settings → Variables and Secrets, type « Secret »), jamais
  en variables de build (Settings → Builds) ; `.env.example` ne contient que des noms. La CI lance
  gitleaks sur tout l'historique.
- **Variables non sensibles dans `wrangler.jsonc`**, pas dans le tableau de bord : `wrangler deploy`
  écrase celles saisies dans l'interface.
- **Tout ce qui vient d'un visiteur ou de la feuille passe par `escapeHtml`** (`src/lib/html.ts`)
  avant d'atterrir dans une page ou un e-mail.

## Règles du site

- **Deux langues, toujours ensemble.** Une page FR dans `src/pages/` a son équivalent dans
  `src/pages/en/`, et les deux partagent le composant de `src/components/pages/`. Toute nouvelle
  chaîne s'ajoute en FR et en EN dans `src/i18n/ui.ts` (un test vérifie que les clés concordent).
- **Liens internes avec slash final** (`localizedPath()`), sinon chaque clic coûte une 301.
  L'audit SEO refuse un lien sans slash.
- **Pas de paramètre de query dans une URL de page** : la semaine choisie passe dans le fragment
  (`/reservation/#week=…`), sinon Google indexe une URL par semaine.
- **Classes Tailwind écrites en entier**, jamais assemblées (`av-${kind}`) : Tailwind supprime de
  la feuille de style les classes qu'il ne trouve pas telles quelles dans les sources.
- **Photos** : les déposer dans `public/photos/villa/<thème>/`. `src/data/photos.json` est généré
  au build par `scripts/photo-manifest.mjs` et n'est pas versionné.
- **Tarifs** : la feuille Google fait foi. `src/data/rates.json` n'est qu'un secours, à
  resynchroniser de temps en temps (format dans `docs/guide-tarifs.md`).

## Style

- Commentaires, documentation et messages de commit en français. Un commentaire explique le
  pourquoi (la contrainte, le piège évité), pas ce que le code dit déjà.
- Messages de commit : « Zone : ce qui change », puis le pourquoi dans le corps si utile.
