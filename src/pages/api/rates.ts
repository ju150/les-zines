import type { APIRoute } from 'astro';
import fallback from '../../data/rates.json';
import { SITE } from '../../data/site';
import { parseSheet } from '../../scripts/sheet';

export const prerender = false;

export const GET: APIRoute = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120',
    // Cache partagé côté CDN : absorbe les rafales au lieu de matraquer Google.
    // En-tête standard, compris par Cloudflare (et par Netlify si on y revenait).
    // Côté Cloudflare, mettre en cache une route /api/ à l'edge demande en plus une
    // Cache Rule dans le tableau de bord ; sans elle, seul le cache navigateur joue.
    'CDN-Cache-Control': 'public, max-age=120, stale-while-revalidate=600',
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
