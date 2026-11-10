// /llms.txt, généré au build (page statique) : voir src/lib/llms.ts pour le pourquoi.
// Le jeu de caractères annoncé ici ne survit pas au pré-rendu ; c'est public/_headers qui le
// fixe pour le fichier servi par Cloudflare.
import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { currentSeason } from '../data/season';
import { buildLlmsTxt } from '../lib/llms';

export const GET: APIRoute = () =>
  new Response(buildLlmsTxt(SITE, currentSeason()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
