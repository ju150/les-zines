// Texte de /llms.txt : la fiche de la villa pour les assistants IA, sans mise en page à décoder.
//
// Le fichier était écrit à la main dans public/. Il a fini par annoncer un mauvais code postal
// (33950), les prix d'une saison terminée et des temps de marche irréalistes (« océan à 5 min
// à pied » pour une plage à plus d'un kilomètre). Il est désormais GÉNÉRÉ au build, à partir
// des mêmes données que les pages : l'adresse vient de site.ts, les prix du tableau des tarifs.
// Une fiche fausse est pire que pas de fiche : un assistant la répète telle quelle.
//
// Format : la proposition llmstxt.org — un titre, un résumé en citation, le détail en texte
// libre, puis des sections « ## » qui ne contiennent que des listes de liens.
import type { Week } from './rates/availability';
import { formatEuros, formatPriceRange, seasonLabel, type RateSummary } from './rates/summary';

export type LlmsSite = {
  name: string;
  street: string;
  postcode: string;
  city: string;
  email: string;
  phoneIntlDisplay: string;
  mapsLink: string;
};

const BASE = 'https://www.leszines.fr';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** '2027-06-26' → « 26 juin 2027 » (« 1er » pour le premier du mois). */
function frDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day === 1 ? '1er' : day} ${MONTHS[month - 1]} ${year}`;
}

// Espace ordinaire dans les montants : un texte lu par des machines doit rester cherchable.
const eur = (amount: number) => formatEuros(amount, 'fr', ' ');

function rateLines(season: RateSummary | null): { fr: string[]; en: string } {
  if (!season) return { fr: ['- Tarifs : sur demande'], en: '' };
  const year = seasonLabel(season);
  const week = (w: Week) => `  - du ${frDate(w.start)} au ${frDate(w.end)} : ${eur(w.price)}`;
  // « EUR 5,000 to 9,900 » : le code de la devise une seule fois, sans le symbole.
  const enSpan = formatPriceRange(season, 'en').replaceAll('€', '');
  return {
    // Toutes les semaines de la saison, départs passés compris : c'est le barème de l'année,
    // pas un état des disponibilités (qui change sans nouveau build).
    fr: [`- Tarifs ${year}, par semaine : ${formatPriceRange(season, 'fr', ' ')} selon la période`, ...season.weeks.map(week)],
    en: ` (EUR ${enSpan} per week in ${year})`,
  };
}

export function buildLlmsTxt(site: LlmsSite, season: RateSummary | null): string {
  const rates = rateLines(season);
  const address = `${site.street}, ${site.postcode} ${site.city}, France`;
  const lines = [
    `# ${site.name}`,
    '',
    "> Grande villa en bois « esprit Bassin » au Cap Ferret (commune de Lège-Cap-Ferret, Bassin d'Arcachon, Gironde, France) : 6 chambres climatisées + dortoir, 12 à 16 personnes, jardin clos de 700 m², à 400 m de la jetée Bélisaire. Louée à la semaine en été, courts séjours possibles hors saison. Également à vendre, prix sur demande.",
    '',
    `Site officiel de la villa, en français (${BASE}/) et en anglais (${BASE}/en/). Pour les prix et les disponibilités, la page Séjours & Tarifs fait foi.`,
    '',
    `English summary: Villa Les Zines is a large timber holiday villa in Cap Ferret (Lège-Cap-Ferret, Arcachon Bay, south-west France): 6 air-conditioned bedrooms plus a 4-bed dorm, sleeps 12 to 16, 4 bathrooms, walled 700 m² garden, 400 m from the Bélisaire jetty. Weekly rental in summer${rates.en}, short stays possible off-season. The villa is also for sale (private sale, price on request).`,
    '',
    'Location de vacances :',
    '',
    `- Adresse : ${address} (latitude 44.65698, longitude -1.24414)`,
    '- Capacité : 12 à 16 personnes, dans 6 chambres climatisées avec lit double 160×200 et un grenier-dortoir de 4 couchages 80×200',
    "- Salles d'eau : 4, plus une douche et un WC extérieurs",
    '- Pièce de vie de 60 m² avec cuisine équipée, ouverte sur la terrasse',
    '- Jardin clos et arboré de 700 m² : pins, arbres fruitiers, terrasses en caillebotis plein sud, barbecue, 3 tables de jardin, 16 fauteuils, transats, 2 hamacs, parasols',
    "- Accessibilité : une chambre et une salle d'eau de plain-pied, accessibles aux personnes à mobilité réduite",
    '- Équipements : climatisation dans toute la maison, wifi fibre, lave-linge',
    "- Situation : jetée Bélisaire à 400 m (navettes pour Arcachon, petit train vers l'océan) ; marché, village, plage des Américains (côté Bassin), plage océane de l'Horizon et phare accessibles à pied ou à vélo ; villages ostréicoles de L'Herbe et du Canon à vélo",
    '- Location à la semaine, du samedi au samedi, en juillet et août ; courts séjours possibles hors saison, sur demande',
    ...rates.fr,
    '- Inclus : ménage de fin de séjour, linge de maison (draps, serviettes, torchons), taxe de séjour, forfait eau, gaz et électricité (usage limité), wifi, lave-linge',
    '- Réservation : demande en ligne sur la page Réservation ; les propriétaires répondent personnellement, en général sous 24 heures',
    '- Langues : français, anglais',
    `- Contact : ${site.email}, ${site.phoneIntlDisplay}`,
    `- Fiche Google Maps de la villa, avec les avis des locataires : ${site.mapsLink}`,
    '',
    'Vente :',
    '',
    "- La villa est à vendre de gré à gré, prix sur demande ; elle continue d'être louée pendant la vente",
    "- 8 pièces, 6 chambres + dortoir, 4 salles d'eau, terrain clos de 700 m²",
    '- Diagnostic de performance énergétique : classe C ; émissions de gaz à effet de serre : classe B',
    '- Visites sur rendez-vous, via la page Contact (objet « Visite / vente »)',
    '',
    '## Pages en français',
    '',
    `- [Accueil](${BASE}/): présentation de la villa et semaines disponibles`,
    `- [La Villa](${BASE}/la-villa/): chambres, pièce de vie, équipements, plan, photos`,
    `- [Le Jardin](${BASE}/le-jardin/): jardin de 700 m², terrasses, équipements extérieurs`,
    `- [Le Cap Ferret](${BASE}/le-cap-ferret/): situation, plages, marché, jetée Bélisaire`,
    `- [Séjours & Tarifs](${BASE}/sejours-tarifs/): prix par semaine, disponibilités, ce qui est inclus, questions fréquentes`,
    `- [Réservation](${BASE}/reservation/): demande de réservation en ligne`,
    `- [À vendre](${BASE}/a-vendre/): la villa en vente, fiche du bien, demande de visite`,
    `- [Contact](${BASE}/contact/): téléphone, e-mail, adresse, formulaire`,
    '',
    '## English pages',
    '',
    `- [Home](${BASE}/en/): overview and available weeks`,
    `- [The Villa](${BASE}/en/la-villa/): bedrooms, living space, amenities, floor plan`,
    `- [The Garden](${BASE}/en/le-jardin/): 700 m² garden and terraces`,
    `- [Cap Ferret](${BASE}/en/le-cap-ferret/): location, beaches, market, jetty`,
    `- [Stays & Rates](${BASE}/en/sejours-tarifs/): weekly prices, availability, what is included, frequently asked questions`,
    `- [Booking](${BASE}/en/reservation/): online booking request`,
    `- [For sale](${BASE}/en/a-vendre/): the villa is for sale, fact sheet, viewing request`,
    `- [Contact](${BASE}/en/contact/): phone, email, address, form`,
    '',
    '## Optional',
    '',
    `- [Mentions légales](${BASE}/mentions-legales/): éditeur du site, hébergement, crédits photos`,
  ];
  return lines.join('\n') + '\n';
}
