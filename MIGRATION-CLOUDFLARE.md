# Migration Netlify → Cloudflare Workers

Le 30 août 2026, Netlify a mis en pause **toute l'équipe** (« This team has exceeded the
credit limit »), pas seulement ce projet : `www.leszines.fr`, l'apex et l'adresse
`grand-pasca-ebc693.netlify.app` répondaient tous `503 {"error":"usage_exceeded"}`.
Netlify annonçait un rétablissement automatique « next month ». Attention au piège : le
cycle de facturation de cette équipe court **du 17 au 16**, et le cycle en cours est
« Aug 17 to Sep 16 ». Le rétablissement gratuit n'est donc pas à espérer avant le
**17 septembre** — soit dix-huit jours d'indisponibilité, pas deux.

Ce document décrit la sortie de Netlify et ce qu'il reste à faire à la main.

> **Workers, pas Pages.** `@astrojs/cloudflare` v14 (le seul adaptateur compatible avec
> Astro 7) cible **Cloudflare Workers avec Static Assets**, pas Cloudflare Pages. Le build
> produit `dist/client/` (204 fichiers statiques) et `dist/server/entry.mjs` (le Worker).
> Conséquence importante pour le DNS : voir l'étape 3.

## Ce qui est déjà fait dans le dépôt (branche `migration-cloudflare`)

