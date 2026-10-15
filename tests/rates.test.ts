import { describe, expect, it, vi } from 'vitest';
import { loadRates } from '../src/lib/rates/load';
import type { Week } from '../src/lib/rates/availability';

const fallback: Week[] = [
  { start: '2026-07-18', end: '2026-07-25', price: 7900, status: 'booked' },
  { start: '2026-07-25', end: '2026-08-01', price: 9500, status: 'available' },
];

const sheet = (...rows: string[]) => ['Arrivée,Départ,Prix,Disponibilité,Zones,Afficher', ...rows].join('\n');
const respond = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }));

describe('loadRates', () => {
  it('sans adresse de feuille, sert le secours local sans appel réseau', async () => {
    const fetchImpl = vi.fn();
    expect(await loadRates({ fallback, fetchImpl })).toEqual({ weeks: fallback, source: 'local' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sert les semaines de la feuille, sans celles masquées à la main', async () => {
    const fetchImpl = respond(sheet('18/07/2026,25/07/2026,7900,loué,A B C,TRUE', '25/07/2026,01/08/2026,9500,disponible,A B C,FALSE'));
    const rates = await loadRates({ sheetUrl: 'https://example.test/sheet.csv', fallback, fetchImpl });
    expect(rates.source).toBe('sheet');
    expect(rates.weeks.map((w) => w.start)).toEqual(['2026-07-18']);
  });

  it('reprend le prix connu quand la cellule Prix est vide', async () => {
    const fetchImpl = respond(sheet('25/07/2026,01/08/2026,,disponible,,TRUE'));
    const rates = await loadRates({ sheetUrl: 'https://example.test/sheet.csv', fallback, fetchImpl });
    expect(rates.weeks[0].price).toBe(9500);
  });

  it.each([
    ['la feuille répond en erreur', respond('', 500)],
    ['la feuille est vide', respond(sheet())],
    [
      'le réseau est en panne',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    ],
  ])('bascule sur le secours quand %s', async (_, fetchImpl) => {
    const rates = await loadRates({ sheetUrl: 'https://example.test/sheet.csv', fallback, fetchImpl });
    expect(rates).toEqual({ weeks: fallback, source: 'local' });
  });
});
