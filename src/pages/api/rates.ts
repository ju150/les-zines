import type { APIRoute } from 'astro';
import fallback from '../../data/rates.json';
import { SITE } from '../../data/site';

export const prerender = false;

// Minimal CSV parser (handles quoted fields).
function parseCsv(text: string): string[][] {
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

// Lit une date de cellule, quel que soit le format renvoyé par Google Sheets :
//   - « Date(2026,6,4) »  (cellule typée date via gviz ; mois indexé à 0)
//   - « 2026-07-04 » / « 04/07/2026 » / « 4-7-26 »
//   - « 4 juillet 2026 »
// Renvoie une date ISO 'YYYY-MM-DD' (minuit local) ou null.
function parseCellDate(raw: string): string | null {
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
const iso = (y: number, m0: number, d: number) =>
  `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

type ParsedWeek = { start: string; end: string; price: number; status: string; zones?: string[]; show: boolean };

// Zones scolaires saisies à la main : lettres A/B/C (ou « toutes »/« all ») dans une
// colonne au-delà de la disponibilité. Absent → déduites automatiquement côté affichage.
// Note : le mot « FALSE » de la case Afficher n'est pas confondu (le A n'y est pas isolé).
function parseZones(cells: string[]): string[] | undefined {
  for (const c of cells) {
    const s = (c || '').trim();
    if (!s) continue;
    if (/toutes|all/i.test(s)) return ['A', 'B', 'C'];
    const found = s.toUpperCase().match(/\b[ABC]\b/g);
    if (found && found.length) return [...new Set(found)];
  }
  return undefined;
}

// Format attendu de la feuille (une ligne par semaine, en-tête libre ignoré) :
//   Arrivée | Départ | Prix | Disponibilité | Zones | Afficher      (colonnes en trop ignorées)
// Une ligne est retenue dès que ses deux premières cellules sont des dates lisibles.
// Zones + Afficher sont détectées par leur CONTENU (ordre des colonnes indifférent).
function parseSheet(text: string): ParsedWeek[] {
  const rows = parseCsv(text);
  const weeks: ParsedWeek[] = [];
  for (const r of rows) {
    const start = parseCellDate(r[0] || '');
    const end = parseCellDate(r[1] || '');
    if (!start || !end) continue; // en-tête, ligne vide ou note → ignorée
    const price = parseInt((r[2] || '').replace(/[^\d]/g, ''), 10) || 0;
    const disp = (r[3] || '').toLowerCase();
    // « loué / réservé / complet » → booked ; sinon disponible (une ligne listée est
    // une semaine proposée, sauf mention contraire).
    const status = /lou|réserv|reserv|complet|indispo|booked|taken/.test(disp) ? 'booked' : 'available';
    const extra = r.slice(4);
    const zones = parseZones(extra);
    // Case « afficher » décochée (FALSE / non / masqué) dans une colonne au-delà de la dispo.
    const show = !extra.some((c) => /^\s*(false|faux|non|off|décoch|decoch|masqu|cach|hidden)/i.test(c || ''));
    weeks.push({ start, end, price, status, zones, show });
  }
  return weeks;
}

export const GET: APIRoute = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120',
    // Durable shared cache on Netlify's CDN: absorbs bursts instead of hammering Google.
    'Netlify-CDN-Cache-Control': 'public, max-age=120, stale-while-revalidate=600, durable',
  };
  try {
    if (!SITE.ratesSheetCsv) return new Response(JSON.stringify({ weeks: fallback.weeks, source: 'local' }), { headers });
    const res = await fetch(SITE.ratesSheetCsv, {
      headers: { 'User-Agent': 'villa-les-zines' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('fetch failed');
    // On retient toutes les lignes valides pour la garde « feuille vide », mais on
    // n'expose pas les semaines masquées manuellement (case décochée).
    const parsed = parseSheet(await res.text());
    if (parsed.length < 1) throw new Error('parse empty');
    const weeks = parsed.filter((w) => w.show);
    // Si une cellule Prix est vide, on récupère le prix connu de rates.json pour la même
    // date d'arrivée (par sécurité).
    const byStart = new Map(fallback.weeks.map((f) => [f.start, f.price]));
    for (const w of weeks) if (!w.price) { const p = byStart.get(w.start); if (p) w.price = p; }
    return new Response(JSON.stringify({ weeks, source: 'sheet' }), { headers });
  } catch {
    return new Response(JSON.stringify({ weeks: fallback.weeks, source: 'local' }), { headers });
  }
};