| Fichier | Changement |
| --- | --- |
| `astro.config.mjs` | `@astrojs/netlify` → `@astrojs/cloudflare` (+ `platformProxy` pour `astro dev`) |
| `package.json` | adaptateur remplacé, Astro 7.1 → 7.2 (exigé par l'adaptateur), `wrangler` en devDependency |
| `wrangler.jsonc` | **nouveau** — nom du Worker, date et drapeaux de compatibilité (`nodejs_compat`) |
| `public/_redirects` | **nouveau** — portage des ~40 redirections 301 de `netlify.toml` |
| `public/_headers` | **nouveau** — portage des en-têtes de sécurité et des `Cache-Control` |
| `.nvmrc` | **nouveau** — `22`, pour bâtir avec la même version de Node que chez Netlify |
| `src/pages/api/reservation.ts` | `Buffer.from(…).toString('base64')` → `btoa(…)` ; variables lues via `locals.runtime.env` |
| `src/pages/api/rates.ts` | `Netlify-CDN-Cache-Control` → `CDN-Cache-Control` (en-tête standard) |
| `src/components/pages/MentionsLegales.astro` | hébergeur : Netlify → Cloudflare (mention légale obligatoire) |
| `scripts-tools/photo-manifest.mjs` + `src/data/photos.json` | **nouveau** — voir « galeries » ci-dessous |
| `src/components/pages/Villa.astro`, `Jardin.astro` | galeries lues dans le manifeste au lieu de `fs.readdirSync` |
| `package.json` | `npm run build` génère le manifeste avant `astro build` |
| `README.md`, `.env.example` | doc de déploiement réécrite pour Cloudflare |

> **Piège évité — les galeries photo.** `Villa.astro` et `Jardin.astro` listaient leurs
> photos avec `fs.readdirSync('public/photos/villa/…')` au moment du rendu. Chez Netlify le
> pré-rendu tourne sous Node, à la racine du projet : ça marchait. L'adaptateur Cloudflare,
> lui, pré-rend **dans le runtime Workers**, qui n'a aucun accès disque : `fs.existsSync`
> renvoyait `false` en silence, le build sortait en succès (code 0) et les pages
> `/la-villa/` et `/le-jardin/` partaient **sans une seule photo**. La liste est désormais
> figée dans `src/data/photos.json`, généré au build par un script Node — de la donnée pure,
> qui fonctionne quel que soit l'hébergeur. Vérifié après correction : 76 photos sur
> `/la-villa/` (FR et EN), 27 sur `/le-jardin/`. Déposer de nouvelles photos dans
> `public/photos/villa/<thème>/` continue de suffire.

Validé localement : `npm run build` passe, et `npx wrangler deploy --dry-run -c
dist/server/wrangler.json` accepte la configuration (Worker 615 KiB, 158 KiB gzippé, très
loin de la limite de 3 Mo ; 204 fichiers statiques ; bindings `ASSETS`, `SESSION`, `IMAGES`).

`netlify.toml` est **conservé** : il documente l'origine des règles et permet un retour
arrière rapide.

## Ce qu'il reste à faire à la main

### 1. Les variables d'environnement

**Une seule chose à saisir dans le tableau de bord Cloudflare : `RESEND_API_KEY`,
en type « Secret ».**

Les trois autres (`RESERVATION_FROM`, `RESERVATION_TO`, `CONTACT_EMAIL`) sont déclarées
dans `wrangler.jsonc`, et c'est délibéré. `wrangler deploy` **remplace** les variables
simples du Worker par celles du fichier de configuration : une variable saisie uniquement
dans l'interface est effacée au déploiement suivant. C'est ce qui a fait échouer les
premiers essais d'envoi — le Worker répondait `501 no_provider`. Ces trois valeurs sont
de toute façon publiques (les deux adresses figurent sur la page Contact).

Les **secrets**, eux, sont gérés séparément par Cloudflare et survivent aux déploiements :
la clé Resend est donc à sa place dans le tableau de bord, et nulle part dans le dépôt.

⚠️ La clé Resend de l'ancien site est irrécupérable : Netlify ne réaffiche jamais un
secret, et Resend non plus après création. Il faut en créer une nouvelle sur resend.com →
API Keys → Create API key, avec la permission **Sending access** (pas *Full access* : le
site ne fait qu'envoyer). Supprimer l'ancienne clé `netlify-send` une fois la bascule
confirmée.

Twilio (SMS d'alerte au propriétaire à chaque demande) n'a jamais été configuré sur ce
site et ne le sera pas : c'est un service payant, jugé non nécessaire.

Sans clé Resend, le site fonctionne quand même : le formulaire bascule automatiquement sur
l'ouverture d'un e-mail pré-rempli chez le visiteur. Mais l'envoi automatique et l'accusé
de réception au client sont perdus.

### 2. Déployer le Worker

Cloudflare → **Workers & Pages → Create → Import a repository** → `ju150/les-zines`.

| Réglage | Valeur |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy -c dist/server/wrangler.json` |
| Version de Node | lue dans `.nvmrc` (22) |

Puis **Settings → Variables and Secrets** : ajouter `RESEND_API_KEY` en type « Secret »
(et rien d'autre — voir l'étape 1), puis **relancer un déploiement** : les variables ne
sont lues qu'au déploiement suivant.

Le site est alors joignable sur `https://les-zines.<compte>.workers.dev`. **Tout vérifier
là-dessus avant de toucher au DNS** : pages FR et EN, tarifs, formulaire de réservation.

### 3. Brancher le domaine — la partie délicate

Un **domaine personnalisé sur un Worker exige que la zone soit hébergée chez Cloudflare**
(contrairement à Cloudflare Pages, qui acceptait un simple CNAME depuis un DNS externe).
Il faut donc déplacer les serveurs de noms de `leszines.fr` d'OVH vers Cloudflare.

Zone OVH relevée le 30 août 2026 (à reproduire à l'identique chez Cloudflare, sauf les
deux lignes marquées « remplacer ») :

| Sous-domaine | Type | Cible | Sort |
| --- | --- | --- | --- |
| `@` | NS | `ns20.ovh.net.`, `dns20.ovh.net.` | remplacés par ceux de Cloudflare |
| `@` | A | `75.2.60.5` | **supprimer** (Netlify) |
| `www` | CNAME | `grand-pasca-ebc693.netlify.app.` | **remplacer** par le domaine du Worker |
| `@` | **MX** | `1 mx1.mail.ovh.net.` · `5 mx2.mail.ovh.net.` · `100 mx3.mail.ovh.net.` | à préserver |
| `@` | SPF | `v=spf1 include:mx.ovh.com -all` | à recréer **en TXT** |
| `dpmail._domainkey` | TXT | `v=DKIM1;t=s;p=MIGfMA0GCSqGSIb3…` | à préserver |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | à préserver |
| `@` | TXT | `google-site-verification=hjqVfiOIW2lLo…` | à préserver |
| `resend._domainkey` | TXT | `p=MIGfMA0GCSqGSIb3DQ…` | **à préserver — critique** |
| `send` | MX | `10 feedback-smtp.eu-west-1.amazonses.com.` | **à préserver — critique** |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | **à préserver — critique** |

⚠️ **Deux messageries distinctes dépendent de cette zone, pas une.**

1. **La boîte du propriétaire** (`contact@leszines.fr`) tourne sur les MX d'OVH.
2. **L'envoi Resend** (`reservation@leszines.fr`, l'expéditeur des demandes de réservation)
   repose sur `resend._domainkey` et sur le sous-domaine `send`. Perdre ces trois lignes
   ne coupe pas la réception : ça coupe l'**émission** — le formulaire du site cesse
   d'envoyer. Le symptôme serait un `502 send_failed`, difficile à relier au DNS.

Deux pièges concrets :

- OVH expose un pseudo-type **SPF** qui n'existe pas chez Cloudflare : le recréer en
  **TXT**, avec la même valeur.
- Les valeurs DKIM sont longues. Vérifier qu'elles ont été importées **en entier**, sans
  troncature ni guillemets en trop.
- Tout ce qui touche au courrier reste en **« DNS only » (nuage gris)**, jamais en proxy.

Point rassurant sur le calendrier : la zone Cloudflare se construit **avant** le changement
de serveurs de noms. Tant que les deux zones portent les mêmes MX, aucun message ne se perd
pendant la propagation — un expéditeur qui interroge encore OVH et un autre qui interroge
déjà Cloudflare obtiennent la même réponse.

Procédure sûre :

1. **Exporter la zone DNS depuis OVH** (Espace client → Domaine → Zone DNS → Exporter).
   Garder le fichier : c'est le filet de sécurité.
2. Ajouter `leszines.fr` dans Cloudflare (plan **Free**). Cloudflare scanne la zone et
   pré-remplit les enregistrements.
3. **Comparer ligne à ligne** avec l'export OVH. Vérifier en particulier les 3 MX, le SPF,
   le DKIM (`*._domainkey`) et le DMARC (`_dmarc`). Ajouter à la main ce qui manque.
   Mettre les enregistrements de messagerie en « DNS only » (nuage gris), jamais en proxy.
4. Seulement ensuite : chez OVH, remplacer les serveurs de noms par ceux fournis par
   Cloudflare. Propagation : quelques heures, jusqu'à 48 h au pire.
5. Une fois la zone active chez Cloudflare : Worker → **Settings → Domains & Routes →
   Add Custom Domain** → `www.leszines.fr`. Ajouter aussi `leszines.fr` (apex) et une
   **Redirect Rule** 301 apex → `https://www.leszines.fr` (l'URL canonique du site).

Si ce déplacement de DNS n'est pas souhaitable, l'alternative est de rester chez Netlify
(voir « Retour arrière ») ou de choisir un hébergeur acceptant un CNAME externe.

### 4. Vérifications après bascule

```bash
curl -sSI https://www.leszines.fr | head -5
curl -sS  https://www.leszines.fr/api/rates | head -c 200
curl -sSI https://leszines.fr | head -5              # 301 vers www
curl -sSI https://www.leszines.fr/tarifs | head -5   # 301 vers /sejours-tarifs/
nslookup -type=MX leszines.fr 8.8.8.8                # les 3 MX OVH doivent répondre
```

- Envoyer une vraie demande depuis `/reservation/` et confirmer la réception de l'e-mail.
- Envoyer un e-mail de test **vers** `contact@leszines.fr` : la messagerie doit être intacte.
- Console du navigateur : vérifier qu'aucune ressource n'est bloquée par la CSP (elle est
  en `Report-Only`, donc rien ne casse tant qu'on ne la passe pas en actif).
- Search Console : l'URL `www.leszines.fr` ne change pas, rien à redéclarer.

### 5. Après coup

- `/api/rates` n'est plus mis en cache à l'edge (Netlify avait un cache durable). Si le
  volume d'appels devient un sujet, ajouter une **Cache Rule** sur `/api/rates`
  (Edge TTL 2 min). Sans elle, seul le cache navigateur joue — c'est déjà l'essentiel.
- Limites du plan Workers gratuit : 100 000 requêtes/jour **sur le Worker**. Les fichiers
  statiques ne comptent pas et sont illimités ; seuls `/api/rates` et `/api/reservation`
  invoquent le Worker. On est très loin du plafond.
- Ne supprimer le projet Netlify qu'une fois la bascule confirmée et le site stable.

## Retour arrière

`git checkout main` puis `npm install` : `netlify.toml` n'a pas bougé et `@astrojs/netlify`
se réinstalle. Côté DNS, remettre le CNAME `www` sur `grand-pasca-ebc693.netlify.app.` et
l'enregistrement A de l'apex sur `75.2.60.5`.

## Origine du dépassement de crédits — établie

Le tableau de bord Netlify (**Usage & billing**) est sans ambiguïté : **une seule journée,
le 23 août, a consommé 312 crédits**, alors que le mois complet précédent
(17 juillet – 16 août) en avait consommé 320 au total.

Répartition de cette journée :

| Ressource | Crédits | Part |
| --- | --- | --- |
| **Web requests** | 257 | 82 % |
| **Bandwidth** | 48 | 15 % |
| Functions compute | 7,3 | 2 % |
| Database, Agent Runners, AI Gateway, Preview Servers | 0 | 0 % |

Et côté bande passante : ~2,35 Go sur cette seule journée, contre ~0,05 Go les autres
jours — **47 fois le trafic normal**, puis retour immédiat à zéro. Total du cycle en cours :
2,6 Go contre 1,2 Go pour le mois entier précédent.

**Ce n'est donc ni un bug de facturation, ni une ressource provisionnée qui facture en
continu, ni l'agent IA de Netlify** (Agent Runners : 0 crédit). C'est un **pic de requêtes
sur les fichiers statiques**, concentré sur une journée : le profil typique d'un robot
d'indexation ou d'un aspirateur de site. Les fonctions n'y sont pour presque rien (7,3
crédits), ce qui écarte aussi une boucle sur `/api/rates`.

Le terrain était favorable : `public/robots.txt` autorise explicitement tous les crawlers
IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) et le site sert 22 Mo de photos en
115 fichiers. Un passage complet coûte 24 Mo ; une centaine de passages dans la journée
suffit à expliquer les 2,35 Go.

### Pourquoi Cloudflare règle le problème

Sur Workers, **les requêtes sur fichiers statiques sont gratuites et illimitées** : le
scénario du 23 août n'aurait rien coûté. Seuls `/api/rates` et `/api/reservation` invoquent
le Worker, dans la limite de 100 000 requêtes/jour du plan gratuit — sans commune mesure
avec le trafic réel du site.

### À faire quand même, une fois en ligne

1. **Bot Fight Mode** (Cloudflare → Security → Bots) : gratuit, filtre les robots les plus
   agressifs.
2. Une **règle de limitation de débit** (1 règle incluse dans le plan gratuit), par exemple
   100 requêtes/minute par IP.
3. Envisager d'alléger les photos : 77 fichiers JPEG pèsent 16 Mo là où 35 WebP n'en pèsent
   que 4. `node scripts-tools/optimize-images.mjs` existe déjà pour ça. Cela divise le coût
   d'un passage de robot — et accélère le site pour les visiteurs.
