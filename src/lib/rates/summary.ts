// Résumé chiffré de la saison en cours de commercialisation : fourchette de prix et années.
//
// Pourquoi ce fichier : jusqu'en novembre 2026, la fourchette était recopiée à la main dans
// les données structurées, dans llms.txt et dans la description de la page des tarifs. Elle
// annonçait encore « 5 000 à 9 500 € (saison 2026) » alors que le tableau ne proposait plus
// que 2027, jusqu'à 9 900 € : un assistant interrogé sur le prix citait le mauvais plafond et
// la mauvaise année. Tout ce qui cite un prix en dehors du tableau passe désormais par ici,
// donc par les mêmes semaines que le tableau.
//
// Fonctions pures, sans dépendance au serveur : elles tournent aussi dans le navigateur, où
// la page des tarifs s'en sert pour réécrire sa phrase de synthèse à partir de la feuille.
import { scopedWeeks, type Week } from './availability';

export type RateSummary = {
  /** Prix le plus bas, en euros par semaine. */
  min: number;
  /** Prix le plus haut, en euros par semaine. */
  max: number;
  /** Années d'arrivée couvertes, croissantes : [2027], ou [2026, 2027] à cheval sur deux saisons. */
  years: number[];
  /** Les semaines résumées, dans l'ordre reçu. */
  weeks: Week[];
};

const arrivalYear = (w: Week) => Number(w.start.slice(0, 4));

/**
 * Fourchette de prix de la saison en cours de commercialisation.
 *
 * « La saison », ce sont TOUTES les semaines des années qui ont encore au moins une semaine
 * à venir — y compris celles dont le départ est déjà passé, et quel que soit leur statut.
 * Ne résumer que les semaines restantes faisait fondre la fourchette en fin d'été : un build
 * fait le 2 septembre annonçait « Saison 2027 : 5 000 € la semaine », la haute saison à
 * 9 900 € étant derrière nous, et cette valeur restait en ligne tout l'automne.
 *
 * Entre deux saisons (dernier départ passé, feuille pas encore remplie pour l'été suivant),
 * il n'y a plus de semaine à venir : on résume la dernière saison connue plutôt que de
 * laisser les moteurs sans aucun prix. `null` seulement si aucune semaine n'a de prix.
 */
export function rateSummary(weeks: Week[]): RateSummary | null {
  const known = weeks.filter((w) => w.show !== false && w.price > 0 && Number.isFinite(arrivalYear(w)));
  if (!known.length) return null;
  const upcomingYears = new Set(scopedWeeks(known, 'current').map(arrivalYear));
  const seasonYears = upcomingYears.size ? upcomingYears : new Set([Math.max(...known.map(arrivalYear))]);
  const season = known.filter((w) => seasonYears.has(arrivalYear(w)));
  const prices = season.map((w) => w.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    years: [...seasonYears].sort((a, b) => a - b),
    weeks: season,
  };
}

/** « 2027 », ou « 2026-2027 » quand le tableau est à cheval sur deux saisons. */
export const seasonLabel = (s: RateSummary) =>
  s.years.length > 1 ? `${s.years[0]}-${s.years[s.years.length - 1]}` : String(s.years[0]);

/**
 * Montant en euros, écrit comme dans chaque langue : « 9 900 € » / « €9,900 ».
 *
 * `space` sépare les milliers et précède le symbole en français. Espace insécable par défaut,
 * pour qu'un prix ne soit jamais coupé en fin de ligne dans une page ; passer une espace
 * ordinaire pour un texte lu par des machines (llms.txt), où « 9 900 » doit rester cherchable.
 */
export function formatEuros(amount: number, lang: string, space = ' '): string {
  const digits = String(Math.round(amount));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? space : ',');
  return lang === 'fr' ? `${grouped}${space}€` : `€${grouped}`;
}

/** « 5 000 € – 9 900 € » / « €5,000 – €9,900 » ; un seul montant si tous les prix sont égaux. */
export function formatPriceSpan(s: RateSummary, lang: string, space = ' '): string {
  const lo = formatEuros(s.min, lang, space);
  return s.min === s.max ? lo : `${lo} – ${formatEuros(s.max, lang, space)}`;
}

/** « de 5 000 € à 9 900 € » / « €5,000 to €9,900 » ; un seul montant si tous les prix sont égaux. */
export function formatPriceRange(s: RateSummary, lang: string, space = ' '): string {
  const lo = formatEuros(s.min, lang, space);
  if (s.min === s.max) return lo;
  const hi = formatEuros(s.max, lang, space);
  return lang === 'fr' ? `de ${lo} à ${hi}` : `${lo} to ${hi}`;
}

/**
 * La phrase de synthèse affichée au-dessus du tableau et dans les questions fréquentes :
 * « Saison 2027 : de 5 000 € à 9 900 € la semaine selon la période » (sans point final).
 * Rendue au build, puis réécrite dans le navigateur avec les semaines de la feuille : sans
 * cela, elle contredirait le tableau le jour où le propriétaire change un prix.
 */
export function seasonSentence(s: RateSummary, lang: string): string {
  return lang === 'fr'
    ? `Saison ${seasonLabel(s)} : ${formatPriceRange(s, 'fr')} la semaine selon la période`
    : `${seasonLabel(s)} season: ${formatPriceRange(s, 'en')} per week depending on the period`;
}
