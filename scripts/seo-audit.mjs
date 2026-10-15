// Audit SEO du site construit : ce que Google et les moteurs d'IA lisent réellement, page
// par page, dans dist/client. Lancé en CI après le build (`npm run audit:seo`).
//
// Erreur        = la page envoie un signal faux ou cassé (canonical, hreflang, lien mort,
//                 page orpheline, JSON-LD illisible…) : le script sort en code 1.
// Avertissement = perfectible sans être faux (longueur d'un titre, d'une description).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const DIST = fileURLToPath(new URL('../dist/client/', import.meta.url));
const SITE = 'https://www.leszines.fr';
const HREFLANGS = ['fr', 'en', 'x-default'];
const TITLE_LENGTH = { min: 15, max: 65 };
const DESCRIPTION_LENGTH = { min: 70, max: 160 };

if (!fs.existsSync(DIST)) {
  console.error('dist/client introuvable : lancer `npm run build` avant l’audit.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const error = (page, message) => errors.push(`${page}  ${message}`);
const warn = (page, message) => warnings.push(`${page}  ${message}`);

// ——— Pages construites ———
const htmlFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });

/** dist/client/la-villa/index.html → « /la-villa/ » ; dist/client/404.html → « /404.html ». */
const urlPathOf = (file) => {
  const rel = '/' + path.relative(DIST, file).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

/** Le chemin désigne-t-il un fichier ou une page présents dans le build ? */
const existsInDist = (urlPath) => {
  const target = path.join(DIST, decodeURIComponent(urlPath));
  return urlPath.endsWith('/') ? fs.existsSync(path.join(target, 'index.html')) : fs.existsSync(target);
};

const pages = new Map(
  htmlFiles(DIST).map((file) => {
    const root = parse(fs.readFileSync(file, 'utf8'));
    const urlPath = urlPathOf(file);
    const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
    const alternates = Object.fromEntries(
      root.querySelectorAll('link[rel="alternate"][hreflang]').map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')]),
    );
    return [urlPath, { urlPath, root, indexable: !/noindex/i.test(robots), alternates, inbound: new Set() }];
  }),
);
const indexable = [...pages.values()].filter((p) => p.indexable);

// ——— Contrôles page par page ———
for (const page of pages.values()) {
  const { urlPath, root } = page;
  const url = SITE + urlPath;

  const expectedLang = urlPath.startsWith('/en/') ? 'en' : 'fr';
  const lang = root.querySelector('html')?.getAttribute('lang');
  if (lang !== expectedLang) error(urlPath, `<html lang="${lang}"> au lieu de « ${expectedLang} »`);

  const titles = root.querySelectorAll('title');
  const title = titles[0]?.text.trim() ?? '';
  if (titles.length !== 1 || !title) error(urlPath, `${titles.length} balise(s) <title> non vide(s), 1 attendue`);
  page.title = title;

  // Liens internes : ils existent, et visent la forme canonique (slash final), sans 301.
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const target = new URL(href, url);
    if (target.origin !== SITE) continue;
    const targetPath = target.pathname;
    const looksLikePage = !path.posix.extname(targetPath);
    if (looksLikePage && !targetPath.endsWith('/')) {
      error(urlPath, `lien sans slash final vers ${targetPath} (redirection 301 évitable)`);
    } else if (!existsInDist(targetPath)) {
      error(urlPath, `lien mort vers ${targetPath}`);
    } else if (targetPath !== urlPath && pages.has(targetPath)) {
      pages.get(targetPath).inbound.add(urlPath);
    }
  }

  for (const img of root.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) error(urlPath, `image sans attribut alt : ${img.getAttribute('src')}`);
  }

  if (!page.indexable) continue; // 404 : pas de canonical ni de hreflang à vérifier.

  if (title.length < TITLE_LENGTH.min || title.length > TITLE_LENGTH.max) {
    warn(urlPath, `titre de ${title.length} caractères (conseillé : ${TITLE_LENGTH.min} à ${TITLE_LENGTH.max})`);
  }

  const description = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  page.description = description;
  if (!description) error(urlPath, 'meta description absente');
  else if (description.length < DESCRIPTION_LENGTH.min || description.length > DESCRIPTION_LENGTH.max) {
    warn(urlPath, `description de ${description.length} caractères (conseillé : ${DESCRIPTION_LENGTH.min} à ${DESCRIPTION_LENGTH.max})`);
  }

  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (canonical !== url) error(urlPath, `canonical « ${canonical} » au lieu de « ${url} »`);

  const h1 = root.querySelectorAll('h1').length;
  if (h1 !== 1) error(urlPath, `${h1} titre(s) <h1>, 1 attendu`);

  for (const hreflang of HREFLANGS) {
    const href = page.alternates[hreflang];
    if (!href) error(urlPath, `hreflang « ${hreflang} » absent`);
    else if (!href.startsWith(SITE) || !pages.has(href.slice(SITE.length))) error(urlPath, `hreflang « ${hreflang} » vers une page inexistante : ${href}`);
  }
  if (page.alternates[expectedLang] !== url) error(urlPath, `hreflang « ${expectedLang} » ne pointe pas vers la page elle-même`);
  if (page.alternates['x-default'] !== page.alternates.fr) error(urlPath, 'x-default différent de la version française');

  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (!ogImage) error(urlPath, 'og:image absente');
  else if (ogImage.startsWith(SITE) && !existsInDist(new URL(ogImage).pathname)) error(urlPath, `og:image introuvable : ${ogImage}`);

  page.jsonLd = [];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.text);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (!item['@context'] || !item['@type']) error(urlPath, 'bloc JSON-LD sans @context ou @type');
        else page.jsonLd.push(item['@type']);
      }
    } catch {
      error(urlPath, 'bloc JSON-LD illisible (JSON invalide)');
    }
  }
}

