// Lecture des variables d'exécution, en un seul endroit.
//
// Le Worker les reçoit par `cloudflare:workers` : en production, les variables non sensibles
// de wrangler.jsonc et les secrets du tableau de bord (RESEND_API_KEY, RATES_SHEET_CSV_URL…) ;
// en dev, `astro dev` y injecte le fichier .env (cf. .env.example). `process.env` ne sert que
// de repli pour un éventuel retour à un runtime Node.
//
// Deux sources sont exclues exprès :
// - `Astro.locals.runtime.env` : depuis Astro 6, ce getter lève une exception, ce qui
//   transformait chaque POST en 500 ;
// - `import.meta.env` : Vite le fige au build. Il ne contient que les valeurs publiques
//   d'Astro (MODE, SITE…), jamais un secret, et un secret n'a rien à faire dans le bundle.
//
// Ce module est le seul à importer `cloudflare:workers` : la logique de src/lib reçoit sa
// configuration en paramètre, ce qui la garde testable hors du runtime Cloudflare.
import { env as workerEnv } from 'cloudflare:workers';

/** Valeur d'une variable d'environnement, ou `undefined` si elle est absente ou vide. */
export function readEnv(key: string): string | undefined {
  const value = workerEnv?.[key] ?? (typeof process !== 'undefined' ? process.env[key] : undefined);
  return typeof value === 'string' && value !== '' ? value : undefined;
}
