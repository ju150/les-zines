// Compare le fichier de secours des tarifs (src/data/rates.json) à la feuille du propriétaire,
// lue par l'adresse publique /api/rates, et le recopie sur demande.
//
//   npm run tarifs:ecart   liste les écarts ; code de sortie 1 s'il y en a un qui compte
//   npm run tarifs:sync    réécrit rates.json d'après la feuille (relire le diff, puis pousser)
//
// Pourquoi : le propriétaire tient ses prix dans une feuille Google, et le tableau du site la
// suit tout seul dans le navigateur. Mais les robots (Google, Bing, assistants IA) n'exécutent
// pas le JavaScript : ils lisent ce qui a été rendu au build à partir de rates.json — le
// tableau statique, le titre « Tarifs 2027 », la fourchette des données structurées, llms.txt.
// En novembre 2026, ce fichier avait trois mois de retard : un prix faux, deux statuts faux,
// une semaine manquante, et « 9 500 € » annoncé aux moteurs là où le site affichait 9 900 €.
// Rien ne le signalait. Le workflow .github/workflows/tarifs.yml lance ce contrôle chaque matin.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/data/rates.json', import.meta.url));
const FEED = 'https://www.leszines.fr/api/rates';
const write = process.argv.includes('--write');
const today = new Date().toISOString().slice(0, 10);

const fail = (message) => {
  console.error(`Tarifs : ${message}`);
  process.exit(1);
};

let feed;
try {
  // Paramètre unique : ne jamais relire une réponse en cache.
  const res = await fetch(`${FEED}?tarifs=${Date.now()}`, { headers: { 'User-Agent': 'villa-les-zines-tarifs' } });
  if (!res.ok) throw new Error(`réponse ${res.status}`);
  feed = await res.json();
} catch (error) {
  fail(`${FEED} est injoignable (${error.message}).`);
}

// Feuille injoignable : le site sert alors rates.json lui-même. Le comparer à lui-même ne
// prouverait rien, et l'écrire reviendrait à ne rien faire. La surveillance horaire alerte déjà.
if (feed.source !== 'sheet' || !Array.isArray(feed.weeks) || !feed.weeks.length) {
  if (write) fail('le site sert en ce moment ses tarifs de secours (feuille injoignable) : rien à recopier.');
  console.log('Tarifs : le site sert en ce moment ses tarifs de secours (feuille injoignable) : rien à comparer.');
  process.exit(0);
}

// Ce qu'on garde d'une semaine. Tout vient d'une feuille remplie à la main : on refuse
// d'écrire dans le dépôt une ligne qui n'a pas la forme attendue.
const STATUSES = ['available', 'booked', 'unavailable'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const live = feed.weeks
  .filter((w) => w.show !== false)
  .map(({ start, end, price, status, zones }) => ({ start, end, price, status, ...(Array.isArray(zones) ? { zones } : {}) }));
for (const w of live) {
  const zonesOk = !w.zones || w.zones.every((z) => /^[ABC]$/.test(z));
  if (!ISO.test(w.start) || !ISO.test(w.end) || !Number.isFinite(w.price) || w.price < 0 || !STATUSES.includes(w.status) || !zonesOk) {
    fail(`semaine inattendue dans la feuille, rien n’est modifié : ${JSON.stringify(w)}`);
  }
}

const local = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const byStart = (weeks) => new Map(weeks.map((w) => [w.start, w]));
const mine = byStart(local.weeks);
const theirs = byStart(live);

// « Qui compte » = ce qu'un moteur annoncerait de faux : un prix, des dates, une semaine en
// trop ou en moins, le statut d'une semaine passée (l'archive sert d'argument pour la vente).
// Le statut d'une semaine à venir change à chaque réservation : le signaler chaque matin
// reviendrait à exiger un déploiement par réservation. Il est listé pour information.
const blocking = [];
const info = [];
for (const start of [...new Set([...mine.keys(), ...theirs.keys()])].sort()) {
  const a = mine.get(start);
  const b = theirs.get(start);
  if (!a) {
    blocking.push(`semaine du ${start} : dans la feuille, absente de rates.json`);
  } else if (!b) {
    (a.end <= today ? info : blocking).push(`semaine du ${start} : dans rates.json, absente de la feuille`);
  } else {
    if (a.end !== b.end) blocking.push(`semaine du ${start} : départ le ${a.end} dans rates.json, le ${b.end} dans la feuille`);
    if (a.price !== b.price) blocking.push(`semaine du ${start} : ${a.price} € dans rates.json, ${b.price} € dans la feuille`);
    if (a.status !== b.status) (b.end <= today ? blocking : info).push(`semaine du ${start} : « ${a.status} » dans rates.json, « ${b.status} » dans la feuille`);
    if (JSON.stringify(a.zones ?? null) !== JSON.stringify(b.zones ?? null)) info.push(`semaine du ${start} : zones scolaires différentes`);
  }
}

const report = (title, lines) => {
  if (lines.length) console.log(`\n${title} (${lines.length}) :\n  ${lines.join('\n  ')}`);
};
report('Écarts à corriger', blocking);
report('Pour information (statuts de semaines à venir, zones, archive)', info);

if (write) {
  const zones = (list) => JSON.stringify(list).replaceAll(',', ', ');
  const line = (w) =>
    `    { "start": "${w.start}", "end": "${w.end}", "price": ${w.price}, "status": "${w.status}"${w.zones ? `, "zones": ${zones(w.zones)}` : ''} }`;
  const head = { season: local.season, source: 'local', _note: local._note, _synced: today };
  const text = `${JSON.stringify(head, null, 2).slice(0, -2)},\n  "weeks": [\n${live.map(line).join(',\n')}\n  ]\n}\n`;
  JSON.parse(text); // garde-fou : ne jamais écrire un fichier illisible
  fs.writeFileSync(FILE, text);
  console.log(`\nTarifs : rates.json recopié depuis la feuille (${live.length} semaines). Relire le diff, lancer « npm run verify », puis pousser.`);
  process.exit(0);
}

if (blocking.length) {
  console.error('\nTarifs : rates.json n’est plus à jour. Les moteurs lisent ce fichier, pas la feuille : lancer « npm run tarifs:sync », relire, puis pousser.');
  process.exit(1);
}
console.log(`\nTarifs : rates.json est à jour (${live.length} semaines, ${info.length} différence(s) sans conséquence).`);
