// /version.txt : le commit actuellement en production (« local » pour un build fait à la main).
//
// Un push sur main est construit et déployé par Cloudflare, sans que GitHub sache quand c'est
// fini. Le workflow .github/workflows/indexnow.yml lit cette adresse jusqu'à y trouver le
// commit qu'il attend : c'est son seul moyen de savoir que les pages en ligne sont les
// nouvelles, donc qu'il peut prévenir Bing. Elle sert aussi à répondre, d'un coup d'œil, à
// « quelle version est en ligne ? ».
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(`${__BUILD_COMMIT__ || 'local'}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
