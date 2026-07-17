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

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Lowercase + strip accents so "Août" / "Loué" / "disponibilité" all match plainly.
const norm = (s: unknown): string =>
  (s ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// A Google Sheets checkbox exports as TRUE/FALSE; also accept x / oui / vrai / 1 / ✓.
const truthy = (s: unknown): boolean => ['true', 'vrai', 'x', 'oui', 'yes', '1', '✓'].includes(norm(s));

function detectMonth(s: string): string | null {
  const u = norm(s);
  if (/juillet|juil/.test(u)) return 'juillet';
  if (/aout/.test(u)) return 'août';
  if (/septembre|sept/.test(u)) return 'septembre';
  if (/octobre|octo/.test(u)) return 'octobre';
  if (/juin/.test(u)) return 'juin';
  for (const m of MONTHS) if (u.includes(norm(m))) return m;
  return null;
}

type Week = { id: string; month: string; label: string; price: number; status: string; zones: string[] };

// Header-aware parser: finds columns by their name, so column order can change and
// works with BOTH the new sheet (checkboxes "Loué" / "Zone A|B|C") and the old text format.
function parseSheet(text: string): Week[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => (c || '').trim() !== ''));
  if (!rows.length) return [];

  let hi = rows.findIndex((r) => r.some((c) => /semaine|prix|week|price/i.test(c || '')));
  if (hi < 0) hi = 0;
  const header = rows[hi].map(norm);
  const exact = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const fuzzy = (...subs: string[]) => header.findIndex((h) => subs.some((s) => h.includes(s)));

  const ci = {
    mois: exact('mois', 'month'),
    semaine: fuzzy('semaine', 'week'),
    du: exact('du', 'from', 'arrivee', 'debut'),
    au: exact('au', 'to', 'depart', 'fin'),
    dates: fuzzy('dates'),
    prix: fuzzy('prix', 'price', 'tarif'),
    loue: fuzzy('loue', 'reserve', 'booked', 'occupe'),
    statut: fuzzy('statut', 'disponibilite', 'status', 'dispo'),
    zoneA: fuzzy('zone a', 'zone_a'),
    zoneB: fuzzy('zone b', 'zone_b'),
    zoneC: fuzzy('zone c', 'zone_c'),
    zones: exact('zones', 'zone', 'zones scolaires'),
  };

  const weeks: Week[] = [];
  let month = '';
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const cell = (idx: number) => (idx >= 0 ? r[idx] || '' : '');

    if (ci.mois >= 0) { const m = detectMonth(cell(ci.mois)); if (m) month = m; }
    else { const m = detectMonth(cell(0)); if (m) month = m; }

    const idm = cell(ci.semaine >= 0 ? ci.semaine : 1).match(/\bS\s?(\d{1,2})/i);
    if (!idm) continue;
    const id = 'S' + idm[1];

    let label = cell(ci.dates).trim();
    if (!label) {
      const du = cell(ci.du).trim();
      const au = cell(ci.au).trim();
      label = du && au ? `${du} → ${au}` : du || au || '';
    }

    const price = parseInt(cell(ci.prix >= 0 ? ci.prix : 3).replace(/[^\d]/g, ''), 10) || 0;

    let status: string;
    if (ci.loue >= 0) status = truthy(cell(ci.loue)) ? 'booked' : 'available';
    else if (ci.statut >= 0) {
      const d = norm(cell(ci.statut));
      status = /lou|reserv|occup/.test(d) ? 'booked' : /dispo|libre/.test(d) ? 'available' : 'booked';
    } else status = 'available';

    let zones: string[] = [];
    if (ci.zoneA >= 0 || ci.zoneB >= 0 || ci.zoneC >= 0) {
      if (truthy(cell(ci.zoneA))) zones.push('A');
      if (truthy(cell(ci.zoneB))) zones.push('B');
      if (truthy(cell(ci.zoneC))) zones.push('C');
    } else if (ci.zones >= 0) {
      zones = (cell(ci.zones).toUpperCase().match(/[ABC]/g) || []);
    } else {
      zones = [r[5], r[6], r[7]].map((z) => (z || '').trim().toUpperCase()).filter((z) => z === 'A' || z === 'B' || z === 'C');
    }

    weeks.push({ id, month, label, price, status, zones });
  }
  return weeks;
}

export const GET: APIRoute = async () => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' };
  try {
    if (!SITE.ratesSheetCsv) return new Response(JSON.stringify({ weeks: fallback.weeks, source: 'local' }), { headers });
    const res = await fetch(SITE.ratesSheetCsv, { headers: { 'User-Agent': 'villa-les-zines' } });
    if (!res.ok) throw new Error('fetch failed');
    const weeks = parseSheet(await res.text());
    if (weeks.length < 3) throw new Error('parse empty');
    // If the sheet leaves a price cell empty, keep the known price from rates.json for that week.
    const byId = new Map(fallback.weeks.map((f) => [f.id, f.price]));
    for (const w of weeks) if (!w.price) { const p = byId.get(w.id); if (p) w.price = p; }
    return new Response(JSON.stringify({ weeks, source: 'sheet' }), { headers });
  } catch {
    return new Response(JSON.stringify({ weeks: fallback.weeks, source: 'local' }), { headers });
  }
};
