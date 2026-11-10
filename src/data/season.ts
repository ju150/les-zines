// La saison en cours de commercialisation, telle que la résume le tableau des tarifs :
// son année et sa fourchette de prix, pour tout ce qui en parle hors du tableau (titre et
// description de la page des tarifs, questions fréquentes, données structurées, llms.txt).
//
// Ce sont des FONCTIONS, pas des constantes, et ce n'est pas un détail : le site est
// pré-rendu dans le runtime Workers, où l'horloge n'avance pas pendant le chargement des
// modules (`new Date()` y renvoie le 1er janvier 1970). Une constante calculée à l'import
// prendrait toutes les semaines pour des semaines à venir et annoncerait « 2026-2027 » à
// vie. Appelées pendant le rendu d'une page, ces fonctions lisent la vraie date du build.
//
// Limite à connaître : tout ceci est figé au build, à partir de rates.json. Si le
// propriétaire change un prix dans sa feuille, le tableau suit en deux minutes mais ces
// valeurs attendent une resynchronisation (`npm run tarifs:sync`) et un déploiement. Le
// workflow .github/workflows/tarifs.yml prévient quand les deux divergent.
import rates from './rates.json';
import type { Lang } from '../i18n/ui';
import type { Week } from '../lib/rates/availability';
import { formatPriceRange, rateSummary, seasonLabel, seasonSentence as sentence, type RateSummary } from '../lib/rates/summary';

export const currentSeason = (): RateSummary | null => rateSummary(rates.weeks as Week[]);

/** « 2027 » (ou « 2026-2027 » à cheval sur deux saisons) ; '' si aucun tarif n'est connu. */
export function seasonYear(): string {
  const season = currentSeason();
  return season ? seasonLabel(season) : '';
}

/**
 * « de 5 000 € à 9 900 € » / « €5,000 to €9,900 » ; '' si aucun tarif n'est connu.
 * `space` : voir formatEuros (insécable par défaut ; espace ordinaire pour un titre de page
 * ou une description, que les moteurs affichent tels quels).
 */
export function seasonPrices(lang: Lang, space?: string): string {
  const season = currentSeason();
  return season ? formatPriceRange(season, lang, space) : '';
}

/** « Saison 2027 : de 5 000 € à 9 900 € la semaine selon la période » ; '' si aucun tarif. */
export function seasonSentence(lang: Lang): string {
  const season = currentSeason();
  return season ? sentence(season, lang) : '';
}
