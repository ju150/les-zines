// Source des tarifs : la feuille Google du propriétaire, avec rates.json en repli.
//
// Le repli n'est pas une option de confort : si la feuille est injoignable, vide, illisible
// ou si son adresse n'est pas configurée, le site doit continuer d'afficher des tarifs. La
// réponse dit d'où ils viennent (`source`), ce que la surveillance horaire contrôle.
import { parseSheet } from './sheet';
import type { Week } from './availability';

export type RatesSource = 'sheet' | 'local';
export type Rates = { weeks: Week[]; source: RatesSource };

export type LoadRatesOptions = {
  /** URL d'export CSV de la feuille (secret RATES_SHEET_CSV_URL). */
  sheetUrl?: string;
  /** Semaines de secours (src/data/rates.json). */
  fallback: Week[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export async function loadRates({ sheetUrl, fallback, fetchImpl = fetch, timeoutMs = 5000 }: LoadRatesOptions): Promise<Rates> {
  const local: Rates = { weeks: fallback, source: 'local' };
  if (!sheetUrl) return local;
  try {
    const res = await fetchImpl(sheetUrl, {
      headers: { 'User-Agent': 'villa-les-zines' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return local;
    // Toutes les lignes valides comptent pour la garde « feuille vide », mais les semaines
    // masquées à la main (case « Afficher » décochée) ne sont pas exposées.
    const parsed = parseSheet(await res.text());
    if (parsed.length < 1) return local;
    const weeks = parsed.filter((w) => w.show);
    // Cellule Prix vide : on reprend, par sécurité, le prix connu pour la même arrivée.
    const knownPrice = new Map(fallback.map((w) => [w.start, w.price]));
    for (const w of weeks) {
      if (!w.price) {
        const price = knownPrice.get(w.start);
        if (price) w.price = price;
      }
    }
    return { weeks, source: 'sheet' };
  } catch {
    return local;
  }
}
