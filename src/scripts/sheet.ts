// Lecture de la feuille Google (CSV) → semaines exploitables par le tableau de disponibilités.
//
// Le format côté oncle est volontairement minimal (cf. google-sheet/GUIDE-ONCLE.md) :
//   Arrivée | Départ | Prix | Disponibilité | Zones | Afficher     (colonnes en trop ignorées)
//
// Ce module est isolé de la route /api/rates pour pouvoir être relu et testé seul :
// c'est lui qui décide qu'une semaine est louée, indisponible, sans zone ou masquée.

import type { Week } from './availability';

export type ParsedWeek = Week & { show: boolean };

/** Mini-parseur CSV (gère les champs entre guillemets et les guillemets doublés). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c === '\r') { /* skip */ }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const MONTHS_FR: Record<string, number> = {
  janvier: 0, janv: 0, février: 1, fevrier: 1, févr: 1, fevr: 1, mars: 2, avril: 3, avr: 3,
  mai: 4, juin: 5, juillet: 6, juil: 6, août: 7, aout: 7, septembre: 8, sept: 8,
  octobre: 9, oct: 9, novembre: 10, nov: 10, décembre: 11, decembre: 11, déc: 11, dec: 11,
};

const iso = (y: number, m0: number, d: number) =>
  `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Lit une date de cellule, quel que soit le format renvoyé par Google Sheets :
//   - « Date(2026,6,4) »  (cellule typée date via gviz ; mois indexé à 0)
//   - « 2026-07-04 » / « 04/07/2026 » / « 4-7-26 »
//   - « 4 juillet 2026 »
// Renvoie une date ISO 'YYYY-MM-DD' (minuit local) ou null.
export function parseCellDate(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  let m = /Date\((\d+),(\d+),(\d+)\)/.exec(s);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return iso(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s);
  if (m) { const y = Number(m[3]); return iso(y < 100 ? y + 2000 : y, Number(m[2]) - 1, Number(m[1])); }
  m = /(\d{1,2})\s+([a-zà-ÿ]+)\.?\s+(\d{4})/i.exec(s);
  if (m) { const mi = MONTHS_FR[m[2].toLowerCase()]; if (mi !== undefined) return iso(Number(m[3]), mi, Number(m[1])); }
  return null;
}

// ——— Colonne D : Disponibilité ———
// Trois états. « indisponible » DOIT être testé en premier : le mot contient « dispo », il ne
// doit surtout pas retomber sur le repli « disponible ».
const UNAVAILABLE = /indispo|non\s*dispo|pas\s*dispo|ferm|bloqu|blocked|travaux|unavailable|not\s*available/i;
const BOOKED = /lou|réserv|reserv|complet|occup|booked|taken|sold/i;

export function parseStatus(cell: string): Week['status'] {
  const s = (cell || '').trim();
  if (UNAVAILABLE.test(s)) return 'unavailable';
  if (BOOKED.test(s)) return 'booked';
  return 'available'; // une ligne listée est une semaine proposée, sauf mention contraire
}

// ——— Colonnes E (Zones) et F (Afficher) ———
// Elles sont reconnues à leur CONTENU, pas à leur position — mais une même cellule ne peut
// servir qu'à UNE chose. C'était le piège : un « non » écrit dans la colonne Zones (pour dire
// « aucune zone ») était lu comme « Afficher = non » et faisait disparaître la semaine du site.

/** « Aucune zone » : semaine hors vacances scolaires, ne rien déduire. */
const ZONE_NONE = /^(?:[-–—/.]+|non|none|no|aucun|aucune|sans|hors|hors\s+vacances|n\/?a|néant|neant)$/i;
/** Valeur de case à cocher : jamais une zone. */
const BOOLEANISH = /^(?:true|vrai|false|faux|oui|1|0|x|✓)$/i;
/** Case « Afficher » décochée. La cellule ENTIÈRE doit valoir ça (pas un simple fragment). */
const HIDDEN = /^(?:false|faux|non|no|off|0|décoché|décochée|decoche|decochee|masqué|masquée|masque|masquee|caché|cachée|cache|cachee|hidden)$/i;

/**
 * Analyse les colonnes situées après « Disponibilité ».
 * @returns `zones` : `undefined` = à déduire des vacances, `[]` = aucune (choix explicite).
 *          `show`  : false si la case « Afficher » est décochée.
 */
export function parseExtras(cells: string[]): { zones?: string[]; show: boolean } {
  let zones: string[] | undefined;
  let zoneIdx = -1;
  for (let i = 0; i < cells.length; i++) {
    const s = (cells[i] || '').trim();
    if (!s || BOOLEANISH.test(s)) continue;
    if (/toutes|all/i.test(s)) { zones = ['A', 'B', 'C']; zoneIdx = i; break; }
    // Lettres isolées : le « A » de FALSE n'est pas pris (pas de frontière de mot autour).
    const found = s.toUpperCase().match(/\b[ABC]\b/g);
    if (found && found.length) { zones = [...new Set(found)]; zoneIdx = i; break; }
    // « aucune zone » : accepté dans la 1re colonne après Disponibilité (= la colonne Zones)
    // et seulement si une colonne Afficher suit — sinon « non » garde son sens « masquer ».
    if (i === 0 && cells.length > 1 && ZONE_NONE.test(s)) { zones = []; zoneIdx = i; break; }
  }
  const show = !cells.some((c, i) => i !== zoneIdx && HIDDEN.test((c || '').trim()));
  return { zones, show };
}

/**
 * CSV complet → semaines. Une ligne est retenue dès que ses deux premières cellules sont
 * des dates lisibles : en-tête, lignes vides et notes libres sont donc ignorés d'office.
 */
export function parseSheet(text: string): ParsedWeek[] {
  const weeks: ParsedWeek[] = [];
  for (const r of parseCsv(text)) {
    const start = parseCellDate(r[0] || '');
    const end = parseCellDate(r[1] || '');
    if (!start || !end) continue;
    const price = parseInt((r[2] || '').replace(/[^\d]/g, ''), 10) || 0;
    const status = parseStatus(r[3] || '');
    const { zones, show } = parseExtras(r.slice(4));
    weeks.push({ start, end, price, status, zones, show });
  }
  return weeks;
}