// ——— hreflang réciproques : chaque version annonce l'autre ———
for (const page of indexable) {
  const self = SITE + page.urlPath;
  for (const lang of ['fr', 'en']) {
    const other = pages.get(page.alternates[lang]?.slice(SITE.length));
    if (other && other !== page) {
      const back = Object.values(other.alternates);
      if (!back.includes(self)) error(page.urlPath, `${other.urlPath} ne renvoie pas vers cette page (hreflang non réciproque)`);
    }
  }
}

// ——— Maillage interne : aucune page indexable sans lien entrant ———
for (const page of indexable) {
  if (page.urlPath !== '/' && page.urlPath !== '/en/' && page.inbound.size === 0) {
    error(page.urlPath, 'page orpheline : aucune autre page ne la lie');
  }
}

// ——— Sitemap et robots.txt ———
const read = (file) => (fs.existsSync(path.join(DIST, file)) ? fs.readFileSync(path.join(DIST, file), 'utf8') : '');
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapIndex = read('sitemap-index.xml');
if (!sitemapIndex) error('/sitemap-index.xml', 'absent');
const inSitemap = new Set(locs(sitemapIndex).flatMap((loc) => locs(read(new URL(loc).pathname))));
for (const page of pages.values()) {
  const listed = inSitemap.has(SITE + page.urlPath);
  if (page.indexable && !listed) error(page.urlPath, 'absente du sitemap');
  if (!page.indexable && listed) error(page.urlPath, 'noindex mais listée dans le sitemap');
}
for (const loc of inSitemap) {
  if (!pages.get(loc.slice(SITE.length))?.indexable) error(loc, 'listée dans le sitemap sans page indexable correspondante');
}
if (!read('robots.txt').includes(`Sitemap: ${SITE}/sitemap-index.xml`)) error('/robots.txt', 'ne déclare pas le sitemap');
if (!read('llms.txt')) warn('/llms.txt', 'absent : les assistants IA n’ont pas de fiche de synthèse');

// ——— Rapport ———
const col = (value, width) => String(value).padEnd(width);
console.log(`\nAudit SEO de ${pages.size} pages (${indexable.length} indexables) — ${SITE}\n`);
console.log(col('Page', 28) + col('Titre', 7) + col('Descr.', 8) + col('Liens entrants', 16) + 'JSON-LD');
for (const page of [...pages.values()].sort((a, b) => a.urlPath.localeCompare(b.urlPath))) {
  if (!page.indexable) {
    console.log(col(page.urlPath, 28) + 'noindex');
    continue;
  }
  console.log(
    col(page.urlPath, 28) +
      col(page.title.length, 7) +
      col(page.description.length, 8) +
      col(page.inbound.size, 16) +
      (page.jsonLd.join(', ') || '—'),
  );
}
for (const [label, list] of [['Avertissements', warnings], ['Erreurs', errors]]) {
  if (list.length) console.log(`\n${label} (${list.length}) :\n  ${list.join('\n  ')}`);
}
console.log(errors.length ? `\n✗ ${errors.length} erreur(s).` : '\n✓ Aucune erreur.');
process.exit(errors.length ? 1 : 0);
