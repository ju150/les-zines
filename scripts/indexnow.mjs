// Prévient Bing — et les autres moteurs du protocole IndexNow — que les pages viennent de changer.
//
// Pourquoi : sans signal, Bing repasse quand il veut. En novembre 2026 il affichait encore pour
// /la-villa/ une description supprimée 26 jours plus tôt. Or son index alimente aussi Copilot
// et DuckDuckGo : une correction (un prix, une adresse) y restait fausse des semaines.
//
// Lancé par .github/workflows/indexnow.yml une fois le déploiement confirmé en production.
// À la main : `npm run indexnow -- --dry-run` montre ce qui partirait, sans rien envoyer.
//
// La clé IndexNow est le fichier public/<32 caractères hexadécimaux>.txt. Elle n'a rien d'un
// secret : le protocole exige qu'elle soit lisible à la racine du site, c'est ainsi que le
// moteur vérifie que l'envoi vient bien du propriétaire. Elle est lue dans ce fichier et
// jamais recopiée ici.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'www.leszines.fr';
const ORIGIN = `https://${HOST}`;
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const dryRun = process.argv.includes('--dry-run');

const fail = (message) => {
  console.error(`IndexNow : ${message}`);
  process.exit(1);
};

const keyFile = fs.readdirSync(PUBLIC).find((file) => /^[a-f0-9]{32}\.txt$/.test(file));
if (!keyFile) fail('aucune clé dans public/ (fichier nommé <32 caractères hexadécimaux>.txt).');
const key = fs.readFileSync(path.join(PUBLIC, keyFile), 'utf8').trim();
if (key !== keyFile.slice(0, -4)) fail(`le fichier ${keyFile} doit contenir exactement son propre nom, sans l’extension.`);

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'villa-les-zines-indexnow' } });
  if (!res.ok) throw new Error(`${url} répond ${res.status}`);
  return res.text();
};
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

try {
  // Les adresses viennent du sitemap EN LIGNE : on n'annonce que des pages réellement servies.
  // Les 18 pages partent à chaque fois. Le protocole préfère qu'on ne signale que ce qui a
  // changé, mais un changement de pied de page ou de tarif touche presque toutes les pages, et
  // le workflow ne se déclenche que sur une modification du site : quelques envois par mois.
  const sitemaps = locs(await get(`${ORIGIN}/sitemap-index.xml`));
  const urlList = [...new Set((await Promise.all(sitemaps.map(get))).flatMap(locs))].filter((url) => url.startsWith(`${ORIGIN}/`));
  if (!urlList.length) fail('le sitemap en ligne ne liste aucune page.');

  // Le moteur va relire la clé à cette adresse : si elle n'y est pas, il rejette tout l'envoi.
  if ((await get(`${ORIGIN}/${keyFile}`)).trim() !== key) fail(`la clé servie par ${ORIGIN}/${keyFile} n’est pas celle du dépôt.`);

  if (dryRun) {
    console.log(`IndexNow (essai à blanc) : ${urlList.length} adresses seraient envoyées, clé publiée à ${ORIGIN}/${keyFile}`);
    for (const url of urlList) console.log(`  ${url}`);
    process.exit(0);
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `${ORIGIN}/${keyFile}`, urlList }),
  });
  // 200 = reçu ; 202 = reçu, clé en cours de vérification (normal au tout premier envoi).
  if (res.status !== 200 && res.status !== 202) fail(`${urlList.length} adresses refusées, réponse ${res.status} ${await res.text()}`);
  console.log(`IndexNow : ${urlList.length} adresses envoyées, réponse ${res.status}.`);
} catch (error) {
  fail(error.message);
}
