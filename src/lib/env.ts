// Lecture des variables d'exécution, en un seul endroit.
//
// En production, le Worker les reçoit par `cloudflare:workers` : les variables non sensibles
// de wrangler.jsonc et les secrets du tableau de bord (RESEND_API_KEY, RATES_SHEET_CSV_URL…).
// Surtout pas `Astro.locals.runtime.env` : depuis Astro 6 ce getter lève une exception, ce
// qui transformait chaque POST en 500. Les deux sources suivantes couvrent le dev local
// (fichier .env, cf. .env.example) et un éventuel retour à un runtime Node.
//
// Ce module est le seul à importer `cloudflare:workers` : la logique de src/lib reçoit sa
// configuration en paramètre, ce qui la garde testable hors du runtime Cloudflare.
import { env as workerEnv } from 'cloudflare:workers';

/** Valeur d'une variable d'environnement, ou `undefined` si elle est absente ou vide. */
export function readEnv(key: string): string | undefined {
  const value =
    workerEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined) ??
    (import.meta.env as Record<string, unknown>)[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}
