// Génère src/data/photos.json à partir du contenu de public/photos/villa/.
//
// Pourquoi un script séparé plutôt qu'un `fs.readdirSync` dans la page ?
// L'adaptateur Cloudflare pré-rend les pages dans le runtime Workers, où `node:fs`
// ne voit aucun disque : le scan y renvoyait silencieusement une liste vide, donc
// une galerie muette sur /la-villa/ et /le-jardin/. Un manifeste JSON est de la
// donnée pure — il fonctionne quel que soit l'hébergeur.
//
// Lancé automatiquement par `npm run build`. Déposer de nouvelles photos dans
// public/photos/villa/<thème>/ suffit : elles réapparaissent au build suivant.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VILLA_DIR = path.join(ROOT, 'public', 'photos', 'villa');
const OUT = path.join(ROOT, 'src', 'data', 'photos.json');

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

const scan = (slug) => {
  const dir = path.join(VILLA_DIR, slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_RE.test(f))
    .sort()
    .map((f) => `/photos/villa/${slug}/${f}`);
};

const slugs = fs.existsSync(VILLA_DIR)
  ? fs.readdirSync(VILLA_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];

const manifest = Object.fromEntries(slugs.map((slug) => [slug, scan(slug)]));
const total = Object.values(manifest).reduce((n, list) => n + list.length, 0);

if (total === 0) {
  // Mieux vaut casser le build que publier un site dont les galeries sont vides.
  console.error(`[photo-manifest] Aucune photo trouvée dans ${VILLA_DIR}`);
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[photo-manifest] ${total} photos dans ${slugs.length} thèmes → src/data/photos.json`);
