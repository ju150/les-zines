/// <reference path="../.astro/types.d.ts" />

// Module fourni par le runtime Cloudflare Workers. On ne déclare que ce que le code utilise
// (src/lib/env.ts) : les types complets de Workers redéfinissent fetch, Response… et entrent
// en conflit avec ceux du DOM dont les pages Astro ont besoin.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
