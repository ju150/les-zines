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

function detectMonth(s: string): string | null {
  const u = (s || '').toLowerCase();
  if (/juillet/.test(u)) return 'juillet';
  if (/ao[uû]t/.test(u)) return 'août';
  if (/septembre/.test(u)) return 'septembre';
  if (/octobre/.test(u)) return 'octobre';
  if (/juin/.test(u)) return 'juin';
  for (const m of MONTHS) if (u.includes(m)) return m;
  return null;
}

function parseSheet(text: string) {
  const rows = parseCsv(text);
  const weeks: { id: string; month: string; label: string; price: number; status: string; zones: string[]; year?: number }[] = [];
  let month = '';
  let year: number | undefined;
  // Guard against a restructured sheet (columns moved): count rows whose price or
  // availability cell doesn't look right, and give up (→ local fallback) past a threshold.
  let suspicious = 0;
  for (const r of rows) {
    const detected = detectMonth(r[0] || '');
    if (detected) month = detected;
    // Les en-têtes de mois portent l'année de la saison (« MOIS JUILLET   2026 »).
    const ym = (r[0] || '').match(/\b(20\d{2})\b/);
    if (ym) year = Number(ym[1]);
    const idm = (r[1] || '').match(/\bS\s?(\d{1,2})/i);
    if (!idm) continue;
    const id = 'S' + idm[1];
    const dm = (r[2] || '').match(/du samedi\s*(\d{1,2}).*?au samedi\s*(\d{1,2})/i);
    const label = dm ? `sam. ${dm[1]} → sam. ${dm[2]}` : (r[2] || '').trim();
    let price = parseInt((r[3] || '').replace(/[^\d]/g, ''), 10) || 0;
    if (price > 0 && price < 100) { price = 0; suspicious++; } // "18" parsed out of a date ≠ a weekly rate
    const disp = (r[4] || '').toLowerCase();
    // Check "loué" first: the header word "disponibilité" contains "dispo" and would false-positive.
    const known = /lou[eé]/.test(disp) || /disponible/.test(disp);
    if (!known) suspicious++;
    const status = /lou[eé]/.test(disp) ? 'booked' : /disponible/.test(disp) ? 'available' : 'booked';
    const zones = [r[5], r[6], r[7]]
      .map((z) => (z || '').trim().toUpperCase())
      .filter((z) => z === 'A' || z === 'B' || z === 'C');
    weeks.push({ id, month, label, price, status, zones, year });
  }
  if (weeks.length && suspicious > weeks.length / 2) throw new Error('sheet layout changed');
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
