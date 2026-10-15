import type { APIRoute } from 'astro';
import fallback from '../../data/rates.json';
import { readEnv } from '../../lib/env';
import { loadRates } from '../../lib/rates/load';
import type { Week } from '../../lib/rates/availability';

export const prerender = false;

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120',
  // Cache partagé côté CDN : absorbe les rafales au lieu de solliciter Google à chaque
  // visite. Côté Cloudflare, mettre en cache une route /api/ à l'edge demande en plus une
  // Cache Rule dans le tableau de bord ; sans elle, seul le cache navigateur joue.
  'CDN-Cache-Control': 'public, max-age=120, stale-while-revalidate=600',
};

export const GET: APIRoute = async () => {
  const rates = await loadRates({
    // L'adresse de la feuille est un secret : la feuille est lisible par quiconque a le lien.
    sheetUrl: readEnv('RATES_SHEET_CSV_URL'),
    fallback: fallback.weeks as Week[],
  });
  return new Response(JSON.stringify(rates), { headers: HEADERS });
};
